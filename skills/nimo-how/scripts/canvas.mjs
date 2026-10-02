#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const INPUT_LIMIT = 2 * 1024 * 1024;
const SOURCE_LIMIT = 32 * 1024 * 1024;
const TOTAL_SOURCE_LIMIT = 64 * 1024 * 1024;
const slug = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const reservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const certaintyValues = ['confirmed', 'inferred', 'unknown'];

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function object(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_MODEL', `${label} must be an object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) fail('INVALID_MODEL', `${label}.${key} is unsupported`);
}

function string(value, label, limit = 4000, empty = false) {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > limit || value.includes('\0')) {
    fail('INVALID_MODEL', `${label} must be ${empty ? 'a' : 'a nonempty'} string (max ${limit})`);
  }
}

function id(value, label) {
  if (typeof value !== 'string' || !slug.test(value) || reservedName.test(value)) fail('INVALID_MODEL', `${label} must be a safe slug`);
}

function array(value, label, limit, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum || value.length > limit) fail('INVALID_MODEL', `${label} must contain ${minimum}..${limit} items`);
}

function oneOf(value, values, label) {
  if (!values.includes(value)) fail('INVALID_MODEL', `${label} has an invalid value`);
}

function uniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object') fail('INVALID_MODEL', `${label} items must be objects`);
    id(item.id, `${label}.id`);
    if (ids.has(item.id)) fail('INVALID_MODEL', `${label} contains duplicate id ${item.id}`);
    ids.add(item.id);
  }
  return ids;
}

function sourcePath(value) {
  string(value, 'source.path', 512);
  if (value.startsWith('/') || /[\\:<>"|?*\x00-\x1f]/.test(value) || value.split('/').some((part) => !part || part === '.' || part === '..' || /[. ]$/.test(part))) {
    fail('UNSAFE_PATH', 'source.path must be a project-relative forward-slash path');
  }
  if (value.split('/').some((part) => reservedName.test(part.split('.')[0]))) fail('UNSAFE_PATH', 'source.path contains a reserved name');
}

function referencedPaths(model) {
  return [...new Set(model.nodes.flatMap((node) => node.sources.map((source) => source.path)))].sort();
}

function validateSnapshot(snapshot, expectedPaths) {
  object(snapshot, 'snapshot', ['head', 'sources']);
  if (snapshot.head !== null && (typeof snapshot.head !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(snapshot.head))) fail('INVALID_SNAPSHOT', 'snapshot.head is invalid');
  array(snapshot.sources, 'snapshot.sources', 1500);
  const paths = new Set();
  for (const source of snapshot.sources) {
    object(source, 'snapshot.source', ['path', 'sha256']);
    sourcePath(source.path);
    if (paths.has(source.path) || typeof source.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(source.sha256)) fail('INVALID_SNAPSHOT', 'snapshot source is duplicate or invalid');
    paths.add(source.path);
  }
  if (paths.size !== expectedPaths.length || expectedPaths.some((item) => !paths.has(item))) fail('INVALID_SNAPSHOT', 'snapshot source set differs from model sources');
}

/** Validate the complete domain model before any output is changed. */
export function validateModel(input) {
  object(input, 'model', ['schemaVersion', 'id', 'title', 'summary', 'groups', 'nodes', 'edges', 'journeys', 'snapshot', 'generatedAt']);
  if (input.schemaVersion !== 1) fail('INVALID_MODEL', 'schemaVersion must be 1');
  id(input.id, 'model.id');
  string(input.title, 'model.title', 240);
  string(input.summary, 'model.summary');
  array(input.groups, 'groups', 100);
  array(input.nodes, 'nodes', 300, 1);
  array(input.edges, 'edges', 1000);
  array(input.journeys, 'journeys', 100);
  for (const group of input.groups) {
    object(group, 'group', ['id', 'title']);
    string(group.title, 'group.title', 240);
  }
  const groupIds = uniqueIds(input.groups, 'groups');
  for (const node of input.nodes) {
    object(node, 'node', ['id', 'title', 'kind', 'groupId', 'description', 'certainty', 'sources']);
    string(node.title, 'node.title', 240);
    string(node.description, 'node.description');
    oneOf(node.kind, ['component', 'function', 'data', 'resource', 'decision', 'note'], 'node.kind');
    oneOf(node.certainty, certaintyValues, 'node.certainty');
    if (node.groupId !== undefined && !groupIds.has(node.groupId)) fail('INVALID_MODEL', `node ${node.id} refers to an unknown group`);
    array(node.sources, 'node.sources', 50);
    if (node.certainty === 'confirmed' && !node.sources.length) fail('INVALID_MODEL', `confirmed node ${node.id} needs a source`);
    for (const source of node.sources) {
      object(source, 'source', ['path', 'line', 'symbol']);
      sourcePath(source.path);
      if (source.line !== undefined && (!Number.isSafeInteger(source.line) || source.line < 1)) fail('INVALID_MODEL', 'source.line must be a positive integer');
      if (source.symbol !== undefined) string(source.symbol, 'source.symbol', 240);
    }
  }
  const nodeIds = uniqueIds(input.nodes, 'nodes');
  for (const edge of input.edges) {
    object(edge, 'edge', ['id', 'source', 'target', 'label', 'kind', 'certainty']);
    string(edge.label, 'edge.label', 240, true);
    oneOf(edge.kind, ['call', 'async', 'data'], 'edge.kind');
    if (edge.certainty !== undefined) oneOf(edge.certainty, certaintyValues, 'edge.certainty');
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) fail('INVALID_MODEL', `edge ${edge.id} refers to an unknown node`);
  }
  const edgeIds = uniqueIds(input.edges, 'edges');
  uniqueIds(input.journeys, 'journeys');
  let stepCount = 0;
  for (const journey of input.journeys) {
    object(journey, 'journey', ['id', 'title', 'description', 'steps']);
    string(journey.title, 'journey.title', 240);
    string(journey.description, 'journey.description');
    array(journey.steps, 'journey.steps', 100, 1);
    stepCount += journey.steps.length;
    for (const step of journey.steps) {
      object(step, 'step', ['title', 'description', 'nodeIds', 'edgeIds']);
      string(step.title, 'step.title', 240);
      string(step.description, 'step.description');
      for (const [key, allowed] of Object.entries({ nodeIds, edgeIds })) {
        array(step[key], `step.${key}`, key === 'nodeIds' ? 300 : 1000, key === 'nodeIds' ? 1 : 0);
        if (new Set(step[key]).size !== step[key].length || step[key].some((value) => !allowed.has(value))) fail('INVALID_MODEL', `step.${key} contains duplicate or unknown references`);
      }
    }
  }
  if (stepCount > 500 || referencedPaths(input).length > 1500) fail('RESOURCE_LIMIT', 'model contains too many steps or sources');
  if (input.snapshot !== undefined) validateSnapshot(input.snapshot, referencedPaths(input));
  if (input.generatedAt !== undefined && (typeof input.generatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.generatedAt) || !Number.isFinite(Date.parse(input.generatedAt)) || new Date(input.generatedAt).toISOString() !== input.generatedAt)) fail('INVALID_MODEL', 'generatedAt must be a UTC ISO date');
  const serialized = JSON.stringify(input);
  if (Buffer.byteLength(serialized) > INPUT_LIMIT) fail('RESOURCE_LIMIT', 'model exceeds 2 MiB');
  return JSON.parse(serialized);
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

