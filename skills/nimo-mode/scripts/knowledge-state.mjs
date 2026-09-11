import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { absolute, atomicWrite, fail, guarded, main, readOptional, response, withLock } from './lib/common.mjs';

const ownerships = new Set(['user-managed', 'nimo-managed']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const sha256 = content => createHash('sha256').update(content).digest('hex');
const slash = value => value.split(path.sep).join('/');

function portableTargetKey(projectRoot, file) {
  const relative = path.relative(projectRoot, file);
  if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) {
    return `./${slash(relative)}`;
  }
  return `external:${sha256(Buffer.from(file))}`;
}

function validTargetKey(value) {
  if (/^external:[a-f0-9]{64}$/.test(value)) return true;
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
        !/^[a-f0-9]{64}$/.test(record.contentHash ?? '') || !text(record.verifiedRevision) || !validSources(record.sources)) {
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

async function materializeTargets(projectRoot, targets) {
  if (!Array.isArray(targets)) fail('INVALID_REQUEST', 'targets must be an array');
  const records = {};
  for (const target of targets) {
    if (!object(target)) fail('INVALID_REQUEST', 'Each knowledge target must be an object');
    const requested = absolute(target.path, 'knowledge target path');
    if (!ownerships.has(target.ownership) || !text(target.verifiedRevision) || !validSources(target.sources)) {
      fail('INVALID_REQUEST', `Knowledge target needs ownership, verifiedRevision, and unique non-absolute sources: ${requested}`);
    }
    const actual = await fs.realpath(requested).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (!actual) fail('INVALID_TARGET', `Knowledge target does not exist: ${requested}`, 4);
    const stat = await fs.stat(actual);
    if (!stat.isFile()) fail('INVALID_TARGET', `Knowledge target must resolve to a regular file: ${requested}`, 4);
    const key = portableTargetKey(projectRoot, actual);
    if (records[key]) fail('DUPLICATE_TARGET', `Duplicate knowledge target identity: ${key}`);
    records[key] = {
      ownership: target.ownership,
      contentHash: sha256(await fs.readFile(actual)),
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
      const ownership = { 'user-managed': 0, 'nimo-managed': 0 };
      for (const record of Object.values(state.targets)) ownership[record.ownership] += 1;
      return response({
        revision: state.revision,
        lastMaintainedRevision: state.lastMaintainedRevision,
        lastMaintainedAt: state.lastMaintainedAt,
        targetCount: Object.keys(state.targets).length,
        ownership,
      });
    }

    if (operation === 'update') {
      if (!Number.isSafeInteger(request.expectedRevision) || !text(request.projectVersion) || !text(request.maintainedAt)) {
        fail('INVALID_REQUEST', 'update requires expectedRevision, projectVersion, and maintainedAt');
      }
      return withLock(file, async () => {
        const current = await readState(file);
        if (current.revision !== request.expectedRevision) fail('REVISION_CONFLICT', 'Knowledge state changed; reread before updating', 3);
        const targets = await materializeTargets(projectRoot, request.targets);
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
