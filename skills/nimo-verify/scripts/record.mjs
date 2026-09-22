import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHECK_RESULTS,
  RECORD_SCHEMA_VERSION,
  VERDICTS,
  captureSnapshot,
  fail,
  isObject,
  readJsonFile,
  requiredText,
  serializeError,
  taskPaths,
  withTaskLock,
  writeJsonRecord,
} from '../../nimo-mode/scripts/lib/task-records.mjs';
import { normalizeSnapshot, validateAnchor } from '../../nimo-mode/scripts/task-anchor.mjs';

function time(request) {
  return typeof request.time === 'string' && request.time.trim() ? request.time.trim() : new Date().toISOString();
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

function currentContract(anchor, revision) {
  validateAnchor(anchor, anchor?.taskId);
  const contract = anchor.contractRevisions.find(item => item.revision === revision);
  if (!contract) fail('UNKNOWN_CONTRACT_REVISION', `Unknown contract revision ${revision}`);
  return contract;
}

function acceptanceIndex(contract) {
  const index = new Map();
  for (const item of contract.acceptance) index.set(item.id, item);
  return index;
}

function normalizeEvidence(value, checkId, index) {
  if (typeof value === 'string') {
    return { source: 'provided', location: requiredText(value, `checks.${checkId}.evidence[${index}]`) };
  }
  if (!isObject(value)) fail('INVALID_EVIDENCE', `checks.${checkId}.evidence[${index}] must be an object`);
  const evidence = {
    source: requiredText(value.source, `checks.${checkId}.evidence[${index}].source`),
    location: requiredText(value.location, `checks.${checkId}.evidence[${index}].location`),
  };
  for (const key of ['version', 'sha256', 'summary', 'claim', 'supportsClaim']) {
    if (value[key] !== undefined) {
      if (key === 'supportsClaim') {
        if (typeof value[key] !== 'boolean') fail('INVALID_EVIDENCE', `checks.${checkId}.evidence[${index}].supportsClaim must be boolean`);
        evidence[key] = value[key];
      } else {
        evidence[key] = requiredText(value[key], `checks.${checkId}.evidence[${index}].${key}`);
      }
    }
  }
  return evidence;
}

function normalizeStoredEvidence(value, checkId, index) {
  if (!isObject(value)) fail('INVALID_EVIDENCE', `checks.${checkId}.evidence[${index}] must be an object`);
  return normalizeEvidence(value, checkId, index);
}

function normalizeChecks(value, contract) {
  if (!Array.isArray(value) || value.length === 0) fail('INVALID_CHECKS', 'checks must be a non-empty array');
  const accepted = acceptanceIndex(contract);
  const ids = new Set();
  return value.map(item => {
    if (!isObject(item)) fail('INVALID_CHECK', 'checks entries must be objects');
    const checkId = requiredText(item.checkId ?? item.check, 'checkId');
    if (ids.has(checkId)) fail('DUPLICATE_CHECK', `Duplicate checkId ${checkId}`);
    ids.add(checkId);
    const acceptanceIds = stringArray(item.acceptanceIds ?? [], `checks.${checkId}.acceptanceIds`, true);
    for (const acceptanceId of acceptanceIds) {
      if (!accepted.has(acceptanceId)) fail('UNKNOWN_ACCEPTANCE', `Check ${checkId} references unknown acceptance ${acceptanceId}`);
    }
    const evidence = Array.isArray(item.evidence)
      ? item.evidence.map((entry, index) => normalizeEvidence(entry, checkId, index))
      : [];
    const result = requiredText(item.result, `checks.${checkId}.result`);
    if (!CHECK_RESULTS.has(result)) fail('INVALID_RESULT', `Unsupported result for ${checkId}: ${result}`);
    if (result === 'PASS' && evidence.length === 0) fail('PASS_WITHOUT_EVIDENCE', `PASS check ${checkId} requires evidence`);
    const required = acceptanceIds.some(id => accepted.get(id).required)
      ? true
      : acceptanceIds.length === 0 && item.required === true;
    return {
      checkId,
      acceptanceIds,
      required,
      source: requiredText(item.source, `checks.${checkId}.source`),
      operation: requiredText(item.operation ?? item.verification, `checks.${checkId}.operation`),
      result,
      reason: typeof item.reason === 'string' ? item.reason.trim() : '',
      evidence,
    };
  });
}

function normalizeSkips(value, context) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail('INVALID_SKIPS', 'skipDeclarations must be an array');
  const ids = new Set();
  return value.map(item => {
    if (!isObject(item)) fail('INVALID_SKIP', 'skipDeclarations entries must be objects');
    const checkId = requiredText(item.checkId ?? item.check, 'skipDeclarations.checkId');
    if (ids.has(checkId)) fail('DUPLICATE_SKIP', `Duplicate skip declaration for ${checkId}`);
    ids.add(checkId);
    return {
      checkId,
      source: requiredText(item.source, `skipDeclarations.${checkId}.source`),
      reason: requiredText(item.reason, `skipDeclarations.${checkId}.reason`),
      taskId: requiredText(item.taskId, `skipDeclarations.${checkId}.taskId`),
      artifactVersion: requiredText(item.artifactVersion, `skipDeclarations.${checkId}.artifactVersion`),
      environment: requiredText(item.environment, `skipDeclarations.${checkId}.environment`),
    };
  });
}

