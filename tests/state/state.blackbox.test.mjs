import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../skills/nimo-mode/scripts/state.mjs');
const stateModule = await import(pathToFileURL(scriptPath).href);
const { run } = stateModule;

const allowedStatuses = new Set(['OK', 'WARN', 'BLOCK']);

function assertEnvelope(result) {
  assert.ok(result && typeof result === 'object', 'run() must return an object');
  assert.ok(allowedStatuses.has(result.status), `unexpected status: ${result.status}`);
  assert.equal(typeof result.changed, 'boolean');
  assert.ok(Array.isArray(result.diagnostics), 'diagnostics must be an array');
  assert.ok(result.data && typeof result.data === 'object', 'data must be an object');
}

function diagnosticText(result) {
  return JSON.stringify(result.diagnostics ?? []).toLowerCase();
}

async function makeFixture(label) {
  const root = await mkdtemp(join(tmpdir(), `nimo-state-${label}-`));
  const store = join(root, 'program');
  const projectRoot = join(root, 'project');
  await mkdir(store, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  return { root, store, projectRoot };
}

async function removeFixture(fixture) {
  await rm(fixture.root, { recursive: true, force: true });
}

async function initFixture(fixture) {
  const result = await run({
    operation: 'init',
    store: fixture.store,
    taskId: 'task-1',
    goal: 'verify project state',
    projectRoot: fixture.projectRoot,
  });
  assertEnvelope(result);
  assert.equal(result.status, 'OK');
  assert.equal(result.changed, true);
  return result.data;
}

async function persisted(fixture) {
  return JSON.parse(await readFile(join(fixture.store, 'program.json'), 'utf8'));
}

async function revision(fixture) {
  return (await persisted(fixture)).revision;
}

async function fileHash(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

test('init, read, and status expose one durable program record', async () => {
  const fixture = await makeFixture('init');
  try {
    const initialized = await initFixture(fixture);
    assert.equal(initialized.formatVersion, 1);
    assert.equal(initialized.revision, 0);
    assert.equal(initialized.taskId, 'task-1');
    assert.equal(initialized.goal, 'verify project state');
    assert.equal(initialized.projectRoot, resolve(fixture.projectRoot));
    assert.equal(initialized.executionState, 'running');
    assert.deepEqual(initialized.owners, []);
    assert.deepEqual(initialized.units, []);
    assert.deepEqual(initialized.verifications, []);
    assert.deepEqual(initialized.gates, []);
    assert.deepEqual(initialized.frontier, { generation: 0, prs: [], lowestUnmerged: null });
    assert.equal('steps' in initialized, false);
    assert.equal('shell' in initialized, false);
    assert.equal(await stat(join(fixture.store, 'program.json')).then(() => true), true);

    const read = await run({ operation: 'read', store: fixture.store });
    assertEnvelope(read);
    assert.equal(read.status, 'OK');
    assert.deepEqual(read.data, initialized);

    const status = await run({ operation: 'status', store: fixture.store });
    assertEnvelope(status);
    assert.equal(status.status, 'OK');
    assert.equal(status.data.revision, 0);
    assert.equal(status.data.executionState, 'running');
    assert.deepEqual(status.data.counts, {});
    assert.deepEqual(status.data.gates, []);
  } finally {
    await removeFixture(fixture);
  }
});

test('init is idempotent and does not overwrite an existing record', async () => {
  const fixture = await makeFixture('init-idempotent');
  try {
    await initFixture(fixture);
    const before = await fileHash(join(fixture.store, 'program.json'));
    const second = await run({
      operation: 'init',
      store: fixture.store,
      taskId: 'different-task',
      goal: 'different goal',
      projectRoot: fixture.projectRoot,
    });
    assertEnvelope(second);
    assert.equal(second.status, 'OK');
    assert.equal(second.changed, false);
    assert.equal(await fileHash(join(fixture.store, 'program.json')), before);
  } finally {
    await removeFixture(fixture);
  }
});

test('update applies an expected revision atomically and rejects a stale revision', async () => {
  const fixture = await makeFixture('revision');
  try {
    await initFixture(fixture);
    const expectedRevision = await revision(fixture);
    const updated = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision,
      patch: { executionState: 'paused', stopReason: 'waiting for user' },
    });
    assertEnvelope(updated);
    assert.equal(updated.status, 'OK');
    assert.equal(updated.changed, true);
    assert.equal(updated.data.revision, expectedRevision + 1);
    assert.equal(updated.data.executionState, 'paused');
    assert.equal(updated.data.stopReason, 'waiting for user');

    const path = join(fixture.store, 'program.json');
    const before = await readFile(path);
    const conflict = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision,
      patch: { stopReason: 'stale writer' },
    });
    assertEnvelope(conflict);
    assert.equal(conflict.status, 'BLOCK');
    assert.equal(conflict.changed, false);
    assert.match(diagnosticText(conflict), /revision|changed|reread|conflict/i);
    assert.deepEqual(await readFile(path), before);
  } finally {
    await removeFixture(fixture);
  }
});