async function safeDirectory(directory, create = false) {
  const absolute = path.resolve(directory);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const component of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    if (create) await fs.mkdir(current).catch((error) => { if (error.code !== 'EEXIST') throw error; });
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('UNSAFE_PATH', 'directory contains a symlink or non-directory');
  }
  return absolute;
}

async function readSource(root, relative) {
  let current = root;
  const components = relative.split('/');
  for (let index = 0; index < components.length; index++) {
    current = path.join(current, components[index]);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || (index < components.length - 1 ? !stat.isDirectory() : !stat.isFile())) fail('UNSAFE_PATH', `source ${relative} is a symlink or non-file`);
    if (index === components.length - 1 && stat.size > SOURCE_LIMIT) fail('RESOURCE_LIMIT', `source ${relative} exceeds 32 MiB`);
  }
  const content = await fs.readFile(current);
  if (content.length > SOURCE_LIMIT) fail('RESOURCE_LIMIT', `source ${relative} exceeds 32 MiB`);
  return { content, sha256: createHash('sha256').update(content).digest('hex') };
}

async function headAt(root) {
  try {
    const { stdout } = await execute('git', ['-C', root, 'rev-parse', '--verify', 'HEAD'], { windowsHide: true, timeout: 5000, maxBuffer: 1024 });
    const head = stdout.trim();
    return /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head) ? head : null;
  } catch { return null; }
}

async function captureSnapshot(model, root) {
  const before = await headAt(root);
  const sources = [];
  let total = 0;
  const linesByPath = new Map();
  for (const relative of referencedPaths(model)) {
    const { content, sha256 } = await readSource(root, relative);
    total += content.length;
    if (total > TOTAL_SOURCE_LIMIT) fail('RESOURCE_LIMIT', 'combined source size exceeds 64 MiB');
    sources.push({ path: relative, sha256 });
    linesByPath.set(relative, content.length === 0 ? 0 : content.toString('utf8').split('\n').length);
  }
  for (const node of model.nodes) for (const source of node.sources) {
    if (source.line !== undefined && source.line > linesByPath.get(source.path)) fail('INVALID_SOURCE', `source line is outside ${source.path}`);
  }
  const after = await headAt(root);
  if (before !== after) fail('SOURCE_CHANGED', 'HEAD changed during snapshot capture');
  return { head: after, sources };
}

