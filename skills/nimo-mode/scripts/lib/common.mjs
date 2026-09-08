import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export class NimoError extends Error {
  constructor(code, message, exitCode = 2) { super(message); this.code = code; this.exitCode = exitCode; }
}
export const hash = text => createHash('sha256').update(text).digest('hex');
export const fail = (code, message, exitCode = 2) => { throw new NimoError(code, message, exitCode); };
export function absolute(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) fail('INVALID_PATH', `${label} must be absolute`);
  return path.resolve(value);
}
export async function readOptional(file) {
  try { return await fs.readFile(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export function response(data = {}, diagnostics = [], changed = false) {
  const status = diagnostics.some(d => d.severity === 'BLOCK') ? 'BLOCK' : diagnostics.length ? 'WARN' : 'OK';
  return { status, changed, data, diagnostics };
}
export async function guarded(fn) {
  try { return await fn(); } catch (error) {
    return { ...response({}, [{ code: error.code || 'IO_ERROR', message: error.message, severity: 'BLOCK' }]), exitCode: error.exitCode || 3 };
  }
}
export async function withLock(file, action) {
  const parent = await fs.lstat(path.dirname(file)).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (parent?.isSymbolicLink()) fail('LINKED_DIRECTORY', 'Refusing to write records through a linked directory', 3);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const lock = `${file}.lock`;
  let handle;
  try { handle = await fs.open(lock, 'wx'); } catch (error) {
    if (error.code === 'EEXIST') fail('BUSY', `Another writer holds ${lock}`, 3);
    throw error;
  }
  try { await handle.writeFile(JSON.stringify({ pid: process.pid })); return await action(); }
  finally { await handle.close(); await fs.unlink(lock); }
}
export async function atomicWrite(file, content) {
  const stat = await fs.lstat(file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (stat?.isSymbolicLink()) fail('CONFIG_SYMLINK', 'Refusing to replace a linked record', 3);
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  try {
    const handle = await fs.open(temporary, 'wx', stat?.mode ?? 0o600);
    try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temporary, file);
  } finally { await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
export function main(meta, run) {
  if (!process.argv[1] || meta !== pathToFileURL(path.resolve(process.argv[1])).href) return;
  void guarded(async () => {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--input') fail('USAGE', 'Use --input <request.json>');
    return await run(JSON.parse(await fs.readFile(args[1], 'utf8')));
  }).then(result => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.exitCode || (result.status === 'BLOCK' ? 2 : 0);
  });
}