function normalizeFailure(value) {
  if (!isObject(value)) fail('INVALID_FAILURE', 'unresolvedFailures entries must be objects');
  const acceptanceIds = value.acceptanceIds === undefined ? [] : stringArray(value.acceptanceIds, 'unresolvedFailures.acceptanceIds', true);
  return {
    checkId: requiredText(value.checkId ?? value.check, 'unresolvedFailures.checkId'),
    taskId: typeof value.taskId === 'string' ? value.taskId.trim() : '',
    contractRevision: Number.isSafeInteger(value.contractRevision) ? value.contractRevision : null,
    acceptanceIds,
    acceptanceSignature: typeof value.acceptanceSignature === 'string' ? value.acceptanceSignature : '',
    source: typeof value.source === 'string' ? value.source.trim() : '',
    operation: typeof value.operation === 'string' ? value.operation.trim() : '',
    artifactVersion: typeof value.artifactVersion === 'string' ? value.artifactVersion.trim() : '',
    environment: typeof value.environment === 'string' ? value.environment.trim() : '',
    reason: requiredText(value.reason, 'unresolvedFailures.reason'),
    firstSeenAt: requiredText(value.firstSeenAt, 'unresolvedFailures.firstSeenAt'),
    lastSeenAt: requiredText(value.lastSeenAt ?? value.firstSeenAt, 'unresolvedFailures.lastSeenAt'),
  };
}

function normalizeResolvedFailure(value, index) {
  if (!isObject(value)) fail('INVALID_RESOLUTION', `resolvedFailures[${index}] must be an object`);
  const acceptanceIds = value.acceptanceIds === undefined
    ? []
    : stringArray(value.acceptanceIds, `resolvedFailures[${index}].acceptanceIds`, true);
  if (!Array.isArray(value.resolutionEvidence) || value.resolutionEvidence.length === 0) {
    fail('INVALID_RESOLUTION', `resolvedFailures[${index}].resolutionEvidence must be a non-empty array`);
  }
  return {
    checkId: requiredText(value.checkId ?? value.check, `resolvedFailures[${index}].checkId`),
    taskId: requiredText(value.taskId, `resolvedFailures[${index}].taskId`),
    contractRevision: integer(value.contractRevision, `resolvedFailures[${index}].contractRevision`, 1),
    acceptanceIds,
    acceptanceSignature: requiredText(value.acceptanceSignature, `resolvedFailures[${index}].acceptanceSignature`),
    operation: requiredText(value.operation, `resolvedFailures[${index}].operation`),
    environment: requiredText(value.environment, `resolvedFailures[${index}].environment`),
    failedArtifactVersion: requiredText(value.failedArtifactVersion, `resolvedFailures[${index}].failedArtifactVersion`),
    resolvedArtifactVersion: requiredText(value.resolvedArtifactVersion, `resolvedFailures[${index}].resolvedArtifactVersion`),
    failedAt: requiredText(value.failedAt, `resolvedFailures[${index}].failedAt`),
    resolvedAt: requiredText(value.resolvedAt, `resolvedFailures[${index}].resolvedAt`),
    resolutionEvidence: value.resolutionEvidence.map((entry, evidenceIndex) =>
      normalizeStoredEvidence(entry, `resolvedFailures[${index}]`, evidenceIndex)),
  };
}