/**
 * MATCH compares the declared source snapshot, not the model's semantic claims.
 * @param {*} input
 * @param {{ projectRoot?: string }} [options]
 */
export async function check(input, { projectRoot } = {}) {
  let model;
  try { model = validateModel(input); } catch (error) {
    return { status: 'UNKNOWN', reasons: [{ code: error.code || 'INVALID_MODEL', message: error.message }] };
  }
  if (!model.snapshot) return { status: 'UNKNOWN', reasons: [{ code: 'NO_SNAPSHOT', message: 'model has no generated snapshot' }] };
  let root;
  try {
    if (!projectRoot || !path.isAbsolute(projectRoot)) fail('UNSAFE_PATH', 'projectRoot must be absolute');
    root = await safeDirectory(projectRoot);
  } catch (error) { return { status: 'UNKNOWN', reasons: [{ code: error.code || 'SOURCE_ROOT_UNAVAILABLE', message: 'source root cannot be read safely' }] }; }
  const reasons = [];
  const currentHead = await headAt(root);
  if (model.snapshot.head !== null && currentHead !== null && model.snapshot.head !== currentHead) reasons.push({ code: 'HEAD_CHANGED', message: 'repository HEAD differs from snapshot' });
  let unknown = false;
  if (model.snapshot.head === null || currentHead === null) {
    unknown = true;
    reasons.push({ code: 'HEAD_UNAVAILABLE', message: 'repository HEAD is unavailable for comparison' });
  }
  let total = 0;
  for (const source of model.snapshot.sources) {
    try {
      const { content, sha256 } = await readSource(root, source.path);
      total += content.length;
      if (total > TOTAL_SOURCE_LIMIT) fail('RESOURCE_LIMIT', 'combined source size exceeds 64 MiB');
      if (sha256 !== source.sha256) reasons.push({ code: 'SOURCE_CHANGED', path: source.path, message: 'source content differs from snapshot' });
    } catch (error) {
      if (error.code === 'ENOENT') reasons.push({ code: 'SOURCE_MISSING', path: source.path, message: 'source is missing' });
      else {
        unknown = true;
        reasons.push({ code: error.code || 'SOURCE_UNREADABLE', path: source.path, message: 'source cannot be compared safely' });
      }
    }
  }
  if (currentHead !== await headAt(root)) {
    unknown = true;
    reasons.push({ code: 'SOURCE_CHANGED_DURING_CHECK', message: 'repository HEAD changed during check' });
  }
  const stale = reasons.some((reason) => ['HEAD_CHANGED', 'SOURCE_CHANGED', 'SOURCE_MISSING'].includes(reason.code));
  return { status: stale ? 'STALE' : unknown ? 'UNKNOWN' : 'MATCH', reasons };
}

