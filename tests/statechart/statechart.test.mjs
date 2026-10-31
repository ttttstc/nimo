import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scripts = path.join(root, 'skills/nimo-statechart/scripts');
const corpus = path.join(scripts, 'test/corpus');
const cli = path.join(scripts, 'statechart.ts');

function removeScratch(dir) {
  const resolved = fs.realpathSync(dir);
  const relative = path.relative(fs.realpathSync(os.tmpdir()), resolved);
  assert.ok(relative && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

function scratch(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-statechart-测试 '));
  try { return run(dir); } finally { removeScratch(dir); }
}

function invoke(name, out, env, withView = false) {
  const dir = path.join(corpus, name);
  return spawnSync(process.execPath, [cli, path.join(dir, `${name}.tla`), '--out', out,
    ...(withView ? ['--view', path.join(dir, 'view.mjs')] : [])],
  { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120_000, windowsHide: true });
}

test('a nonempty output folder is preserved before TLC starts', () => scratch((dir) => {
  const out = path.join(dir, 'out');
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, 'mine.txt'), 'keep');
  const result = invoke('Login', out, {});
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /not empty/);
  assert.deepEqual(fs.readdirSync(out), ['mine.txt']);
  assert.equal(fs.readFileSync(path.join(out, 'mine.txt'), 'utf8'), 'keep');
}));

test('an unavailable Java exits cleanly without leaving a partial result', () => scratch((dir) => {
  const out = path.join(dir, 'out');
  const result = invoke('Login', out, { TLA2TOOLS: path.join(dir, 'absent.jar'), JAVA: path.join(dir, 'absent-java') });
  assert.equal(result.status, 2, result.stderr);
  assert.doesNotMatch(result.stderr, /Unhandled 'error' event|spawn \/bin\/sh ENOENT/);
  assert.equal(fs.existsSync(out), false);
  assert.deepEqual(fs.readdirSync(dir), []);
}));

test('real TLC draws a model that satisfies its rules in an empty output folder', { skip: !process.env.TLA2TOOLS }, () => scratch((dir) => {
  const out = path.join(dir, 'out');
  fs.mkdirSync(out);
  const result = invoke('Login', out, {}, true);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(out, 'report.md'), 'utf8'), /Rules that hold[\s\S]*TypeOK/);
  assert.match(fs.readFileSync(path.join(out, 'chart.mmd'), 'utf8'), /stateDiagram-v2/);
}));

test('real TLC reports violated rules and their shortest paths', { skip: !process.env.TLA2TOOLS }, () => scratch((dir) => {
  const out = path.join(dir, 'out');
  const result = invoke('FirstRule', out, {});
  assert.equal(result.status, 1, result.stderr);
  const report = fs.readFileSync(path.join(out, 'report.md'), 'utf8');
  assert.match(report, /NotOne breaks[\s\S]*shortest path has 1 step/);
  assert.match(report, /NoDeadlock breaks[\s\S]*shortest path has 3 steps/);
  assert.match(fs.readFileSync(path.join(out, 'chart.mmd'), 'utf8'), /stateDiagram-v2/);
}));

test('a file created during a check is preserved', { skip: !process.env.TLA2TOOLS, timeout: 30_000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-statechart-collision-'));
  const out = path.join(dir, 'out');
  fs.mkdirSync(out);
  const child = spawn(process.execPath, [cli, path.join(corpus, 'Login', 'Login.tla'), '--out', out], {
    env: process.env, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true,
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exited = once(child, 'exit');
  try {
    const deadline = Date.now() + 15_000;
    while (!fs.readdirSync(dir).some((name) => name.startsWith('.out.statechart-'))) {
      assert.equal(child.exitCode, null, stderr);
      assert.ok(Date.now() < deadline, `check did not start: ${stderr}`);
      await sleep(20);
    }
    fs.writeFileSync(path.join(out, 'mine.txt'), 'keep');
    const [status] = await exited;
    assert.equal(status, 2, stderr);
    assert.match(stderr, /appeared while the check ran/);
    assert.deepEqual(fs.readdirSync(out), ['mine.txt']);
    assert.equal(fs.readFileSync(path.join(out, 'mine.txt'), 'utf8'), 'keep');
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; }
    removeScratch(dir);
  }
});

test('an interrupted check stops its worker and cleans temporary files', { skip: !process.env.TLA2TOOLS, timeout: 30_000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimo-statechart-interrupt-'));
  const temp = path.join(dir, 'tmp');
  const out = path.join(dir, 'out');
  fs.mkdirSync(temp);
  fs.writeFileSync(path.join(dir, 'Infinite.tla'), [
    '---- MODULE Infinite ----', 'EXTENDS Naturals', 'VARIABLE x', 'Init == x = 0',
    "Next == x' = x + 1", 'Spec == Init /\\ [][Next]_x', '====', '',
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'Infinite.cfg'), 'SPECIFICATION Spec\nCHECK_DEADLOCK FALSE\n');
  const child = spawn(process.execPath, [cli, path.join(dir, 'Infinite.tla'), '--out', out], {
    env: { ...process.env, TMPDIR: temp, TEMP: temp, TMP: temp }, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true,
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exited = once(child, 'exit');
  try {
    const deadline = Date.now() + 15_000;
    while (!fs.readdirSync(temp, { recursive: true }).some((name) => name.endsWith('verdict-1.stdout'))) {
      assert.equal(child.exitCode, null, stderr);
      assert.ok(Date.now() < deadline, `TLC did not start: ${stderr}`);
      await sleep(50);
    }
    child.kill('SIGKILL');
    await exited;
    while (fs.readdirSync(temp).length || fs.readdirSync(dir).some((name) => name.startsWith('.out.statechart-'))) {
      assert.ok(Date.now() < deadline, 'temporary files were not removed');
      await sleep(50);
    }
    assert.equal(fs.existsSync(out), false);
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; }
    removeScratch(dir);
  }
});
