import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RECORD_SCHEMA_VERSION,
  TASK_ID,
  absoluteProjectRoot,
  captureSnapshot,
  fail,
  isObject,
  readJsonFile,
  requiredText,
  serializeError,
  taskPaths,
  withTaskLock,
  writeJsonRecord,
} from './lib/task-records.mjs';

function time(request, field = 'time') {
  return typeof request[field] === 'string' && request[field].trim()
    ? request[field].trim()
    : new Date().toISOString();
}

function integer(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) fail('INVALID_INPUT', `${label} must be an integer >= ${minimum}`);
  return value;
}

function stringArray(value, label, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.some(item => typeof item !== 'string' || !item.trim())) {
    fail('INVALID_INPUT', `${label} must be a ${allowEmpty ? '' : 'non-empty '}string array`);
  }
  return [...new Set(value.map(item => item.trim()))];
}

function acceptanceList(value) {
  if (!Array.isArray(value) || value.length === 0) fail('INVALID_INPUT', 'acceptance must be a non-empty array');
  const ids = new Set();
  return value.map(item => {
    if (!isObject(item)) fail('INVALID_INPUT', 'acceptance entries must be objects');
    const id = requiredText(item.id, 'acceptance.id');
    if (ids.has(id)) fail('DUPLICATE_ACCEPTANCE', `Duplicate acceptance id ${id}`);
    ids.add(id);
    if (typeof item.required !== 'boolean') fail('INVALID_INPUT', `acceptance ${id} requires a boolean required field`);
    return { id, text: requiredText(item.text, `acceptance ${id}.text`), required: item.required };
  });
}

function contractInput(request) {
  const contract = isObject(request.contract) ? request.contract : request;
  return {
    goal: requiredText(contract.goal, 'goal'),
    scope: stringArray(contract.scope, 'scope'),
    acceptance: acceptanceList(contract.acceptance),
    confirmedBy: requiredText(contract.confirmedBy ?? request.confirmedBy, 'confirmedBy'),
    confirmedAt: typeof contract.confirmedAt === 'string' && contract.confirmedAt.trim()
      ? contract.confirmedAt.trim()
      : time(request),
  };
}

function contractRevision(revision, request) {
  return {
    revision,
    goal: request.goal,
    scope: request.scope,
    acceptance: request.acceptance,
    confirmedBy: request.confirmedBy,
    confirmedAt: request.confirmedAt,
  };
}

function boundaryPair(value, start, end) {
  const hasStart = value[start] !== undefined;
  const hasEnd = value[end] !== undefined;
  if (hasStart !== hasEnd) fail('INVALID_SESSION_REF', `${start} and ${end} must be provided together`);
  if (!hasStart) return;
  if (typeof value[start] !== 'string' && !Number.isSafeInteger(value[start])) fail('INVALID_SESSION_REF', `${start} must be a string or integer`);
  if (typeof value[end] !== 'string' && !Number.isSafeInteger(value[end])) fail('INVALID_SESSION_REF', `${end} must be a string or integer`);
}

function normalizeSessionRef(value) {
  if (!isObject(value)) fail('INVALID_SESSION_REF', 'sessionRef must be an object');
  const ref = {
    host: requiredText(value.host, 'sessionRef.host'),
    sessionId: requiredText(value.sessionId, 'sessionRef.sessionId'),
    basis: requiredText(value.basis ?? 'declared', 'sessionRef.basis'),
  };
  if (ref.basis !== 'declared') fail('SESSION_BASIS_UNSUPPORTED', 'V1 only accepts basis=declared');
  for (const key of ['workspace', 'source']) if (value[key] !== undefined) ref[key] = requiredText(value[key], `sessionRef.${key}`);
  boundaryPair(value, 'turnStart', 'turnEnd');
  boundaryPair(value, 'eventStart', 'eventEnd');
  for (const key of ['turnStart', 'turnEnd', 'eventStart', 'eventEnd']) if (value[key] !== undefined) ref[key] = value[key];
  return ref;
}

