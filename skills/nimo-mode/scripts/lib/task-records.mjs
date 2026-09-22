import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const TASK_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const CHECK_RESULTS = new Set(['PASS', 'FAIL', 'NOT_RUN', 'NOT_APPLICABLE']);
export const VERDICTS = new Set(['VERIFIED', 'PASS_WITH_SKIPS', 'UNVERIFIED', 'BLOCKED']);
export const RECORD_SCHEMA_VERSION = 1;

export class TaskRecordError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TaskRecordError';
    this.code = code;
  }
}

export function fail(code, message) {
  throw new TaskRecordError(code, message);
}

export function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail('INVALID_INPUT', `${label} is required`);
  return value.trim();
}

export function optionalText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function hashFile(file) {
  const digest = crypto.createHash('sha256');
  const stream = createReadStream(file);
  for await (const chunk of stream) digest.update(chunk);
  return digest.digest('hex');
}

export function absoluteProjectRoot(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) fail('INVALID_PATH', 'projectRoot must be absolute');
  return path.resolve(value);
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function assertNoLinks(root, target, allowMissing = true) {
  if (!inside(root, target)) fail('PATH_ESCAPE', 'record path escapes projectRoot');
  const relative = path.relative(root, target);
  const parts = relative ? relative.split(path.sep) : [];
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch(error => {
      if (error.code === 'ENOENT' && allowMissing) return null;
      throw error;
    });
    if (!stat) break;
    if (stat.isSymbolicLink()) fail('SYMLINK_REFUSED', `Refusing to cross symbolic link: ${current}`);
    if (current !== target && !stat.isDirectory()) fail('INVALID_PATH', `Path component is not a directory: ${current}`);
  }
}

export async function taskPaths(projectRootValue, taskId) {
  const projectRoot = absoluteProjectRoot(projectRootValue);
  if (typeof taskId !== 'string' || !TASK_ID.test(taskId)) {
    fail('INVALID_TASK_ID', 'taskId must match [a-z0-9][a-z0-9._-]{0,63}');
  }
  const taskDir = path.join(projectRoot, '.nimo', 'tasks', taskId);
  await assertNoLinks(projectRoot, taskDir);
  return {
    projectRoot,
    taskId,
    taskDir,
    anchor: path.join(taskDir, 'task.json'),
    verification: path.join(taskDir, 'verification.json'),
    audit: path.join(taskDir, 'audit.md'),
  };
}

export async function outputPath(projectRootValue, targetValue, defaultRelative) {
  const projectRoot = absoluteProjectRoot(projectRootValue);
  const target = targetValue
    ? path.resolve(requiredText(targetValue, 'output'))
    : path.join(projectRoot, defaultRelative);
  await assertNoLinks(projectRoot, target);
  if (!inside(projectRoot, target)) fail('OUTPUT_ESCAPE', 'output must stay inside projectRoot');
  return target;
}

export async function readJsonFile(file) {
  const stat = await fs.lstat(file).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return null;
  if (stat.isSymbolicLink()) fail('SYMLINK_REFUSED', `Refusing to read linked record: ${file}`);
  if (!stat.isFile()) fail('INVALID_RECORD', `Record is not a file: ${file}`);
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    fail('INVALID_JSON', `${file}: ${error.message}`);
  }
}

export async function readTextFile(file) {
  const stat = await fs.lstat(file).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return null;
  if (stat.isSymbolicLink()) fail('SYMLINK_REFUSED', `Refusing to read linked record: ${file}`);
  if (!stat.isFile()) fail('INVALID_RECORD', `Record is not a file: ${file}`);
  return fs.readFile(file, 'utf8');
}

async function ensureDirectory(file) {
  const parent = path.dirname(file);
  await fs.mkdir(parent, { recursive: true });
  await assertNoLinks(path.parse(parent).root, parent, false);
}

export async function atomicWrite(file, content) {
  await ensureDirectory(file);
  const stat = await fs.lstat(file).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (stat?.isSymbolicLink()) fail('SYMLINK_REFUSED', `Refusing to replace linked record: ${file}`);
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${crypto.randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.unlink(temporary).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export async function withTaskLock(paths, action) {
  await fs.mkdir(paths.taskDir, { recursive: true });
  await assertNoLinks(paths.projectRoot, paths.taskDir, false);
  const lock = path.join(paths.taskDir, '.task-record.lock');
  let handle;
  try {
    handle = await fs.open(lock, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST') fail('BUSY', `Task record is locked: ${paths.taskId}`);
    throw error;
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid }));
    return await action();
  } finally {
    await handle.close();
    await fs.unlink(lock).catch(() => {});
  }
}

