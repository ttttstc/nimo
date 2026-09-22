import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('Inspector route, package entry, and runtime boundaries are explicit', () => {
  const mode = read('skills/nimo-mode/SKILL.md');
  const inspect = read('skills/nimo-inspect/SKILL.md');
  const verify = read('skills/nimo-verify/SKILL.md');
  const packageContract = read('tests/assets/check-package.mjs');
  assert.match(mode, /查看执行链路、验证依据或任务证据.*nimo-inspect/);
  assert.match(inspect, /不重跑验证，不自动关联会话/);
  assert.match(inspect, /basis=declared/);
  assert.match(verify, /required.*任务记录/s);
  assert.match(verify, /unresolvedFailures/);
  assert.match(packageContract, /'nimo-inspect'/);
  assert.match(read('.gitignore'), /\.nimo\/inspector\//);
});

test('Inspector owns read-only projection while Anchor and Verify own writes', () => {
  const source = read('skills/nimo-inspect/scripts/inspect.mjs');
  assert.match(source, /loadVerification/);
  assert.match(source, /renderHtml/);
  assert.doesNotMatch(source, /writeJsonRecord/);
  assert.match(read('skills/nimo-mode/scripts/task-anchor.mjs'), /withTaskLock/);
  assert.match(read('skills/nimo-verify/scripts/record.mjs'), /unresolvedFailures/);
});
