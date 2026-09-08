import fs from 'node:fs/promises';
import path from 'node:path';
import { absolute, atomicWrite, fail, guarded, hash, main, readOptional, response, withLock } from './lib/common.mjs';

const executionStates = ['running', 'waiting-input', 'blocked', 'paused', 'delivered', 'cancelled'];
const unitStates = ['queued', 'running', 'returned', 'accepted', 'integrated', 'failed', 'abandoned', 'cancelled'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.length > 0;
const writable = ['executionState', 'stopReason', 'owners', 'units', 'verifications', 'frontier', 'gates'];

function validate(program) {
  if (!object(program) || program.formatVersion !== 1 || !Number.isSafeInteger(program.revision) || program.revision < 0 || !executionStates.includes(program.executionState)) fail('INVALID_STATE', 'Invalid program version, revision, or execution state');
  for (const field of ['owners', 'units', 'verifications', 'gates']) if (!Array.isArray(program[field])) fail('INVALID_STATE', `${field} must be an array`);
  const ids = new Set();
  for (const unit of program.units) {
    if (!object(unit) || !text(unit.id) || ids.has(unit.id) || !unitStates.includes(unit.state) || !Array.isArray(unit.dependencies)) fail('INVALID_UNIT', 'Units need unique ids, valid state, and dependencies');
    ids.add(unit.id);
    if (['returned', 'accepted', 'integrated'].includes(unit.state) && !text(unit.report)) fail('MISSING_REPORT', 'Returned units require a report');
    if (['accepted', 'integrated'].includes(unit.state) && (!text(unit.head) || !program.verifications.some(v => v.unitId === unit.id && v.head === unit.head && v.verdict === 'PASS' && text(v.evidence)))) fail('MISSING_VERIFICATION', 'Accepted units require evidence for their current head');
  }
  const visiting = new Set();
  const visited = new Set();
  function walk(id) {
    if (!ids.has(id)) fail('MISSING_DEPENDENCY', `Unknown dependency ${id}`);
    if (visiting.has(id)) fail('DEPENDENCY_CYCLE', 'Unit dependencies contain a cycle');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of program.units.find(unit => unit.id === id).dependencies) walk(dependency);
    visiting.delete(id); visited.add(id);
  }
  for (const id of ids) walk(id);
  for (const record of program.verifications) {
    if (!object(record) || !text(record.unitId) || !ids.has(record.unitId) || !text(record.head) || !text(record.evidence) || !text(record.verifier) || !['PASS', 'FAIL', 'NOT_RUN', 'NOT_APPLICABLE'].includes(record.verdict)) fail('INVALID_VERIFICATION', 'Verification needs a unit, head, verifier, evidence and verdict');
  }
  if (!object(program.frontier) || !Number.isSafeInteger(program.frontier.generation) || program.frontier.generation < 0 || !Array.isArray(program.frontier.prs)) fail('INVALID_FRONTIER', 'Frontier needs a generation and ordered PR list');
  if (new Set(program.frontier.prs.map(pr => object(pr) ? pr.number : pr)).size !== program.frontier.prs.length) fail('INVALID_FRONTIER', 'Duplicate frontier PR');
  if (program.gates.some(g => !object(g) || !text(g.id) || !['open', 'resolved'].includes(g.state) || (g.state === 'resolved' && !text(g.answer)))) fail('INVALID_GATE', 'Gates require explicit resolutions');
  return program;
}

async function readProgram(file) {
  const content = await readOptional(file);
  if (content === null) fail('MISSING_PROGRAM', 'Initialize this program first', 4);
  return validate(JSON.parse(content));
}

