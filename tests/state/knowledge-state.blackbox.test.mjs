import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../skills/nimo-mode/scripts/knowledge-state.mjs');
const { run } = await import(pathToFileURL(scriptPath).href);

async function fixture(label) {
  const root = await mkdtemp(join(tmpdir(), `nimo-knowledge-state-${label}-`));
  const projectRoot = join(root, 'project');
  const knowledge = join(projectRoot, 'docs', 'architecture.md');
  await mkdir(dirname(knowledge), { recursive: true });
  await writeFile(knowledge, '# Architecture\n\nScheduler calls Dispatcher.\n', 'utf8');
  return { root, projectRoot, knowledge };
}

async function persisted(current) {
  return JSON.parse(await readFile(join(current.projectRoot, '.nimo', 'state', 'knowledge.json'), 'utf8'));
}

test('knowledge state initializes, hashes maintained targets, and exposes status', async () => {
  const current = await fixture('update');
  try {
    const initialized = await run({ operation: 'init', projectRoot: current.projectRoot });
    assert.equal(initialized.status, 'OK');
    assert.equal(initialized.changed, true);
    assert.equal(initialized.data.revision, 0);
    assert.equal(initialized.data.lastMaintainedRevision, null);
    assert.deepEqual(initialized.data.targets, {});

    const updated = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [{
        path: current.knowledge,
        ownership: 'user-managed',
        verifiedRevision: 'head-2',
        sources: ['src/scheduler/**', 'src/dispatcher/**'],
      }],
    });
    assert.equal(updated.status, 'OK');
    assert.equal(updated.changed, true);
    assert.equal(updated.data.revision, 1);
    assert.equal(updated.data.lastMaintainedRevision, 'head-2');
    const record = updated.data.targets[resolve(current.knowledge)];
    assert.equal(record.ownership, 'user-managed');
    assert.match(record.contentHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(record.sources, ['src/scheduler/**', 'src/dispatcher/**']);

    const status = await run({ operation: 'status', projectRoot: current.projectRoot });
    assert.equal(status.status, 'OK');
    assert.equal(status.data.targetCount, 1);
    assert.deepEqual(status.data.ownership, { 'user-managed': 1, 'nimo-managed': 0 });
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('knowledge state rejects stale revision and leaves the prior record intact', async () => {
  const current = await fixture('conflict');
  try {
    await run({ operation: 'init', projectRoot: current.projectRoot });
    const first = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-1',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [{
        path: current.knowledge,
        ownership: 'nimo-managed',
        verifiedRevision: 'head-1',
        sources: ['src/**'],
      }],
    });
    assert.equal(first.status, 'OK');

    const conflict = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T01:00:00Z',
      targets: [{
        path: current.knowledge,
        ownership: 'nimo-managed',
        verifiedRevision: 'head-2',
        sources: ['src/**'],
      }],
    });
    assert.equal(conflict.status, 'BLOCK');
    assert.match(JSON.stringify(conflict.diagnostics), /REVISION_CONFLICT/);

    const state = await persisted(current);
    assert.equal(state.revision, 1);
    assert.equal(state.lastMaintainedRevision, 'head-1');
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});