function acceptanceSignature(contract, acceptanceIds) {
  const accepted = new Map(contract.acceptance.map(item => [item.id, item]));
  return JSON.stringify([...new Set(acceptanceIds)].sort().map(id => {
    const item = accepted.get(id);
    return [id, item?.text ?? null, item?.required ?? null];
  }));
}

function failureKey(failure) {
  return JSON.stringify([
    failure.checkId,
    failure.taskId,
    failure.contractRevision,
    [...failure.acceptanceIds].sort(),
    failure.acceptanceSignature,
    failure.source,
    failure.operation,
    failure.artifactVersion,
    failure.environment,
  ]);
}

function sameStringSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function timeAfter(next, previous) {
  const nextTime = Date.parse(next);
  const previousTime = Date.parse(previous);
  if (Number.isFinite(nextTime) && Number.isFinite(previousTime)) return nextTime > previousTime;
  return next > previous;
}

function failureFromCheck(check, context, at, prior) {
  return {
    checkId: check.checkId,
    taskId: context.taskId,
    contractRevision: context.contractRevision,
    acceptanceIds: [...check.acceptanceIds],
    acceptanceSignature: context.acceptanceSignature(check.acceptanceIds),
    source: check.source,
    operation: check.operation,
    artifactVersion: context.artifactVersion,
    environment: context.environment,
    reason: check.reason || 'verification failed',
    firstSeenAt: prior?.firstSeenAt ?? at,
    lastSeenAt: at,
  };
}

function canResolveFailure(failure, check, context, at) {
  return check.result === 'PASS'
    && failure.taskId === context.taskId
    && sameStringSet(failure.acceptanceIds, check.acceptanceIds)
    && failure.acceptanceSignature === context.acceptanceSignature(check.acceptanceIds)
    && failure.operation === check.operation
    && failure.environment === context.environment
    && timeAfter(at, failure.lastSeenAt)
    && Array.isArray(check.evidence)
    && check.evidence.length > 0;
}

function priorFailures(previous) {
  const failures = new Map();
  for (const failure of Array.isArray(previous?.unresolvedFailures) ? previous.unresolvedFailures : []) {
    const normalized = normalizeFailure(failure);
    failures.set(failureKey(normalized), normalized);
  }
  for (const check of Array.isArray(previous?.checks) ? previous.checks : []) {
    if (check?.result !== 'FAIL' || typeof (check.checkId ?? check.check) !== 'string') continue;
    const checkId = check.checkId ?? check.check;
    const fallback = {
      checkId,
      taskId: typeof previous.taskId === 'string' ? previous.taskId.trim() : '',
      contractRevision: Number.isSafeInteger(previous.contractRevision) ? previous.contractRevision : null,
      acceptanceIds: Array.isArray(check.acceptanceIds) ? [...check.acceptanceIds] : [],
      acceptanceSignature: typeof check.acceptanceSignature === 'string' ? check.acceptanceSignature : '',
      source: typeof check.source === 'string' ? check.source.trim() : '',
      operation: typeof check.operation === 'string' ? check.operation.trim() : '',
      artifactVersion: typeof previous.artifactVersion === 'string' ? previous.artifactVersion.trim() : '',
      environment: typeof previous.environment === 'string' ? previous.environment.trim() : '',
      reason: typeof check.reason === 'string' && check.reason.trim() ? check.reason.trim() : 'previous verification failed',
      firstSeenAt: previous.verifiedAt ?? new Date(0).toISOString(),
      lastSeenAt: previous.verifiedAt ?? new Date(0).toISOString(),
    };
    if (![...failures.values()].some(failure => failure.checkId === checkId)) failures.set(failureKey(fallback), fallback);
  }
  return failures;
}