export function escapeModelJson(model) {
  return JSON.stringify(model).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

async function lockPublication(base) {
  const lockPath = path.join(base, '.publish.lock');
  let handle;
  try { handle = await fs.open(lockPath, 'wx'); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    fail('BUSY', 'another canvas publication is active');
  }
  try { await handle.writeFile(String(process.pid)); } catch (error) {
    await handle.close();
    await fs.unlink(lockPath);
    throw error;
  }
  return async () => { await handle.close(); await fs.unlink(lockPath); };
}

/**
 * Build a complete bundle, then replace the prior bundle under a single writer lock.
 * @param {*} input
 * @param {{ projectRoot?: string, cwd?: string, out?: string }} [options]
 */
export async function generate(input, { projectRoot, cwd = process.cwd(), out } = {}) {
  const model = validateModel(input);
  if (!projectRoot || !path.isAbsolute(projectRoot)) fail('UNSAFE_PATH', 'projectRoot must be absolute');
  const root = await safeDirectory(projectRoot);
  if (model.snapshot) {
    const result = await check(model, { projectRoot: root });
    if (result.status !== 'MATCH') fail('STALE_MODEL', 'existing snapshot cannot be reused; investigate again and submit a model without snapshot');
  }
  const base = path.resolve(cwd, '.nimo', 'how');
  const destination = path.resolve(cwd, out ?? path.join('.nimo', 'how', model.id));
  if (!inside(base, destination)) fail('UNSAFE_OUTPUT', 'output must be a directory inside cwd/.nimo/how');
  try { sourcePath(path.relative(base, destination).split(path.sep).join('/')); }
  catch { fail('UNSAFE_OUTPUT', 'output contains an unsafe directory name'); }
  const snapshot = await captureSnapshot(model, root);
  if (model.snapshot && (snapshot.head !== model.snapshot.head || snapshot.sources.some((source) => model.snapshot.sources.find((old) => old.path === source.path)?.sha256 !== source.sha256))) fail('STALE_MODEL', 'source changed while reusing an existing snapshot');
  const generated = { ...model, snapshot, generatedAt: new Date().toISOString() };
  const template = await fs.readFile(path.join(scriptDirectory, 'viewer.html'), 'utf8');
  const html = template.replace('/*__NIMO_MODEL__*/', () => escapeModelJson(generated));
  if (html === template) fail('INVALID_VIEWER', 'viewer model placeholder is missing');
  const modelText = `${JSON.stringify(generated, null, 2)}\n`;
  await safeDirectory(base, true);
  const release = await lockPublication(base);
  let staging;
  let backup;
  let oldMoved = false;
  let published = false;
  try {
    await safeDirectory(path.dirname(destination), true);
    try {
      await safeDirectory(destination);
      const entries = await fs.readdir(destination);
      if (entries.some((name) => !['model.json', 'index.html'].includes(name))) fail('UNSAFE_OUTPUT', 'existing output contains files outside a canvas bundle');
      for (const name of entries) {
        const stat = await fs.lstat(path.join(destination, name));
        if (stat.isSymbolicLink() || !stat.isFile()) fail('UNSAFE_OUTPUT', 'existing output assets must be regular files');
      }
      if (entries.length !== 2) fail('OUTPUT_CONFLICT', 'existing output is not a complete canvas bundle');
      let previous;
      try { previous = validateModel(await readModel(path.join(destination, 'model.json'))); }
      catch { fail('OUTPUT_CONFLICT', 'existing output model is not a valid canvas bundle'); }
      if (!previous.snapshot || !previous.generatedAt || previous.id !== model.id) fail('OUTPUT_CONFLICT', 'existing output belongs to another scope or lacks generated metadata');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    let ancestor = path.dirname(destination);
    while (inside(base, ancestor)) {
      if (await fs.stat(path.join(ancestor, 'model.json')).then(() => true, (error) => { if (error.code === 'ENOENT') return false; throw error; })) fail('UNSAFE_OUTPUT', 'output is nested inside an existing bundle');
      ancestor = path.dirname(ancestor);
    }
    const token = randomUUID();
    staging = path.join(path.dirname(destination), `.canvas-${token}.tmp`);
    backup = path.join(path.dirname(destination), `.canvas-${token}.old`);
    if (!inside(base, staging) || !inside(base, backup)) fail('UNSAFE_OUTPUT', 'temporary output is outside bundle root');
    await fs.mkdir(staging);
    await fs.writeFile(path.join(staging, 'model.json'), modelText, { flag: 'wx' });
    await fs.writeFile(path.join(staging, 'index.html'), html, { flag: 'wx' });
    try { await fs.rename(destination, backup); oldMoved = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await fs.rename(staging, destination); published = true; } catch (error) {
      if (oldMoved) { await fs.rename(backup, destination); oldMoved = false; }
      throw error;
    }
    return { status: 'OK', modelPath: path.join(destination, 'model.json'), htmlPath: path.join(destination, 'index.html') };
  } finally {
    try {
      if (staging && !published) await fs.rm(staging, { recursive: true, force: true });
      if (backup && oldMoved && published) await fs.rm(backup, { recursive: true, force: true });
    } finally { await release(); }
  }
}

async function readModel(file) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) fail('UNSAFE_PATH', 'input must be a regular file');
  if (stat.size > INPUT_LIMIT) fail('RESOURCE_LIMIT', 'input exceeds 2 MiB');
  const buffer = await fs.readFile(file);
  if (buffer.length > INPUT_LIMIT) fail('RESOURCE_LIMIT', 'input exceeds 2 MiB');
  try { return JSON.parse(buffer.toString('utf8')); } catch { fail('INVALID_JSON', 'input is not valid JSON'); }
}

export async function run(args = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (!['--input', '--project-root', '--out', '--check'].includes(name) || options[name] !== undefined || !args[index + 1] || args[index + 1].startsWith('--')) fail('USAGE', 'use --input <model.json> --project-root <absolute-repo> [--out <bundle-dir>] or --check <model.json> --project-root <absolute-repo>');
    options[name] = args[index + 1];
  }
  if (!options['--project-root'] || Boolean(options['--input']) === Boolean(options['--check']) || (options['--check'] && options['--out'])) fail('USAGE', 'select either --input or --check with --project-root');
  const model = await readModel(options['--input'] ?? options['--check']);
  return options['--check'] ? check(model, { projectRoot: options['--project-root'] }) : generate(model, { projectRoot: options['--project-root'], out: options['--out'] });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(JSON.stringify({ status: 'ERROR', code: error.code || 'IO_ERROR', message: ['ENOENT', 'EACCES', 'EPERM'].includes(error.code) ? 'required file or directory is unavailable' : error.message }));
    process.exitCode = 1;
  });
}
