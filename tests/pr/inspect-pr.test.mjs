import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULE_URL = pathToFileURL(join(REPO_ROOT, 'skills', 'nimo-mode', 'scripts', 'inspect-pr.mjs'));
const { classify, run } = await import(MODULE_URL);

assert.equal(typeof classify, 'function', 'inspect-pr.mjs must export classify(facts)');
assert.equal(typeof run, 'function', 'inspect-pr.mjs must export run(request)');

function readyFacts(overrides = {}) {
  return {
    state: 'OPEN',
    headRefOid: 'head-1',
    baseRefOid: 'base-1',
    expectedHeadRefOid: 'head-1',
    isDraft: false,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    reviewDecision: 'APPROVED',
    requiredChecks: [{ name: 'test', state: 'SUCCESS' }],
    reviewThreads: [{ id: 'thread-1', isResolved: true }],
    dataComplete: true,
    ...overrides,
  };
}

function statusOf(value) {
  if (typeof value === 'string') return value;
  return value?.verdict ?? value?.status ?? value?.classification ?? value?.conclusion ?? value?.result?.verdict ?? value?.data?.verdict;
}

function assertClassification(facts, expected, message) {
  const result = classify(facts);
  assert.equal(statusOf(result), expected, `${message}; result=${JSON.stringify(result)}`);
}

test('classify reports COMPLETE only for merged PRs and READY only with complete facts', () => {
  assertClassification(readyFacts({ state: 'MERGED' }), 'COMPLETE', 'merged PR');
  assertClassification(readyFacts(), 'READY', 'complete clean PR');
});

test('pending and failed required checks remain distinct from READY', () => {
  assertClassification(readyFacts({ requiredChecks: [{ name: 'test', state: 'IN_PROGRESS' }] }), 'WAITING', 'pending required check');
  assertClassification(readyFacts({ requiredChecks: [{ name: 'test', state: 'FAILURE' }] }), 'BLOCKED', 'failed required check');
});

test('unknown, missing, empty, or paginated facts never become READY', () => {
  const cases = [
    ['unknown mergeability', readyFacts({ mergeable: 'UNKNOWN' })],
    ['missing mergeability', (() => { const facts = readyFacts(); delete facts.mergeable; return facts; })()],
    ['missing checks', (() => { const facts = readyFacts(); delete facts.requiredChecks; return facts; })()],
    ['empty checks without completeness proof', readyFacts({ requiredChecks: [] })],
    ['checks have another page', readyFacts({ dataComplete: false })],
    ['reviews have another page', readyFacts({ dataComplete: false })],
    ['reviews missing', (() => { const facts = readyFacts(); delete facts.reviewThreads; return facts; })()],
  ];
  for (const [label, facts] of cases) {
    const result = classify(facts);
    assert.notEqual(statusOf(result), 'READY', `${label} must not be READY; result=${JSON.stringify(result)}`);
    assert.equal(statusOf(result), 'UNKNOWN', `${label} must remain UNKNOWN; result=${JSON.stringify(result)}`);
  }
});

test('a changed or missing actual head invalidates a previous READY verdict', () => {
  const changed = readyFacts({
    headRefOid: 'head-2',
    expectedHeadRefOid: 'head-1',
  });
  assertClassification(changed, 'UNKNOWN', 'changed actual head');

  const missing = readyFacts();
  delete missing.headRefOid;
  assertClassification(missing, 'UNKNOWN', 'missing actual head');
});

test('run(request) validates input before any GitHub call and remains read-only', async () => {
  const result = await run({ repo: 'invalid repo', pr: 13 });
  assert.equal(result.status, 'BLOCK', `invalid request must be rejected: ${JSON.stringify(result)}`);
  assert.equal(result.diagnostics?.[0]?.code, 'INVALID_PR');
});
