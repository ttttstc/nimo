import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { absolute, atomicWrite, fail, guarded, main, readOptional, response, withLock } from './lib/common.mjs';

const ownerships = new Set(['user-managed', 'managed-by-nimo']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const sha256 = content => createHash('sha256').update(content).digest('hex');
const slash = value => value.split(path.sep).join('/');
const hashValue = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const externalTargetPrefix = 'external-path-sha256:';

function portableTargetKey(projectRoot, file) {
  const relative = path.relative(projectRoot, file);
  if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    return `./${slash(relative)}`;
  }
  return `${externalTargetPrefix}${sha256(Buffer.from(file))}`;
}

function validTargetKey(value) {
  if (new RegExp(`^${externalTargetPrefix}[a-f0-9]{64}$`).test(value)) return true;
  if (!value.startsWith('./') || value.includes('\\')) return false;
  const parts = value.slice(2).split('/');
  return parts.length > 0 && parts.every(part => part && part !== '.' && part !== '..');
}

function validSources(sources) {
  return Array.isArray(sources) && sources.every(source => text(source) && !path.isAbsolute(source)) &&
    new Set(sources).size === sources.length;
}

function validateState(state) {
  if (!object(state) || state.formatVersion !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0) {
    fail('INVALID_KNOWLEDGE_STATE', 'Knowledge state needs formatVersion 1 and a non-negative revision');
  }
  if (state.lastMaintainedRevision !== null && !text(state.lastMaintainedRevision)) {
    fail('INVALID_KNOWLEDGE_STATE', 'lastMaintainedRevision must be null or a non-empty string');
  }
  if (state.lastMaintainedAt !== null && !text(state.lastMaintainedAt)) {
    fail('INVALID_KNOWLEDGE_STATE', 'lastMaintainedAt must be null or a non-empty string');
  }
  if (!object(state.targets)) fail('INVALID_KNOWLEDGE_STATE', 'targets must be an object');
  for (const [target, record] of Object.entries(state.targets)) {
    if (!validTargetKey(target) || !object(record) || !ownerships.has(record.ownership) ||
        !hashValue(record.contentHash) || !text(record.verifiedRevision) || !validSources(record.sources)) {
      fail('INVALID_KNOWLEDGE_STATE', `Invalid knowledge target record: ${target}`);
    }
  }
  return state;
}

async function readState(file) {
  const content = await readOptional(file);
  if (content === null) fail('MISSING_KNOWLEDGE_STATE', 'Initialize knowledge state first', 4);
  let parsed;
  try { parsed = JSON.parse(content); } catch { fail('INVALID_KNOWLEDGE_STATE', 'Knowledge state is not valid JSON', 4); }
  return validateState(parsed);
}

async function observeTarget(projectRoot, value) {
  const requested = absolute(value, 'knowledge target path');
  const unresolvedKey = portableTargetKey(projectRoot, path.resolve(requested));
  const actual = await fs.realpath(requested).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (!actual) return { key: unresolvedKey, actualContentHash: null };
  const stat = await fs.stat(actual);
  if (!stat.isFile()) fail('INVALID_TARGET', `Knowledge target must resolve to a regular file: ${requested}`, 4);
  return {
    key: portableTargetKey(projectRoot, actual),
    actualContentHash: sha256(await fs.readFile(actual)),
  };
}

async function checkTargets(projectRoot, state, targets) {
  if (!Array.isArray(targets)) fail('INVALID_REQUEST', 'check requires targets to be an array');
  const seen = new Set();
  const observations = [];
  for (const target of targets) {
    if (!object(target) || !text(target.path)) fail('INVALID_REQUEST', 'Each check target needs an absolute path');
    const observation = await observeTarget(projectRoot, target.path);
    if (seen.has(observation.key)) fail('DUPLICATE_TARGET', `Duplicate knowledge target identity: ${observation.key}`);
    seen.add(observation.key);
    const baseline = state.targets[observation.key] ?? null;
    let status;
    if (observation.actualContentHash === null) status = 'MISSING';
    else if (!baseline) status = 'UNTRACKED';
    else status = baseline.contentHash === observation.actualContentHash ? 'UNCHANGED' : 'CHANGED';
    observations.push({
      target: observation.key,
      status,
      baselineContentHash: baseline?.contentHash ?? null,
      actualContentHash: observation.actualContentHash,
      verifiedRevision: baseline?.verifiedRevision ?? null,
    });
  }
  return observations;
}

