import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODULE_PATH = join(REPO_ROOT, 'skills', 'nimo-mode', 'scripts', 'audit-worktrees.mjs');

async function snapshot(root) {
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory() && entry.name !== '.git') await visit(path);
      else if (entry.isFile()) result.push(relative(root, path).replaceAll('\\', '/'));
    }
  }
  await visit(root);
  return result.sort();
}

async function git(cwd, ...args) {
  await execFileAsync('git', ['-c', 'core.autocrlf=false', ...args], { cwd, windowsHide: true });
}

async function readAudit(request) {
  const module = await import(pathToFileURL(MODULE_PATH));
  const candidate = module.auditWorktrees ?? module.audit ?? module.run ?? module.default;
  if (typeof candidate === 'function') return candidate(request);

  const { stdout } = await execFileAsync(process.execPath, [MODULE_PATH, '--repo', request.repoRoot], { windowsHide: true });
  const output = stdout.trim();
  assert.ok(output, 'audit-worktrees CLI must return JSON on stdout');
  return JSON.parse(output);
}

test('worktree audit is read-only and reports untracked/unknown states', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nimo-audit-'));
  const worktree = join(root, 'active worktree');
  try {
    await git(root, 'init', '-q');
    await git(root, 'config', 'user.email', 'nimo-tests@example.invalid');
    await git(root, 'config', 'user.name', 'nimo tests');
    await writeFile(join(root, 'tracked.txt'), 'tracked\n', 'utf8');
    await git(root, 'add', 'tracked.txt');
    await git(root, 'commit', '-qm', 'test fixture');
    await git(root, 'worktree', 'add', '-qb', 'audit-fixture', worktree, 'HEAD');
    await writeFile(join(worktree, 'untracked.txt'), 'must remain\n', 'utf8');

    const before = await snapshot(root);
    const report = await readAudit({ repo: root, repoRoot: root, repository: root, cwd: root });
    const after = await snapshot(root);

    assert.deepEqual(after, before, 'audit must not remove or mutate worktree files');
    assert.ok(report && typeof report === 'object', 'audit must return a structured report');
    const text = JSON.stringify(report);
    assert.match(text, /local-files-or-changes/, 'audit report must classify dirty/untracked worktrees');
    assert.doesNotMatch(text, /"(?:deleted|removed)"\s*:\s*(?:true|[1-9])/i, 'audit must report candidates rather than delete them');
  } finally {
    // The test root is in os.tmpdir and contains only this fixture. Keep cleanup
    // explicit and scoped so a broken audit implementation cannot broaden it.
    await execFileAsync('git', ['worktree', 'remove', '--force', worktree], { cwd: root, windowsHide: true }).catch(() => {});
    const rootStat = await stat(root);
    assert.equal(rootStat.isDirectory(), true);
    await import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true }));
  }
});