test('update rejects executable or unknown fields instead of turning facts into a workflow', async () => {
  const fixture = await makeFixture('update-shape');
  try {
    await initFixture(fixture);
    const before = await readFile(join(fixture.store, 'program.json'));
    const result = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: { steps: ['npm test'], command: 'npm test' },
    });
    assertEnvelope(result);
    assert.equal(result.status, 'BLOCK');
    assert.equal(result.changed, false);
    assert.match(diagnosticText(result), /update|field|state|unsupported/i);
    assert.deepEqual(await readFile(join(fixture.store, 'program.json')), before);
  } finally {
    await removeFixture(fixture);
  }
});

test('unit dependencies, reports, heads, and verification evidence are validated', async () => {
  const fixture = await makeFixture('units');
  try {
    await initFixture(fixture);
    let currentRevision = await revision(fixture);
    const queued = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [
          { id: 'base', state: 'queued', dependencies: [] },
          { id: 'top', state: 'queued', dependencies: ['base'] },
        ],
      },
    });
    assert.equal(queued.status, 'OK');
    currentRevision = queued.data.revision;

    const missingReport = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: { units: [{ id: 'base', state: 'returned', dependencies: [] }, { id: 'top', state: 'queued', dependencies: ['base'] }] },
    });
    assert.equal(missingReport.status, 'BLOCK');
    assert.match(diagnosticText(missingReport), /report/i);
    assert.equal(await revision(fixture), currentRevision);

    const cycle = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [
          { id: 'base', state: 'queued', dependencies: ['top'] },
          { id: 'top', state: 'queued', dependencies: ['base'] },
        ],
      },
    });
    assert.equal(cycle.status, 'BLOCK');
    assert.match(diagnosticText(cycle), /cycle/i);
    assert.equal(await revision(fixture), currentRevision);

    const missingDependency = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: { units: [{ id: 'base', state: 'queued', dependencies: ['does-not-exist'] }, { id: 'top', state: 'queued', dependencies: [] }] },
    });
    assert.equal(missingDependency.status, 'BLOCK');
    assert.match(diagnosticText(missingDependency), /depend/i);
    assert.equal(await revision(fixture), currentRevision);

    const acceptedWithoutEvidence = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: { units: [{ id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'abc123' }, { id: 'top', state: 'queued', dependencies: ['base'] }] },
    });
    assert.equal(acceptedWithoutEvidence.status, 'BLOCK');
    assert.match(diagnosticText(acceptedWithoutEvidence), /verif|evidence/i);
    assert.equal(await revision(fixture), currentRevision);

    const accepted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [
          { id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'abc123' },
          { id: 'top', state: 'queued', dependencies: ['base'] },
        ],
        verifications: [{ unitId: 'base', head: 'abc123', verifier: 'luna-max', evidence: 'evidence/base.json', verdict: 'PASS' }],
      },
    });
    assert.equal(accepted.status, 'OK');
    assert.equal(accepted.data.units[0].state, 'accepted');
    assert.equal(accepted.data.verifications[0].verdict, 'PASS');
  } finally {
    await removeFixture(fixture);
  }
});

test('status counts recorded states and does not invent integrated units', async () => {
  const fixture = await makeFixture('status');
  try {
    await initFixture(fixture);
    const updated = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: {
        units: [
          { id: 'one', state: 'queued', dependencies: [] },
          { id: 'two', state: 'running', dependencies: ['one'] },
          { id: 'three', state: 'failed', dependencies: [] },
        ],
      },
    });
    assert.equal(updated.status, 'OK');
    const status = await run({ operation: 'status', store: fixture.store });
    assert.equal(status.status, 'OK');
    assert.deepEqual(status.data.counts, { queued: 1, running: 1, failed: 1 });
    assert.equal(status.data.counts.integrated ?? 0, 0);
    assert.deepEqual(status.data.gates, []);
  } finally {
    await removeFixture(fixture);
  }
});