async function materializeTargets(projectRoot, targets, projectVersion) {
  if (!Array.isArray(targets)) fail('INVALID_REQUEST', 'targets must be an array');
  const records = {};
  for (const target of targets) {
    if (!object(target)) fail('INVALID_REQUEST', 'Each knowledge target must be an object');
    const requested = absolute(target.path, 'knowledge target path');
    if (!ownerships.has(target.ownership) || !text(target.verifiedRevision) || !validSources(target.sources) ||
        !hashValue(target.expectedContentHash)) {
      fail('INVALID_REQUEST', `Knowledge target needs ownership, verifiedRevision, expectedContentHash, and unique non-absolute sources: ${requested}`);
    }
    if (target.verifiedRevision !== projectVersion) {
      fail('STALE_TARGET_VERIFICATION', `Knowledge target ${requested} was verified at ${target.verifiedRevision}, not ${projectVersion}`);
    }
    const observation = await observeTarget(projectRoot, requested);
    if (observation.actualContentHash === null) fail('INVALID_TARGET', `Knowledge target does not exist: ${requested}`, 4);
    if (observation.actualContentHash !== target.expectedContentHash) {
      fail('CONTENT_CHANGED', `Knowledge target changed after verification: ${requested}`, 3);
    }
    if (records[observation.key]) fail('DUPLICATE_TARGET', `Duplicate knowledge target identity: ${observation.key}`);
    records[observation.key] = {
      ownership: target.ownership,
      contentHash: observation.actualContentHash,
      verifiedRevision: target.verifiedRevision,
      sources: [...target.sources],
    };
  }
  return records;
}

export async function run(request) {
  return guarded(async () => {
    if (!object(request)) fail('INVALID_REQUEST', 'Expected an object');
    const projectRoot = absolute(request.projectRoot, 'projectRoot');
    const file = path.join(projectRoot, '.nimo', 'state', 'knowledge.json');
    const operation = request.operation;

    if (operation === 'init') {
      return withLock(file, async () => {
        if (await readOptional(file) !== null) return response(await readState(file));
        const state = validateState({
          formatVersion: 1,
          revision: 0,
          lastMaintainedRevision: null,
          lastMaintainedAt: null,
          targets: {},
        });
        await atomicWrite(file, `${JSON.stringify(state, null, 2)}\n`);
        return response(state, [], true);
      });
    }

    if (operation === 'read') return response(await readState(file));

    if (operation === 'status') {
      const state = await readState(file);
      const ownership = { 'user-managed': 0, 'managed-by-nimo': 0 };
      for (const record of Object.values(state.targets)) ownership[record.ownership] += 1;
      return response({
        revision: state.revision,
        lastMaintainedRevision: state.lastMaintainedRevision,
        lastMaintainedAt: state.lastMaintainedAt,
        targetCount: Object.keys(state.targets).length,
        ownership,
      });
    }

    if (operation === 'check') {
      const state = await readState(file);
      return response({
        revision: state.revision,
        lastMaintainedRevision: state.lastMaintainedRevision,
        targets: await checkTargets(projectRoot, state, request.targets),
      });
    }

    if (operation === 'update') {
      if (!Number.isSafeInteger(request.expectedRevision) || !text(request.projectVersion) || !text(request.maintainedAt)) {
        fail('INVALID_REQUEST', 'update requires expectedRevision, projectVersion, and maintainedAt');
      }
      return withLock(file, async () => {
        const current = await readState(file);
        if (current.revision !== request.expectedRevision) fail('REVISION_CONFLICT', 'Knowledge state changed; reread before updating', 3);
        const targets = await materializeTargets(projectRoot, request.targets, request.projectVersion);
        const next = validateState({
          ...current,
          revision: current.revision + 1,
          lastMaintainedRevision: request.projectVersion,
          lastMaintainedAt: request.maintainedAt,
          targets,
        });
        await atomicWrite(file, `${JSON.stringify(next, null, 2)}\n`);
        return response(next, [], true);
      });
    }

    fail('INVALID_OPERATION', 'Unsupported knowledge state operation');
  });
}

main(import.meta.url, run);
