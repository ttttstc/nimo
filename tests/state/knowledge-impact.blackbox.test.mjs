import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../skills/nimo-mode/scripts/state.mjs');
const { run } = await import(pathToFileURL(scriptPath).href);

async function fixture(label) {
  const root = await mkdtemp(join(tmpdir(), `nimo-knowledge-impact-${label}-`));
  const store = join(root, 'program');
  const projectRoot = join(root, 'project');
  await mkdir(store, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  return { root, store, projectRoot };
}

async function init(current) {
  return run({
    operation: 'init',
    store: current.store,
    taskId: 'knowledge-impact',
    goal: 'record delivery knowledge impact',
    projectRoot: current.projectRoot,
    sourceVersion: 'head-1',
  });
}

test('program state persists and exposes a review-recommended knowledge impact', async () => {
  const current = await fixture('persist');
  try {
    const initialized = await init(current);
    assert.equal(initialized.status, 'OK');
    assert.equal(initialized.data.knowledgeImpact, null);

    const updated = await run({
      operation: 'update',
      store: current.store,
      expectedRevision: 0,
      patch: {
        knowledgeImpact: {
          verdict: 'REVIEW_RECOMMENDED',
          reason: 'A new dispatcher changes the scheduling chain',
          areas: ['architecture', 'execution-index'],
          sourceVersion: 'head-2',
        },
      },
    });
    assert.equal(updated.status, 'OK');
    assert.equal(updated.changed, true);
    assert.equal(updated.data.revision, 1);
    assert.equal(updated.data.knowledgeImpact.verdict, 'REVIEW_RECOMMENDED');

    const status = await run({ operation: 'status', store: current.store });
    assert.equal(status.status, 'OK');
    assert.deepEqual(status.data.knowledgeImpact, updated.data.knowledgeImpact);

    const persisted = JSON.parse(await readFile(join(current.store, 'program.json'), 'utf8'));
    assert.deepEqual(persisted.knowledgeImpact, updated.data.knowledgeImpact);
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('invalid knowledge impact is blocked without advancing revision', async () => {
  const current = await fixture('invalid');
  try {
    await init(current);
    const result = await run({
      operation: 'update',
      store: current.store,
      expectedRevision: 0,
      patch: {
        knowledgeImpact: {
          verdict: 'REVIEW_RECOMMENDED',
          reason: 'Claims impact but names no knowledge area',
          areas: [],
          sourceVersion: 'head-2',
        },
      },
    });
    assert.equal(result.status, 'BLOCK');
    assert.match(JSON.stringify(result.diagnostics), /INVALID_KNOWLEDGE_IMPACT/);

    const persisted = JSON.parse(await readFile(join(current.store, 'program.json'), 'utf8'));
    assert.equal(persisted.revision, 0);
    assert.equal(persisted.knowledgeImpact, null);
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});

test('changed programs cannot enter delivered without a fresh knowledge impact in the same update', async () => {
  const current = await fixture('delivery');
  try {
    await init(current);
    const accepted = await run({
      operation: 'update',
      store: current.store,
      expectedRevision: 0,
      patch: {
        units: [{
          id: 'implementation',
          state: 'accepted',
          dependencies: [],
          report: 'implemented and verified',
          head: 'head-2',
        }],
        verifications: [{
          unitId: 'implementation',
          head: 'head-2',
          evidence: 'tests passed against head-2',
          verifier: 'independent-reviewer',
          verdict: 'PASS',
        }],
      },
    });
    assert.equal(accepted.status, 'OK');
    assert.equal(accepted.data.revision, 1);

    const missing = await run({
      operation: 'update',
      store: current.store,
      expectedRevision: 1,
      patch: { executionState: 'delivered' },
    });
    assert.equal(missing.status, 'BLOCK');
    assert.match(JSON.stringify(missing.diagnostics), /MISSING_KNOWLEDGE_IMPACT/);
    assert.equal(JSON.parse(await readFile(join(current.store, 'program.json'), 'utf8')).revision, 1);

    const delivered = await run({
      operation: 'update',
      store: current.store,
      expectedRevision: 1,
      patch: {
        executionState: 'delivered',
        knowledgeImpact: {
          verdict: 'NONE',
          reason: 'The implementation changed local behavior but no stable project knowledge contract',
          areas: [],
          sourceVersion: 'head-2',
        },
      },
    });
    assert.equal(delivered.status, 'OK');
    assert.equal(delivered.data.executionState, 'delivered');
    assert.equal(delivered.data.knowledgeImpact.verdict, 'NONE');
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
});