test('frontier topology changes require a newer generation', async () => {
  const fixture = await makeFixture('frontier');
  try {
    await initFixture(fixture);
    const first = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: { frontier: { generation: 1, prs: [{ number: 10, head: 'abc', base: 'main' }], lowestUnmerged: 10 } },
    });
    assert.equal(first.status, 'OK');
    const stale = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: first.data.revision,
      patch: { frontier: { generation: 1, prs: [{ number: 11, head: 'def', base: 'main' }], lowestUnmerged: 11 } },
    });
    assert.equal(stale.status, 'BLOCK');
    assert.match(diagnosticText(stale), /frontier|generation|topology/i);
    assert.equal((await persisted(fixture)).frontier.prs[0].number, 10);
  } finally {
    await removeFixture(fixture);
  }
});

test('accepted and integrated units require a report and PASS evidence for their current head', async () => {
  const fixture = await makeFixture('evidence-boundary');
  try {
    await initFixture(fixture);
    const queued = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: { units: [{ id: 'unit-1', state: 'queued', dependencies: [] }] },
    });
    assert.equal(queued.status, 'OK');

    const accepted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: queued.data.revision,
      patch: {
        units: [{ id: 'unit-1', state: 'accepted', dependencies: [], report: 'reports/unit-1.md', head: 'head-1' }],
        verifications: [{ unitId: 'unit-1', head: 'head-1', verifier: 'luna-max', evidence: 'evidence/unit-1.json', verdict: 'PASS' }],
      },
    });
    assert.equal(accepted.status, 'OK');

    const integrated = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: accepted.data.revision,
      patch: { units: [{ id: 'unit-1', state: 'integrated', dependencies: [], report: 'reports/unit-1.md', head: 'head-1' }] },
    });
    assert.equal(integrated.status, 'OK');
    assert.equal(integrated.data.units[0].state, 'integrated');

    const staleHead = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: integrated.data.revision,
      patch: { units: [{ id: 'unit-1', state: 'integrated', dependencies: [], report: 'reports/unit-1.md', head: 'head-2' }] },
    });
    assert.equal(staleHead.status, 'BLOCK');
    assert.match(diagnosticText(staleHead), /verif|evidence|head/i);
    assert.equal(await revision(fixture), integrated.data.revision);

    const notRun = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: integrated.data.revision,
      patch: {
        units: [{ id: 'unit-1', state: 'integrated', dependencies: [], report: 'reports/unit-1.md', head: 'head-1' }],
        verifications: [{ unitId: 'unit-1', head: 'head-1', verifier: 'luna-max', evidence: 'evidence/unit-1.json', verdict: 'NOT_RUN' }],
      },
    });
    assert.equal(notRun.status, 'BLOCK');
    assert.match(diagnosticText(notRun), /verif|evidence|pass/i);
    assert.equal(await revision(fixture), integrated.data.revision);

    const noReport = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: integrated.data.revision,
      patch: { units: [{ id: 'unit-1', state: 'integrated', dependencies: [], head: 'head-1' }] },
    });
    assert.equal(noReport.status, 'BLOCK');
    assert.match(diagnosticText(noReport), /report/i);
    assert.equal(await revision(fixture), integrated.data.revision);
  } finally {
    await removeFixture(fixture);
  }
});

