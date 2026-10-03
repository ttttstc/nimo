import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateModel, generate, check, escapeModelJson } from '../../skills/nimo-how/scripts/canvas.mjs';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../../skills/nimo-how/scripts/canvas.mjs', import.meta.url));

function model() {
  return {
    schemaVersion: 1, id: 'example', title: '示例架构', summary: '从入口调用处理函数。',
    groups: [{ id: 'app', title: '应用' }],
    nodes: [
      { id: 'entry', title: '入口', kind: 'component', groupId: 'app', description: '调用处理函数。', certainty: 'confirmed', sources: [{ path: 'src/main.js', line: 1, symbol: 'main' }] },
      { id: 'handler', title: '处理函数', kind: 'function', groupId: 'app', description: '产生结果。', certainty: 'inferred', sources: [{ path: 'src/handler.js', line: 1 }] },
    ],
    edges: [{ id: 'call-handler', source: 'entry', target: 'handler', label: '调用', kind: 'call' }],
    journeys: [{ id: 'request', title: '一次请求', description: '入口到结果。', steps: [
      { title: '进入', description: '请求到入口。', nodeIds: ['entry'], edgeIds: [] },
      { title: '调用处理', description: '调用处理函数。', nodeIds: ['entry', 'handler'], edgeIds: ['call-handler'] },
    ] }],
  };
}

function modelV2() {
  const input = model();
  input.schemaVersion = 2;
  input.categories = [{ id: 'requests', title: '请求场景' }];
  input.overview = { description: '入口与处理边界。', sections: [{ title: '应用', description: '处理一次请求。', nodeIds: ['entry', 'handler'] }] };
  input.objectNodeIds = ['handler'];
  Object.assign(input.journeys[0], { categoryId: 'requests', status: 'confirmed', preconditions: ['请求已到达'], completion: '处理结果已返回' });
  input.journeys[0].steps.forEach((step, index) => Object.assign(step, { actor: index ? '处理函数' : '入口', input: index ? '调用参数' : '请求', output: index ? '结果' : '调用参数' }));
  return input;
}

async function fixture(t, withGit = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nimo-how-'));
  const repo = path.join(root, 'source');
  const cwd = path.join(root, 'report');
  await fs.mkdir(path.join(repo, 'src'), { recursive: true });
  await fs.mkdir(cwd);
  await fs.writeFile(path.join(repo, 'src', 'main.js'), 'export function main() { return handler(); }\n');
  await fs.writeFile(path.join(repo, 'src', 'handler.js'), 'export function handler() { return 1; }\n');
  if (withGit) {
    await execute('git', ['init', '-q', repo], { windowsHide: true });
    await execute('git', ['-C', repo, 'add', '.'], { windowsHide: true });
    await execute('git', ['-C', repo, '-c', 'user.name=Canvas Test', '-c', 'user.email=canvas@example.invalid', 'commit', '-q', '-m', 'fixture'], { windowsHide: true });
  }
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await fs.rm(root, { recursive: true, force: true });
  });
  return { root, repo, cwd, options: { projectRoot: repo, cwd } };
}

async function saved(result) { return JSON.parse(await fs.readFile(result.modelPath, 'utf8')); }

test('canvas generates a complete single-file bundle against a separate source repo', async (t) => {
  const f = await fixture(t);
  const result = await generate(model(), f.options);
  assert.equal(result.status, 'OK');
  assert.equal(result.modelPath, path.join(f.cwd, '.nimo', 'how', 'example', 'model.json'));
  const stored = await saved(result);
  assert.equal(stored.snapshot.sources.length, 2);
  assert.match(stored.snapshot.head, /^[a-f0-9]{40,64}$/);
  assert.match(stored.generatedAt, /^\d{4}-.*Z$/);
  assert.deepEqual(await check(stored, { projectRoot: f.repo }), { status: 'MATCH', reasons: [] });
  const html = await fs.readFile(result.htmlPath, 'utf8');
  const embedded = html.match(/<script id="model" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(embedded), stored);
  assert.equal(html.includes('export function main()'), false, 'source contents must not be embedded');
  assert.deepEqual(await fs.readdir(path.dirname(result.htmlPath)), ['index.html', 'model.json']);
  assert.deepEqual(await fs.readdir(path.join(f.cwd, '.nimo', 'how')), ['example']);
});

