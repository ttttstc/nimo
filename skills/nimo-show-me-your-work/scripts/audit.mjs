import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const FORMAT = 'nimo-task-audit:v1';
const TASK_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PHASES = new Set(['contract', 'design', 'implementation', 'verification', 'review', 'handoff']);
const CHECK_RESULTS = new Set(['PASS', 'FAIL', 'NOT_RUN', 'NOT_APPLICABLE']);
const EXECUTION_STATES = new Set(['running', 'waiting-input', 'blocked', 'paused', 'delivered', 'cancelled']);
const VERDICTS = new Set(['PENDING', 'VERIFIED', 'PASS_WITH_SKIPS', 'UNVERIFIED', 'BLOCKED']);
const MARKERS = {
  acceptance: '<!-- nimo:audit:acceptance:end -->',
  harness: '<!-- nimo:audit:harness:end -->',
  decisions: '<!-- nimo:audit:decisions:end -->',
  artifacts: '<!-- nimo:audit:artifacts:end -->',
  verification: '<!-- nimo:audit:verification:end -->',
  outcome: '<!-- nimo:audit:outcome:end -->',
  learning: '<!-- nimo:audit:learning:end -->',
};

class AuditError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuditError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new AuditError(code, message);
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail('INVALID_INPUT', `${label} is required`);
  return value.trim();
}

function optionalText(value, fallback = 'none') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) {
    fail('INVALID_INPUT', `${label} must be a non-empty string array`);
  }
  return value.map(item => item.trim());
}

function now(request) {
  return typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
}