function mergeFailures(previous, checks, context, at) {
  const failures = priorFailures(previous);
  const resolvedFailures = Array.isArray(previous?.resolvedFailures) ? [...previous.resolvedFailures] : [];
  for (const check of checks) {
    if (check.result === 'PASS') {
      for (const [key, failure] of failures) {
        if (failure.checkId !== check.checkId || !canResolveFailure(failure, check, context, at)) continue;
        failures.delete(key);
        resolvedFailures.push({
          checkId: failure.checkId,
          taskId: failure.taskId,
          contractRevision: failure.contractRevision,
          acceptanceIds: [...failure.acceptanceIds],
          acceptanceSignature: failure.acceptanceSignature,
          operation: failure.operation,
          environment: failure.environment,
          failedArtifactVersion: failure.artifactVersion,
          resolvedArtifactVersion: context.artifactVersion,
          failedAt: failure.firstSeenAt,
          resolvedAt: at,
          resolutionEvidence: check.evidence,
        });
      }
    }
    if (check.result === 'FAIL') {
      const probe = failureFromCheck(check, context, at);
      const key = failureKey(probe);
      failures.set(key, failureFromCheck(check, context, at, failures.get(key)));
    }
  }
  return { unresolvedFailures: [...failures.values()], resolvedFailures };
}

function skipIndex(skips) {
  const result = new Map();
  for (const skip of skips) if (isObject(skip) && typeof skip.checkId === 'string') result.set(skip.checkId, skip);
  return result;
}