export async function run(request) {
  return guarded(async () => {
    if (!object(request)) fail('INVALID_REQUEST', 'Expected an object');
    const store = absolute(request.store, 'store');
    const file = path.join(store, 'program.json');
    const operation = request.operation;
    if (operation === 'init') {
      if (!text(request.taskId) || !text(request.goal)) fail('INVALID_REQUEST', 'init requires taskId and goal');
      return withLock(file, async () => {
        if (await readOptional(file) !== null) return response(await readProgram(file));
        const program = validate({ formatVersion: 1, revision: 0, taskId: request.taskId, goal: request.goal,
          projectRoot: absolute(request.projectRoot, 'projectRoot'), sourceVersion: request.sourceVersion ?? 'unknown',
          executionState: 'running', stopReason: null, owners: [], units: [], verifications: [],
          frontier: { generation: 0, prs: [], lowestUnmerged: null }, gates: [] });
        await atomicWrite(file, JSON.stringify(program, null, 2) + '\n');
        return response(program, [], true);
      });
    }
    if (['read', 'status'].includes(operation)) {
      const program = await readProgram(file);
      if (operation === 'read') return response(program);
      const counts = {};
      for (const unit of program.units) counts[unit.state] = (counts[unit.state] ?? 0) + 1;
      return response({ revision: program.revision, executionState: program.executionState, counts,
        frontier: program.frontier, gates: program.gates.filter(g => g.state === 'open') });
    }
    if (operation === 'update') {
      if (!Number.isSafeInteger(request.expectedRevision) || !object(request.patch) || Object.keys(request.patch).some(key => !writable.includes(key))) fail('INVALID_UPDATE', 'update requires expectedRevision and a patch of state fields');
      return withLock(file, async () => {
        const current = await readProgram(file);
        if (current.revision !== request.expectedRevision) fail('REVISION_CONFLICT', 'Program changed; reread before updating', 3);
        if (current.executionState !== 'running' && (request.patch.executionState ?? current.executionState) !== 'running' &&
            (request.patch.units ?? []).some(unit => ['queued', 'running'].includes(unit.state) &&
              !current.units.some(previous => previous.id === unit.id && previous.state === unit.state))) {
          fail('TERMINAL_STATE', 'A paused, blocked, completed or cancelled task cannot dispatch new work');
        }
        const next = validate({ ...current, ...request.patch, revision: current.revision + 1 });
        if (['cancelled', 'delivered'].includes(current.executionState) && next.executionState !== current.executionState) fail('TERMINAL_STATE', 'A completed or cancelled task cannot restart silently');
        if (JSON.stringify(next.frontier) !== JSON.stringify(current.frontier) && next.frontier.generation <= current.frontier.generation) fail('STALE_FRONTIER', 'Topology changes need a new generation');
        await atomicWrite(file, JSON.stringify(next, null, 2) + '\n');
        return response(next, [], true);
      });
    }
    if (operation === 'inbox-add') {
      await readProgram(file);
      const event = request.event;
      if (!object(event) || !text(event.id) || !text(event.unitId) || !text(event.report)) fail('INVALID_EVENT', 'An event needs id, unitId, and report');
      const name = `${hash(event.id)}.json`;
      return withLock(file, async () => {
        const inbox = path.join(store, 'inbox');
        const archive = path.join(store, 'processed', name);
        await fs.mkdir(inbox, { recursive: true });
        const target = path.join(inbox, name);
        const prior = await readOptional(target) ?? await readOptional(archive);
        if (prior !== null) {
          if (JSON.stringify(JSON.parse(prior)) !== JSON.stringify(event)) fail('EVENT_CONFLICT', 'Event id already has a different report', 3);
          return response(event);
        }
        await atomicWrite(target, JSON.stringify(event) + '\n');
        return response(event, [], true);
      });
    }
    if (operation === 'inbox-drain') {
      await readProgram(file);
      return withLock(file, async () => {
        const inbox = path.join(store, 'inbox');
        const names = await fs.readdir(inbox).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
        const events = [];
        for (const name of names.sort()) {
          if (!/^[a-f0-9]{64}\.json$/.test(name)) fail('INVALID_INBOX', 'Unexpected inbox entry');
          const source = path.join(inbox, name);
          const event = JSON.parse(await fs.readFile(source, 'utf8'));
          if (!text(event.id) || `${hash(event.id)}.json` !== name) fail('INVALID_EVENT', 'Inbox event identity differs');
          events.push(event);
        }
        if (names.length) await fs.mkdir(path.join(store, 'processed'), { recursive: true });
        const moved = [];
        try {
          for (const name of names.sort()) {
            await fs.rename(path.join(inbox, name), path.join(store, 'processed', name));
            moved.push(name);
          }
        } catch (error) {
          for (const name of moved.reverse()) await fs.rename(path.join(store, 'processed', name), path.join(inbox, name));
          throw error;
        }
        return response({ events }, [], events.length > 0);
      });
    }
    fail('INVALID_OPERATION', 'Unsupported state operation');
  });
}
main(import.meta.url, run);