test('canvas accepts a local one-node explanation and visible unknown source gaps', async (t) => {
  const f = await fixture(t);
  const input = model();
  input.groups = []; input.edges = []; input.journeys = [];
  input.nodes = [{ id: 'gap', title: '尚未查明', kind: 'note', description: '需要继续调查来源。', certainty: 'unknown', sources: [] }];
  const result = await generate(input, f.options);
  assert.equal((await saved(result)).nodes[0].certainty, 'unknown');
  assert.equal((await check(await saved(result), { projectRoot: f.repo })).status, 'MATCH');
});

test('v2 semantic metadata roundtrips in the canonical single-file bundle', async (t) => {
  const f = await fixture(t);
  const input = modelV2();
  input.journeys[0].steps.reverse();
  const result = await generate(input, f.options), stored = await saved(result);
  const html = await fs.readFile(result.htmlPath, 'utf8');
  const embedded = JSON.parse(html.match(/<script id="model" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(embedded, stored);
  for (const key of ['categories', 'overview', 'objectNodeIds', 'journeys']) assert.deepEqual(stored[key], input[key]);
  assert.equal(stored.journeys[0].steps[0].actor, '处理函数');
  assert.equal((await check(stored, { projectRoot: f.repo })).status, 'MATCH');
  assert.equal(html.includes('stepInfo'), false);
  assert.equal(html.includes('model.ui'), false);
  assert.equal(html.includes('Agent Hub'), false);
  assert.equal(html.includes('/*__NIMO_MODEL__*/'), false);
});

test('v2 metadata rejects unknown or duplicate references, invalid types and unsupported fields', () => {
  const cases = [
    (input) => { input.categories = null; },
    (input) => input.categories.push({ ...input.categories[0] }),
    (input) => { input.categories[0].sceneIds = ['request']; },
    (input) => { input.overview.sections[0].nodeIds = ['missing']; },
    (input) => { input.overview.sections[0].nodeIds = ['entry', 'entry']; },
    (input) => { input.overview.sections[0].description = 1; },
    (input) => { input.objectNodeIds = ['missing']; },
    (input) => { input.objectNodeIds = ['entry', 'entry']; },
    (input) => { input.journeys[0].categoryId = 'missing'; },
    (input) => { input.journeys[0].status = 'runtime-passed'; },
    (input) => { delete input.journeys[0].status; },
    (input) => { input.journeys[0].preconditions = 'request'; },
    (input) => { input.journeys[0].preconditions = [1]; },
    (input) => { delete input.journeys[0].completion; },
    (input) => { input.journeys[0].steps[0].actor = 1; },
    (input) => { delete input.journeys[0].steps[0].input; },
    (input) => { input.journeys[0].steps[0].output = ''; },
    (input) => { input.ui = {}; },
    (input) => { input.schemaVersion = 1; },
    (input) => { input.categories = Array.from({ length: 101 }, (_, i) => ({ id: `c${i}`, title: '分类' })); },
    (input) => { input.overview.sections = Array.from({ length: 101 }, () => input.overview.sections[0]); },
    (input) => { input.journeys[0].preconditions = Array(101).fill('前提'); },
  ];
  for (const mutate of cases) {
    const input = modelV2(); mutate(input);
    assert.throws(() => validateModel(input), { code: 'INVALID_MODEL' });
  }
  for (const [key, value] of Object.entries({ status: 'confirmed', preconditions: [], completion: '结果' })) {
    const input = model(); input.journeys[0][key] = value;
    assert.throws(() => validateModel(input), { code: 'INVALID_MODEL' });
  }
  const input = model(); input.journeys[0].steps[0].actor = '入口';
  assert.throws(() => validateModel(input), { code: 'INVALID_MODEL' });
});

test('v2 uninvestigated states require an honest reason and empty steps; partial models need no categories or journeys', async (t) => {
  const f = await fixture(t);
  for (const status of ['not-investigated', 'out-of-scope']) {
    const input = modelV2();
    Object.assign(input.journeys[0], { status, reason: '该路径尚未调查。', steps: [], preconditions: [], completion: '' });
    assert.deepEqual(validateModel(input).journeys[0].steps, []);
    const result = await generate(input, f.options);
    assert.equal((await saved(result)).journeys[0].reason, input.journeys[0].reason);
    assert.equal((await check(await saved(result), { projectRoot: f.repo })).status, 'MATCH');
    const noReason = structuredClone(input); delete noReason.journeys[0].reason;
    assert.throws(() => validateModel(noReason), { code: 'INVALID_MODEL' });
    input.journeys[0].steps = modelV2().journeys[0].steps;
    assert.throws(() => validateModel(input), { code: 'INVALID_MODEL' });
  }
  const pending = modelV2(); pending.journeys[0].status = 'needs-validation';
  assert.throws(() => validateModel(pending), { code: 'INVALID_MODEL' });
  pending.journeys[0].reason = '返回链路仍需核实。';
  assert.doesNotThrow(() => validateModel(pending));
  pending.journeys[0].steps = [];
  assert.throws(() => validateModel(pending), { code: 'INVALID_MODEL' });
  const confirmed = modelV2(); confirmed.journeys[0].completion = '';
  assert.throws(() => validateModel(confirmed), { code: 'INVALID_MODEL' });
  const partial = modelV2(); delete partial.categories; delete partial.overview; delete partial.objectNodeIds;
  delete partial.journeys[0].categoryId;
  assert.doesNotThrow(() => validateModel(partial));
  partial.groups = []; partial.edges = []; partial.journeys = [];
  partial.nodes = [{ id: 'local', title: '局部函数', kind: 'function', description: '来源尚未查明。', certainty: 'unknown', sources: [] }];
  assert.equal((await saved(await generate(partial, f.options))).nodes[0].kind, 'function');
});

test('v2 injected semantic text remains inert and invalid metadata cannot replace a bundle', async (t) => {
  const f = await fixture(t), input = modelV2();
  const malicious = '</script><img src="https://remote.invalid" onerror="globalThis.stolen=true">&\u2028\u2029';
  input.categories[0].title = malicious; input.overview.description = malicious;
  Object.assign(input.journeys[0], { status: 'needs-validation', reason: malicious, completion: malicious, preconditions: [malicious] });
  Object.assign(input.journeys[0].steps[0], { actor: malicious, input: malicious, output: malicious });
  const result = await generate(input, f.options);
  const before = await Promise.all([fs.readFile(result.htmlPath, 'utf8'), fs.readFile(result.modelPath, 'utf8')]);
  const scripts = [...before[0].matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  assert.deepEqual(JSON.parse(scripts[0][1]), await saved(result));
  assert.equal(scripts[0][1].includes('<'), false);
  assert.equal(scripts[1][1].includes('globalThis.stolen'), false);
  new Function(scripts[1][1]);
  input.objectNodeIds = ['missing'];
  await assert.rejects(generate(input, f.options), { code: 'INVALID_MODEL' });
  assert.deepEqual(await Promise.all([fs.readFile(result.htmlPath, 'utf8'), fs.readFile(result.modelPath, 'utf8')]), before);
});

test('model validator rejects duplicate IDs, dangling references and invalid source claims', () => {
  const cases = [
    (input) => input.nodes.push({ ...input.nodes[0] }),
    (input) => input.groups.push({ ...input.groups[0] }),
    (input) => input.edges.push({ ...input.edges[0] }),
    (input) => input.journeys.push({ ...input.journeys[0] }),
    (input) => { input.edges[0].target = 'missing'; },
    (input) => { input.nodes[0].groupId = 'missing'; },
    (input) => { input.journeys[0].steps[0].nodeIds = ['missing']; },
    (input) => { input.journeys[0].steps[0].edgeIds = ['missing']; },
    (input) => { input.journeys[0].steps[0].nodeIds = ['entry', 'entry']; },
    (input) => { input.nodes[0].sources = []; },
    (input) => { input.nodes[0].sources[0].line = 0; },
    (input) => { input.nodes[0].certainty = 'probably'; },
    (input) => { input.nodes[0].kind = 'iframe'; },
    (input) => { input.id = '../escape'; },
    (input) => { input.nodes[0].image = 'https://remote.invalid/image'; },
  ];
  for (const mutate of cases) {
    const input = model(); mutate(input);
    assert.throws(() => validateModel(input), { code: 'INVALID_MODEL' });
  }
  for (const relative of ['../secret', '/etc/passwd', 'C:/secret', 'src\\main.js', 'src/../main.js', 'https://remote.invalid', 'src//main.js', 'src/CON', 'src/name.']) {
    const input = model(); input.nodes[0].sources[0].path = relative;
    assert.throws(() => validateModel(input), { code: 'UNSAFE_PATH' });
  }
});

test('source and output boundaries reject traversal, symlinks and out-of-range lines', async (t) => {
  const f = await fixture(t);
  await assert.rejects(generate(model(), { ...f.options, out: path.join(f.root, 'outside') }), { code: 'UNSAFE_OUTPUT' });
  await assert.rejects(generate(model(), { ...f.options, out: path.join(f.cwd, '.nimo', 'how') }), { code: 'UNSAFE_OUTPUT' });
  await assert.rejects(generate(model(), { ...f.options, projectRoot: 'relative' }), { code: 'UNSAFE_PATH' });
  const outOfRange = model(); outOfRange.nodes[0].sources[0].line = 100;
  await assert.rejects(generate(outOfRange, f.options), { code: 'INVALID_SOURCE' });
  const missing = model(); missing.nodes[0].sources[0].path = 'src/missing.js';
  await assert.rejects(generate(missing, f.options), { code: 'ENOENT' });
  await fs.symlink(path.join(f.repo, 'src'), path.join(f.repo, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  const linked = model(); linked.nodes[0].sources[0].path = 'link/main.js';
  await assert.rejects(generate(linked, f.options), { code: 'UNSAFE_PATH' });
  await fs.mkdir(path.join(f.cwd, '.nimo', 'how'), { recursive: true });
  await fs.symlink(path.join(f.root, 'source'), path.join(f.cwd, '.nimo', 'how', 'redirect'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(generate(model(), { ...f.options, out: '.nimo/how/redirect/result' }), { code: 'UNSAFE_PATH' });
  assert.equal(await fs.stat(path.join(f.repo, 'result')).then(() => true, () => false), false);
  assert.equal(await fs.stat(path.join(f.cwd, '.nimo', 'how', '.publish.lock')).then(() => true, () => false), false);
});

test('model script content stays inert JSON in the standalone HTML', async (t) => {
  const f = await fixture(t);
  const input = model();
  input.title = '</script><script>globalThis.stolen=true</script>';
  input.nodes[0].description = '<img src="https://remote.invalid" onerror="alert(1)">&\u2028\u2029 $& $$ $\' $`';
  const result = await generate(input, f.options);
  const html = await fs.readFile(result.htmlPath, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  assert.deepEqual(JSON.parse(scripts[0][1]), await saved(result));
  assert.equal(scripts[0][1].includes('<'), false);
  assert.equal(scripts[1][1].includes('globalThis.stolen'), false);
  assert.equal(escapeModelJson({ value: '</script>&\u2028\u2029' }), '{"value":"\\u003c/script\\u003e\\u0026\\u2028\\u2029"}');
  new Function(scripts[1][1]);
});

test('invalid generation preserves the prior bundle and cleans publication locks', async (t) => {
  const f = await fixture(t);
  const first = await generate(model(), f.options);
  const before = await Promise.all([fs.readFile(first.htmlPath, 'utf8'), fs.readFile(first.modelPath, 'utf8')]);
  const broken = model(); broken.nodes[0].sources[0].path = 'missing.js';
  await assert.rejects(generate(broken, f.options));
  assert.deepEqual(await Promise.all([fs.readFile(first.htmlPath, 'utf8'), fs.readFile(first.modelPath, 'utf8')]), before);
  const updated = model(); updated.title = '新调查';
  const next = await generate(updated, f.options);
  assert.equal((await saved(next)).title, '新调查');
  assert.deepEqual(await fs.readdir(path.join(f.cwd, '.nimo', 'how')), ['example']);
});

test('publication protects unrelated output files and independent nested bundles', async (t) => {
  const f = await fixture(t);
  const directory = path.join(f.cwd, '.nimo', 'how', 'protected');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'keep.txt'), 'user data');
  await assert.rejects(generate(model(), { ...f.options, out: directory }), { code: 'UNSAFE_OUTPUT' });
  assert.equal(await fs.readFile(path.join(directory, 'keep.txt'), 'utf8'), 'user data');
  const nested = await generate(model(), { ...f.options, out: '.nimo/how/folder/nested' });
  await assert.rejects(generate(model(), { ...f.options, out: '.nimo/how/folder' }), { code: 'UNSAFE_OUTPUT' });
  assert.equal((await saved(nested)).id, 'example');
  await assert.rejects(generate(model(), { ...f.options, out: '.nimo/how/folder/nested/child' }), { code: 'UNSAFE_OUTPUT' });
  assert.equal((await check(await saved(nested), { projectRoot: f.repo })).status, 'MATCH');
  assert.equal(await fs.stat(path.join(f.cwd, '.nimo', 'how', '.publish.lock')).then(() => true, () => false), false);
});

test('existing same-named files need a complete generated model for the same scope', async (t) => {
  const f = await fixture(t);
  const valid = await saved(await generate(model(), { ...f.options, out: '.nimo/how/valid' }));
  const foreign = structuredClone(valid); foreign.id = 'another-scope';
  const noSnapshot = structuredClone(valid); delete noSnapshot.snapshot;
  const noTimestamp = structuredClone(valid); delete noTimestamp.generatedAt;
  const invalid = structuredClone(valid); invalid.snapshot.sources.pop();
  const cases = [
    { name: 'foreign', data: JSON.stringify(foreign), html: true },
    { name: 'no-snapshot', data: JSON.stringify(noSnapshot), html: true },
    { name: 'no-timestamp', data: JSON.stringify(noTimestamp), html: true },
    { name: 'invalid-snapshot', data: JSON.stringify(invalid), html: true },
    { name: 'invalid-json', data: 'private old data', html: true },
    { name: 'missing-html', data: JSON.stringify(valid), html: false },
  ];
  for (const item of cases) {
    const directory = path.join(f.cwd, '.nimo', 'how', item.name);
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, 'model.json'), item.data);
    if (item.html) await fs.writeFile(path.join(directory, 'index.html'), 'old html');
    await assert.rejects(generate(model(), { ...f.options, out: directory }), { code: 'OUTPUT_CONFLICT' });
    assert.equal(await fs.readFile(path.join(directory, 'model.json'), 'utf8'), item.data);
    assert.deepEqual(await fs.readdir(directory), item.html ? ['index.html', 'model.json'] : ['model.json']);
    if (item.html) assert.equal(await fs.readFile(path.join(directory, 'index.html'), 'utf8'), 'old html');
  }
  const update = model(); update.title = '更新后的调查';
  const result = await generate(update, { ...f.options, out: '.nimo/how/valid' });
  assert.equal((await saved(result)).title, update.title);
  assert.equal(await fs.stat(path.join(f.cwd, '.nimo', 'how', '.publish.lock')).then(() => true, () => false), false);
});

test('snapshot check sees content changes, deleted sources, HEAD changes and rejects stale reuse', async (t) => {
  const f = await fixture(t);
  const result = await generate(model(), f.options);
  const stored = await saved(result);
  await fs.writeFile(path.join(f.repo, 'src', 'handler.js'), 'changed without commit\n');
  const changed = await check(stored, { projectRoot: f.repo });
  assert.equal(changed.status, 'STALE');
  assert.ok(changed.reasons.some((reason) => reason.code === 'SOURCE_CHANGED' && reason.path === 'src/handler.js'));
  await assert.rejects(generate(stored, f.options), { code: 'STALE_MODEL' });
  assert.deepEqual(await saved(result), stored);
  await fs.unlink(path.join(f.repo, 'src', 'handler.js'));
  assert.ok((await check(stored, { projectRoot: f.repo })).reasons.some((reason) => reason.code === 'SOURCE_MISSING'));
  await execute('git', ['-C', f.repo, '-c', 'user.name=Canvas Test', '-c', 'user.email=canvas@example.invalid', 'commit', '--allow-empty', '-q', '-m', 'new head'], { windowsHide: true });
  assert.ok((await check(stored, { projectRoot: f.repo })).reasons.some((reason) => reason.code === 'HEAD_CHANGED'));
});

test('incomplete, invalid and absent snapshots are UNKNOWN; unknown HEAD is never MATCH', async (t) => {
  const f = await fixture(t);
  const stored = await saved(await generate(model(), f.options));
  const mutations = [
    (input) => { delete input.snapshot; },
    (input) => { input.snapshot.sources.pop(); },
    (input) => { input.snapshot.sources.push({ path: 'extra.js', sha256: '0'.repeat(64) }); },
    (input) => { input.snapshot.sources[0].sha256 = 'forged'; },
    (input) => { input.snapshot.head = 'forged'; },
    (input) => { input.snapshot.sources.push({ ...input.snapshot.sources[0] }); },
  ];
  for (const mutate of mutations) {
    const input = structuredClone(stored); mutate(input);
    assert.equal((await check(input, { projectRoot: f.repo })).status, 'UNKNOWN');
  }
  const changedHash = structuredClone(stored); changedHash.snapshot.sources[0].sha256 = '0'.repeat(64);
  assert.equal((await check(changedHash, { projectRoot: f.repo })).status, 'STALE');
  const nongit = await fixture(t, false);
  const unknown = await saved(await generate(model(), nongit.options));
  assert.equal(unknown.snapshot.head, null);
  assert.equal((await check(unknown, { projectRoot: nongit.repo })).status, 'UNKNOWN');
});

test('resource caps fail before publishing', async (t) => {
  const f = await fixture(t);
  const tooMany = model(); tooMany.nodes = Array.from({ length: 301 }, (_, index) => ({ ...tooMany.nodes[0], id: `node-${index}` }));
  assert.throws(() => validateModel(tooMany), { code: 'INVALID_MODEL' });
  const oversized = path.join(f.root, 'large.json');
  await fs.writeFile(oversized, ' '.repeat(2 * 1024 * 1024 + 1));
  await assert.rejects(execute(process.execPath, [cli, '--input', oversized, '--project-root', f.repo], { cwd: f.cwd, windowsHide: true }), (error) => {
    assert.equal(JSON.parse(error.stderr).code, 'RESOURCE_LIMIT');
    return true;
  });
  const sourceHandle = await fs.open(path.join(f.repo, 'src', 'main.js'), 'w');
  await sourceHandle.truncate(32 * 1024 * 1024 + 1); await sourceHandle.close();
  await assert.rejects(generate(model(), f.options), { code: 'RESOURCE_LIMIT' });
  assert.equal(await fs.stat(path.join(f.cwd, '.nimo')).then(() => true, () => false), false);
});

test('CLI prints machine-readable generation, read-only check and errors', async (t) => {
  const f = await fixture(t);
  const input = path.join(f.root, 'input.json');
  await fs.writeFile(input, JSON.stringify(model()));
  const generated = await execute(process.execPath, [cli, '--input', input, '--project-root', f.repo, '--out', '.nimo/how/custom'], { cwd: f.cwd, windowsHide: true });
  const result = JSON.parse(generated.stdout);
  assert.equal(result.status, 'OK');
  assert.equal(generated.stderr, '');
  const before = await fs.stat(result.modelPath);
  const checked = await execute(process.execPath, [cli, '--check', result.modelPath, '--project-root', f.repo], { cwd: f.cwd, windowsHide: true });
  assert.equal(JSON.parse(checked.stdout).status, 'MATCH');
  assert.equal((await fs.stat(result.modelPath)).mtimeMs, before.mtimeMs);
  await assert.rejects(execute(process.execPath, [cli, '--input', input, '--check', result.modelPath, '--project-root', f.repo], { cwd: f.cwd, windowsHide: true }), (error) => {
    assert.equal(JSON.parse(error.stderr).code, 'USAGE');
    return true;
  });
});

test('concurrent same-scope CLI publication always leaves one complete matching bundle', async (t) => {
  const f = await fixture(t);
  const paths = await Promise.all(['alpha', 'beta'].map(async (title) => {
    const input = model(); input.title = title;
    const file = path.join(f.root, `${title}.json`);
    await fs.writeFile(file, JSON.stringify(input)); return file;
  }));
  const outcomes = await Promise.allSettled(paths.map((file) => execute(process.execPath, [cli, '--input', file, '--project-root', f.repo], { cwd: f.cwd, windowsHide: true })));
  assert.ok(outcomes.some((outcome) => outcome.status === 'fulfilled'));
  for (const outcome of outcomes) if (outcome.status === 'rejected') assert.equal(JSON.parse(outcome.reason.stderr).code, 'BUSY');
  const directory = path.join(f.cwd, '.nimo', 'how', 'example');
  const stored = JSON.parse(await fs.readFile(path.join(directory, 'model.json'), 'utf8'));
  const embedded = (await fs.readFile(path.join(directory, 'index.html'), 'utf8')).match(/<script id="model" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(embedded), stored);
  assert.ok(['alpha', 'beta'].includes(stored.title));
  assert.deepEqual(await fs.readdir(path.join(f.cwd, '.nimo', 'how')), ['example']);
});