function sessionKey(ref) {
  return JSON.stringify([
    ref.host, ref.sessionId, ref.basis, ref.workspace ?? '', ref.turnStart ?? null,
    ref.turnEnd ?? null, ref.eventStart ?? null, ref.eventEnd ?? null,
  ]);
}

function normalizeSnapshot(value) {
  if (!isObject(value)) fail('INVALID_BASELINE', 'baseline must be an object');
  const snapshotStatus = value.snapshotStatus ?? 'AVAILABLE';
  if (!['AVAILABLE', 'UNKNOWN'].includes(snapshotStatus)) fail('INVALID_BASELINE', 'baseline.snapshotStatus must be AVAILABLE or UNKNOWN');
  const normalizeRelative = (entry, label, rejectRuntime = true) => {
    if (typeof entry !== 'string' || entry.length === 0) fail('INVALID_BASELINE', `${label} must be a non-empty path`);
    const normalized = entry.replaceAll('\\', '/').replace(/^\.\//, '');
    if (path.isAbsolute(entry) || normalized.split('/').includes('..') || normalized === '.nimo/tasks' || normalized.startsWith('.nimo/tasks/') || (rejectRuntime && (normalized === '.nimo/inspector' || normalized.startsWith('.nimo/inspector/')))) {
      fail('INVALID_BASELINE', `${label} escapes the artifact scope: ${entry}`);
    }
    return normalized;
  };
  const snapshot = {
    source: requiredText(value.source ?? 'unknown', 'baseline.source'),
    snapshotStatus,
    gitHead: typeof value.gitHead === 'string' && value.gitHead.trim() ? value.gitHead.trim() : null,
    dirtyHash: typeof value.dirtyHash === 'string' && value.dirtyHash.trim() ? value.dirtyHash.trim() : null,
    indexHash: typeof value.indexHash === 'string' && value.indexHash.trim() ? value.indexHash.trim() : null,
    dirtyPaths: Array.isArray(value.dirtyPaths) ? [...new Set(value.dirtyPaths.map(item => normalizeRelative(item, 'baseline.dirtyPaths entry')))] : [],
    fileHashes: {},
  };
  if (value.fileHashes !== undefined) {
    if (!isObject(value.fileHashes)) fail('INVALID_BASELINE', 'baseline.fileHashes must be an object');
    for (const [file, fingerprint] of Object.entries(value.fileHashes)) {
      if (!isObject(fingerprint)) fail('INVALID_BASELINE', `baseline.fileHashes.${file} must be an object`);
      const normalizedFile = normalizeRelative(file, `baseline.fileHashes.${file}`, false);
      if (!['MISSING', 'PRESENT', 'DIRECTORY', 'UNSUPPORTED'].includes(fingerprint.status)) fail('INVALID_BASELINE', `baseline.fileHashes.${file}.status is invalid`);
      if (fingerprint.status === 'PRESENT' && (typeof fingerprint.sha256 !== 'string' || !fingerprint.sha256.trim())) fail('INVALID_BASELINE', `baseline.fileHashes.${file} needs sha256`);
      if (fingerprint.size !== undefined && (!Number.isSafeInteger(fingerprint.size) || fingerprint.size < 0)) fail('INVALID_BASELINE', `baseline.fileHashes.${file}.size must be a non-negative integer`);
      snapshot.fileHashes[normalizedFile] = { ...fingerprint };
    }
  }
  return snapshot;
}

export function validateAnchor(anchor, expectedTaskId) {
  if (!isObject(anchor) || anchor.schemaVersion !== RECORD_SCHEMA_VERSION) fail('INVALID_ANCHOR', 'Unsupported Task Anchor schema');
  if (typeof anchor.taskId !== 'string' || !TASK_ID.test(anchor.taskId)) fail('INVALID_ANCHOR', 'Task Anchor has an invalid taskId');
  if (expectedTaskId && anchor.taskId !== expectedTaskId) fail('ANCHOR_TASK_MISMATCH', 'Task Anchor taskId does not match its path');
  integer(anchor.contractRevision, 'contractRevision', 1);
  if (typeof anchor.createdAt !== 'string' || !anchor.createdAt.trim()) fail('INVALID_ANCHOR', 'Task Anchor createdAt is required');
  if (typeof anchor.updatedAt !== 'string' || !anchor.updatedAt.trim()) fail('INVALID_ANCHOR', 'Task Anchor updatedAt is required');
  if (!Array.isArray(anchor.contractRevisions) || anchor.contractRevisions.length === 0) fail('INVALID_ANCHOR', 'Task Anchor contractRevisions is required');
  const revisionIds = new Set();
  for (const revision of anchor.contractRevisions) {
    if (!isObject(revision)) fail('INVALID_ANCHOR', 'Contract revisions must be objects');
    integer(revision.revision, 'contract revision', 1);
    if (revisionIds.has(revision.revision)) fail('DUPLICATE_REVISION', `Duplicate contract revision ${revision.revision}`);
    revisionIds.add(revision.revision);
    requiredText(revision.goal, 'contract revision goal');
    stringArray(revision.scope, 'contract revision scope');
    acceptanceList(revision.acceptance);
    requiredText(revision.confirmedBy, 'contract revision confirmedBy');
    requiredText(revision.confirmedAt, 'contract revision confirmedAt');
  }
  const latest = anchor.contractRevisions.at(-1);
  if (latest.revision !== anchor.contractRevision) fail('INVALID_ANCHOR', 'contractRevision must point to the latest revision');
  normalizeSnapshot(anchor.baseline);
  if (!Array.isArray(anchor.sessionRefs)) fail('INVALID_ANCHOR', 'sessionRefs must be an array');
  const sessionRefs = new Set();
  for (const value of anchor.sessionRefs) {
    const ref = normalizeSessionRef(value);
    const key = sessionKey(ref);
    if (sessionRefs.has(key)) fail('DUPLICATE_SESSION_REF', `Duplicate session reference ${ref.host}/${ref.sessionId}`);
    sessionRefs.add(key);
  }
  return anchor;
}

async function baselineFor(request, projectRoot) {
  if (request.baseline !== undefined) return normalizeSnapshot(request.baseline);
  return captureSnapshot(projectRoot, { artifactFiles: request.artifactFiles ?? [] });
}

function contractSignature(revision) {
  return JSON.stringify({
    goal: revision.goal,
    scope: revision.scope,
    acceptance: revision.acceptance,
  });
}

async function initialize(request) {
  const projectRoot = absoluteProjectRoot(request.projectRoot);
  const taskId = requiredText(request.taskId, 'taskId');
  if (!TASK_ID.test(taskId)) fail('INVALID_TASK_ID', 'taskId must match [a-z0-9][a-z0-9._-]{0,63}');
  const paths = await taskPaths(projectRoot, taskId);
  const input = contractInput(request);
  return withTaskLock(paths, async () => {
    const existing = await readJsonFile(paths.anchor);
    if (existing !== null) {
      validateAnchor(existing, taskId);
      const current = existing.contractRevisions.at(-1);
      const expected = contractRevision(existing.contractRevision, input);
      if (contractSignature(current) !== contractSignature(expected)) {
        fail('ANCHOR_CONTRACT_MISMATCH', 'Existing Task Anchor has a different contract; use revise with an expected revision');
      }
      return { status: 'OK', changed: false, data: existing, diagnostics: [] };
    }
    const createdAt = time(request, 'createdAt');
    const anchor = {
      schemaVersion: RECORD_SCHEMA_VERSION,
      taskId,
      createdAt,
      updatedAt: createdAt,
      contractRevision: 1,
      contractRevisions: [contractRevision(1, input)],
      baseline: await baselineFor(request, projectRoot),
      sessionRefs: (request.sessionRefs ?? []).map(normalizeSessionRef),
    };
    validateAnchor(anchor, taskId);
    await writeJsonRecord(paths.anchor, anchor);
    return { status: 'OK', changed: true, data: anchor, diagnostics: [] };
  });
}

async function revise(request) {
  const projectRoot = absoluteProjectRoot(request.projectRoot);
  const taskId = requiredText(request.taskId, 'taskId');
  const paths = await taskPaths(projectRoot, taskId);
  const input = contractInput(request);
  const expectedRevision = integer(request.expectedRevision, 'expectedRevision', 1);
  return withTaskLock(paths, async () => {
    const anchor = await readJsonFile(paths.anchor);
    if (anchor === null) fail('ANCHOR_MISSING', `Task Anchor does not exist: ${paths.anchor}`);
    validateAnchor(anchor, taskId);
    if (anchor.contractRevision !== expectedRevision) fail('REVISION_CONFLICT', 'Task Anchor changed; reread before revising');
    const current = anchor.contractRevisions.at(-1);
    const next = contractRevision(expectedRevision + 1, input);
    if (contractSignature(current) === contractSignature(next)) return { status: 'OK', changed: false, data: anchor, diagnostics: [] };
    const updated = {
      ...anchor,
      updatedAt: time(request),
      contractRevision: expectedRevision + 1,
      contractRevisions: [...anchor.contractRevisions, next],
    };
    validateAnchor(updated, taskId);
    await writeJsonRecord(paths.anchor, updated);
    return { status: 'OK', changed: true, data: updated, diagnostics: [] };
  });
}

async function addSessionRef(request) {
  const projectRoot = absoluteProjectRoot(request.projectRoot);
  const taskId = requiredText(request.taskId, 'taskId');
  const paths = await taskPaths(projectRoot, taskId);
  const ref = normalizeSessionRef(request.sessionRef ?? request);
  const expectedRevision = request.expectedRevision === undefined ? null : integer(request.expectedRevision, 'expectedRevision', 1);
  return withTaskLock(paths, async () => {
    const anchor = await readJsonFile(paths.anchor);
    if (anchor === null) fail('ANCHOR_MISSING', `Task Anchor does not exist: ${paths.anchor}`);
    validateAnchor(anchor, taskId);
    if (expectedRevision !== null && anchor.contractRevision !== expectedRevision) fail('REVISION_CONFLICT', 'Task Anchor changed; reread before adding a session reference');
    const key = sessionKey(ref);
    if (anchor.sessionRefs.some(item => sessionKey(item) === key)) return { status: 'OK', changed: false, data: anchor, diagnostics: [] };
    const updated = { ...anchor, updatedAt: time(request), sessionRefs: [...anchor.sessionRefs, ref] };
    validateAnchor(updated, taskId);
    await writeJsonRecord(paths.anchor, updated);
    return { status: 'OK', changed: true, data: updated, diagnostics: [] };
  });
}

async function readAnchor(request) {
  const paths = await taskPaths(absoluteProjectRoot(request.projectRoot), requiredText(request.taskId, 'taskId'));
  const anchor = await readJsonFile(paths.anchor);
  if (anchor === null) return { status: 'MISSING', changed: false, data: { file: paths.anchor }, diagnostics: ['Task Anchor is missing'] };
  validateAnchor(anchor, paths.taskId);
  return { status: 'OK', changed: false, data: anchor, diagnostics: [] };
}

async function dispatch(request) {
  if (!isObject(request)) fail('INVALID_INPUT', 'Expected an object');
  const operation = requiredText(request.operation, 'operation');
  if (operation === 'init') return initialize(request);
  if (operation === 'revise') return revise(request);
  if (operation === 'session-ref') return addSessionRef(request);
  if (operation === 'read') return readAnchor(request);
  fail('INVALID_OPERATION', `Unsupported operation ${operation}`);
}

export async function run(request) {
  try {
    return await dispatch(request);
  } catch (error) {
    return { status: 'ERROR', changed: false, data: null, diagnostics: [serializeError(error)], errorCode: error.code ?? 'UNEXPECTED_ERROR' };
  }
}

export async function loadAnchor(projectRoot, taskId) {
  const paths = await taskPaths(projectRoot, taskId);
  const anchor = await readJsonFile(paths.anchor);
  if (anchor === null) return null;
  validateAnchor(anchor, taskId);
  return anchor;
}

export function currentContract(anchor) {
  validateAnchor(anchor, anchor.taskId);
  return anchor.contractRevisions.at(-1);
}

export { normalizeSessionRef, normalizeSnapshot };

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
  process.exitCode = result.status === 'OK' ? 0 : result.status === 'MISSING' ? 2 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli();
