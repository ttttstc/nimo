import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  absoluteProjectRoot,
  atomicWrite,
  captureSnapshot,
  fail,
  hashFile,
  isObject,
  outputPath,
  readJsonFile,
  readTextFile,
  requiredText,
  serializeError,
  taskPaths,
} from '../../nimo-mode/scripts/lib/task-records.mjs';
import { currentContract, validateAnchor } from '../../nimo-mode/scripts/task-anchor.mjs';
import { evaluateRecord, loadVerification } from '../../nimo-verify/scripts/record.mjs';
import { readCodexSource } from './hosts/codex.mjs';

const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
const ACTIVITY_KINDS = new Map([
  ['inspect', 'inspect/read'],
  ['read', 'inspect/read'],
  ['change', 'change'],
  ['edit', 'change'],
  ['execute', 'execute/check'],
  ['check', 'execute/check'],
  ['test', 'execute/check'],
  ['git', 'git/delivery'],
  ['delivery', 'git/delivery'],
  ['commit', 'git/delivery'],
]);

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function redact(value) {
  let result = text(value);
  for (const candidate of [process.env.USERPROFILE, process.env.HOME, process.env.HOMEDRIVE && process.env.HOMEPATH].filter(Boolean)) {
    result = result.replaceAll(candidate, '[home]');
  }
  return result.replaceAll(/(?:[A-Za-z]:)?[\\/]Users[\\/][^\\/\s]+/g, '[home]');
}