export function evaluateRecord(record, anchor, options = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(record) || record.schemaVersion !== RECORD_SCHEMA_VERSION) errors.push('Unsupported verification schema');
  try {
    validateAnchor(anchor, isObject(anchor) && typeof anchor.taskId === 'string' ? anchor.taskId : undefined);
  } catch (error) {
    errors.push(`Invalid Task Anchor: ${error.message}`);
    return { ok: false, errors, warnings, derivedVerdict: 'UNVERIFIED', unresolvedFailures: [], requiredAcceptance: new Set(), checkById: new Map() };
  }
  if (!isObject(record)) return { ok: false, errors, warnings, derivedVerdict: 'UNVERIFIED', unresolvedFailures: [], requiredAcceptance: new Set(), checkById: new Map() };
  const taskId = record?.taskId;
  if (taskId !== anchor.taskId) errors.push('Verification taskId does not match Task Anchor');
  const revision = record?.contractRevision;
  const contract = Number.isSafeInteger(revision) ? anchor.contractRevisions.find(item => item.revision === revision) : null;
  if (!contract) errors.push(`Unknown contract revision ${revision}`);
  const recordContext = contract ? {
    taskId: record.taskId,
    contractRevision: revision,
    artifactVersion: typeof record.artifactVersion === 'string' ? record.artifactVersion : '',
    environment: typeof record.environment === 'string' ? record.environment : '',
    acceptanceSignature: acceptanceIds => acceptanceSignature(contract, acceptanceIds),
  } : null;
  const checks = record.checks === undefined ? [] : record.checks;
  const skips = record.skipDeclarations === undefined ? [] : record.skipDeclarations;
  if (!Array.isArray(checks)) errors.push('checks must be an array');
  if (!Array.isArray(skips)) errors.push('skipDeclarations must be an array');
  const requiredAcceptance = new Set(contract?.acceptance.filter(item => item.required).map(item => item.id) ?? []);
  const covered = new Set();
  const checkIds = new Set();
  const checkById = new Map();
  const requiredByCheck = new Map();
  for (const check of Array.isArray(checks) ? checks : []) {
    if (!isObject(check)) {
      errors.push('Verification check is not an object');
      continue;
    }
    const checkId = check.checkId;
    if (typeof checkId !== 'string' || !checkId.trim()) {
      errors.push('Verification checkId is missing');
      continue;
    }
    if (checkIds.has(checkId)) errors.push(`Duplicate checkId ${checkId}`);
    checkIds.add(checkId);
    checkById.set(checkId, check);
    const acceptanceIds = Array.isArray(check.acceptanceIds) ? check.acceptanceIds : [];
    if (!Array.isArray(check.acceptanceIds)) errors.push(`Check ${checkId} acceptanceIds must be an array`);
    const acceptanceSet = new Set();
    for (const acceptanceId of acceptanceIds) {
      if (typeof acceptanceId !== 'string' || !acceptanceId.trim()) {
        errors.push(`Check ${checkId} acceptanceIds must contain non-empty strings`);
        continue;
      }
      if (acceptanceSet.has(acceptanceId)) errors.push(`Check ${checkId} has duplicate acceptanceId ${acceptanceId}`);
      acceptanceSet.add(acceptanceId);
      if (!contract?.acceptance.some(item => item.id === acceptanceId)) errors.push(`Check ${checkId} references unknown acceptance ${acceptanceId}`);
      else covered.add(acceptanceId);
    }
    const expectedRequired = acceptanceIds.some(acceptanceId => contract?.acceptance.find(item => item.id === acceptanceId)?.required === true)
      ? true
      : acceptanceIds.length === 0 && check.required === true;
    if (check.required !== undefined && typeof check.required !== 'boolean') errors.push(`Check ${checkId} required must be boolean`);
    else if (check.required !== undefined && check.required !== expectedRequired && acceptanceIds.length > 0) errors.push(`Check ${checkId} requiredness does not match the Task Anchor`);
    requiredByCheck.set(checkId, expectedRequired);
    if (!CHECK_RESULTS.has(check.result)) errors.push(`Unsupported result for ${checkId}: ${check.result}`);
    let validEvidence = 0;
    if (!Array.isArray(check.evidence)) {
      errors.push(`Check ${checkId} evidence must be an array`);
    } else {
      for (let index = 0; index < check.evidence.length; index += 1) {
        try {
          normalizeStoredEvidence(check.evidence[index], checkId, index);
          validEvidence += 1;
        } catch (error) {
          errors.push(error.message);
        }
      }
    }
    if (check.result === 'PASS' && validEvidence === 0) errors.push(`PASS check ${checkId} lacks valid evidence`);
  }
  const missingRequiredAcceptance = [...requiredAcceptance].filter(acceptanceId => !covered.has(acceptanceId));
  for (const acceptanceId of missingRequiredAcceptance) errors.push(`Required acceptance ${acceptanceId} has no check coverage`);
  const validSkips = Array.isArray(skips) ? skips : [];
  const skipsById = skipIndex(validSkips);
  const skipIds = new Set();
  for (const skip of validSkips) {
    if (!isObject(skip)) {
      errors.push('Skip declaration must be an object');
      continue;
    }
    const checkId = skip.checkId;
    if (typeof checkId !== 'string' || !checkId.trim()) {
      errors.push('Skip declaration checkId is required');
      continue;
    }
    if (skipIds.has(checkId)) errors.push(`Duplicate skip declaration for ${checkId}`);
    skipIds.add(checkId);
    for (const field of ['source', 'reason', 'taskId', 'artifactVersion', 'environment']) {
      if (typeof skip[field] !== 'string' || !skip[field].trim()) errors.push(`Skip declaration ${checkId} ${field} is required`);
    }
    if (!checkIds.has(checkId)) errors.push(`Skip declaration references unknown check ${checkId}`);
    const skippedCheck = checkById.get(checkId);
    if (skippedCheck && skippedCheck.result !== 'NOT_RUN') errors.push(`Skip declaration for ${checkId} must reference a NOT_RUN check`);
    if (skip.taskId !== record.taskId || skip.artifactVersion !== record.artifactVersion || skip.environment !== record.environment) errors.push(`Skip scope mismatch for ${checkId}`);
  }
  const unresolvedFailures = [];
  if (record.unresolvedFailures !== undefined && !Array.isArray(record.unresolvedFailures)) errors.push('unresolvedFailures must be an array');
  for (const [index, failure] of (Array.isArray(record.unresolvedFailures) ? record.unresolvedFailures : []).entries()) {
    try { unresolvedFailures.push(normalizeFailure(failure)); } catch (error) { errors.push(`unresolvedFailures[${index}]: ${error.message}`); }
  }
  const unresolvedIds = new Set(unresolvedFailures.map(item => item.checkId));
  for (const check of Array.isArray(checks) ? checks : []) if (isObject(check) && check.result === 'FAIL' && typeof check.checkId === 'string' && !unresolvedIds.has(check.checkId)) errors.push(`FAIL check ${check.checkId} is missing from unresolvedFailures`);
  for (const failure of unresolvedFailures) {
    const current = checkById.get(failure.checkId);
    if (current?.result === 'PASS' && recordContext && canResolveFailure(failure, current, recordContext, record.verifiedAt)) {
      errors.push(`Resolved FAIL ${failure.checkId} remains in unresolvedFailures`);
    }
  }
  for (const failure of unresolvedFailures) errors.push(`Unresolved FAIL for ${failure.checkId}`);
  const resolvedFailures = [];
  if (record.resolvedFailures !== undefined && !Array.isArray(record.resolvedFailures)) errors.push('resolvedFailures must be an array');
  for (const [index, resolution] of (Array.isArray(record.resolvedFailures) ? record.resolvedFailures : []).entries()) {
    try { resolvedFailures.push(normalizeResolvedFailure(resolution, index)); } catch (error) { errors.push(error.message); }
  }
  if (typeof options.expectedArtifactVersion === 'string' && options.expectedArtifactVersion !== record.artifactVersion) {
    errors.push(`Artifact version mismatch: expected ${options.expectedArtifactVersion}, found ${record.artifactVersion}`);
  }
  if (typeof options.expectedEnvironment === 'string' && options.expectedEnvironment !== record.environment) {
    errors.push(`Environment mismatch: expected ${options.expectedEnvironment}, found ${record.environment}`);
  }
  let derivedVerdict = 'VERIFIED';
  if (missingRequiredAcceptance.length > 0) derivedVerdict = 'UNVERIFIED';
  if (unresolvedFailures.length > 0) derivedVerdict = 'UNVERIFIED';
  let hasRequiredNotRun = false;
  let hasHardFailure = missingRequiredAcceptance.length > 0 || unresolvedFailures.length > 0;
  let hasMissingSkip = false;
  for (const check of Array.isArray(checks) ? checks : []) {
    if (!isObject(check)) continue;
    const required = requiredByCheck.get(check.checkId) === true;
    if (check.result === 'FAIL' || check.result === 'NOT_APPLICABLE') {
      if (required) derivedVerdict = 'UNVERIFIED';
      else if (check.result === 'FAIL') derivedVerdict = 'UNVERIFIED';
      if (check.result === 'FAIL' || (check.result === 'NOT_APPLICABLE' && required)) hasHardFailure = true;
    }
    if (required && check.result === 'NOT_RUN') {
      hasRequiredNotRun = true;
      if (!skipsById.has(check.checkId)) {
        hasMissingSkip = true;
        errors.push(`Required check ${check.checkId} lacks a user skip declaration`);
      }
    }
    if (required && check.result !== 'PASS' && check.result !== 'NOT_RUN') hasHardFailure = true;
  }
  if (hasHardFailure) derivedVerdict = 'UNVERIFIED';
  else if (hasMissingSkip) derivedVerdict = 'BLOCKED';
  else if (hasRequiredNotRun) derivedVerdict = 'PASS_WITH_SKIPS';
  if (record?.recordedVerdict && record.recordedVerdict !== derivedVerdict) errors.push(`recordedVerdict ${record.recordedVerdict} does not match derived ${derivedVerdict}`);
  if (!VERDICTS.has(record?.recordedVerdict)) errors.push(`Unsupported recordedVerdict ${record?.recordedVerdict}`);
  if (derivedVerdict === 'PASS_WITH_SKIPS') {
    for (const check of Array.isArray(checks) ? checks : []) if (isObject(check) && requiredByCheck.get(check.checkId) === true && check.result === 'NOT_RUN' && !skipsById.has(check.checkId)) errors.push(`Required check ${check.checkId} lacks a user skip declaration`);
  }
  if (record?.recordedVerdict === 'PASS_WITH_SKIPS' && !hasRequiredNotRun) errors.push('PASS_WITH_SKIPS requires a required NOT_RUN check');
  if (record?.recordedVerdict === 'VERIFIED' && hasRequiredNotRun) errors.push('VERIFIED cannot contain a required NOT_RUN check');
  if (Array.isArray(record?.checks) && record.checks.length === 0) errors.push('Verification record has no checks');
  if (record.artifactSnapshot === undefined) warnings.push('Artifact snapshot is unavailable; applicability may be UNKNOWN');
  return { ok: errors.length === 0, errors, warnings, derivedVerdict, unresolvedFailures, resolvedFailures, requiredAcceptance, checkById };
}