function escapeCell(value) {
  return requiredText(String(value), 'cell')
    .replaceAll('&', '&amp;')
    .replaceAll('|', '&#124;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/[\t\r\n]+/g, ' ');
}

function row(values) {
  return `| ${values.map(value => escapeCell(value)).join(' | ')} |`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function taskContext(request) {
  const projectRoot = path.resolve(requiredText(request.projectRoot, 'projectRoot'));
  const taskId = requiredText(request.taskId, 'taskId');
  if (!TASK_ID.test(taskId)) fail('INVALID_TASK_ID', 'taskId must match [a-z0-9][a-z0-9._-]{0,63}');
  return {
    projectRoot,
    taskId,
    file: path.join(projectRoot, '.nimo', 'tasks', taskId, 'audit.md'),
  };
}

async function readOptional(file) {
  const stat = await fs.lstat(file).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return null;
  if (stat.isSymbolicLink()) fail('LINKED_AUDIT', 'Refusing to read a linked Task Audit');
  return fs.readFile(file, 'utf8');
}

async function atomicWrite(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const existing = await fs.lstat(file).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
  if (existing?.isSymbolicLink()) fail('LINKED_AUDIT', 'Refusing to write a linked Task Audit');
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  await fs.writeFile(temporary, content, { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temporary, file);
}

async function withLock(file, action) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  let handle;
  try {
    handle = await fs.open(lock, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') fail('AUDIT_BUSY', `Task Audit is locked: ${file}`);
    throw error;
  }
  try {
    return await action();
  } finally {
    await handle.close();
    await fs.unlink(lock).catch(() => {});
  }
}

function parseRow(line) {
  return line.slice(1, -1).split('|').map(item => item.trim());
}

function markerIndex(content, marker) {
  const first = content.indexOf(marker);
  if (first < 0 || content.indexOf(marker, first + marker.length) >= 0) {
    fail('INVALID_AUDIT', `Missing or duplicate marker ${marker}`);
  }
  return first;
}

function tableRows(content, marker) {
  const index = markerIndex(content, marker);
  const lines = content.slice(0, index).trimEnd().split('\n');
  const rows = [];
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    rows.unshift(line);
  }
  if (rows.length < 2) fail('INVALID_AUDIT', `Malformed table before ${marker}`);
  return rows.slice(2).map(parseRow);
}

function insertRow(content, marker, values) {
  const index = markerIndex(content, marker);
  return `${content.slice(0, index)}${row(values)}\n${content.slice(index)}`;
}

function metadata(content, label) {
  const match = content.match(new RegExp(`^- ${label}: (.+)$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function extractContractBlock(content) {
  const start = content.indexOf('## Contract\n');
  const end = content.indexOf('\n\n## Harness\n');
  if (start < 0 || end <= start) fail('INVALID_AUDIT', 'Contract block is missing');
  return content.slice(start, end);
}

function buildContract(request) {
  const goal = requiredText(request.goal, 'goal');
  const scope = stringArray(request.scope, 'scope');
  if (!Array.isArray(request.acceptance) || request.acceptance.length === 0) {
    fail('INVALID_INPUT', 'acceptance must be a non-empty array');
  }
  const seen = new Set();
  const acceptance = request.acceptance.map(item => {
    const id = requiredText(item?.id, 'acceptance.id');
    const requirement = requiredText(item?.text, 'acceptance.text');
    if (seen.has(id)) fail('DUPLICATE_ACCEPTANCE', `Duplicate acceptance id ${id}`);
    seen.add(id);
    return { id, requirement };
  });
  const block = `## Contract\n\n### Goal\n${escapeCell(goal)}\n\n### Scope\n${scope.map(item => `- ${escapeCell(item)}`).join('\n')}\n\n### Acceptance\n| ID | Requirement |\n|---|---|\n${acceptance.map(item => row([item.id, item.requirement])).join('\n')}\n${MARKERS.acceptance}`;
  return { block, hash: sha256(block) };
}

function template(request, context) {
  const title = requiredText(request.title, 'title');
  const nimoRevision = requiredText(request.nimoRevision, 'nimoRevision');
  const traceHost = requiredText(request.trace?.host, 'trace.host');
  const traceRef = optionalText(request.trace?.ref, 'UNAVAILABLE');
  const observedBoundary = requiredText(request.trace?.observedBoundary, 'trace.observedBoundary');
  const createdAt = now(request);
  const contract = buildContract(request);
  return `<!-- ${FORMAT} -->\n# Task Audit: ${escapeCell(title)}\n\n- Task ID: ${context.taskId}\n- Created At: ${escapeCell(createdAt)}\n- Nimo Revision: ${escapeCell(nimoRevision)}\n- Contract Hash: ${contract.hash}\n\n${contract.block}\n\n## Harness\n| Time | Applied | Evidence of use |\n|---|---|---|\n${row([createdAt, 'nimo-show-me-your-work', `audit:${context.taskId}`])}\n${MARKERS.harness}\n\n## Trace\n- Host: ${escapeCell(traceHost)}\n- Reference: ${escapeCell(traceRef)}\n- Observed Boundary: ${escapeCell(observedBoundary)}\n\n## Decisions\n| Time | ID | Phase | Decision | Reason | Evidence | Result |\n|---|---|---|---|---|---|---|\n${MARKERS.decisions}\n\n## Artifacts\n| Time | ID | Artifact | Reference | Version |\n|---|---|---|---|---|\n${MARKERS.artifacts}\n\n## Verification\n| Time | Check | Source | Required | Verification | Evidence / Reason | Result |\n|---|---|---|---|---|---|---|\n${MARKERS.verification}\n\n## Outcome\n| Time | Execution | Verdict | Artifact Version | Open | Next |\n|---|---|---|---|---|---|\n${row([createdAt, 'running', 'PENDING', 'PENDING', 'none', 'continue task'])}\n${MARKERS.outcome}\n\n## Learning\n| Time | ID | Observation | Candidate | Status |\n|---|---|---|---|---|\n${MARKERS.learning}\n`;
}

function nextId(rows, prefix, index) {
  let max = 0;
  for (const item of rows) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(item[index] ?? '');
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

function appendDecision(content, request) {
  const rows = tableRows(content, MARKERS.decisions);
  const phase = requiredText(request.phase, 'phase');
  if (!PHASES.has(phase)) fail('INVALID_PHASE', `Unsupported decision phase ${phase}`);
  const id = nextId(rows, 'D', 1);
  return {
    id,
    content: insertRow(content, MARKERS.decisions, [
      now(request), id, phase,
      requiredText(request.decision, 'decision'),
      requiredText(request.reason, 'reason'),
      requiredText(request.evidence, 'evidence'),
      requiredText(request.result, 'result'),
    ]),
  };
}

function appendHarness(content, request) {
  const name = requiredText(request.name, 'name');
  const evidence = requiredText(request.evidence, 'evidence');
  const rows = tableRows(content, MARKERS.harness);
  if (rows.some(item => item[1] === name && item[2] === escapeCell(evidence))) return { id: name, content, changed: false };
  return { id: name, content: insertRow(content, MARKERS.harness, [now(request), name, evidence]) };
}

function appendArtifact(content, request) {
  const rows = tableRows(content, MARKERS.artifacts);
  const id = nextId(rows, 'A', 1);
  return {
    id,
    content: insertRow(content, MARKERS.artifacts, [
      now(request), id,
      requiredText(request.artifact, 'artifact'),
      requiredText(request.reference, 'reference'),
      requiredText(request.version, 'version'),
    ]),
  };
}

function appendVerification(content, request) {
  const check = requiredText(request.check, 'check');
  const source = requiredText(request.source, 'source');
  const verification = requiredText(request.verification, 'verification');
  const evidence = requiredText(request.evidence, 'evidence');
  const result = requiredText(request.result, 'result');
  if (!CHECK_RESULTS.has(result)) fail('INVALID_RESULT', `Unsupported verification result ${result}`);
  if (typeof request.required !== 'boolean') fail('INVALID_INPUT', 'required must be boolean');
  const required = request.required ? 'yes' : 'no';
  const rows = tableRows(content, MARKERS.verification);
  for (const item of rows) {
    if (item[1] !== escapeCell(check)) continue;
    if (item[2] !== escapeCell(source)) fail('CHECK_SOURCE_CHANGED', `Verification source changed for ${check}`);
    if (item[3] !== required) fail('CHECK_REQUIREDNESS_CHANGED', `Verification requiredness changed for ${check}`);
  }
  return {
    id: check,
    content: insertRow(content, MARKERS.verification, [now(request), check, source, required, verification, evidence, result]),
  };
}

function appendOutcome(content, request) {
  const execution = requiredText(request.execution, 'execution');
  const verdict = requiredText(request.verdict, 'verdict');
  if (!EXECUTION_STATES.has(execution)) fail('INVALID_EXECUTION', `Unsupported execution state ${execution}`);
  if (!VERDICTS.has(verdict)) fail('INVALID_VERDICT', `Unsupported verdict ${verdict}`);
  const skips = request.skips ?? [];
  if (!Array.isArray(skips)) fail('INVALID_INPUT', 'skips must be an array');
  for (const skip of skips) {
    for (const field of ['check', 'source', 'reason', 'taskId', 'artifactVersion', 'environment']) {
      requiredText(skip?.[field], `skips.${field}`);
    }
  }
  content = content.replace('| Time | Execution | Verdict | Artifact Version | Open | Next |\n|---|---|---|---|---|---|',
    '| Time | Execution | Verdict | Artifact Version | Open | Next | User Skips |\n|---|---|---|---|---|---|---|');
  return {
    id: verdict,
    content: insertRow(content, MARKERS.outcome, [
      now(request), execution, verdict,
      requiredText(request.artifactVersion, 'artifactVersion'),
      optionalText(request.open), optionalText(request.next), JSON.stringify(skips),
    ]),
  };
}

function appendLearning(content, request) {
  const rows = tableRows(content, MARKERS.learning);
  const id = nextId(rows, 'L', 1);
  const status = optionalText(request.status, 'candidate');
  if (status !== 'candidate') fail('INVALID_LEARNING_STATUS', 'Learning status must remain candidate in v1');
  return {
    id,
    content: insertRow(content, MARKERS.learning, [
      now(request), id,
      requiredText(request.observation, 'observation'),
      requiredText(request.candidate, 'candidate'),
      status,
    ]),
  };
}

async function initAudit(request) {
  const context = taskContext(request);
  const contract = buildContract(request);
  const existing = await readOptional(context.file);
  if (existing !== null) {
    if (!existing.includes(`<!-- ${FORMAT} -->`) || metadata(existing, 'Task ID') !== context.taskId) {
      fail('AUDIT_EXISTS_INVALID', `Existing audit cannot be adopted: ${context.file}`);
    }
    if (metadata(existing, 'Contract Hash') !== contract.hash) {
      fail('AUDIT_CONTRACT_MISMATCH', 'Existing Task Audit has a different goal, scope, or acceptance boundary; use a new taskId');
    }
    if (metadata(existing, 'Nimo Revision') !== requiredText(request.nimoRevision, 'nimoRevision')) {
      fail('AUDIT_REVISION_MISMATCH', 'Existing Task Audit belongs to a different Nimo revision');
    }
    return { status: 'OK', changed: false, data: { file: context.file, taskId: context.taskId }, warnings: [] };
  }
  return withLock(context.file, async () => {
    if (await readOptional(context.file) !== null) fail('AUDIT_RACE', 'Task Audit appeared during initialization');
    await atomicWrite(context.file, template(request, context));
    return { status: 'OK', changed: true, data: { file: context.file, taskId: context.taskId }, warnings: [] };
  });
}

async function appendAudit(request) {
  const context = taskContext(request);
  const kind = requiredText(request.kind, 'kind');
  return withLock(context.file, async () => {
    const content = await readOptional(context.file);
    if (content === null) fail('AUDIT_MISSING', `Task Audit does not exist: ${context.file}`);
    let update;
    if (kind === 'decision') update = appendDecision(content, request);
    else if (kind === 'harness') update = appendHarness(content, request);
    else if (kind === 'artifact') update = appendArtifact(content, request);
    else if (kind === 'verification') update = appendVerification(content, request);
    else if (kind === 'outcome') update = appendOutcome(content, request);
    else if (kind === 'learning') update = appendLearning(content, request);
    else fail('INVALID_KIND', `Unsupported append kind ${kind}`);
    const changed = update.changed !== false && update.content !== content;
    if (changed) await atomicWrite(context.file, update.content);
    return { status: 'OK', changed, data: { file: context.file, id: update.id }, warnings: [] };
  });
}

function latestBy(rows, index) {
  const result = new Map();
  for (const item of rows) result.set(item[index], item);
  return result;
}

async function validateAudit(request) {
  const context = taskContext(request);
  const content = await readOptional(context.file);
  if (content === null) return { status: 'BLOCK', changed: false, data: { file: context.file }, warnings: [], errors: ['Task Audit is missing'] };
  const errors = [];
  const warnings = [];
  if (!content.includes(`<!-- ${FORMAT} -->`)) errors.push('Unsupported or missing audit format');
  if (metadata(content, 'Task ID') !== context.taskId) errors.push('Task ID does not match audit path');
  const storedHash = metadata(content, 'Contract Hash');
  try {
    if (storedHash !== sha256(extractContractBlock(content))) errors.push('Contract Hash does not match rendered Contract');
  } catch (error) {
    errors.push(error.message);
  }
  if (!metadata(content, 'Nimo Revision')) errors.push('Nimo Revision is missing');

  const traceRef = content.match(/^- Reference: (.+)$/m)?.[1]?.trim();
  const observedBoundary = content.match(/^- Observed Boundary: (.+)$/m)?.[1]?.trim();
  if (!observedBoundary) errors.push('Observed Boundary is missing');
  if (!traceRef || traceRef === 'UNAVAILABLE') warnings.push('Host Trace is unavailable; keep unobserved behavior explicitly unobserved');

  let acceptance = [];
  let harness = [];
  let decisions = [];
  let artifacts = [];
  let verification = [];
  let outcome = [];
  try {
    acceptance = tableRows(content, MARKERS.acceptance);
    harness = tableRows(content, MARKERS.harness);
    decisions = tableRows(content, MARKERS.decisions);
    artifacts = tableRows(content, MARKERS.artifacts);
    verification = tableRows(content, MARKERS.verification);
    outcome = tableRows(content, MARKERS.outcome);
    tableRows(content, MARKERS.learning);
  } catch (error) {
    errors.push(error.message);
  }

  for (const item of harness) if (!item[2]) errors.push(`Harness ${item[1] ?? '?'} lacks evidence of use`);
  const decisionIds = new Set();
  for (const item of decisions) {
    if (decisionIds.has(item[1])) errors.push(`Duplicate Decision ID ${item[1]}`);
    decisionIds.add(item[1]);
    if (!item[5]) errors.push(`Decision ${item[1] ?? '?'} lacks Evidence`);
  }
  for (const item of artifacts) {
    if (!item[3]) errors.push(`Artifact ${item[1] ?? '?'} lacks Reference`);
    if (!item[4]) errors.push(`Artifact ${item[1] ?? '?'} lacks Version`);
  }

  const checkShape = new Map();
  for (const item of verification) {
    const check = item[1];
    const shape = `${item[2]}|${item[3]}`;
    if (checkShape.has(check) && checkShape.get(check) !== shape) errors.push(`Verification shape changed for ${check}`);
    checkShape.set(check, shape);
    if (item[6] === 'PASS' && !item[5]) errors.push(`PASS verification ${check} lacks Evidence`);
    if (!CHECK_RESULTS.has(item[6])) errors.push(`Unsupported verification result for ${check}: ${item[6]}`);
  }

  const latestChecks = latestBy(verification, 1);
  const latestOutcome = outcome.at(-1);
  const final = request.final === true;
  if (final) {
    for (const item of acceptance) {
      const check = latestChecks.get(item[0]);
      if (!check) errors.push(`Acceptance ${item[0]} has no Verification record`);
      else if (check[3] !== 'yes') errors.push(`Acceptance ${item[0]} is not marked Required`);
    }
    if (!latestOutcome) errors.push('Outcome is missing');
    else {
      const verdict = latestOutcome[2];
      const artifactVersion = latestOutcome[3];
      if (!VERDICTS.has(verdict)) errors.push(`Unsupported verdict ${verdict}`);
      if (verdict === 'PENDING') errors.push('Final Audit cannot keep PENDING verdict');
      if (!artifactVersion || artifactVersion === 'PENDING') errors.push('Final Audit must bind an Artifact Version');
      if (artifactVersion && artifactVersion !== 'PENDING' && !artifacts.some(item => item[4] === artifactVersion)) {
        errors.push(`Outcome Artifact Version ${artifactVersion} is not present in Artifacts`);
      }
      if (verdict === 'VERIFIED' || verdict === 'PASS_WITH_SKIPS') {
        let skips = [];
        try {
          const encoded = latestOutcome[6] ?? '[]';
          skips = JSON.parse(encoded.replaceAll('&#124;', '|').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
          if (!Array.isArray(skips)) throw new Error('not an array');
        } catch {
          errors.push('Invalid User Skips');
          skips = [];
        }
        const waived = new Set();
        for (const skip of skips) {
          if (!skip || !['check', 'source', 'reason', 'taskId', 'artifactVersion', 'environment'].every(field => typeof skip[field] === 'string' && skip[field].trim())) {
            errors.push('Incomplete user skip declaration');
            continue;
          }
          const check = escapeCell(skip.check);
          if (skip.taskId !== context.taskId || escapeCell(skip.artifactVersion) !== artifactVersion || skip.environment !== request.expectedEnvironment) {
            errors.push(`Skip scope mismatch for ${check}`);
            continue;
          }
          if (latestChecks.get(check)?.[6] !== 'NOT_RUN') errors.push(`Skipped check ${check} must remain NOT_RUN`);
          if (waived.has(check)) errors.push(`Duplicate skip for ${check}`);
          waived.add(check);
        }
        if (verdict === 'PASS_WITH_SKIPS' && ![...waived].some(check => latestChecks.get(check)?.[3] === 'yes')) {
          errors.push('PASS_WITH_SKIPS requires an explicit user skip for a required check');
        }
        const unresolvedFailures = new Set();
        for (const item of verification) {
          if (item[6] === 'FAIL') unresolvedFailures.add(item[1]);
          if (item[6] === 'PASS') unresolvedFailures.delete(item[1]);
        }
        for (const check of unresolvedFailures) errors.push(`Unresolved FAIL for ${check}`);
        for (const [check, item] of latestChecks.entries()) {
          const skipped = verdict === 'PASS_WITH_SKIPS' && item[6] === 'NOT_RUN' && waived.has(check);
          if (item[3] === 'yes' && item[6] !== 'PASS' && !skipped) errors.push(`Required check ${check} is ${item[6]}, not PASS or user-declared skip`);
        }
      }
      if (typeof request.expectedVerdict === 'string' && request.expectedVerdict !== verdict) {
        errors.push(`Expected verdict ${request.expectedVerdict}, found ${verdict}`);
      }
      if (typeof request.expectedArtifactVersion === 'string' && request.expectedArtifactVersion !== artifactVersion) {
        errors.push(`Expected Artifact Version ${request.expectedArtifactVersion}, found ${artifactVersion}`);
      }
    }
  }
  return {
    status: errors.length ? 'BLOCK' : 'OK',
    changed: false,
    data: { file: context.file, verdict: latestOutcome?.[2] ?? 'PENDING', artifactVersion: latestOutcome?.[3] ?? 'PENDING' },
    warnings,
    errors,
  };
}

async function dispatch(request) {
  const operation = requiredText(request.operation, 'operation');
  if (operation === 'init') return initAudit(request);
  if (operation === 'append') return appendAudit(request);
  if (operation === 'validate') return validateAudit(request);
  fail('INVALID_OPERATION', `Unsupported operation ${operation}`);
}

export async function run(request) {
  try {
    return await dispatch(request);
  } catch (error) {
    return {
      status: 'ERROR',
      changed: false,
      data: null,
      warnings: [],
      errors: [error.message],
      errorCode: error.code ?? 'UNEXPECTED_ERROR',
    };
  }
}

async function cli() {
  const inputIndex = process.argv.indexOf('--input');
  if (inputIndex < 0 || !process.argv[inputIndex + 1]) {
    console.error(JSON.stringify({ status: 'ERROR', errors: ['Usage: node audit.mjs --input <request.json>'] }));
    process.exitCode = 1;
    return;
  }
  const request = JSON.parse(await fs.readFile(path.resolve(process.argv[inputIndex + 1]), 'utf8'));
  const result = await run(request);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'OK' ? 0 : result.status === 'BLOCK' ? 2 : 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await cli();