test('delivered and cancelled programs reject new work, while paused work resumes explicitly', async (t) => {
  for (const terminalState of ['delivered', 'cancelled']) {
    await t.test(`${terminalState} rejects a new queued unit`, async () => {
      const fixture = await makeFixture(`terminal-${terminalState}`);
      try {
        await initFixture(fixture);
        const terminal = await run({
          operation: 'update',
          store: fixture.store,
          expectedRevision: await revision(fixture),
          patch: { executionState: terminalState, stopReason: `entered ${terminalState}` },
        });
        assert.equal(terminal.status, 'OK');
        const next = await run({
          operation: 'update',
          store: fixture.store,
          expectedRevision: terminal.data.revision,
          patch: { units: [{ id: 'new-unit', state: 'queued', dependencies: [] }] },
        });
        assert.equal(next.status, 'BLOCK');
        assert.match(diagnosticText(next), /terminal|completed|cancelled|restart|state/i);
        const after = await persisted(fixture);
        assert.equal(after.executionState, terminalState);
        assert.deepEqual(after.units, []);
      } finally {
        await removeFixture(fixture);
      }
    });
  }

  const fixture = await makeFixture('pause-resume');
  try {
    await initFixture(fixture);
    const paused = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: {
        executionState: 'paused',
        stopReason: 'user paused',
        units: [{ id: 'running-unit', state: 'running', dependencies: [] }],
      },
    });
    assert.equal(paused.status, 'OK');
    const recovered = await run({
      operation: 'read',
      store: fixture.store,
    });
    assert.equal(recovered.data.executionState, 'paused');
    assert.equal(recovered.data.stopReason, 'user paused');
    assert.deepEqual(recovered.data.units, paused.data.units);

    const resumed = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: recovered.data.revision,
      patch: { executionState: 'running', stopReason: null },
    });
    assert.equal(resumed.status, 'OK');
    assert.equal(resumed.data.executionState, 'running');
    assert.deepEqual(resumed.data.units, paused.data.units);
  } finally {
    await removeFixture(fixture);
  }
});

test('paused and blocked programs require explicit running recovery before dispatch', async (t) => {
  for (const suspendedState of ['paused', 'blocked']) {
    await t.test(`${suspendedState} rejects implicit dispatch`, async () => {
      const fixture = await makeFixture(`suspended-${suspendedState}`);
      try {
        await initFixture(fixture);
        const suspended = await run({
          operation: 'update',
          store: fixture.store,
          expectedRevision: await revision(fixture),
          patch: { executionState: suspendedState, stopReason: `entered ${suspendedState}` },
        });
        assert.equal(suspended.status, 'OK');
        const implicit = await run({
          operation: 'update',
          store: fixture.store,
          expectedRevision: suspended.data.revision,
          patch: { units: [{ id: 'new-unit', state: 'queued', dependencies: [] }] },
        });
        assert.equal(implicit.status, 'BLOCK');
        assert.match(diagnosticText(implicit), /dispatch|state|paused|blocked/i);
        assert.equal((await persisted(fixture)).units.length, 0);

        const recovered = await run({
          operation: 'update',
          store: fixture.store,
          expectedRevision: suspended.data.revision,
          patch: {
            executionState: 'running',
            stopReason: null,
            units: [{ id: 'new-unit', state: 'queued', dependencies: [] }],
          },
        });
        assert.equal(recovered.status, 'OK');
        assert.equal(recovered.data.executionState, 'running');
        assert.deepEqual(recovered.data.units, [{ id: 'new-unit', state: 'queued', dependencies: [] }]);
      } finally {
        await removeFixture(fixture);
      }
    });
  }
});

test('confirmed units cannot outrun unfinished dependencies', async () => {
  const fixture = await makeFixture('dependency-invariant');
  try {
    await initFixture(fixture);
    const queued = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: {
        units: [
          { id: 'base', state: 'queued', dependencies: [] },
          { id: 'top', state: 'queued', dependencies: ['base'] },
        ],
        verifications: [{ unitId: 'top', head: 'head-top', verifier: 'luna-max', evidence: 'evidence/top.json', verdict: 'PASS' }],
      },
    });
    assert.equal(queued.status, 'OK');
    const currentRevision = queued.data.revision;

    for (const prematureState of ['accepted', 'integrated']) {
      const premature = await run({
        operation: 'update',
        store: fixture.store,
        expectedRevision: currentRevision,
        patch: {
          units: [
            { id: 'base', state: 'queued', dependencies: [] },
            { id: 'top', state: prematureState, dependencies: ['base'], report: 'reports/top.md', head: 'head-top' },
          ],
        },
      });
      assert.equal(premature.status, 'BLOCK');
      assert.match(diagnosticText(premature), /depend/i);
      assert.equal(await revision(fixture), currentRevision);
    }

    const accepted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [
          { id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' },
          { id: 'top', state: 'accepted', dependencies: ['base'], report: 'reports/top.md', head: 'head-top' },
        ],
        verifications: [
          { unitId: 'top', head: 'head-top', verifier: 'luna-max', evidence: 'evidence/top.json', verdict: 'PASS' },
          { unitId: 'base', head: 'head-base', verifier: 'luna-max', evidence: 'evidence/base.json', verdict: 'PASS' },
        ],
      },
    });
    assert.equal(accepted.status, 'OK');
    assert.equal(accepted.data.units.find(unit => unit.id === 'top').state, 'accepted');
  } finally {
    await removeFixture(fixture);
  }
});

