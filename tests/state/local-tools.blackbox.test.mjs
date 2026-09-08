import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const scriptDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../skills/nimo-mode/scripts');
const logModule = await import(pathToFileURL(join(scriptDirectory, 'log.mjs')).href);
const planModule = await import(pathToFileURL(join(scriptDirectory, 'check-plan.mjs')).href);
const { run: log } = logModule;
const { checkPlan } = planModule;

async function makeFixture(label) {
  return { root: await mkdtemp(join(tmpdir(), `nimo-local-tools-${label}-`)) };
}

async function removeFixture(fixture) {
  await rm(fixture.root, { recursive: true, force: true });
}

function validUnit(id, dependency = '无') {
  return [
    `### 单元 ${id}`,
    '目标：完成一个可验证单元',
    '文件：tests/example.mjs',
    `依赖：${dependency}`,
    '可观察结果：输出可复核产物',
    '自动检查：node --test tests/example.mjs',
    '真实操作：运行目标命令',
    '性能验证：不适用：无性能变化',
    '停止点：结果可复核后停止',
  ].join('\n');
}

test('log.mjs writes complete TSV rows, normalizes cells, and escapes formula prefixes', async () => {
  const fixture = await makeFixture('log');
  const file = join(fixture.root, 'decisions.tsv');
  try {
    const first = await log({
      file,
      time: '2026-09-08T12:00:00+08:00',
      phase: 'plan',
      decision: 'keep\tthis\nline',
      reason: 'reason\r\ncontinued',
      evidence: '=SUM(A1)',
      result: '-not-a-formula',
    });
    assert.equal(first.status, 'OK');
    assert.equal(first.changed, true);
    assert.equal(first.data.file, file);
    assert.equal(await stat(file).then(() => true), true);
    assert.equal(
      await readFile(file, 'utf8'),
      'time\tphase\tdecision\treason\tevidence\tresult\n' +
        "2026-09-08T12:00:00+08:00\tplan\tkeep this line\treason  continued\t'=SUM(A1)\t'-not-a-formula\n",
    );

    const second = await log({
      file,
      time: '2026-09-08T12:01:00+08:00',
      phase: 'verify',
      decision: 'safe',
      reason: 'checked',
      evidence: 'tests/state/example.mjs',
      result: 'PASS',
    });
    assert.equal(second.status, 'OK');
    const lines = (await readFile(file, 'utf8')).split('\n');
    assert.equal(lines.length, 4);
    assert.equal(lines[0], 'time\tphase\tdecision\treason\tevidence\tresult');
    assert.equal(lines[2], '2026-09-08T12:01:00+08:00\tverify\tsafe\tchecked\ttests/state/example.mjs\tPASS');
  } finally {
    await removeFixture(fixture);
  }
});

test('log.mjs requires every decision field and leaves invalid input untouched', async () => {
  const fixture = await makeFixture('log-invalid');
  const file = join(fixture.root, 'decisions.tsv');
  try {
    const result = await log({
      file,
      time: '2026-09-08T12:00:00+08:00',
      phase: 'plan',
      decision: 'missing result',
      reason: 'reason',
      evidence: 'evidence',
    });
    assert.equal(result.status, 'BLOCK');
    assert.equal(result.changed, false);
    assert.equal(result.diagnostics[0].code, 'INVALID_ROW');
    assert.equal(await stat(file).catch(() => null), null);
  } finally {
    await removeFixture(fixture);
  }
});

test('checkPlan accepts a complete unit with an explicit non-applicable performance reason', () => {
  assert.deepEqual(checkPlan(validUnit('unit-a')), []);
});

test('checkPlan reports missing required unit fields', () => {
  const markdown = validUnit('unit-a').replace('性能验证：不适用：无性能变化\n', '');
  const issues = checkPlan(markdown);
  assert.ok(issues.some(issue => /Missing 性能验证/.test(issue.message)));
});

test('checkPlan reports duplicate unit ids and unknown dependencies', () => {
  const markdown = [validUnit('unit-a', 'missing-unit'), validUnit('unit-a')].join('\n\n');
  const issues = checkPlan(markdown);
  assert.ok(issues.some(issue => issue.message === 'Duplicate unit ids'));
  assert.ok(issues.some(issue => issue.message === 'Unknown dependency missing-unit'));
});

test('checkPlan reports dependency cycles', () => {
  const markdown = [validUnit('unit-a', 'unit-b'), validUnit('unit-b', 'unit-a')].join('\n\n');
  const issues = checkPlan(markdown);
  assert.ok(issues.some(issue => issue.message === 'Dependency cycle'));
});
