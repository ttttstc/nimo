import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { absolute, fail, guarded, main, response } from './lib/common.mjs';
const execute = promisify(execFile);
async function git(repo, args) { return (await execute('git', ['-C', repo, ...args], { maxBuffer: 8 * 1024 * 1024, timeout: 30000, windowsHide: true })).stdout; }
export async function run(request) {
  return guarded(async () => {
    const repo = absolute(request.repo, 'repo');
    if (request.inUse !== undefined && !Array.isArray(request.inUse)) fail('INVALID_USAGE', 'inUse must be an explicit array of worktree paths');
    const raw = await git(repo, ['worktree', 'list', '--porcelain', '-z']);
    const records = [];
    /** @type {{path?: string, head?: string, branch?: string, locked?: boolean, prunable?: boolean}} */
    let record = {};
    for (const field of raw.split('\0')) {
      if (!field) { if (record.path) records.push(record); record = {}; continue; }
      if (field.startsWith('worktree ')) record.path = field.slice(9);
      else if (field.startsWith('HEAD ')) record.head = field.slice(5);
      else if (field.startsWith('branch ')) record.branch = field.slice(7);
      else if (field.startsWith('locked')) record.locked = true;
      else if (field.startsWith('prunable')) record.prunable = true;
    }
    const worktrees = [];
    for (const item of records) {
      const reasons = [];
      let status = null;
      let merged = null;
      try {
        const real = await fs.realpath(item.path);
        if (real !== path.resolve(item.path)) reasons.push('linked-path');
        status = await git(real, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored']);
        if (status) reasons.push('local-files-or-changes');
        if (request.base) {
          if (typeof request.base !== 'string' || request.base.startsWith('-')) fail('INVALID_BASE', 'Invalid base ref');
          try { await git(real, ['merge-base', '--is-ancestor', item.head, request.base]); merged = true; }
          catch { merged = false; reasons.push('not-proven-merged'); }
        } else reasons.push('merge-state-unknown');
        if (request.inUse === undefined) reasons.push('usage-unknown');
        else if (request.inUse.some(p => path.resolve(p) === path.resolve(item.path))) reasons.push('in-use');
        if (path.resolve(repo) === path.resolve(item.path)) reasons.push('current-worktree');
        if (item.locked) reasons.push('locked');
      } catch { reasons.push('unreadable-worktree'); }
      worktrees.push({ ...item, merged, dirty: status === null ? null : status.length > 0, reasons, candidate: reasons.length === 0 });
    }
    return response({ worktrees, note: 'Candidates are advice, not permission. This tool never deletes files.' });
  });
}
main(import.meta.url, run);
