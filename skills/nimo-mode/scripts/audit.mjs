import fs from 'node:fs/promises';
import path from 'node:path';
import { absolute, atomicWrite, fail, guarded, main, readOptional, response, withLock } from './lib/common.mjs';

const FORMAT = 'nimo-task-audit:v1';
const TASK_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PHASES = new Set(['contract', 'design', 'implementation', 'verification', 'review', 'handoff']);
const CHECK_RESULTS = new Set(['PASS', 'FAIL', 'NOT_RUN', 'NOT_APPLICABLE']);
const EXECUTION_STATES = new Set(['running', 'waiting-input', 'blocked', 'paused', 'delivered', 'cancelled']);
const VERDICTS = new Set(['PENDING', 'VERIFIED', 'UNVERIFIED', 'BLOCKED']);
const LEARNING_STATUS = new Set(['candidate']);
const MARKERS = {
  acceptance: '<!-- nimo:audit:acceptance:end -->',
  harness: '<!-- nimo:audit:harness:end -->',
  decisions: '<!-- nimo:audit:decisions:end -->',
  artifacts: '<!-- nimo:audit:artifacts:end -->',
  verification: '<!-- nimo:audit:verification:end -->',
  outcome: '<!-- nimo:audit:outcome:end -->',
  learning: '<!-- nimo:audit:learning:end -->',
};

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail('INVALID_INPUT', `${label} is required`);
  return value.trim();
}

function stringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some(item => typeof item !== 'string' || !item.trim())) {
    fail('INVALID_INPUT', `${label} must be a non-empty string array`);
  }
  return value.map(item => item.trim());
}

function taskContext(request) {
  const projectRoot = absolute(request.projectRoot, 'projectRoot');
  const taskId = text(request.taskId, 'taskId');
  if (!TASK_ID.test(taskId)) fail('INVALID_TASK_ID', 'taskId must match [a-z0-9][a-z0-9._-]{0,63}');
  return { projectRoot, taskId, file: path.join(projectRoot, '.nimo', 'tasks', taskId, 'audit.md') };
}