export async function writeJsonRecord(file, value) {
  await atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function runGit(projectRoot, args) {
  try {
    const result = await execFileAsync('git', ['-C', projectRoot, ...args], {
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout };
  } catch (error) {
    return { ok: false, stdout: '', error };
  }
}

function decodeGitPath(value) {
  return value;
}

function projectRelativeGitPath(value, gitPrefix) {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!gitPrefix) return normalized;
  const prefix = `${gitPrefix}/`;
  if (!normalized.startsWith(prefix)) return null;
  return normalized.slice(prefix.length);
}

function gitScope(gitPrefix) {
  const scope = gitPrefix || '.';
  return ['--', scope, `:(exclude)${gitPrefix ? `${gitPrefix}/` : ''}.nimo/tasks`, `:(exclude)${gitPrefix ? `${gitPrefix}/` : ''}.nimo/inspector`];
}

function runtimePath(value) {
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  return normalized === '.nimo/tasks' || normalized.startsWith('.nimo/tasks/') || normalized === '.nimo/inspector' || normalized.startsWith('.nimo/inspector/');
}

async function fileFingerprint(projectRoot, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) fail('INVALID_INPUT', 'artifact file path must be a non-empty path');
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) fail('PATH_ESCAPE', `artifact file escapes projectRoot: ${relativePath}`);
  if (normalized === '.nimo/tasks' || normalized.startsWith('.nimo/tasks/')) fail('RUNTIME_PATH', `runtime record cannot be an artifact file: ${relativePath}`);
  const file = path.resolve(projectRoot, normalized);
  if (!inside(projectRoot, file)) fail('PATH_ESCAPE', `artifact file escapes projectRoot: ${relativePath}`);
  await assertNoLinks(projectRoot, file);
  const stat = await fs.lstat(file).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return { path: normalized, status: 'MISSING' };
  if (stat.isDirectory()) return { path: normalized, status: 'DIRECTORY' };
  if (!stat.isFile()) return { path: normalized, status: 'UNSUPPORTED' };
  return { path: normalized, status: 'PRESENT', sha256: await hashFile(file), size: stat.size };
}

export async function captureSnapshot(projectRootValue, options = {}) {
  const projectRoot = absoluteProjectRoot(projectRootValue);
  const gitHead = await runGit(projectRoot, ['rev-parse', 'HEAD']);
  const artifactFiles = Array.isArray(options.artifactFiles) ? [...new Set(options.artifactFiles)] : [];
  const fileHashes = {};
  for (const entry of artifactFiles) {
    const fingerprint = await fileFingerprint(projectRoot, entry);
    fileHashes[fingerprint.path] = fingerprint;
  }
  if (!gitHead.ok) {
    return {
      source: 'filesystem',
      snapshotStatus: 'AVAILABLE',
      gitHead: null,
      dirtyHash: null,
      indexHash: null,
      dirtyPaths: [],
      fileHashes,
    };
  }
  const gitRootResult = await runGit(projectRoot, ['rev-parse', '--show-toplevel']);
  if (!gitRootResult.ok) {
    return {
      source: 'git',
      snapshotStatus: 'UNKNOWN',
      gitHead: null,
      dirtyHash: null,
      indexHash: null,
      dirtyPaths: [],
      fileHashes,
      gitRootError: 'git root could not be resolved',
    };
  }
  const gitRoot = await fs.realpath(path.resolve(gitRootResult.stdout.trim()));
  const canonicalProjectRoot = await fs.realpath(projectRoot);
  const gitPrefix = path.relative(gitRoot, canonicalProjectRoot).replaceAll('\\', '/');
  if (!inside(gitRoot, canonicalProjectRoot)) {
    return {
      source: 'git',
      snapshotStatus: 'UNKNOWN',
      gitHead: null,
      dirtyHash: null,
      indexHash: null,
      dirtyPaths: [],
      fileHashes,
      gitRootError: 'projectRoot is outside the Git root',
    };
  }
  const scope = gitScope(gitPrefix);
  const status = await runGit(gitRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all', ...scope]);
  const index = await runGit(gitRoot, ['diff', '--cached', '--binary', '--no-ext-diff', '--no-renames', ...scope]);
  if (!status.ok || !index.ok) {
    return {
      source: 'git',
      snapshotStatus: 'UNKNOWN',
      gitHead: null,
      dirtyHash: null,
      indexHash: null,
      dirtyPaths: [],
      fileHashes,
      statusError: status.ok ? undefined : 'git status failed',
      indexError: index.ok ? undefined : 'git index diff failed',
    };
  }
  const entries = [];
  if (status.stdout) {
    const tokens = status.stdout.split('\0').filter(Boolean);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const code = token.slice(0, 2);
      const relativePath = projectRelativeGitPath(decodeGitPath(token.slice(3)), gitPrefix);
      if (relativePath && !runtimePath(relativePath)) entries.push({ code, path: relativePath });
      if (/^[RC]/.test(code) && tokens[index + 1]) {
        const original = projectRelativeGitPath(decodeGitPath(tokens[++index]), gitPrefix);
        if (original && !runtimePath(original)) entries.push({ code: 'ORIGINAL', path: original });
      }
    }
  }
  const fingerprints = [];
  for (const entry of entries.sort((left, right) => left.path.localeCompare(right.path))) {
    const file = path.resolve(projectRoot, entry.path);
    await assertNoLinks(projectRoot, file);
    const stat = await fs.lstat(file).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    const content = stat?.isFile() ? await hashFile(file) : stat ? `${stat.isDirectory() ? 'directory' : 'unsupported'}:${stat.size}` : 'deleted';
    fingerprints.push(`${entry.code}\t${entry.path}\t${content}`);
  }
  const indexHash = sha256(index.stdout);
  fingerprints.push(`INDEX\t${indexHash}`);
  return {
    source: 'git',
    snapshotStatus: 'AVAILABLE',
    gitHead: gitHead.stdout.trim(),
    dirtyHash: sha256(fingerprints.join('\n')),
    indexHash,
    dirtyPaths: entries.map(entry => entry.path),
    fileHashes,
  };
}

export function serializeError(error) {
  return { code: error.code ?? 'UNEXPECTED_ERROR', message: error.message ?? String(error) };
}
