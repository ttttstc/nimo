import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), '../../skills/nimo-mode/scripts/knowledge-state.mjs');
const { run } = await import(pathToFileURL(scriptPath).href);
const sha256 = content => createHash('sha256').update(content).digest('hex');
const fileHash = async file => sha256(await readFile(file));

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

async function target(current, overrides = {}) {
  return {
    path: current.knowledge,
    ownership: 'user-managed',
    verifiedRevision: 'head-2',
    expectedContentHash: await fileHash(current.knowledge),
    sources: ['src/scheduler/**', 'src/dispatcher/**'],
    ...overrides,
  };
}

test('knowledge state initializes, hashes maintained targets, and exposes portable status', async () => {
  const current = await fixture('update');
  try {
    const initialized = await run({ operation: 'init', projectRoot: current.projectRoot });
    assert.equal(initialized.status, 'OK');
    assert.equal(initialized.changed, true);
    assert.equal(initialized.data.revision, 0);
    assert.equal(initialized.data.lastMaintainedRevision, null);
    assert.deepEqual(initialized.data.targets, {});
    assert.equal('projectRoot' in initialized.data, false, 'shareable knowledge state must not persist the local project path');

    const updated = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [await target(current)],
    });
    assert.equal(updated.status, 'OK');
    assert.equal(updated.changed, true);
    assert.equal(updated.data.revision, 1);
    assert.equal(updated.data.lastMaintainedRevision, 'head-2');
    const record = updated.data.targets['./docs/architecture.md'];
    assert.equal(record.ownership, 'user-managed');
    assert.match(record.contentHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(record.sources, ['src/scheduler/**', 'src/dispatcher/**']);

    const serialized = await readFile(join(current.projectRoot, '.nimo', 'state', 'knowledge.json'), 'utf8');
    assert.equal(serialized.includes(current.projectRoot), false, 'state must not leak the project absolute path');

    const status = await run({ operation: 'status', projectRoot: current.projectRoot });
    assert.equal(status.status, 'OK');
    assert.equal(status.data.targetCount, 1);
    assert.deepEqual(status.data.ownership, { 'user-managed': 1, 'managed-by-nimo': 0 });
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('check includes knowledge-target content changes even when source revisions are unchanged', async () => {
  const current = await fixture('check');
  try {
    await run({ operation: 'init', projectRoot: current.projectRoot });
    const baseline = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [await target(current)],
    });
    assert.equal(baseline.status, 'OK');

    const clean = await run({ operation: 'check', projectRoot: current.projectRoot, targets: [{ path: current.knowledge }] });
    assert.equal(clean.status, 'OK');
    assert.equal(clean.changed, false);
    assert.equal(clean.data.targets[0].status, 'UNCHANGED');

    await writeFile(current.knowledge, '# Architecture\n\nScheduler bypasses Dispatcher.\n', 'utf8');
    const changed = await run({ operation: 'check', projectRoot: current.projectRoot, targets: [{ path: current.knowledge }] });
    assert.equal(changed.status, 'OK');
    assert.equal(changed.data.revision, 1, 'read-only check must not advance state revision');
    assert.equal(changed.data.targets[0].status, 'CHANGED');
    assert.notEqual(changed.data.targets[0].actualContentHash, changed.data.targets[0].baselineContentHash);
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('maintain can accept a verified manual edit by refreshing state without rewriting knowledge', async () => {
  const current = await fixture('manual-edit');
  try {
    await run({ operation: 'init', projectRoot: current.projectRoot });
    const baseline = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [await target(current)],
    });
    assert.equal(baseline.status, 'OK');

    const manualContent = '# Architecture\n\nScheduler calls Dispatcher through the queue.\n';
    await writeFile(current.knowledge, manualContent, 'utf8');
    const before = await readFile(current.knowledge);

    const changed = await run({ operation: 'check', projectRoot: current.projectRoot, targets: [{ path: current.knowledge }] });
    assert.equal(changed.status, 'OK');
    assert.equal(changed.data.targets[0].status, 'CHANGED');

    const refreshed = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 1,
      projectVersion: 'head-3',
      maintainedAt: '2026-09-12T01:00:00Z',
      targets: [await target(current, { verifiedRevision: 'head-3' })],
    });
    assert.equal(refreshed.status, 'OK');
    assert.equal(refreshed.data.lastMaintainedRevision, 'head-3');
    assert.deepEqual(await readFile(current.knowledge), before, 'state refresh must not rewrite already-correct knowledge');
    assert.equal(refreshed.data.targets['./docs/architecture.md'].contentHash, sha256(before));

    const clean = await run({ operation: 'check', projectRoot: current.projectRoot, targets: [{ path: current.knowledge }] });
    assert.equal(clean.status, 'OK');
    assert.equal(clean.data.targets[0].status, 'UNCHANGED');
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('external knowledge uses a path-derived pseudonym without persisting plaintext path', async () => {
  const current = await fixture('external');
  try {
    const external = join(current.root, 'personal knowledge', 'project.md');
    await mkdir(dirname(external), { recursive: true });
    await writeFile(external, '# Personal project facts\n', 'utf8');
    await run({ operation: 'init', projectRoot: current.projectRoot });

    const updated = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-1',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [{
        path: external,
        ownership: 'user-managed',
        verifiedRevision: 'head-1',
        expectedContentHash: await fileHash(external),
        sources: ['external:configured-knowledge'],
      }],
    });
    assert.equal(updated.status, 'OK');
    const keys = Object.keys(updated.data.targets);
    assert.equal(keys.length, 1);
    assert.match(keys[0], /^external-path-sha256:[a-f0-9]{64}$/);
    const serialized = await readFile(join(current.projectRoot, '.nimo', 'state', 'knowledge.json'), 'utf8');
    assert.equal(serialized.includes(external), false, 'state must not persist an external absolute path in plaintext');
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('knowledge state rejects a target verified at an older project version', async () => {
  const current = await fixture('target-version');
  try {
    await run({ operation: 'init', projectRoot: current.projectRoot });
    const result = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [await target(current, { verifiedRevision: 'head-1' })],
    });
    assert.equal(result.status, 'BLOCK');
    assert.match(JSON.stringify(result.diagnostics), /STALE_TARGET_VERIFICATION/);
    assert.equal((await persisted(current)).lastMaintainedRevision, null);
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('knowledge state rejects content changed after verification', async () => {
  const current = await fixture('content-race');
  try {
    await run({ operation: 'init', projectRoot: current.projectRoot });
    const verifiedHash = await fileHash(current.knowledge);
    await writeFile(current.knowledge, '# Architecture\n\nChanged after verification.\n', 'utf8');
    const result = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T00:00:00Z',
      targets: [await target(current, { expectedContentHash: verifiedHash })],
    });
    assert.equal(result.status, 'BLOCK');
    assert.match(JSON.stringify(result.diagnostics), /CONTENT_CHANGED/);
    assert.equal((await persisted(current)).revision, 0);
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
      targets: [await target(current, {
        ownership: 'managed-by-nimo',
        verifiedRevision: 'head-1',
        sources: ['src/**'],
      })],
    });
    assert.equal(first.status, 'OK');

    const conflict = await run({
      operation: 'update',
      projectRoot: current.projectRoot,
      expectedRevision: 0,
      projectVersion: 'head-2',
      maintainedAt: '2026-09-12T01:00:00Z',
      targets: [await target(current, {
        ownership: 'managed-by-nimo',
        verifiedRevision: 'head-2',
        sources: ['src/**'],
      })],
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
