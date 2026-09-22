import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { run as anchor } from '../../skills/nimo-mode/scripts/task-anchor.mjs';
import { run as verify } from '../../skills/nimo-verify/scripts/record.mjs';
import { run as inspect } from '../../skills/nimo-inspect/scripts/inspect.mjs';
import { readCodexSource } from '../../skills/nimo-inspect/scripts/hosts/codex.mjs';

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nimo-review-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const hash = createHash('sha256').update('pass').digest('hex');
  const snapshot = { source: 'filesystem', fileHashes: { 'artifact.txt': { status: 'PRESENT', sha256: hash, size: 4 } } };
  await fs.writeFile(path.join(root, 'artifact.txt'), 'pass');
  await fs.writeFile(path.join(root, 'evidence.txt'), 'pass');
  assert.equal((await anchor({ operation: 'init', projectRoot: root, taskId: 'review', goal: 'Read safely', scope: ['artifact.txt'], acceptance: [{ id: 'AC-1', text: 'Works', required: true }], confirmedBy: 'fixture:user' })).status, 'OK');
  const request = { projectRoot: root, taskId: 'review', environment: 'local', currentSnapshot: snapshot };
  const save = async () => verify({ ...request, operation: 'write', contractRevision: 1, artifactVersion: 'v1', executor: 'review', independent: true, artifactSnapshot: snapshot, checks: [{ checkId: 'C1', acceptanceIds: ['AC-1'], source: 'test', operation: 'read artifact', result: 'PASS', evidence: [{ source: 'fixture', location: 'evidence.txt', sha256: hash }] }] });
  return { root, request, save };
}

test('Anchor without verification still renders a readable report', async t => {
  const { request } = await setup(t);
  const result = await inspect(request);
  assert.notEqual(result.status, 'ERROR');
  assert.equal(result.data.currentVerdict, 'UNVERIFIED');
  assert.match(await fs.readFile(result.data.htmlPath, 'utf8'), /缺少最终验证记录/);
});

test('missing target environment cannot be MATCH', async t => {
  const { request, save } = await setup(t);
  await save();
  const result = await inspect({ ...request, environment: undefined });
  assert.equal(result.data.applicability.status, 'UNKNOWN');
  assert.equal(result.data.currentVerdict, 'UNVERIFIED');
});

test('deleted evidence invalidates current conclusion but retains historical verdict', async t => {
  const { root, request, save } = await setup(t);
  await save();
  assert.equal((await inspect(request)).data.currentVerdict, 'VERIFIED');
  await fs.unlink(path.join(root, 'evidence.txt'));
  const result = await inspect(request);
  assert.equal(result.data.verification.recordedVerdict, 'VERIFIED');
  assert.equal(result.data.currentVerdict, 'UNVERIFIED');
  assert.match(await fs.readFile(result.data.htmlPath, 'utf8'), /缺少当前可访问且内容已绑定的证据/);
});

test('forged record verdict is visibly rejected in HTML', async t => {
  const { root, request, save } = await setup(t);
  await save();
  const file = path.join(root, '.nimo/tasks/review/verification.json');
  const record = JSON.parse(await fs.readFile(file));
  record.checks = [];
  await fs.writeFile(file, JSON.stringify(record));
  const result = await inspect(request);
  assert.equal(result.data.currentVerdict, 'UNVERIFIED');
  const html = await fs.readFile(result.data.htmlPath, 'utf8');
  assert.match(html, /没有对应检查/);
  assert.match(html, /合同修订 1/);
});

test('real Codex envelope projects no raw payload and rejects wrong workspace', async t => {
  const { root, request, save } = await setup(t);
  const source = path.join(root, 'rollout.jsonl');
  const rows = [
    { type: 'session_meta', payload: { id: 'declared', cwd: root } },
    { type: 'turn_context', payload: { turn_id: 'turn-a' } },
    { type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: 'credential=PRIVATE_FIXTURE' } },
    { type: 'response_item', payload: { type: 'reasoning', text: 'HIDDEN_FIXTURE' } },
    { type: 'turn_context', payload: { turn_id: 'turn-b' } },
    { type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', input: 'PRIVATE_PATCH' } },
  ];
  await fs.writeFile(source, rows.map(row => JSON.stringify(row)).join('\n'));
  const result = await readCodexSource({ sessionId: 'declared', source }, root);
  assert.equal(result.status, 'OK');
  assert.equal(result.events[2].kind, 'execute');
  assert.equal(result.events[5].turn, 2);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|HIDDEN/);
  assert.equal((await readCodexSource({ sessionId: 'wrong', source }, root)).status, 'SOURCE_MISMATCH');
  assert.equal((await readCodexSource({ sessionId: 'declared', source }, path.join(root, 'other'))).status, 'SOURCE_MISMATCH');
  await save();
  assert.equal((await anchor({ ...request, operation: 'session-ref', sessionRef: { host: 'codex', sessionId: 'declared', source, eventStart: '3', eventEnd: '6' } })).status, 'OK');
  const projected = await inspect(request);
  assert.deepEqual(projected.data.sessions.refs[0].activities.map(event => event.kind), ['execute/check', 'change']);
  assert.doesNotMatch(await fs.readFile(projected.data.htmlPath, 'utf8'), /PRIVATE|HIDDEN/);
});

test('Windows junction evidence is refused without reading outside content', async t => {
  const { root, request, save } = await setup(t);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'nimo-outside-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.writeFile(path.join(outside, 'secret.txt'), 'PRIVATE_EXTERNAL');
  await fs.symlink(outside, path.join(root, 'junction'), process.platform === 'win32' ? 'junction' : 'dir');
  await save();
  const file = path.join(root, '.nimo/tasks/review/verification.json');
  const record = JSON.parse(await fs.readFile(file));
  record.checks[0].evidence[0].location = 'junction/secret.txt';
  await fs.writeFile(file, JSON.stringify(record));
  const result = await inspect(request);
  assert.equal(result.data.evidence[0].status, 'SYMLINK_REFUSED');
  assert.doesNotMatch(await fs.readFile(result.data.htmlPath, 'utf8'), /PRIVATE_EXTERNAL/);
});

test('Inspector cannot overwrite task records or source files through output', async t => {
  const { root, request, save } = await setup(t);
  await save();
  const recordFile = path.join(root, '.nimo/tasks/review/verification.json');
  const before = await fs.readFile(recordFile, 'utf8');
  const result = await inspect({ ...request, output: recordFile });
  assert.equal(result.errorCode, 'INVALID_REPORT_OUTPUT');
  assert.equal(await fs.readFile(recordFile, 'utf8'), before);
});

test('incomplete current Git observation is UNKNOWN, not a matching clean checkout', async t => {
  const { request, save } = await setup(t);
  await save();
  const result = await inspect({ ...request, currentSnapshot: { snapshotStatus: 'UNKNOWN', fileHashes: {} } });
  assert.equal(result.data.applicability.status, 'UNKNOWN');
  assert.equal(result.data.currentVerdict, 'UNVERIFIED');
});

test('malformed check entries produce a visible invalid-record report', async t => {
  const { root, request, save } = await setup(t);
  await save();
  const file = path.join(root, '.nimo/tasks/review/verification.json');
  const record = JSON.parse(await fs.readFile(file));
  record.checks = [null];
  await fs.writeFile(file, JSON.stringify(record));
  const result = await inspect(request);
  assert.notEqual(result.status, 'ERROR');
  assert.equal(result.data.currentVerdict, 'UNVERIFIED');
});