test('update cannot silently delete recorded units or regress confirmed ones', async () => {
  const fixture = await makeFixture('snapshot-protection');
  try {
    await initFixture(fixture);
    const accepted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: {
        units: [
          { id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' },
          { id: 'top', state: 'queued', dependencies: ['base'] },
        ],
        verifications: [{ unitId: 'base', head: 'head-base', verifier: 'luna-max', evidence: 'evidence/base.json', verdict: 'PASS' }],
      },
    });
    assert.equal(accepted.status, 'OK');
    const currentRevision = accepted.data.revision;

    const removed = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: { units: [{ id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' }] },
    });
    assert.equal(removed.status, 'BLOCK');
    assert.match(diagnosticText(removed), /delet|remov|unit/i);
    assert.equal((await persisted(fixture)).units.length, 2);

    for (const regressedState of ['queued', 'running', 'returned', 'failed', 'abandoned', 'cancelled']) {
      const regressed = await run({
        operation: 'update',
        store: fixture.store,
        expectedRevision: currentRevision,
        patch: {
          units: [
            { id: 'base', state: regressedState, dependencies: [], report: 'reports/base.md', head: 'head-base' },
            { id: 'top', state: 'queued', dependencies: ['base'] },
          ],
        },
      });
      assert.equal(regressed.status, 'BLOCK');
      assert.match(diagnosticText(regressed), /reopen|regress/i);
      assert.equal((await persisted(fixture)).units[0].state, 'accepted');
    }

    const demoted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [
          { id: 'base', state: 'integrated', dependencies: [], report: 'reports/base.md', head: 'head-base' },
          { id: 'top', state: 'queued', dependencies: ['base'] },
        ],
      },
    });
    assert.equal(demoted.status, 'OK');
    assert.equal(demoted.data.units[0].state, 'integrated');

    const backToAccepted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: demoted.data.revision,
      patch: {
        units: [
          { id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' },
          { id: 'top', state: 'queued', dependencies: ['base'] },
        ],
      },
    });
    assert.equal(backToAccepted.status, 'BLOCK');
    assert.match(diagnosticText(backToAccepted), /reopen|regress/i);
  } finally {
    await removeFixture(fixture);
  }
});

test('update cannot delete or rewrite recorded verifications, only append', async () => {
  const fixture = await makeFixture('verification-protection');
  try {
    await initFixture(fixture);
    const accepted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: {
        units: [{ id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' }],
        verifications: [{ unitId: 'base', head: 'head-base', verifier: 'luna-max', evidence: 'evidence/base.json', verdict: 'PASS' }],
      },
    });
    assert.equal(accepted.status, 'OK');
    const currentRevision = accepted.data.revision;

    const emptied = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [{ id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' }],
        verifications: [],
      },
    });
    assert.equal(emptied.status, 'BLOCK');
    assert.match(diagnosticText(emptied), /verif|delet|remov|append/i);
    assert.equal((await persisted(fixture)).verifications.length, 1);

    const rewritten = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [{ id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' }],
        verifications: [{ unitId: 'base', head: 'head-base', verifier: 'someone-else', evidence: 'evidence/other.json', verdict: 'PASS' }],
      },
    });
    assert.equal(rewritten.status, 'BLOCK');
    assert.match(diagnosticText(rewritten), /verif|delet|remov|append|rewrit/i);

    const appended = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: currentRevision,
      patch: {
        units: [{ id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' }],
        verifications: [
          { unitId: 'base', head: 'head-base', verifier: 'luna-max', evidence: 'evidence/base.json', verdict: 'PASS' },
          { unitId: 'base', head: 'head-base', verifier: 'second-opinion', evidence: 'evidence/second.json', verdict: 'PASS' },
        ],
      },
    });
    assert.equal(appended.status, 'OK');
    assert.equal(appended.data.verifications.length, 2);
  } finally {
    await removeFixture(fixture);
  }
});