function cell(value) {
  return text(value, 'cell')
    .replaceAll('&', '&amp;')
    .replaceAll('|', '&#124;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/[\t\r\n]+/g, ' ');
}

function row(values) {
  return `| ${values.map(cell).join(' | ')} |`;
}

function requireSingleMarker(content, marker) {
  const first = content.indexOf(marker);
  if (first < 0 || content.indexOf(marker, first + marker.length) >= 0) fail('INVALID_AUDIT', `Missing or duplicate marker ${marker}`);
  return first;
}

function insertBeforeMarker(content, marker, line) {
  const index = requireSingleMarker(content, marker);
  return `${content.slice(0, index)}${line}\n${content.slice(index)}`;
}

function parseRow(line) {
  return line.slice(1, -1).split('|').map(item => item.trim());
}

function linesBeforeMarker(content, marker) {
  const index = requireSingleMarker(content, marker);
  const before = content.slice(0, index).trimEnd().split('\n');
  const rows = [];
  for (let i = before.length - 1; i >= 0; i -= 1) {
    const line = before[i].trim();
    if (!line.startsWith('|')) break;
    rows.unshift(line);
  }
  if (rows.length < 2) fail('INVALID_AUDIT', `Table before ${marker} is malformed`);
  return rows.slice(2).map(parseRow);
}

function latestBy(rows, index) {
  const latest = new Map();
  for (const item of rows) latest.set(item[index], item);
  return latest;
}

function nextId(rows, prefix, index = 1) {
  let max = 0;
  for (const item of rows) {
    const match = new RegExp(`^${prefix}(\\d+)$`).exec(item[index]);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${max + 1}`;
}

async function readAudit(file) {
  const stat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (!stat) fail('AUDIT_MISSING', `Task Audit does not exist: ${file}`);
  if (stat.isSymbolicLink()) fail('LINKED_AUDIT', 'Refusing to read a linked Task Audit', 3);
  return await fs.readFile(file, 'utf8');
}

function auditTemplate(request, context) {
  const title = text(request.title, 'title');
  const goal = text(request.goal, 'goal');
  const scope = stringArray(request.scope, 'scope');
  if (!Array.isArray(request.acceptance) || request.acceptance.length === 0) fail('INVALID_INPUT', 'acceptance must be non-empty');
  const seenAcceptance = new Set();
  const acceptance = request.acceptance.map(item => {
    const id = text(item?.id, 'acceptance.id');
    const requirement = text(item?.text, 'acceptance.text');
    if (seenAcceptance.has(id)) fail('DUPLICATE_ACCEPTANCE', `Duplicate acceptance id ${id}`);
    seenAcceptance.add(id);
    return { id, requirement };
  });
  const playbook = text(request.playbook, 'playbook');
  const nimoRevision = text(request.nimoRevision, 'nimoRevision');
  const host = text(request.trace?.host, 'trace.host');
  const traceRef = typeof request.trace?.ref === 'string' && request.trace.ref.trim() ? request.trace.ref.trim() : 'UNAVAILABLE';
  const observedBoundary = text(request.trace?.observedBoundary, 'trace.observedBoundary');
  const createdAt = typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
  const acceptanceRows = acceptance.map(item => row([item.id, item.requirement])).join('\n');
  const scopeRows = scope.map(item => `- ${cell(item)}`).join('\n');
  return `<!-- ${FORMAT} -->\n# Task Audit: ${cell(title)}\n\n- Task ID: ${context.taskId}\n- Created At: ${cell(createdAt)}\n- Nimo Revision: ${cell(nimoRevision)}\n\n## Contract\n\n### Goal\n${cell(goal)}\n\n### Scope\n${scopeRows}\n\n### Acceptance\n| ID | Requirement |\n|---|---|\n${acceptanceRows}\n${MARKERS.acceptance}\n\n## Harness\n| Applied | Evidence of use |\n|---|---|\n${row([playbook, `route:${playbook}`])}\n${MARKERS.harness}\n\n## Trace\n- Host: ${cell(host)}\n- Reference: ${cell(traceRef)}\n- Observed Boundary: ${cell(observedBoundary)}\n\n## Decisions\n| Time | ID | Phase | Decision | Reason | Evidence | Result |\n|---|---|---|---|---|---|---|\n${MARKERS.decisions}\n\n## Artifacts\n| Time | ID | Artifact | Reference |\n|---|---|---|---|\n${MARKERS.artifacts}\n\n## Verification\n| Time | Check | Source | Required | Verification | Evidence / Reason | Result |\n|---|---|---|---|---|---|---|\n${MARKERS.verification}\n\n## Outcome\n| Time | Execution | Verdict | Artifact Version | Open | Next |\n|---|---|---|---|---|---|\n${row([createdAt, 'running', 'PENDING', 'PENDING', 'none', 'continue task'])}\n${MARKERS.outcome}\n\n## Learning\n| Time | ID | Observation | Candidate | Status |\n|---|---|---|---|---|\n${MARKERS.learning}\n`;
}

async function initAudit(request) {
  const context = taskContext(request);
  const existing = await readOptional(context.file);
  if (existing !== null) {
    if (!existing.includes(`<!-- ${FORMAT} -->`) || !existing.includes(`- Task ID: ${context.taskId}`)) {
      fail('AUDIT_EXISTS_INVALID', `Existing audit cannot be adopted: ${context.file}`);
    }
    return response({ file: context.file, taskId: context.taskId }, [], false);
  }
  const content = auditTemplate(request, context);
  return await withLock(context.file, async () => {
    if (await readOptional(context.file) !== null) fail('AUDIT_RACE', 'Task Audit appeared during initialization', 3);
    await atomicWrite(context.file, content);
    return response({ file: context.file, taskId: context.taskId }, [], true);
  });
}

function appendDecision(content, request) {
  const rows = linesBeforeMarker(content, MARKERS.decisions);
  const phase = text(request.phase, 'phase');
  if (!PHASES.has(phase)) fail('INVALID_PHASE', `Unsupported decision phase ${phase}`);
  const id = nextId(rows, 'D');
  const time = typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
  const line = row([time, id, phase, request.decision, request.reason, request.evidence, request.result]);
  return { content: insertBeforeMarker(content, MARKERS.decisions, line), id };
}

function appendHarness(content, request) {
  const rows = linesBeforeMarker(content, MARKERS.harness);
  const name = text(request.name, 'name');
  if (rows.some(item => item[0] === name)) return { content, id: name, changed: false };
  return { content: insertBeforeMarker(content, MARKERS.harness, row([name, request.evidence])), id: name };
}

function appendArtifact(content, request) {
  const rows = linesBeforeMarker(content, MARKERS.artifacts);
  const id = typeof request.id === 'string' && request.id.trim() ? request.id.trim() : nextId(rows, 'A');
  if (rows.some(item => item[1] === id)) fail('DUPLICATE_ARTIFACT', `Duplicate artifact id ${id}`);
  const time = typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
  return { content: insertBeforeMarker(content, MARKERS.artifacts, row([time, id, request.artifact, request.reference])), id };
}

function appendVerification(content, request) {
  const result = text(request.result, 'result');
  if (!CHECK_RESULTS.has(result)) fail('INVALID_CHECK_RESULT', `Unsupported check result ${result}`);
  if (typeof request.required !== 'boolean') fail('INVALID_INPUT', 'required must be boolean');
  const check = text(request.check, 'check');
  const source = text(request.source, 'source');
  const time = typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
  const line = row([time, check, source, request.required ? 'yes' : 'no', request.verification, request.evidence, result]);
  return { content: insertBeforeMarker(content, MARKERS.verification, line), id: check };
}

function appendOutcome(content, request) {
  const execution = text(request.execution, 'execution');
  const verdict = text(request.verdict, 'verdict');
  if (!EXECUTION_STATES.has(execution)) fail('INVALID_EXECUTION_STATE', `Unsupported execution state ${execution}`);
  if (!VERDICTS.has(verdict)) fail('INVALID_VERDICT', `Unsupported verdict ${verdict}`);
  const artifactVersion = text(request.artifactVersion, 'artifactVersion');
  const time = typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
  const line = row([time, execution, verdict, artifactVersion, request.open, request.next]);
  return { content: insertBeforeMarker(content, MARKERS.outcome, line), id: verdict };
}

function appendLearning(content, request) {
  const rows = linesBeforeMarker(content, MARKERS.learning);
  const status = text(request.status, 'status');
  if (!LEARNING_STATUS.has(status)) fail('INVALID_LEARNING_STATUS', `Unsupported learning status ${status}`);
  const id = nextId(rows, 'L');
  const time = typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
  const line = row([time, id, request.observation, request.candidate, status]);
  return { content: insertBeforeMarker(content, MARKERS.learning, line), id };
}

async function appendAudit(request) {
  const context = taskContext(request);
  const kind = text(request.kind, 'kind');
  return await withLock(context.file, async () => {
    const content = await readAudit(context.file);
    let update;
    if (kind === 'decision') update = appendDecision(content, request);
    else if (kind === 'harness') update = appendHarness(content, request);
    else if (kind === 'artifact') update = appendArtifact(content, request);
    else if (kind === 'verification') update = appendVerification(content, request);
    else if (kind === 'outcome') update = appendOutcome(content, request);
    else if (kind === 'learning') update = appendLearning(content, request);
    else fail('INVALID_KIND', `Unsupported audit record kind ${kind}`);
    const changed = update.changed !== false && update.content !== content;
    if (changed) await atomicWrite(context.file, update.content);
    return response({ file: context.file, taskId: context.taskId, kind, id: update.id }, [], changed);
  });
}

function metadata(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^- ${escaped}: (.+)$`, 'm').exec(content);
  return match?.[1]?.trim() ?? null;
}

function traceValue(content, label) {
  const match = new RegExp(`^- ${label}: (.+)$`, 'm').exec(content.slice(content.indexOf('## Trace')));
  return match?.[1]?.trim() ?? null;
}

function validateStructure(content) {
  const diagnostics = [];
  if (!content.includes(`<!-- ${FORMAT} -->`)) diagnostics.push({ code: 'INVALID_FORMAT', message: `Missing ${FORMAT}`, severity: 'BLOCK' });
  for (const [name, marker] of Object.entries(MARKERS)) {
    const first = content.indexOf(marker);
    if (first < 0 || content.indexOf(marker, first + marker.length) >= 0) diagnostics.push({ code: 'INVALID_MARKER', message: `${name} marker missing or duplicated`, severity: 'BLOCK' });
  }
  for (const heading of ['## Contract', '## Harness', '## Trace', '## Decisions', '## Artifacts', '## Verification', '## Outcome', '## Learning']) {
    if (!content.includes(heading)) diagnostics.push({ code: 'MISSING_SECTION', message: `Missing ${heading}`, severity: 'BLOCK' });
  }
  return diagnostics;
}

function unavailable(value) {
  return !value || ['UNAVAILABLE', 'PENDING', 'none', '-'].includes(value);
}

async function validateAudit(request) {
  const context = taskContext(request);
  const content = await readAudit(context.file);
  const diagnostics = validateStructure(content);
  if (diagnostics.some(item => item.severity === 'BLOCK')) return response({ file: context.file, taskId: context.taskId }, diagnostics, false);

  const taskId = metadata(content, 'Task ID');
  const nimoRevision = metadata(content, 'Nimo Revision');
  if (taskId !== context.taskId) diagnostics.push({ code: 'TASK_ID_MISMATCH', message: `Audit task id ${taskId ?? '<missing>'} does not match ${context.taskId}`, severity: 'BLOCK' });
  if (!nimoRevision) diagnostics.push({ code: 'NIMO_REVISION_MISSING', message: 'Nimo Revision is missing', severity: 'BLOCK' });
  else if (nimoRevision === 'UNAVAILABLE') diagnostics.push({ code: 'NIMO_REVISION_UNAVAILABLE', message: 'Nimo revision could not be observed', severity: 'WARN' });

  const host = traceValue(content, 'Host');
  const traceRef = traceValue(content, 'Reference');
  const observedBoundary = traceValue(content, 'Observed Boundary');
  if (!host || !observedBoundary) diagnostics.push({ code: 'TRACE_BOUNDARY_MISSING', message: 'Trace host and observed boundary are required', severity: 'BLOCK' });
  if (!traceRef || traceRef === 'UNAVAILABLE') diagnostics.push({ code: 'TRACE_UNAVAILABLE', message: 'Host trace reference is unavailable; process claims outside the observed boundary remain unobserved', severity: 'WARN' });

  const acceptance = linesBeforeMarker(content, MARKERS.acceptance);
  const acceptanceIds = new Set();
  for (const item of acceptance) {
    if (!item[0] || !item[1]) diagnostics.push({ code: 'INVALID_ACCEPTANCE', message: 'Acceptance rows require id and requirement', severity: 'BLOCK' });
    if (acceptanceIds.has(item[0])) diagnostics.push({ code: 'DUPLICATE_ACCEPTANCE', message: `Duplicate acceptance ${item[0]}`, severity: 'BLOCK' });
    acceptanceIds.add(item[0]);
  }
  if (acceptance.length === 0) diagnostics.push({ code: 'ACCEPTANCE_MISSING', message: 'At least one acceptance item is required', severity: 'BLOCK' });

  const harness = linesBeforeMarker(content, MARKERS.harness);
  if (harness.length === 0) diagnostics.push({ code: 'HARNESS_MISSING', message: 'At least one actually applied Harness item is required', severity: 'BLOCK' });
  for (const item of harness) if (!item[0] || unavailable(item[1])) diagnostics.push({ code: 'HARNESS_EVIDENCE_MISSING', message: `Harness ${item[0] || '<unknown>'} lacks evidence of use`, severity: 'BLOCK' });

  const decisions = linesBeforeMarker(content, MARKERS.decisions);
  const decisionIds = new Set();
  for (const item of decisions) {
    if (item.length !== 7) diagnostics.push({ code: 'INVALID_DECISION', message: 'Decision rows must have 7 columns', severity: 'BLOCK' });
    if (decisionIds.has(item[1])) diagnostics.push({ code: 'DUPLICATE_DECISION', message: `Duplicate decision ${item[1]}`, severity: 'BLOCK' });
    decisionIds.add(item[1]);
    if (!PHASES.has(item[2])) diagnostics.push({ code: 'INVALID_PHASE', message: `Unsupported decision phase ${item[2]}`, severity: 'BLOCK' });
    if (unavailable(item[5])) diagnostics.push({ code: 'DECISION_EVIDENCE_MISSING', message: `Decision ${item[1]} lacks evidence`, severity: 'BLOCK' });
  }

  const artifacts = linesBeforeMarker(content, MARKERS.artifacts);
  const artifactIds = new Set();
  for (const item of artifacts) {
    if (artifactIds.has(item[1])) diagnostics.push({ code: 'DUPLICATE_ARTIFACT', message: `Duplicate artifact ${item[1]}`, severity: 'BLOCK' });
    artifactIds.add(item[1]);
    if (!item[2] || unavailable(item[3])) diagnostics.push({ code: 'ARTIFACT_REFERENCE_MISSING', message: `Artifact ${item[1] || '<unknown>'} lacks a reference`, severity: 'BLOCK' });
  }

  const verification = linesBeforeMarker(content, MARKERS.verification);
  const latestChecks = latestBy(verification, 1);
  const latestAcceptance = new Map();
  const checkShape = new Map();
  for (const item of verification) {
    if (!CHECK_RESULTS.has(item[6])) diagnostics.push({ code: 'INVALID_CHECK_RESULT', message: `Unsupported check result ${item[6]}`, severity: 'BLOCK' });
    if (!['yes', 'no'].includes(item[3])) diagnostics.push({ code: 'INVALID_REQUIRED', message: `Verification ${item[1]} has invalid Required value`, severity: 'BLOCK' });
    const priorShape = checkShape.get(item[1]);
    const currentShape = `${item[2]}\u0000${item[3]}`;
    if (priorShape && priorShape !== currentShape) diagnostics.push({ code: 'CHECK_SHAPE_CHANGED', message: `Verification ${item[1]} changed source or requiredness across retries`, severity: 'BLOCK' });
    checkShape.set(item[1], currentShape);
    if (item[6] === 'PASS' && unavailable(item[5])) diagnostics.push({ code: 'PASS_WITHOUT_EVIDENCE', message: `Verification ${item[1]} is PASS without evidence`, severity: 'BLOCK' });
    if (acceptanceIds.has(item[2]) && item[3] === 'yes') latestAcceptance.set(item[2], item);
  }
  for (const id of acceptanceIds) if (!latestAcceptance.has(id)) diagnostics.push({ code: 'MISSING_ACCEPTANCE_VERIFICATION', message: `Acceptance ${id} has no required verification record`, severity: request.final === true ? 'BLOCK' : 'WARN' });

  const outcomes = linesBeforeMarker(content, MARKERS.outcome);
  const outcome = outcomes.at(-1);
  if (!outcome) diagnostics.push({ code: 'OUTCOME_MISSING', message: 'Outcome history is empty', severity: 'BLOCK' });
  else {
    const execution = outcome[1];
    const verdict = outcome[2];
    const artifactVersion = outcome[3];
    if (!EXECUTION_STATES.has(execution)) diagnostics.push({ code: 'INVALID_EXECUTION_STATE', message: `Unsupported execution state ${execution}`, severity: 'BLOCK' });
    if (!VERDICTS.has(verdict)) diagnostics.push({ code: 'INVALID_VERDICT', message: `Unsupported verdict ${verdict}`, severity: 'BLOCK' });
    if (request.final === true) {
      if (verdict === 'PENDING') diagnostics.push({ code: 'VERDICT_PENDING', message: 'Final audit cannot keep PENDING verdict', severity: 'BLOCK' });
      if (unavailable(artifactVersion)) diagnostics.push({ code: 'ARTIFACT_VERSION_MISSING', message: 'Final audit requires an artifact version', severity: 'BLOCK' });
      if (artifacts.length === 0) diagnostics.push({ code: 'ARTIFACTS_MISSING', message: 'Final audit requires at least one artifact record', severity: 'BLOCK' });
      if (verdict === 'VERIFIED') {
        for (const [id, item] of latestAcceptance) if (item[6] !== 'PASS') diagnostics.push({ code: 'VERIFIED_WITH_UNPROVEN_ACCEPTANCE', message: `${id} is ${item[6]} while verdict is VERIFIED`, severity: 'BLOCK' });
        for (const [id, item] of latestChecks) if (item[3] === 'yes' && item[6] !== 'PASS') diagnostics.push({ code: 'VERIFIED_WITH_FAILED_REQUIRED_CHECK', message: `${id} is ${item[6]} while verdict is VERIFIED`, severity: 'BLOCK' });
      }
      if (typeof request.expectedArtifactVersion === 'string' && request.expectedArtifactVersion.trim() && artifactVersion !== request.expectedArtifactVersion.trim()) {
        diagnostics.push({ code: 'ARTIFACT_VERSION_MISMATCH', message: `Audit artifact ${artifactVersion} does not match expected ${request.expectedArtifactVersion.trim()}`, severity: 'BLOCK' });
      }
      if (typeof request.expectedVerdict === 'string' && request.expectedVerdict.trim() && verdict !== request.expectedVerdict.trim()) {
        diagnostics.push({ code: 'VERDICT_MISMATCH', message: `Audit verdict ${verdict} does not match expected ${request.expectedVerdict.trim()}`, severity: 'BLOCK' });
      }
    }
  }

  return response({
    file: context.file,
    taskId: context.taskId,
    acceptanceCount: acceptance.length,
    decisionCount: decisions.length,
    artifactCount: artifacts.length,
    verificationCount: verification.length,
    currentOutcome: outcome ? { execution: outcome[1], verdict: outcome[2], artifactVersion: outcome[3] } : null,
  }, diagnostics, false);
}

export async function run(request) {
  return await guarded(async () => {
    const operation = text(request.operation, 'operation');
    if (operation === 'init') return await initAudit(request);
    if (operation === 'append') return await appendAudit(request);
    if (operation === 'validate') return await validateAudit(request);
    fail('INVALID_OPERATION', `Unsupported audit operation ${operation}`);
  });
}

main(import.meta.url, run);
