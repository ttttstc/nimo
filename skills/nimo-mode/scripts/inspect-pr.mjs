import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fail, guarded, main, response } from './lib/common.mjs';
const execute = promisify(execFile);

export function classify(facts) {
  if (!facts || typeof facts !== 'object') return { verdict: 'UNKNOWN', blockers: ['missing-facts'] };
  if (facts.expectedHeadRefOid && facts.expectedHeadRefOid !== facts.headRefOid) return { verdict: 'UNKNOWN', blockers: ['head-changed'] };
  if (facts.state === 'MERGED') return { verdict: 'COMPLETE', blockers: [] };
  if (facts.state === 'CLOSED') return { verdict: 'BLOCKED', blockers: ['closed-without-merge'] };
  const blockers = [];
  if (facts.state !== 'OPEN' || !facts.headRefOid || !facts.baseRefOid) return { verdict: 'UNKNOWN', blockers: ['missing-version-or-state'] };
  if (facts.isDraft) blockers.push('draft');
  if (facts.mergeable === 'CONFLICTING' || facts.mergeStateStatus === 'DIRTY') blockers.push('conflict');
  if (facts.reviewDecision === 'CHANGES_REQUESTED') blockers.push('changes-requested');
  if (Array.isArray(facts.reviewThreads) && facts.reviewThreads.some(thread => !thread.isResolved)) blockers.push('review-threads');
  const checks = facts.requiredChecks;
  const pending = Array.isArray(checks) && checks.some(check => ['PENDING', 'QUEUED', 'IN_PROGRESS', 'WAITING', 'REQUESTED', 'EXPECTED'].includes(check.state));
  if (Array.isArray(checks) && checks.some(check => ['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE'].includes(check.state))) blockers.push('required-check');
  if (blockers.length) return { verdict: 'BLOCKED', blockers };
  if (!Array.isArray(checks) || checks.length === 0 || !Array.isArray(facts.reviewThreads) || facts.dataComplete === false || !['MERGEABLE', 'CONFLICTING'].includes(facts.mergeable) || ['UNKNOWN', null, undefined].includes(facts.mergeStateStatus)) return { verdict: 'UNKNOWN', blockers: ['incomplete-platform-facts'] };
  if (checks.some(check => !['SUCCESS', 'SKIPPED', 'NEUTRAL', 'PENDING', 'QUEUED', 'IN_PROGRESS', 'WAITING', 'REQUESTED', 'EXPECTED'].includes(check.state))) return { verdict: 'UNKNOWN', blockers: ['unknown-check-state'] };
  if (pending || facts.reviewDecision === 'REVIEW_REQUIRED') return { verdict: 'WAITING', blockers: [pending ? 'checks-running' : 'owner-review'] };
  if (facts.mergeStateStatus !== 'CLEAN') return { verdict: 'WAITING', blockers: [facts.mergeStateStatus === 'BEHIND' ? 'stale-base' : 'platform-gate'] };
  return { verdict: 'READY', blockers: [] };
}

async function gh(args, allowFailureOutput = false) {
  try { return (await execute('gh', args, { maxBuffer: 8 * 1024 * 1024, timeout: 30000, windowsHide: true })).stdout; }
  catch (error) {
    if (allowFailureOutput && error.stdout?.trim().startsWith('[')) return error.stdout;
    fail('GITHUB_UNAVAILABLE', 'GitHub facts unavailable; check gh authentication and repository access', 4);
  }
}

export async function run(request) {
  return guarded(async () => {
    if (!request || typeof request.repo !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(request.repo) || !Number.isSafeInteger(request.pr) || request.pr < 1) fail('INVALID_PR', 'Use repo owner/name and a positive integer pr');
    const fields = 'number,url,state,headRefOid,baseRefOid,headRefName,baseRefName,mergeable,mergeStateStatus,isDraft,reviewDecision,mergedAt';
    const facts = JSON.parse(await gh(['pr', 'view', String(request.pr), '--repo', request.repo, '--json', fields]));
    const diagnostics = [];
    try {
      const checks = JSON.parse(await gh(['pr', 'checks', String(request.pr), '--repo', request.repo, '--required', '--json', 'name,state,bucket,link'], true));
      facts.requiredChecks = checks.map(check => ({ ...check, state: check.state?.toUpperCase() }));
    } catch { diagnostics.push({ code: 'CHECKS_UNKNOWN', severity: 'WARN', message: 'Required checks could not be read' }); }
    const [owner, name] = request.repo.split('/');
    const query = 'query($owner:String!,$name:String!,$number:Int!,$after:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid reviewThreads(first:100,after:$after){nodes{id isResolved isOutdated} pageInfo{hasNextPage endCursor}}}}}';
    let after;
    const seen = new Set();
    try {
      facts.reviewThreads = [];
      do {
        const args = ['api', 'graphql', '-f', `query=${query}`, '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `number=${request.pr}`];
        if (after) args.push('-f', `after=${after}`);
        const result = JSON.parse(await gh(args));
        const pr = result.data?.repository?.pullRequest;
        if (result.errors || !pr || pr.headRefOid !== facts.headRefOid) throw new Error('Changed head or missing review facts');
        const page = pr.reviewThreads;
        if (!Array.isArray(page?.nodes) || typeof page.pageInfo?.hasNextPage !== 'boolean') throw new Error('Incomplete page');
        facts.reviewThreads.push(...page.nodes);
        after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
        if (page.pageInfo.hasNextPage && (!after || seen.has(after))) throw new Error('Invalid pagination');
        if (after) seen.add(after);
      } while (after);
    } catch { facts.dataComplete = false; diagnostics.push({ code: 'REVIEWS_UNKNOWN', severity: 'WARN', message: 'Review threads are incomplete or the PR head changed' }); }
    const latest = JSON.parse(await gh(['pr', 'view', String(request.pr), '--repo', request.repo, '--json', 'headRefOid,baseRefOid,state']));
    if (latest.headRefOid !== facts.headRefOid || latest.baseRefOid !== facts.baseRefOid || latest.state !== facts.state) { facts.dataComplete = false; diagnostics.push({ code: 'PR_CHANGED', severity: 'WARN', message: 'PR changed during observation; reread it' }); }
    return response({ repo: request.repo, pr: request.pr, facts, ...classify(facts), observedAt: new Date().toISOString() }, diagnostics);
  });
}
main(import.meta.url, run);