test('reopen explicitly reopens confirmed units with a recorded reason and history', async () => {
  const fixture = await makeFixture('reopen');
  try {
    await initFixture(fixture);
    const accepted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: await revision(fixture),
      patch: {
        units: [
          { id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' },
          { id: 'top', state: 'accepted', dependencies: ['base'], report: 'reports/top.md', head: 'head-top' },
        ],
        verifications: [
          { unitId: 'base', head: 'head-base', verifier: 'luna-max', evidence: 'evidence/base.json', verdict: 'PASS' },
          { unitId: 'top', head: 'head-top', verifier: 'luna-max', evidence: 'evidence/top.json', verdict: 'PASS' },
        ],
      },
    });
    assert.equal(accepted.status, 'OK');
    const currentRevision = accepted.data.revision;

    const blockedByDependent = await run({
      operation: 'reopen',
      store: fixture.store,
      unitId: 'base',
      reason: 'evidence was forged',
      expectedRevision: currentRevision,
    });
    assert.equal(blockedByDependent.status, 'BLOCK');
    assert.match(diagnosticText(blockedByDependent), /dependent/i);

    const missingReason = await run({
      operation: 'reopen',
      store: fixture.store,
      unitId: 'top',
      expectedRevision: currentRevision,
    });
    assert.equal(missingReason.status, 'BLOCK');
    assert.match(diagnosticText(missingReason), /reason/i);

    const notConfirmed = await run({
      operation: 'reopen',
      store: fixture.store,
      unitId: 'missing-unit',
      reason: 'does not exist',
      expectedRevision: currentRevision,
    });
    assert.equal(notConfirmed.status, 'BLOCK');
    assert.match(diagnosticText(notConfirmed), /unknown|confirm/i);

    const reopened = await run({
      operation: 'reopen',
      store: fixture.store,
      unitId: 'top',
      reason: 'verification evidence could not be reproduced',
      expectedRevision: currentRevision,
    });
    assert.equal(reopened.status, 'OK');
    assert.equal(reopened.changed, true);
    assert.equal(reopened.data.revision, currentRevision + 1);
    const reopenedUnit = reopened.data.units.find(unit => unit.id === 'top');
    assert.equal(reopenedUnit.state, 'queued');
    assert.deepEqual(reopenedUnit.history, [
      { from: 'accepted', to: 'queued', reason: 'verification evidence could not be reproduced', revision: currentRevision + 1 },
    ]);

    const persistedAfter = await persisted(fixture);
    assert.equal(persistedAfter.units.find(unit => unit.id === 'top').state, 'queued');
    assert.equal(persistedAfter.units.find(unit => unit.id === 'base').state, 'accepted');

    const resubmitted = await run({
      operation: 'update',
      store: fixture.store,
      expectedRevision: reopened.data.revision,
      patch: {
        units: [
          { id: 'base', state: 'accepted', dependencies: [], report: 'reports/base.md', head: 'head-base' },
          { id: 'top', state: 'accepted', dependencies: ['base'], report: 'reports/top-v2.md', head: 'head-top-2' },
        ],
        verifications: [
          { unitId: 'base', head: 'head-base', verifier: 'luna-max', evidence: 'evidence/base.json', verdict: 'PASS' },
          { unitId: 'top', head: 'head-top', verifier: 'luna-max', evidence: 'evidence/top.json', verdict: 'PASS' },
          { unitId: 'top', head: 'head-top-2', verifier: 'luna-max', evidence: 'evidence/top-2.json', verdict: 'PASS' },
        ],
      },
    });
    assert.equal(resubmitted.status, 'OK');
    const finalTop = resubmitted.data.units.find(unit => unit.id === 'top');
    assert.equal(finalTop.state, 'accepted');
  } finally {
    await removeFixture(fixture);
  }
});