function structuralRecord(request, anchor, previous) {
  const revision = integer(request.contractRevision, 'contractRevision', 1);
  const contract = currentContract(anchor, revision);
  const artifactVersion = requiredText(request.artifactVersion, 'artifactVersion');
  const environment = requiredText(request.environment, 'environment');
  const verifiedAt = time(request);
  const checks = normalizeChecks(request.checks, contract);
  const context = {
    taskId: anchor.taskId,
    contractRevision: revision,
    artifactVersion,
    environment,
    acceptanceSignature: acceptanceIds => acceptanceSignature(contract, acceptanceIds),
  };
  const skipDeclarations = normalizeSkips(request.skipDeclarations, context);
  const failureMerge = mergeFailures(previous, checks, context, verifiedAt);
  let executor;
  if (typeof request.executor === 'string') executor = requiredText(request.executor, 'executor');
  else if (isObject(request.executor)) {
    const id = requiredText(request.executor.id ?? request.executor.name, 'executor.id');
    executor = { id };
  } else fail('INVALID_INPUT', 'executor is required');
  if (typeof request.independent !== 'boolean') fail('INVALID_INPUT', 'independent must be boolean');
  const record = {
    schemaVersion: RECORD_SCHEMA_VERSION,
    taskId: anchor.taskId,
    contractRevision: revision,
    artifactVersion,
    artifactSnapshot: request.artifactSnapshot === undefined || request.artifactSnapshot === null ? null : normalizeSnapshot(request.artifactSnapshot),
    environment,
    verifiedAt,
    executor,
    independent: request.independent,
    recordedVerdict: 'UNVERIFIED',
    checks,
    skipDeclarations,
    unresolvedFailures: failureMerge.unresolvedFailures,
    resolvedFailures: failureMerge.resolvedFailures,
  };
  const evaluated = evaluateRecord(record, anchor);
  record.recordedVerdict = evaluated.derivedVerdict;
  return { record, evaluated };
}

