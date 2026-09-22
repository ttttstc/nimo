import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { run as anchor } from '../../skills/nimo-mode/scripts/task-anchor.mjs';
import { run as verify } from '../../skills/nimo-verify/scripts/record.mjs';
import { captureSnapshot } from '../../skills/nimo-mode/scripts/lib/task-records.mjs';

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nimo-record-review-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const base = { projectRoot: root, taskId: 'record-review' };
  const contract = { goal: 'Deliver', scope: ['result.txt'], acceptance: [{ id: 'AC1', text: 'Expected result', required: true }], confirmedBy: 'user-fixture' };
  assert.equal((await anchor({ ...base, ...contract, operation: 'init' })).status, 'OK');
  const check = { checkId: 'C1', acceptanceIds: ['AC1'], source: 'suite', operation: 'check result', result: 'FAIL', reason: 'unexpected', evidence: [{ source: 'log', location: 'result.log' }] };
  const write = (extra = {}) => verify({ ...base, operation: 'write', contractRevision: 1, artifactVersion: 'v1', environment: 'local', executor: 'test', independent: true, time: '2026-09-22T10:00:00Z', checks: [check], ...extra });
  return { root, base, check, write, contract };
}

test('later fixed artifact resolves a prior failure with retained version evidence', async t => {
  const { write, check } = await setup(t);
  const fail = await write();
  assert.equal(fail.data.recordedVerdict, 'UNVERIFIED');
  const fixed = await write({ artifactVersion: 'v2', time: '2026-09-22T10:01:00Z', checks: [{ ...check, result: 'PASS' }] });
  assert.equal(fixed.status, 'OK', JSON.stringify(fixed));
  assert.equal(fixed.data.unresolvedFailures.length, 0);
  assert.equal(fixed.data.resolvedFailures[0].failedArtifactVersion, 'v1');
  assert.equal(fixed.data.resolvedFailures[0].resolvedArtifactVersion, 'v2');
});

test('same check ID with different environment or changed expectation cannot erase a FAIL', async t => {
  const { write, check, base, contract } = await setup(t);
  await write();
  const other = await write({ environment: 'other', time: '2026-09-22T10:01:00Z', checks: [{ ...check, result: 'PASS' }] });
  assert.equal(other.data.recordedVerdict, 'UNVERIFIED');
  await anchor({ ...base, ...contract, operation: 'revise', expectedRevision: 1, acceptance: [{ id: 'AC1', text: 'Different result', required: true }] });
  const changed = await write({ contractRevision: 2, time: '2026-09-22T10:02:00Z', checks: [{ ...check, result: 'PASS' }] });
  assert.equal(changed.data.recordedVerdict, 'UNVERIFIED');
});

test('reading forged evidence and skip declarations never grants a passing verdict', async t => {
  const { root, base, write, check } = await setup(t);
  await write({ checks: [{ ...check, result: 'PASS' }] });
  const file = path.join(root, '.nimo/tasks/record-review/verification.json');
  const record = JSON.parse(await fs.readFile(file));
  record.checks[0].evidence = [{}];
  await fs.writeFile(file, JSON.stringify(record));
  assert.equal((await verify({ ...base, operation: 'validate' })).status, 'BLOCK');
  record.checks[0].result = 'NOT_RUN';
  record.checks[0].evidence = [];
  record.recordedVerdict = 'PASS_WITH_SKIPS';
  record.skipDeclarations = [{ checkId: 'C1', taskId: base.taskId, artifactVersion: 'v1', environment: 'local' }];
  await fs.writeFile(file, JSON.stringify(record));
  const result = await verify({ ...base, operation: 'validate' });
  assert.equal(result.status, 'BLOCK');
  assert.match(JSON.stringify(result.diagnostics), /缺少必填字段 source/);
});

test('malformed acceptance mapping is diagnosed rather than thrown', async t => {
  const { root, base, write, check } = await setup(t);
  await write({ checks: [{ ...check, result: 'PASS' }] });
  const file = path.join(root, '.nimo/tasks/record-review/verification.json');
  const record = JSON.parse(await fs.readFile(file));
  record.checks[0].acceptanceIds = {};
  await fs.writeFile(file, JSON.stringify(record));
  assert.equal((await verify({ ...base, operation: 'validate' })).status, 'BLOCK');
});

test('Git snapshot binds staged bytes even if worktree bytes and status codes stay unchanged', async t => {
  const { root } = await setup(t);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { windowsHide: true, stdio: 'pipe' });
  git('init'); git('config', 'user.name', 'fixture'); git('config', 'user.email', 'fixture@example.invalid');
  const file = path.join(root, 'result.txt');
  await fs.writeFile(file, 'base'); git('add', 'result.txt'); git('commit', '-m', 'base');
  await fs.writeFile(file, 'stage-one'); git('add', 'result.txt'); await fs.writeFile(file, 'worktree');
  const first = await captureSnapshot(root);
  await fs.writeFile(file, 'stage-two'); git('add', 'result.txt'); await fs.writeFile(file, 'worktree');
  const second = await captureSnapshot(root);
  assert.notEqual(first.dirtyHash, second.dirtyHash);
  await fs.mkdir(path.join(root, '.nimo/inspector'), { recursive: true });
  await fs.writeFile(path.join(root, '.nimo/inspector/report.html'), 'runtime');
  git('add', '-f', '.nimo/inspector/report.html');
  assert.equal((await captureSnapshot(root)).dirtyHash, second.dirtyHash);
});

test('Git subdirectory and leading-space paths bind the correct file content', async t => {
  const { root } = await setup(t);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { windowsHide: true, stdio: 'pipe' });
  git('init'); git('config', 'user.name', 'fixture'); git('config', 'user.email', 'fixture@example.invalid');
  await fs.writeFile(path.join(root, 'base'), 'base'); git('add', 'base'); git('commit', '-m', 'base');
  const child = path.join(root, 'child'); await fs.mkdir(child);
  const file = path.join(child, ' leading.txt'); await fs.writeFile(file, 'one');
  const first = await captureSnapshot(child);
  assert.deepEqual(first.dirtyPaths, [' leading.txt']);
  await fs.writeFile(file, 'two');
  assert.notEqual((await captureSnapshot(child)).dirtyHash, first.dirtyHash);
});

test('Task Anchor refuses a real Windows junction before creating records outside workspace', async t => {
  const { root } = await setup(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'nimo-record-outside-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  const child = path.join(root, 'child'); await fs.mkdir(child);
  await fs.symlink(outside, path.join(child, '.nimo'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = await anchor({ operation: 'init', projectRoot: child, taskId: 'escape', goal: 'x', scope: ['x'], acceptance: [{ id: 'A', text: 'x', required: true }], confirmedBy: 'fixture' });
  assert.equal(result.errorCode, 'SYMLINK_REFUSED');
  assert.deepEqual(await fs.readdir(outside), []);
});