test('A23 inbox events are idempotent, conflict-safe, and drained in batches', async () => {
  const fixture = await makeFixture('inbox');
  try {
    await initFixture(fixture);
    const event = { id: 'event-1', unitId: 'unit-1', report: 'reports/unit-1.md' };
    const first = await run({ operation: 'inbox-add', store: fixture.store, event });
    assertEnvelope(first);
    assert.equal(first.status, 'OK');
    assert.equal(first.changed, true);
    const duplicate = await run({ operation: 'inbox-add', store: fixture.store, event: { ...event } });
    assert.equal(duplicate.status, 'OK');
    assert.equal(duplicate.changed, false);
    const inboxNames = await readdir(join(fixture.store, 'inbox'));
    assert.equal(inboxNames.length, 1);

    const conflict = await run({
      operation: 'inbox-add',
      store: fixture.store,
      event: { ...event, report: 'reports/different.md' },
    });
    assert.equal(conflict.status, 'BLOCK');
    assert.match(diagnosticText(conflict), /event|report|different|conflict/i);
    assert.equal((await readdir(join(fixture.store, 'inbox'))).length, 1);

    const drained = await run({ operation: 'inbox-drain', store: fixture.store });
    assertEnvelope(drained);
    assert.equal(drained.status, 'OK');
    assert.equal(drained.changed, true);
    assert.deepEqual(drained.data.events, [event]);
    assert.deepEqual(await readdir(join(fixture.store, 'inbox')), []);

    const archivedDuplicate = await run({ operation: 'inbox-add', store: fixture.store, event: { ...event } });
    assert.equal(archivedDuplicate.status, 'OK');
    assert.equal(archivedDuplicate.changed, false);
    const archivedConflict = await run({
      operation: 'inbox-add',
      store: fixture.store,
      event: { ...event, report: 'reports/late-different.md' },
    });
    assert.equal(archivedConflict.status, 'BLOCK');

    const late = { id: 'event-2', unitId: 'unit-2', report: 'reports/unit-2.md' };
    const beforeLate = await persisted(fixture);
    await run({ operation: 'inbox-add', store: fixture.store, event: late });
    const empty = await run({ operation: 'inbox-drain', store: fixture.store });
    assert.equal(empty.status, 'OK');
    assert.deepEqual(empty.data.events, [late]);
    assert.deepEqual(await persisted(fixture), beforeLate);
    const final = await run({ operation: 'inbox-drain', store: fixture.store });
    assert.equal(final.status, 'OK');
    assert.equal(final.changed, false);
    assert.deepEqual(final.data.events, []);
  } finally {
    await removeFixture(fixture);
  }
});

test('inbox-drain interruption does not lose an event moved before the failure', async () => {
  const fixture = await makeFixture('inbox-interruption');
  try {
    await initFixture(fixture);
    const event = { id: 'event-before-invalid-entry', unitId: 'unit-1', report: 'reports/unit-1.md' };
    await run({ operation: 'inbox-add', store: fixture.store, event });
    const invalidPath = join(fixture.store, 'inbox', 'zz-invalid.json');
    await writeFile(invalidPath, 'invalid inbox entry\n', 'utf8');

    const interrupted = await run({ operation: 'inbox-drain', store: fixture.store });
    assertEnvelope(interrupted);
    assert.equal(interrupted.status, 'BLOCK');
    assert.match(diagnosticText(interrupted), /inbox|unexpected|invalid/i);

    await rm(invalidPath, { force: true });
    const retried = await run({ operation: 'inbox-drain', store: fixture.store });
    assertEnvelope(retried);
    assert.equal(retried.status, 'OK');
    assert.deepEqual(retried.data.events, [event]);
  } finally {
    await removeFixture(fixture);
  }
});

test('invalid persisted JSON is reported instead of being silently repaired', async () => {
  const fixture = await makeFixture('corrupt');
  try {
    await writeFile(join(fixture.store, 'program.json'), '{not-json\n', 'utf8');
    const result = await run({ operation: 'read', store: fixture.store });
    assertEnvelope(result);
    assert.equal(result.status, 'BLOCK');
    assert.equal(result.changed, false);
    assert.match(diagnosticText(result), /json|parse|unexpected/i);
    assert.equal(await readFile(join(fixture.store, 'program.json'), 'utf8'), '{not-json\n');
  } finally {
    await removeFixture(fixture);
  }
});

test('state.mjs --input emits one JSON result on stdout', async () => {
  const fixture = await makeFixture('cli');
  try {
    const inputPath = join(fixture.root, 'request.json');
    await writeFile(inputPath, JSON.stringify({
      operation: 'init',
      store: fixture.store,
      taskId: 'cli-task',
      goal: 'exercise CLI input',
      projectRoot: fixture.projectRoot,
    }), 'utf8');
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, '--input', inputPath], {
      cwd: fixture.projectRoot,
      windowsHide: true,
    });
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 1, `stdout must contain one JSON document; stderr=${stderr}`);
    const result = JSON.parse(lines[0]);
    assertEnvelope(result);
    assert.equal(result.status, 'OK');
    assert.equal(result.data.taskId, 'cli-task');
  } finally {
    await removeFixture(fixture);
  }
});