async function writeRecord(request) {
  const paths = await taskPaths(request.projectRoot, requiredText(request.taskId, 'taskId'));
  return withTaskLock(paths, async () => {
    const anchor = await readJsonFile(paths.anchor);
    if (anchor === null) fail('ANCHOR_MISSING', `Task Anchor does not exist: ${paths.anchor}`);
    if (request.contractRevision !== anchor.contractRevision) fail('STALE_CONTRACT_REVISION', `Verification must target current contract revision ${anchor.contractRevision}`);
    const previous = await readJsonFile(paths.verification);
    const { record, evaluated: initial } = structuralRecord(request, anchor, previous);
    if (request.recordedVerdict !== undefined && request.recordedVerdict !== record.recordedVerdict) {
      fail('VERDICT_MISMATCH', `recordedVerdict must be ${record.recordedVerdict} for these checks`);
    }
    if (record.artifactSnapshot === null) record.artifactSnapshot = await captureSnapshot(paths.projectRoot, { artifactFiles: request.artifactFiles ?? [] });
    const evaluated = evaluateRecord(record, anchor);
    await writeJsonRecord(paths.verification, record);
    return {
      status: evaluated.ok && ['VERIFIED', 'PASS_WITH_SKIPS'].includes(record.recordedVerdict) ? 'OK' : 'WARN',
      changed: true,
      data: record,
      diagnostics: [...evaluated.errors.map(message => ({ code: 'VERIFY_INVALID', message, severity: 'WARN' })), ...evaluated.warnings.map(message => ({ code: 'VERIFY_WARNING', message, severity: 'WARN' }))],
      validation: { ...evaluated, initial },
    };
  });
}

