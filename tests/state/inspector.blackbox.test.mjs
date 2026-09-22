import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const anchorScript = resolve(testsDirectory, '../../skills/nimo-mode/scripts/task-anchor.mjs');
const verifyScript = resolve(testsDirectory, '../../skills/nimo-verify/scripts/record.mjs');
const inspectScript = resolve(testsDirectory, '../../skills/nimo-inspect/scripts/inspect.mjs');
const { run: anchor } = await import(pathToFileURL(anchorScript).href);
const { run: verify } = await import(pathToFileURL(verifyScript).href);
const { run: inspectRun } = await import(pathToFileURL(inspectScript).href);
const inspect = request => inspectRun({ environment: 'local', ...request });
const execFileAsync = promisify(execFile);

const snapshot = (overrides = {}) => ({
  source: 'fixture',
  gitHead: 'head-a',
  dirtyHash: 'dirty-a',
  dirtyPaths: [],
  fileHashes: {},
  ...overrides,
});

async function workspace(label) {
  return mkdtemp(join(tmpdir(), `nimo-inspector-${label}-`));
}

async function initTask(root, options = {}) {
  return anchor({
    operation: 'init',
    projectRoot: root,
    taskId: options.taskId ?? 'task-a',
    goal: options.goal ?? '完成任务',
    scope: options.scope ?? ['src'],
    acceptance: options.acceptance ?? [{ id: 'AC-01', text: '功能可用', required: true }],
    confirmedBy: options.confirmedBy ?? 'user-message:test',
    baseline: options.baseline ?? snapshot(),
    sessionRefs: options.sessionRefs ?? [],
    createdAt: options.createdAt ?? '2026-09-22T00:00:00.000Z',
  });
}

