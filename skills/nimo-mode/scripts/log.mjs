import fs from 'node:fs/promises';
import path from 'node:path';
import { absolute, fail, guarded, main, response, withLock } from './lib/common.mjs';
const columns = ['time', 'phase', 'decision', 'reason', 'evidence', 'result'];
const cell = value => { const text = value.replace(/[\t\r\n]/g, ' '); return /^[=+@-]/.test(text) ? `'${text}` : text; };
export async function run(request) {
  return guarded(async () => {
    const file = absolute(request.file, 'file');
    const row = { ...request, time: request.time ?? new Date().toISOString() };
    if (columns.some(key => typeof row[key] !== 'string' || !row[key])) fail('INVALID_ROW', 'All decision columns are required');
    await withLock(file, async () => {
      const stat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (stat?.isSymbolicLink()) fail('LINKED_LOG', 'Refusing to write a linked log');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.appendFile(file, (stat?.size ? '' : columns.join('\t') + '\n') + columns.map(key => cell(row[key])).join('\t') + '\n', { mode: 0o600 });
    });
    return response({ file }, [], true);
  });
}
main(import.meta.url, run);