function html(value) {
  return redact(typeof value === 'number' ? String(value) : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function projectContract(contract) {
  if (!contract) return null;
  return {
    revision: contract.revision,
    goal: redact(contract.goal),
    scope: array(contract.scope).map(redact),
    acceptance: array(contract.acceptance).map(item => ({ id: redact(item.id), text: redact(item.text), required: item.required === true })),
    confirmedBy: redact(contract.confirmedBy),
    confirmedAt: redact(contract.confirmedAt),
  };
}

function projectVerification(record, validation, contract) {
  if (!record) return null;
  const requiredAcceptance = new Set(array(contract?.acceptance).filter(item => item.required).map(item => item.id));
  return {
    taskId: record.taskId,
    contractRevision: record.contractRevision,
    artifactVersion: redact(record.artifactVersion),
    environment: redact(record.environment),
    verifiedAt: redact(record.verifiedAt),
    executor: typeof record.executor === 'string' ? redact(record.executor) : 'declared executor',
    independent: record.independent === true,
    recordedVerdict: record.recordedVerdict,
    checks: array(record.checks).filter(isObject).map(check => ({
      checkId: redact(check.checkId),
      acceptanceIds: array(check.acceptanceIds).map(redact),
      required: array(check.acceptanceIds).some(id => requiredAcceptance.has(id)) || (array(check.acceptanceIds).length === 0 && check.required === true),
      source: redact(check.source),
      operation: redact(check.operation),
      result: check.result,
      reason: redact(check.reason),
    })),
    skipDeclarations: array(record.skipDeclarations).filter(isObject).map(skip => ({
      checkId: redact(skip.checkId),
      source: redact(skip.source),
      reason: redact(skip.reason),
      taskId: redact(skip.taskId),
      artifactVersion: redact(skip.artifactVersion),
      environment: redact(skip.environment),
    })),
    unresolvedFailures: array(record.unresolvedFailures).filter(isObject).map(failure => ({
      checkId: redact(failure.checkId),
      reason: redact(failure.reason),
      firstSeenAt: redact(failure.firstSeenAt),
      lastSeenAt: redact(failure.lastSeenAt),
    })),
    validation: { ok: validation.ok, errors: validation.errors.map(redact), warnings: validation.warnings.map(redact), derivedVerdict: validation.derivedVerdict },
  };
}

function parseMarkdownTable(content, heading) {
  const start = content.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const rest = content.slice(start + heading.length + 3);
  const end = rest.search(/\n##\s+/);
  const block = rest.slice(0, end < 0 ? rest.length : end);
  const rows = block.split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  if (rows.length < 2) return [];
  const parse = line => line.trim().slice(1, -1).split('|').map(value => value.trim().replaceAll('&#124;', '|').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
  return rows.slice(2).filter(line => !/^\|\s*:?-{2,}/.test(line.trim())).map(parse);
}

function latestBy(rows, index) {
  const result = new Map();
  for (const row of rows) if (row[index]) result.set(row[index], row);
  return result;
}

async function listAnchors(projectRoot) {
  const root = path.join(projectRoot, '.nimo', 'tasks');
  const stat = await fs.lstat(root).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return [];
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail('INVALID_TASK_ROOT', 'Task root is not a real directory');
  const entries = await fs.readdir(root, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const taskId = entry.name;
    const paths = await taskPaths(projectRoot, taskId);
    const anchor = await readJsonFile(paths.anchor);
    if (anchor === null) continue;
    validateAnchor(anchor, taskId);
    candidates.push(anchor);
  }
  return candidates.sort((left, right) => {
    const leftTime = Date.parse(left.createdAt) || 0;
    const rightTime = Date.parse(right.createdAt) || 0;
    return rightTime - leftTime || left.taskId.localeCompare(right.taskId);
  });
}

async function selectTask(request, projectRoot) {
  if (request.taskId !== undefined) {
    const taskId = requiredText(request.taskId, 'taskId');
    const paths = await taskPaths(projectRoot, taskId);
    const anchor = await readJsonFile(paths.anchor);
    return {
      taskId,
      paths,
      anchor: anchor === null ? null : validateAnchor(anchor, taskId),
      reason: 'explicit taskId',
    };
  }
  const anchors = await listAnchors(projectRoot);
  if (anchors.length === 0) {
    return { taskId: null, paths: null, anchor: null, reason: 'no Task Anchor exists in the current workspace' };
  }
  const anchor = anchors[0];
  return {
    taskId: anchor.taskId,
    paths: await taskPaths(projectRoot, anchor.taskId),
    anchor,
    reason: 'selected the newest Task Anchor in the current workspace by createdAt; ties use taskId order',
  };
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function localReference(projectRoot, location) {
  const target = path.isAbsolute(location) ? path.resolve(location) : path.resolve(projectRoot, location);
  if (!inside(projectRoot, target)) return { safe: false, status: 'UNSAFE_PATH', display: '[outside project]' };
  const relative = path.relative(projectRoot, target).replaceAll('\\', '/') || '.';
  let current = projectRoot;
  for (const part of path.relative(projectRoot, target).split(path.sep)) {
    if (!part) continue;
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) return { safe: true, status: 'MISSING', display: relative, target };
    if (stat.isSymbolicLink()) return { safe: false, status: 'SYMLINK_REFUSED', display: relative };
  }
  const stat = await fs.lstat(target).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return { safe: true, status: 'MISSING', display: relative, target };
  if (!stat.isFile()) return { safe: true, status: 'UNSUPPORTED', display: relative, target, size: stat.size };
  return { safe: true, status: 'PRESENT', display: relative, target, size: stat.size };
}

function isRemote(location) {
  return /^https?:\/\//i.test(location);
}

function unsafeProtocol(location) {
  return !path.isAbsolute(location) && /^[a-z][a-z\d+.-]*:/i.test(location) && !isRemote(location);
}

async function inspectEvidence(projectRoot, record) {
  const result = [];
  for (const check of array(record?.checks).filter(isObject)) {
    for (const evidence of array(check.evidence)) {
      const source = text(evidence?.source, 'unknown');
      const location = text(evidence?.location);
      const item = { checkId: check.checkId, source: redact(source), location: redact(location), referenced: Boolean(source && location), bound: false, supportsClaim: false, status: 'INVALID_REFERENCE', reason: '' };
      if (!source || !location) {
        item.reason = 'source and location are required';
        result.push(item);
        continue;
      }
      if (isRemote(location)) {
        item.status = 'REMOTE_UNCHECKED';
        item.reason = 'Inspector does not fetch remote references';
        result.push(item);
        continue;
      }
      if (unsafeProtocol(location)) {
        item.status = 'UNSAFE_PROTOCOL';
        item.reason = 'Only HTTP and HTTPS links are displayable';
        result.push(item);
        continue;
      }
      const local = await localReference(projectRoot, location);
      item.location = local.display;
      item.status = local.status;
      if (!local.safe) {
        item.reason = 'Inspector refused a path outside the project or through a symbolic link';
        result.push(item);
        continue;
      }
      if (local.status === 'MISSING') {
        item.reason = 'Referenced file does not exist';
        result.push(item);
        continue;
      }
      if (local.status !== 'PRESENT') {
        item.reason = 'Referenced path is not a regular file';
        result.push(item);
        continue;
      }
      if (local.size > MAX_EVIDENCE_BYTES) {
        item.status = 'TOO_LARGE_TO_CHECK';
        item.reason = `File exceeds ${MAX_EVIDENCE_BYTES} bytes`;
        result.push(item);
        continue;
      }
      const actualDigest = await hashFile(local.target);
      const expectedDigest = text(evidence.sha256);
      const expectedVersion = text(evidence.version);
      const recordVersion = text(record.artifactVersion);
      if (expectedDigest && expectedDigest !== actualDigest) {
        item.status = 'CHANGED';
        item.reason = 'Content digest does not match the recorded evidence';
        item.actualSha256 = actualDigest;
        result.push(item);
        continue;
      }
      if (expectedVersion && expectedVersion !== recordVersion && expectedVersion !== text(record.artifactSnapshot?.gitHead)) {
        item.status = 'CHANGED';
        item.reason = 'Evidence version does not match the verification artifact';
        result.push(item);
        continue;
      }
      if (!expectedDigest) {
        item.status = 'REFERENCED_ONLY';
        item.reason = 'A path or declared version does not establish the current file content; a content digest is required';
        result.push(item);
        continue;
      }
      item.bound = true;
      item.status = 'BOUND';
      item.reason = 'Local file exists and its content digest matches';
      const explicitClaim = evidence.claim === 'machine-result' || evidence.supportsClaim === true;
      if (explicitClaim && text(evidence.summary)) {
        item.status = 'CLAIM_DECLARED';
        item.reason += '; producer declared support for the claim; Inspector has not independently checked that claim';
      } else {
        item.reason += '; no explicit machine-result claim was supplied';
      }
      result.push(item);
    }
  }
  return result;
}

function compareSnapshots(recordSnapshot, currentSnapshot) {
  if (!isObject(recordSnapshot) || !isObject(currentSnapshot)) return { status: 'UNKNOWN', reasons: ['artifact snapshot is unavailable'] };
  if ([recordSnapshot.snapshotStatus, currentSnapshot.snapshotStatus].includes('UNKNOWN')) return { status: 'UNKNOWN', reasons: ['artifact snapshot could not be read completely'] };
  const reasons = [];
  if (recordSnapshot.gitHead && currentSnapshot.gitHead && recordSnapshot.gitHead !== currentSnapshot.gitHead) reasons.push(`Git HEAD changed from ${recordSnapshot.gitHead} to ${currentSnapshot.gitHead}`);
  if (recordSnapshot.dirtyHash && currentSnapshot.dirtyHash && recordSnapshot.dirtyHash !== currentSnapshot.dirtyHash) reasons.push('uncommitted workspace fingerprint changed');
  if (recordSnapshot.indexHash && currentSnapshot.indexHash && recordSnapshot.indexHash !== currentSnapshot.indexHash) reasons.push('Git index changed');
  for (const [file, recorded] of Object.entries(recordSnapshot.fileHashes ?? {})) {
    const current = currentSnapshot.fileHashes?.[file];
    if (!current || current.sha256 !== recorded.sha256 || current.status !== recorded.status) reasons.push(`artifact file changed: ${file}`);
  }
  if (reasons.length) return { status: 'STALE', reasons };
  const comparable = recordSnapshot.gitHead
    ? Boolean(currentSnapshot.gitHead && recordSnapshot.dirtyHash && currentSnapshot.dirtyHash)
    : Object.values(recordSnapshot.fileHashes ?? {}).length > 0 && Object.values(recordSnapshot.fileHashes).every(file => file.status === 'PRESENT' && file.sha256);
  return comparable ? { status: 'MATCH', reasons: ['recorded artifact snapshot matches the observed workspace'] } : { status: 'UNKNOWN', reasons: ['no comparable artifact version or file fingerprint'] };
}

async function applicability(projectRoot, anchor, record, request) {
  if (!record) return { status: 'UNKNOWN', reasons: ['Final Verification Record is missing'] };
  const reasons = [];
  if (record.contractRevision !== anchor.contractRevision) reasons.push(`record uses contract revision ${record.contractRevision}; current revision is ${anchor.contractRevision}`);
  if (typeof request.currentArtifactVersion === 'string' && request.currentArtifactVersion !== record.artifactVersion) reasons.push(`record uses artifact ${record.artifactVersion}; current artifact is ${request.currentArtifactVersion}`);
  if (typeof request.environment === 'string' && request.environment !== record.environment) reasons.push(`record uses environment ${record.environment}; current environment is ${request.environment}`);
  const artifactSnapshot = request.currentSnapshot ?? await captureSnapshot(projectRoot, { artifactFiles: Object.keys(record.artifactSnapshot?.fileHashes ?? {}) });
  const snapshot = compareSnapshots(record.artifactSnapshot, artifactSnapshot);
  if (snapshot.status === 'STALE') reasons.push(...snapshot.reasons);
  if (reasons.length) return { status: 'STALE', reasons, observedSnapshot: artifactSnapshot };
  if (snapshot.status === 'UNKNOWN') return { status: 'UNKNOWN', reasons: snapshot.reasons, observedSnapshot: artifactSnapshot };
  if (typeof request.environment !== 'string' || !request.environment.trim()) return { status: 'UNKNOWN', reasons: ['Target environment was not supplied; historical environment is not proof of the current target'], observedSnapshot: artifactSnapshot };
  return { status: 'MATCH', reasons: ['contract revision, artifact snapshot, and requested environment match'], observedSnapshot: artifactSnapshot };
}

function boundaryContains(ref, event) {
  if (Number.isSafeInteger(ref.turnStart) && Number.isSafeInteger(ref.turnEnd) && Number.isSafeInteger(event.turn)) return event.turn >= ref.turnStart && event.turn <= ref.turnEnd;
  if (ref.eventStart && ref.eventEnd && (event.eventId || event.id)) {
    const id = String(event.eventId ?? event.id);
    return id >= String(ref.eventStart) && id <= String(ref.eventEnd);
  }
  if (ref.eventStart && ref.eventEnd && event.timestamp) return String(event.timestamp) >= String(ref.eventStart) && String(event.timestamp) <= String(ref.eventEnd);
  return false;
}

function activity(event) {
  const rawKind = text(event?.kind).toLowerCase();
  return {
    kind: ACTIVITY_KINDS.get(rawKind) ?? 'UNOBSERVED',
    eventId: text(event?.eventId ?? event?.id, 'unknown'),
    turn: Number.isSafeInteger(event?.turn) ? event.turn : undefined,
    timestamp: text(event?.timestamp),
  };
}

async function projectSessions(anchor, projectRoot) {
  const refs = array(anchor?.sessionRefs);
  if (refs.length === 0) return { status: 'UNMAPPED', refs: [], message: 'No explicit declared Session Ref is attached to this Task Anchor' };
  const projected = await Promise.all(refs.map(async ref => {
    const base = { host: ref.host, sessionId: ref.sessionId, basis: ref.basis, boundary: null, activities: [] };
    const hasTurnBoundary = Number.isSafeInteger(ref.turnStart) && Number.isSafeInteger(ref.turnEnd);
    const hasEventBoundary = Boolean(ref.eventStart && ref.eventEnd);
    if (hasTurnBoundary) base.boundary = { type: 'turn', start: ref.turnStart, end: ref.turnEnd };
    else if (hasEventBoundary) base.boundary = { type: 'event', start: ref.eventStart, end: ref.eventEnd };
    if (base.boundary) base.message = `${base.boundary.type} ${base.boundary.start} to ${base.boundary.end}, inclusive`;
    if (!base.boundary) {
      base.status = 'DECLARED_UNBOUNDED';
      base.message = 'Session is explicitly referenced, but no task event boundary is available';
      return base;
    }
    if (ref.host !== 'codex') return { ...base, status: 'UNSUPPORTED', message: 'V1 supports Codex only' };
    const source = await readCodexSource(ref, projectRoot);
    if (source.status !== 'OK') return { ...base, status: source.status, message: source.message };
    const events = source.events;
    let selected;
    if (hasTurnBoundary) {
      if (ref.turnStart > ref.turnEnd || !events.some(event => event.turn === ref.turnStart) || !events.some(event => event.turn === ref.turnEnd)) return { ...base, status: 'INVALID_BOUNDARY', message: 'Turn boundaries do not exist in the source' };
      selected = events.filter(event => boundaryContains(ref, event));
    } else {
      const start = events.findIndex(event => String(event.eventId) === String(ref.eventStart));
      const end = events.findIndex(event => String(event.eventId) === String(ref.eventEnd));
      if (start < 0 || end < start) return { ...base, status: 'INVALID_BOUNDARY', message: 'Event endpoints are missing or reversed' };
      selected = events.slice(start, end + 1);
    }
    base.activities = selected.filter(event => event.activity).map(activity);
    base.status = base.activities.length ? 'PROJECTED' : 'NO_EVENTS_IN_BOUNDARY';
    if (base.activities.some(item => item.kind === 'UNOBSERVED')) base.message += '; unknown event formats remain UNOBSERVED';
    return base;
  }));
  return { status: 'DECLARED', refs: projected, message: 'Only explicitly declared Session Refs are considered' };
}

async function auditSummary(paths, record, contract) {
  if (!paths) return { present: false, status: 'MISSING', extras: [], conflicts: [] };
  const content = await readTextFile(paths.audit);
  if (content === null) return { present: false, status: 'MISSING', extras: [], conflicts: [] };
  const decisions = parseMarkdownTable(content, 'Decisions');
  const harness = parseMarkdownTable(content, 'Harness');
  const artifacts = parseMarkdownTable(content, 'Artifacts');
  const verification = parseMarkdownTable(content, 'Verification');
  const outcomes = parseMarkdownTable(content, 'Outcome');
  const learning = parseMarkdownTable(content, 'Learning');
  const auditChecks = latestBy(verification, 1);
  const conflicts = [];
  const auditTask = content.match(/^- Task ID: (.+)$/m)?.[1]?.trim();
  if (auditTask && auditTask !== paths.taskId) conflicts.push('Audit task ID differs from the selected Task Anchor');
  const auditGoal = content.match(/### Goal\r?\n([^\r\n]+)/)?.[1]?.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  if (auditGoal && contract?.goal && auditGoal !== contract.goal) conflicts.push('Audit goal differs from the current contract');
  const auditAcceptance = parseMarkdownTable(content, 'Contract');
  if (auditAcceptance.length && contract?.acceptance) {
    for (const item of contract.acceptance) {
      if (!auditAcceptance.some(row => row[0] === item.id && row[1] === item.text)) conflicts.push(`Audit acceptance differs from the current contract: ${item.id}`);
    }
  }
  for (const check of array(record?.checks).filter(isObject)) {
    const auditCheck = auditChecks.get(check.checkId);
    if (auditCheck && auditCheck[6] && auditCheck[6] !== check.result) conflicts.push(`Audit result for ${check.checkId} is ${auditCheck[6]}, structured Verify result is ${check.result}`);
  }
  const auditVerdict = outcomes.at(-1)?.[2];
  const auditVersion = outcomes.at(-1)?.[3];
  if (auditVersion && record?.artifactVersion && auditVersion !== record.artifactVersion) conflicts.push('Audit artifact version differs from structured Verify');
  if (auditVerdict && record?.recordedVerdict && auditVerdict !== record.recordedVerdict) conflicts.push(`Audit verdict is ${auditVerdict}, structured Verify verdict is ${record.recordedVerdict}`);
  return {
    present: true,
    status: conflicts.length ? 'CONFLICT' : 'OK',
    format: content.match(/<!--\s*([^>]+)\s*-->/)?.[1] ?? 'legacy audit',
    trace: {
      host: redact(content.match(/^- Host: (.+)$/m)?.[1] ?? 'unknown'),
      reference: redact(content.match(/^- Reference: (.+)$/m)?.[1] ?? 'unknown'),
      observedBoundary: redact(content.match(/^- Observed Boundary: (.+)$/m)?.[1] ?? 'unknown'),
    },
    extras: {
      decisions: decisions.length,
      harness: harness.length,
      artifacts: artifacts.length,
      verification: verification.length,
      outcomes: outcomes.length,
      learning: learning.length,
    },
    conflicts,
    details: { decisions, harness, learning },
  };
}

function safeLink(location) {
  if (isRemote(location)) return `<a href="${html(location)}" rel="noreferrer">${html(location)}</a>`;
  return `<code>${html(location)}</code>`;
}

function renderChecks(report) {
  const checks = array(report.verification?.checks);
  if (!checks.length) return '<p>No structured checks were recorded.</p>';
  const rows = checks.map(check => {
    const evidence = array(report.evidence).filter(item => item.checkId === check.checkId).map(item => `${html(item.status)}${item.bound ? ' (bound)' : ''}${item.supportsClaim ? ' (supports claim)' : ''}`).join('<br>') || 'none';
    return `<tr><td>${html(check.checkId)}<br>${html(check.operation)}</td><td>${html(array(check.acceptanceIds).join(', ') || 'invariant')}</td><td>${html(check.result)}</td><td>${check.required ? 'yes' : 'no'}</td><td>${evidence}</td><td>${html(check.reason || '')}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Check</th><th>Acceptance</th><th>Result</th><th>Required</th><th>Evidence</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderEvidence(report) {
  const evidence = array(report.evidence);
  if (!evidence.length) return '<p>No evidence references were recorded.</p>';
  const rows = evidence.map(item => `<tr><td>${html(item.checkId)}</td><td>${html(item.source)}</td><td>${safeLink(item.location)}</td><td>${html(item.status)}</td><td>${item.referenced ? 'yes' : 'no'}</td><td>${item.bound ? 'yes' : 'no'}</td><td>${item.supportsClaim ? 'yes' : 'no'}</td><td>${html(item.reason)}</td></tr>`).join('');
  return `<table><thead><tr><th>Check</th><th>Source</th><th>Location</th><th>Status</th><th>Referenced</th><th>Bound</th><th>Supports claim</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderSessions(report) {
  const refs = array(report.sessions?.refs);
  if (!refs.length) return `<p>${html(report.sessions?.message || 'No Session Ref.')}</p>`;
  const rows = refs.map(ref => `<tr><td>${html(ref.host)}</td><td>${html(ref.sessionId)}</td><td>${html(ref.basis)}</td><td>${html(ref.status)}</td><td>${html(ref.message || '')}</td><td>${array(ref.activities).map(item => html(`${item.kind}:${item.eventId}`)).join('<br>')}</td></tr>`).join('');
  return `<table><thead><tr><th>Host</th><th>Session</th><th>Basis</th><th>Status</th><th>Boundary</th><th>Projected activities</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderHtml(report) {
  const contract = report.contract;
  const acceptance = array(contract?.acceptance).map(item => `<tr><td>${html(item.id)}</td><td>${html(item.text)}</td><td>${item.required ? 'yes' : 'no'}</td></tr>`).join('');
  const audit = report.audit;
  const auditText = audit.present
    ? `<p>Format: <code>${html(audit.format)}</code>. Decisions: ${audit.extras.decisions}. Harness entries: ${audit.extras.harness}. Artifacts: ${audit.extras.artifacts}. Verification rows: ${audit.extras.verification}. Learning rows: ${audit.extras.learning}.</p>${audit.conflicts.length ? `<ul>${audit.conflicts.map(item => `<li>${html(item)}</li>`).join('')}</ul>` : '<p>No Audit conflicts.</p>'}`
    : '<p>No Audit was found. The core Task Anchor and Verification view remains available.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nimo Inspector: ${html(report.taskId || 'missing task')}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1180px;margin:2rem auto;padding:0 1rem;color:#1f2937}h1{margin-bottom:.25rem}h2{margin-top:2rem;border-bottom:1px solid #d1d5db;padding-bottom:.25rem}table{border-collapse:collapse;width:100%;margin:.75rem 0 1.25rem}th,td{border:1px solid #d1d5db;padding:.45rem;text-align:left;vertical-align:top}th{background:#f3f4f6}code{background:#f3f4f6;padding:.1rem .25rem} .status{font-weight:700} .stale{color:#b91c1c}.match{color:#047857}.unknown{color:#92400e}small{color:#6b7280}</style></head>
<body><h1>Nimo Inspector</h1><p>Task: <code>${html(report.taskId || 'missing')}</code>. Selection: ${html(report.selection.reason)}.</p>
<p>Generated at <code>${html(report.generatedAt)}</code>. This is an offline snapshot and does not update automatically.</p>
<h2>Recorded conclusion</h2><p>Recorded verdict: <span class="status">${html(report.verification?.recordedVerdict || 'MISSING')}</span>. Current applicability: <span class="status ${html((report.applicability?.status || '').toLowerCase())}">${html(report.applicability?.status || 'UNKNOWN')}</span>.</p><p>${html(array(report.applicability?.reasons).join(' ') || 'No applicability reason was recorded.')}</p>
<h2>Current conclusion</h2><p class="status">${html(report.currentVerdict || 'UNVERIFIED')}</p><ul>${array(report.currentReasons).map(reason => `<li>${html(reason)}</li>`).join('')}</ul>
<p>Artifact: <code>${html(report.verification?.artifactVersion || 'unknown')}</code>. Recorded environment: ${html(report.verification?.environment || 'unknown')}. Verified at: ${html(report.verification?.verifiedAt || 'unknown')}.</p>
<p>Observed Git HEAD: <code>${html(report.applicability?.observedSnapshot?.gitHead || 'unavailable')}</code>. Observed differences: <code>${html(report.applicability?.observedSnapshot?.dirtyHash || 'unavailable')}</code>.</p>
<h2>Contract revision ${html(contract?.revision ?? 'unknown')}</h2><p>${html(contract?.goal || 'Task Anchor is missing.')}</p><p>Scope: ${html(array(contract?.scope).join(', '))}. Verification contract revision: ${html(report.verification?.contractRevision ?? 'unknown')}.</p><table><thead><tr><th>Acceptance</th><th>Text</th><th>Required</th></tr></thead><tbody>${acceptance || '<tr><td colspan="3">No contract is available.</td></tr>'}</tbody></table>
<h2>Verification checks</h2>${renderChecks(report)}
<h2>User skip declarations</h2><ul>${array(report.verification?.skipDeclarations).map(skip => `<li>${html(skip.checkId)}: ${html(skip.reason)}. Source: ${html(skip.source)}. Task: ${html(skip.taskId)}. Artifact: ${html(skip.artifactVersion)}. Environment: ${html(skip.environment)}.</li>`).join('') || '<li>None</li>'}</ul>
<h2>Evidence layers</h2>${renderEvidence(report)}
<h2>Codex Session</h2>${renderSessions(report)}
<h2>Audit extras</h2>${auditText}
${audit.present ? `<p>Trace host: ${html(audit.trace?.host)}. Reference: ${html(audit.trace?.reference)}. Observed boundary: ${html(audit.trace?.observedBoundary)}.</p>` : ''}
${audit.present ? Object.entries(audit.details ?? {}).map(([kind, rows]) => `<h3>${html(kind)}</h3><ul>${rows.map(row => `<li>${row.map(html).join(' | ')}</li>`).join('')}</ul>`).join('') : ''}
<h2>Observation boundary</h2><p>${html(report.sessions?.message || 'No Session source was observed.')}</p><small>Inspector reads structured records and metadata. It does not replay validation or copy transcripts, tool payloads, or hidden reasoning.</small>
</body></html>`;
}

export async function inspect(request) {
  const projectRoot = absoluteProjectRoot(request.projectRoot);
  const selection = await selectTask(request, projectRoot);
  const generatedAt = text(request.generatedAt, new Date().toISOString());
  let report = {
    schemaVersion: 1,
    generatedAt,
    projectRoot: '[project root]',
    taskId: selection.taskId,
    selection: { reason: selection.reason },
    status: selection.anchor ? 'OK' : 'MISSING_ANCHOR',
    contract: null,
    verification: null,
    applicability: { status: 'UNKNOWN', reasons: ['Task Anchor is missing'] },
    evidence: [],
    sessions: { status: 'UNMAPPED', refs: [], message: 'Task Anchor is missing' },
    audit: { present: false, status: 'MISSING', extras: {}, conflicts: [] },
  };
  if (selection.anchor) {
    const contract = currentContract(selection.anchor);
    const record = selection.paths ? await loadVerification(projectRoot, selection.taskId) : null;
    const validation = record ? evaluateRecord(record, selection.anchor) : { ok: false, errors: ['Final Verification Record is missing'], warnings: [], derivedVerdict: 'UNVERIFIED' };
    report.contract = projectContract(contract);
    const recordContract = selection.anchor.contractRevisions.find(item => item.revision === record?.contractRevision) ?? contract;
    report.verification = projectVerification(record, validation, recordContract);
    report.evidence = await inspectEvidence(projectRoot, record);
    report.applicability = await applicability(projectRoot, selection.anchor, record, request);
    report.sessions = await projectSessions(selection.anchor, projectRoot);
    try { report.audit = await auditSummary(selection.paths, record, contract); }
    catch { report.audit = { present: false, status: 'UNAVAILABLE', extras: {}, conflicts: [] }; }
    if (!validation.ok) report.status = ['VERIFIED', 'PASS_WITH_SKIPS'].includes(record?.recordedVerdict) ? 'INVALID_RECORD' : 'UNVERIFIED';
    const evidenceMissing = array(record?.checks).filter(isObject).filter(check => check.result === 'PASS').some(check => !report.evidence.some(item => item.checkId === check.checkId && item.bound));
    report.currentVerdict = report.applicability.status === 'MATCH' && validation.ok && !evidenceMissing ? record.recordedVerdict : 'UNVERIFIED';
    report.currentReasons = [...validation.errors, ...(evidenceMissing ? ['At least one PASS has no currently accessible content-bound evidence'] : [])];
  }
  const target = await outputPath(projectRoot, request.output, `.nimo/inspector/${selection.taskId || 'missing'}.html`);
  const reportRoot = path.join(projectRoot, '.nimo', 'inspector');
  if (!inside(reportRoot, target) || path.extname(target).toLowerCase() !== '.html') fail('INVALID_REPORT_OUTPUT', 'Report output must be an HTML file inside .nimo/inspector');
  report.htmlPath = target;
  await atomicWrite(target, renderHtml(report));
  return { status: report.status === 'OK' ? 'OK' : 'WARN', changed: true, data: report, diagnostics: report.status === 'OK' ? [] : [{ code: report.status, message: 'Inspector report was generated with missing or invalid data', severity: 'WARN' }] };
}

export async function run(request) {
  try {
    return await inspect(request);
  } catch (error) {
    return { status: 'ERROR', changed: false, data: null, diagnostics: [serializeError(error)], errorCode: error.code ?? 'UNEXPECTED_ERROR' };
  }
}

async function cli() {
  const index = process.argv.indexOf('--input');
  if (index < 0 || !process.argv[index + 1]) {
    process.stdout.write(JSON.stringify({ status: 'ERROR', changed: false, data: null, diagnostics: [{ code: 'USAGE', message: 'Use --input <request.json>' }] }) + '\n');
    process.exitCode = 2;
    return;
  }
  const request = JSON.parse(await fs.readFile(path.resolve(process.argv[index + 1]), 'utf8'));
  const result = await run(request);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === 'OK' || result.status === 'WARN' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli();