async function digest(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

function passCheck(checkId = 'check-1', acceptanceId = 'AC-01', evidence = [{ source: 'test-result', location: 'evidence.txt', sha256: createHash('sha256').update('fixture evidence\n').digest('hex'), version: 'head-a', summary: 'machine result', claim: 'machine-result' }]) {
  return { checkId, acceptanceIds: [acceptanceId], source: 'test-suite', operation: 'run fixture', result: 'PASS', reason: 'observed expected result', evidence };
}

async function writePass(root, options = {}) {
  return verify({
    operation: 'write', projectRoot: root, taskId: options.taskId ?? 'task-a', contractRevision: options.contractRevision ?? 1,
    artifactVersion: options.artifactVersion ?? 'head-a', environment: options.environment ?? 'local', executor: 'test-runner', independent: false,
    checks: options.checks ?? [passCheck()], skipDeclarations: options.skipDeclarations ?? [], artifactSnapshot: options.artifactSnapshot ?? snapshot(),
    time: options.time ?? '2026-09-22T00:01:00.000Z', recordedVerdict: options.recordedVerdict,
  });
}

async function remove(root) {
  await rm(root, { recursive: true, force: true });
}

test('AC-01: Anchor, Final Verify, and offline HTML form one traceable report', async () => {
  const root = await workspace('ac01');
  try {
    await writeFile(join(root, 'evidence.txt'), 'fixture evidence\n', 'utf8');
    const init = await initTask(root, { goal: '<em>escaped</em> & stable' });
    assert.equal(init.status, 'OK');
    const saved = await writePass(root);
    assert.equal(saved.status, 'OK');
    assert.equal(saved.data.recordedVerdict, 'VERIFIED');
    assert.equal(saved.data.checks[0].required, true);
    const report = await inspect({ projectRoot: root, taskId: 'task-a', currentSnapshot: snapshot(), generatedAt: '2026-09-22T00:02:00.000Z' });
    assert.equal(report.status, 'OK');
    assert.equal(report.data.applicability.status, 'MATCH');
    assert.equal(report.data.currentVerdict, 'VERIFIED');
    assert.equal(report.data.evidence[0].status, 'CLAIM_DECLARED');
    const html = await readFile(report.data.htmlPath, 'utf8');
    assert.match(html, /Nimo 任务检查报告/);
    assert.match(html, /lang="zh-CN"/);
    assert.match(html, /已验证（VERIFIED）/);
    assert.doesNotMatch(html, /Recorded conclusion|Current conclusion|Verification checks|No Audit was found|<th>Required<\/th>/);
    assert.match(html, /&lt;em&gt;escaped&lt;\/em&gt;/);
    assert.doesNotMatch(html, /<em>escaped<\/em>/);
    assert.match(html, /MATCH/);
    assert.equal((await stat(report.data.htmlPath)).isFile(), true);
  } finally {
    await remove(root);
  }
});

test('AC-01: CLI scripts emit one JSON result and create the report through the real entry points', async () => {
  const root = await workspace('cli');
  try {
    await writeFile(join(root, 'request-anchor.json'), JSON.stringify({ operation: 'init', projectRoot: root, taskId: 'cli-task', goal: 'CLI', scope: ['src'], acceptance: [{ id: 'AC-01', text: 'works', required: true }], confirmedBy: 'user', baseline: snapshot() }), 'utf8');
    const anchorCli = await execFileAsync(process.execPath, [anchorScript, '--input', join(root, 'request-anchor.json')], { cwd: root, windowsHide: true });
    assert.equal(anchorCli.stdout.trim().split(/\r?\n/).length, 1);
    assert.equal(JSON.parse(anchorCli.stdout).status, 'OK');
    await writeFile(join(root, 'request-verify.json'), JSON.stringify({ operation: 'write', projectRoot: root, taskId: 'cli-task', contractRevision: 1, artifactVersion: 'head-a', environment: 'local', executor: 'cli', independent: false, checks: [passCheck()], artifactSnapshot: snapshot() }), 'utf8');
    const verifyCli = await execFileAsync(process.execPath, [verifyScript, '--input', join(root, 'request-verify.json')], { cwd: root, windowsHide: true });
    assert.equal(JSON.parse(verifyCli.stdout).data.recordedVerdict, 'VERIFIED');
    await writeFile(join(root, 'request-inspect.json'), JSON.stringify({ projectRoot: root, taskId: 'cli-task', currentSnapshot: snapshot(), output: join(root, '.nimo/inspector/cli-report.html') }), 'utf8');
    const inspectCli = await execFileAsync(process.execPath, [inspectScript, '--input', join(root, 'request-inspect.json')], { cwd: root, windowsHide: true });
    const inspected = JSON.parse(inspectCli.stdout);
    assert.equal(inspected.status, 'OK');
    assert.equal(await stat(join(root, '.nimo/inspector/cli-report.html')).then(value => value.isFile()), true);
  } finally {
    await remove(root);
  }
});

test('AC-02 and AC-12: revisions preserve history, reject stale writes, and initialization is idempotent', async () => {
  const root = await workspace('revisions');
  try {
    const first = await initTask(root);
    const second = await initTask(root);
    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    await writePass(root);
    const revised = await anchor({ operation: 'revise', projectRoot: root, taskId: 'task-a', expectedRevision: 1, goal: '新目标', scope: ['src'], acceptance: [{ id: 'AC-01', text: '新验收', required: true }], confirmedBy: 'user-message:revision', confirmedAt: '2026-09-22T00:03:00.000Z' });
    assert.equal(revised.status, 'OK');
    assert.equal(revised.data.contractRevision, 2);
    const staleWrite = await writePass(root, { contractRevision: 1 });
    assert.equal(staleWrite.status, 'ERROR');
    assert.equal(staleWrite.errorCode, 'STALE_CONTRACT_REVISION');
    const report = await inspect({ projectRoot: root, taskId: 'task-a', currentSnapshot: snapshot(), generatedAt: '2026-09-22T00:04:00.000Z' });
    assert.equal(report.data.verification.contractRevision, 1);
    assert.equal(report.data.verification.recordedVerdict, 'VERIFIED');
    assert.equal(report.data.applicability.status, 'STALE');
    assert.match(report.data.applicability.reasons.join(' '), /合同修订/);
    const conflict = await anchor({ operation: 'revise', projectRoot: root, taskId: 'task-a', expectedRevision: 1, goal: '冲突', scope: ['src'], acceptance: [{ id: 'AC-01', text: '冲突', required: true }], confirmedBy: 'user-message:conflict' });
    assert.equal(conflict.status, 'ERROR');
    assert.equal(conflict.errorCode, 'REVISION_CONFLICT');
  } finally {
    await remove(root);
  }
});

test('AC-03: requiredness comes from Anchor and malformed coverage cannot forge a passing verdict', async () => {
  const root = await workspace('coverage');
  try {
    await initTask(root, { acceptance: [{ id: 'AC-01', text: 'one', required: true }, { id: 'AC-02', text: 'two', required: true }] });
    const missing = await writePass(root, { checks: [passCheck('check-1', 'AC-01')] });
    assert.equal(missing.status, 'WARN');
    assert.equal(missing.data.recordedVerdict, 'UNVERIFIED');
    assert.ok(missing.diagnostics.some(item => /AC-02/.test(item.message)));
    const duplicate = await writePass(root, { checks: [passCheck('check-1', 'AC-01'), passCheck('check-1', 'AC-01')] });
    assert.equal(duplicate.status, 'ERROR');
    assert.equal(duplicate.errorCode, 'DUPLICATE_CHECK');
    const unknown = await writePass(root, { checks: [passCheck('check-1', 'AC-99')] });
    assert.equal(unknown.status, 'ERROR');
    assert.equal(unknown.errorCode, 'UNKNOWN_ACCEPTANCE');
    const forged = await writePass(root, { checks: [{ ...passCheck(), result: 'NOT_RUN', evidence: [], reason: 'not run' }], recordedVerdict: 'VERIFIED' });
    assert.equal(forged.status, 'ERROR');
    assert.equal(forged.errorCode, 'VERDICT_MISMATCH');
    await writePass(root, { checks: [passCheck('check-1', 'AC-01'), passCheck('check-2', 'AC-02')] });
    const verificationPath = join(root, '.nimo', 'tasks', 'task-a', 'verification.json');
    const tampered = JSON.parse(await readFile(verificationPath, 'utf8'));
    tampered.checks[0].required = false;
    await writeFile(verificationPath, `${JSON.stringify(tampered)}\n`, 'utf8');
    const tamperedResult = await verify({ operation: 'validate', projectRoot: root, taskId: 'task-a' });
    assert.equal(tamperedResult.status, 'BLOCK');
    assert.ok(tamperedResult.diagnostics.some(item => /必需属性/.test(item.message)));
  } finally {
    await remove(root);
  }
});

test('AC-04 and AC-05: declared skips allow PASS_WITH_SKIPS but cannot hide an unresolved FAIL', async () => {
  const root = await workspace('verdict');
  try {
    await initTask(root);
    const skip = { checkId: 'check-1', source: 'user-message:test', reason: 'environment unavailable', taskId: 'task-a', artifactVersion: 'head-a', environment: 'local' };
    const passWithSkips = await writePass(root, { checks: [{ ...passCheck(), result: 'NOT_RUN', evidence: [], reason: 'not executed' }], skipDeclarations: [skip] });
    assert.equal(passWithSkips.status, 'OK');
    assert.equal(passWithSkips.data.recordedVerdict, 'PASS_WITH_SKIPS');
    const valid = await verify({ operation: 'validate', projectRoot: root, taskId: 'task-a', expectedEnvironment: 'local', expectedArtifactVersion: 'head-a' });
    assert.equal(valid.status, 'OK');
    const wrongScope = await writePass(root, { checks: [{ ...passCheck(), result: 'NOT_RUN', evidence: [], reason: 'not executed' }], skipDeclarations: [{ ...skip, environment: 'production' }] });
    assert.equal(wrongScope.status, 'WARN');
    const wrongScopeValidation = await verify({ operation: 'validate', projectRoot: root, taskId: 'task-a' });
    assert.equal(wrongScopeValidation.status, 'BLOCK');
    const failed = await writePass(root, { checks: [{ ...passCheck(), result: 'FAIL', reason: 'observed failure' }] });
    assert.equal(failed.data.recordedVerdict, 'UNVERIFIED');
    const laterSkip = await writePass(root, { checks: [{ ...passCheck(), result: 'NOT_RUN', evidence: [], reason: 'later skipped' }], skipDeclarations: [skip] });
    assert.equal(laterSkip.data.recordedVerdict, 'UNVERIFIED');
    assert.equal(laterSkip.data.unresolvedFailures.length, 1);
    const blocked = await verify({ operation: 'validate', projectRoot: root, taskId: 'task-a' });
    assert.equal(blocked.status, 'BLOCK');
    assert.ok(blocked.diagnostics.some(item => /未解决的失败/.test(item.message)));
  } finally {
    await remove(root);
  }
});

test('AC-06 and AC-07: artifact changes stale a historical result while preserving the record', async () => {
  const root = await workspace('applicability');
  try {
    await writeFile(join(root, 'evidence.txt'), 'a', 'utf8');
    await initTask(root);
    await writePass(root);
    const stale = await inspect({ projectRoot: root, taskId: 'task-a', currentSnapshot: snapshot({ dirtyHash: 'dirty-b' }), generatedAt: '2026-09-22T00:05:00.000Z' });
    assert.equal(stale.data.verification.recordedVerdict, 'VERIFIED');
    assert.equal(stale.data.applicability.status, 'STALE');
    assert.match(stale.data.applicability.reasons.join(' '), /指纹/);
    const rootB = await workspace('selection');
    try {
      await initTask(rootB, { taskId: 'a-task', createdAt: '2026-09-22T01:00:00.000Z', goal: 'A' });
      await writePass(rootB, { taskId: 'a-task' });
      await initTask(rootB, { taskId: 'b-task', createdAt: '2026-09-22T01:00:00.000Z', goal: 'B' });
      const selected = await inspect({ projectRoot: rootB, currentSnapshot: snapshot(), generatedAt: '2026-09-22T01:01:00.000Z' });
      assert.equal(selected.data.taskId, 'a-task');
      assert.match(selected.data.selection.reason, /同一时间按任务标识排序/);
    } finally {
      await remove(rootB);
    }
  } finally {
    await remove(root);
  }
});

test('AC-08: evidence status separates reference, binding, and claim support', async () => {
  const root = await workspace('evidence');
  try {
    const evidence = join(root, 'evidence.txt');
    await writeFile(evidence, 'original', 'utf8');
    const oldDigest = await digest(evidence);
    await initTask(root);
    await writePass(root, {
      checks: [passCheck('check-1', 'AC-01', [
        { source: 'file', location: 'evidence.txt' },
        { source: 'file', location: 'missing.txt' },
        { source: 'file', location: 'evidence.txt', sha256: 'wrong', version: 'head-a' },
        { source: 'remote', location: 'https://example.invalid/result' },
        { source: 'file', location: 'evidence.txt', sha256: oldDigest, version: 'head-a', summary: 'machine result', claim: 'machine-result' },
      ])],
    });
    const report = await inspect({ projectRoot: root, taskId: 'task-a', currentSnapshot: snapshot() });
    assert.deepEqual(report.data.evidence.map(item => item.status), ['REFERENCED_ONLY', 'MISSING', 'CHANGED', 'REMOTE_UNCHECKED', 'CLAIM_DECLARED']);
    assert.equal(report.data.evidence[4].supportsClaim, false);
  } finally {
    await remove(root);
  }
});

test('AC-09 and AC-10: only declared bounded Session events project, and old Audit remains optional', async () => {
  const root = await workspace('session-audit');
  try {
    const sessionFile = join(root, 'rollout.jsonl');
    await writeFile(sessionFile, [
      { type: 'session_meta', payload: { id: 's1', cwd: root } },
      { type: 'turn_context', payload: { turn_id: 'one' } },
      { type: 'response_item', payload: { type: 'function_call', name: 'read_file' } },
      { type: 'turn_context', payload: { turn_id: 'two' } },
      { type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch' } },
      { type: 'turn_context', payload: { turn_id: 'three' } },
      { type: 'response_item', payload: { type: 'function_call', name: 'unknown' } },
      { type: 'turn_context', payload: { turn_id: 'four' } },
      { type: 'response_item', payload: { type: 'function_call', name: 'exec_command' } },
    ].map(row => JSON.stringify(row)).join('\n'));
    await initTask(root, {
      sessionRefs: [
        { host: 'codex', sessionId: 's1', source: sessionFile, basis: 'declared', turnStart: 2, turnEnd: 3 },
        { host: 'codex', sessionId: 's2', basis: 'declared' },
      ],
    });
    await writePass(root);
    const auditPath = join(root, '.nimo', 'tasks', 'task-a', 'audit.md');
    await writeFile(auditPath, '<!-- nimo-task-audit:v1 -->\n## Decisions\n| Time | ID | Phase | Decision | Reason | Evidence | Result |\n|---|---|---|---|---|---|---|\n| t | D1 | design | x | y | z | accepted |\n<!-- nimo:audit:decisions:end -->\n## Verification\n| Time | Check | Source | Required | Verification | Evidence / Reason | Result |\n|---|---|---|---|---|---|---|\n| t | check-1 | s | yes | x | y | FAIL |\n<!-- nimo:audit:verification:end -->\n## Outcome\n| Time | Execution | Verdict | Artifact Version | Open | Next |\n|---|---|---|---|---|---|\n| t | delivered | UNVERIFIED | head-a | none | none |\n<!-- nimo:audit:outcome:end -->\n## Harness\n| Time | Applied | Evidence of use |\n|---|---|---|\n| t | x | y |\n<!-- nimo:audit:harness:end -->\n## Artifacts\n| Time | ID | Artifact | Reference | Version |\n|---|---|---|---|---|\n<!-- nimo:audit:artifacts:end -->\n## Learning\n| Time | ID | Observation | Candidate | Status |\n|---|---|---|---|---|\n<!-- nimo:audit:learning:end -->\n', 'utf8');
    const report = await inspect({
      projectRoot: root,
      taskId: 'task-a',
      currentSnapshot: snapshot(),
      sessionSources: [{ host: 'codex', sessionId: 's1', events: [{ kind: 'read', turn: 1, id: 'out' }, { kind: 'change', turn: 2, id: 'in' }, { kind: 'unknown', turn: 3, id: 'unknown' }, { kind: 'git', turn: 4, id: 'out' }] }],
    });
    assert.equal(report.data.sessions.refs[0].status, 'PROJECTED');
    assert.deepEqual(report.data.sessions.refs[0].activities.map(item => item.kind), ['change', 'UNOBSERVED']);
    assert.equal(report.data.sessions.refs[1].status, 'DECLARED_UNBOUNDED');
    assert.equal(report.data.audit.present, true);
    assert.equal(report.data.audit.status, 'CONFLICT');
    assert.match(report.data.audit.conflicts.join(' '), /审计结果/);
  } finally {
    await remove(root);
  }
});

test('AC-11 and AC-12: malicious paths and HTML stay inert, and missing Anchor is explicit', async () => {
  const root = await workspace('security');
  const outside = await workspace('outside');
  try {
    const outsideFile = join(outside, 'secret.txt');
    await writeFile(outsideFile, '<script>alert("secret")</script>', 'utf8');
    const linked = join(root, 'linked.txt');
    let symlinkAvailable = true;
    try {
      await symlink(outsideFile, linked);
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        symlinkAvailable = false;
      } else {
        throw error;
      }
    }
    await initTask(root, { goal: '<script>alert("goal")</script>' });
    const evidence = [{ source: 'path', location: outsideFile }];
    if (symlinkAvailable) evidence.push({ source: 'link', location: 'linked.txt', version: 'head-a' });
    await writePass(root, { checks: [passCheck('check-1', 'AC-01', evidence)] });
    const report = await inspect({ projectRoot: root, taskId: 'task-a', currentSnapshot: snapshot() });
    assert.equal(report.data.evidence[0].status, 'UNSAFE_PATH');
    if (symlinkAvailable) assert.equal(report.data.evidence[1].status, 'SYMLINK_REFUSED');
    const html = await readFile(report.data.htmlPath, 'utf8');
    assert.doesNotMatch(html, /alert\("goal"\)/);
    assert.doesNotMatch(html, /secret/);
    const empty = await workspace('no-anchor');
    try {
      const missing = await inspect({ projectRoot: empty, generatedAt: '2026-09-22T00:06:00.000Z' });
      assert.equal(missing.status, 'WARN');
      assert.equal(missing.data.status, 'MISSING_ANCHOR');
      assert.match(await readFile(missing.data.htmlPath, 'utf8'), /缺少任务记录/);
    } finally {
      await remove(empty);
    }
  } finally {
    await remove(root);
    await remove(outside);
  }
});

test('Task Anchor Session Ref append is idempotent and rejects non-declared basis', async () => {
  const root = await workspace('refs');
  try {
    await initTask(root);
    const ref = { host: 'codex', sessionId: 's1', basis: 'declared', turnStart: 1, turnEnd: 2 };
    const first = await anchor({ operation: 'session-ref', projectRoot: root, taskId: 'task-a', sessionRef: ref });
    const second = await anchor({ operation: 'session-ref', projectRoot: root, taskId: 'task-a', sessionRef: ref });
    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    const correlated = await anchor({ operation: 'session-ref', projectRoot: root, taskId: 'task-a', sessionRef: { ...ref, sessionId: 's2', basis: 'correlated' } });
    assert.equal(correlated.status, 'ERROR');
    assert.equal(correlated.errorCode, 'SESSION_BASIS_UNSUPPORTED');
  } finally {
    await remove(root);
  }
});