async function validateRecord(request) {
  const paths = await taskPaths(request.projectRoot, requiredText(request.taskId, 'taskId'));
  const anchor = await readJsonFile(paths.anchor);
  if (anchor === null) return { status: 'BLOCK', changed: false, data: null, diagnostics: [{ code: 'ANCHOR_MISSING', message: 'Task Anchor is missing', severity: 'BLOCK' }] };
  const record = await readJsonFile(paths.verification);
  if (record === null) return { status: 'BLOCK', changed: false, data: null, diagnostics: [{ code: 'VERIFICATION_MISSING', message: 'Final Verification Record is missing', severity: 'BLOCK' }] };
  const evaluated = evaluateRecord(record, anchor, request);
  return {
    status: evaluated.ok && ['VERIFIED', 'PASS_WITH_SKIPS'].includes(record.recordedVerdict) ? 'OK' : 'BLOCK',
    changed: false,
    data: { ...record, validation: evaluated },
    diagnostics: evaluated.errors.map(message => ({ code: 'VERIFY_INVALID', message, severity: 'BLOCK' })),
  };
}

async function readRecord(request) {
  const paths = await taskPaths(request.projectRoot, requiredText(request.taskId, 'taskId'));
  const record = await readJsonFile(paths.verification);
  if (record === null) return { status: 'MISSING', changed: false, data: { file: paths.verification }, diagnostics: ['Final Verification Record is missing'] };
  return { status: 'OK', changed: false, data: record, diagnostics: [] };
}

async function dispatch(request) {
  if (!isObject(request)) fail('INVALID_INPUT', 'Expected an object');
  const operation = requiredText(request.operation, 'operation');
  if (operation === 'write') return writeRecord(request);
  if (operation === 'validate') return validateRecord(request);
  if (operation === 'read') return readRecord(request);
  fail('INVALID_OPERATION', `Unsupported operation ${operation}`);
}

export async function run(request) {
  try {
    return await dispatch(request);
  } catch (error) {
    return { status: 'ERROR', changed: false, data: null, diagnostics: [serializeError(error)], errorCode: error.code ?? 'UNEXPECTED_ERROR' };
  }
}

export async function loadVerification(projectRoot, taskId) {
  const paths = await taskPaths(projectRoot, taskId);
  const record = await readJsonFile(paths.verification);
  return record;
}

export { normalizeEvidence, normalizeChecks, normalizeSkips };

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
