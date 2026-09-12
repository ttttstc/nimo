import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const execute = promisify(execFile);
const digest = data => createHash('sha256').update(data).digest('hex');
const manifestName = '.nimo-manifest.json';
const skillName = name => /^nimo-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name === 'configure-nimo';
function root(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || path.dirname(path.resolve(value)) === path.resolve(value)) throw new Error('An absolute non-root directory is required');
  return path.resolve(value);
}
function relative(value) {
  if (typeof value !== 'string' || value.includes('\\') || value.includes('\0') || path.isAbsolute(value)) throw new Error('Invalid manifest path');
  const parts = value.split('/');
  if (parts.length < 2 || !skillName(parts[0]) || parts.some(part => !part || part === '.' || part === '..')) throw new Error('Manifest path escapes nimo skills');
  return value;
}
async function safePath(base, rel) {
  const destination = path.join(base, relative(rel));
  let current = base;
  for (const part of [null, ...rel.split('/')]) {
    if (part) current = path.join(current, part);
    const stat = await fs.lstat(current).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (stat?.isSymbolicLink()) throw new Error(`Linked install path: ${current}`);
  }
  return destination;
}
async function walk(directory, prefix = '', includeModules = false) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' && !includeModules) continue;
    if (entry.name === '.bin') continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Source link is not allowed: ${rel}`);
    if (entry.isDirectory()) result.push(...await walk(path.join(directory, entry.name), rel, includeModules));
    else if (entry.isFile()) result.push(rel);
    else throw new Error(`Unsupported source file: ${rel}`);
  }
  return result;
}
async function optional(file) {
  try { return await fs.readFile(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function readManifest(target) {
  const file = path.join(target, manifestName);
  const stat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (stat?.isSymbolicLink()) throw new Error('Linked install manifest');
  const content = await optional(file);
  if (!content) return { formatVersion: 1, files: {} };
  const value = JSON.parse(content.toString());
  if (value.formatVersion !== 1 || !value.files || typeof value.files !== 'object' || Array.isArray(value.files)) throw new Error('Invalid install manifest');
  for (const [rel, hash] of Object.entries(value.files)) { relative(rel); if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid manifest hash'); }
  return value;
}
async function lock(target, action) {
  const file = `${target}.nimo-install.lock`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const handle = await fs.open(file, 'wx');
  try { return await action(); } finally { await handle.close(); await fs.unlink(file); }
}
async function npmCli() {
  const candidates = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')].filter(Boolean);
  try {
    const { stdout } = await execute(process.platform === 'win32' ? 'where.exe' : 'which', ['npm'], { windowsHide: true });
    for (const found of stdout.trim().split(/\r?\n/)) {
      candidates.push(path.join(path.dirname(found), 'node_modules/npm/bin/npm-cli.js'));
      if (process.platform !== 'win32') candidates.push(await fs.realpath(found));
    }
  } catch { /* An explicitly installed Node distribution may provide npm beside node. */ }
  for (const candidate of candidates) if (candidate && /\.(?:c?js|mjs)$/.test(candidate) && await optional(candidate)) return candidate;
  throw new Error('npm is required for source installation');
}
async function transact(target, writes, removes, manifest) {
  const backups = new Map();
  const manifestPath = path.join(target, manifestName);
  try {
    for (const [rel, data] of writes) {
      const file = await safePath(target, rel);
      backups.set(file, await optional(file));
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, data);
    }
    for (const rel of removes) {
      const file = await safePath(target, rel);
      backups.set(file, await optional(file));
      await fs.unlink(file);
    }
    backups.set(manifestPath, await optional(manifestPath));
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  } catch (error) {
    for (const [file, old] of [...backups].reverse()) {
      if (old === null) await fs.unlink(file).catch(() => {});
      else await fs.writeFile(file, old);
    }
    throw error;
  }
}
export async function install(options) {
  const source = root(options.source);
  const target = root(options.target);
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required');
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'nimo-install-'));
  try {
    const names = (await fs.readdir(path.join(source, 'skills'), { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name);
    if (names.length !== 46 || names.some(name => !skillName(name))) throw new Error('Source must contain exactly the 46 nimo skills');
    for (const name of names) {
      const dir = path.join(source, 'skills', name);
      const entry = await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8');
      if (!new RegExp(`^name: ${name}$`, 'm').test(entry)) throw new Error(`Skill name differs: ${name}`);
      for (const rel of await walk(dir)) {
        const output = path.join(staging, name, rel);
        await fs.mkdir(path.dirname(output), { recursive: true });
        await fs.copyFile(path.join(dir, rel), output);
      }
    }
    const scripts = path.join(staging, 'nimo-mode', 'scripts');
    await execute(process.execPath, [await npmCli(), 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: scripts, windowsHide: true, maxBuffer: 1024 * 1024 });
    await execute(process.execPath, ['--input-type=module', '-e', "await import('./config.mjs')"], { cwd: scripts, windowsHide: true });
    const files = new Map();
    for (const rel of await walk(staging, '', true)) files.set(relative(rel), await fs.readFile(path.join(staging, rel)));
    const version = (await fs.readFile(path.join(source, 'VERSION'), 'utf8')).trim();
    files.set('nimo-mode/VERSION', Buffer.from(version + '\n'));
    let sourceCommit = 'unknown';
    try { sourceCommit = (await execute('git', ['-C', source, 'rev-parse', 'HEAD'], { windowsHide: true })).stdout.trim(); } catch { /* Source archives have no Git metadata. */ }
    return await lock(target, async () => {
      const prior = await readManifest(target);
      const removes = [];
      for (const rel of new Set([...files.keys(), ...Object.keys(prior.files)])) {
        const existing = await optional(await safePath(target, rel));
        if (existing !== null && prior.files[rel] !== digest(existing)) throw new Error(`Install conflict; kept existing file: ${rel}`);
        if (existing !== null && !files.has(rel)) removes.push(rel);
      }
      const manifest = { formatVersion: 1, version, sourceCommit, files: Object.fromEntries([...files].map(([rel, data]) => [rel, digest(data)])) };
      await transact(target, files, removes, manifest);
      return { status: 'OK', changed: true, target, skills: names.length, files: files.size };
    });
  } finally {
    const resolved = path.resolve(staging);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('nimo-install-')) await fs.rm(resolved, { recursive: true, force: true });
  }
}
export async function uninstall(options) {
  const target = root(options.target);
  return lock(target, async () => {
    const prior = await readManifest(target);
    const kept = {};
    const removes = [];
    for (const [rel, expected] of Object.entries(prior.files)) {
      const current = await optional(await safePath(target, rel));
      if (current === null) continue;
      if (digest(current) === expected) removes.push(rel); else kept[rel] = expected;
    }
    if (!Object.keys(prior.files).length) return { status: 'OK', changed: false, removed: 0, kept: [] };
    await transact(target, new Map(), removes, { ...prior, files: kept });
    if (!Object.keys(kept).length) await fs.unlink(path.join(target, manifestName));
    return { status: Object.keys(kept).length ? 'WARN' : 'OK', changed: removes.length > 0, removed: removes.length, kept: Object.keys(kept) };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const operation = args.shift();
    const options = {};
    while (args.length) { const key = args.shift(); if (!['--source', '--target'].includes(key) || !args.length) throw new Error('Use install|uninstall --target <skills-dir> [--source <repo>]'); options[key.slice(2)] = args.shift(); }
    options.source ??= path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    if (!['install', 'uninstall'].includes(operation)) throw new Error('Choose install or uninstall');
    console.log(JSON.stringify(await (operation === 'install' ? install(options) : uninstall(options))));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
