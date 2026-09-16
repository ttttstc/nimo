import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDirectory, '../..');
const read = relative => fs.readFileSync(path.join(projectRoot, relative), 'utf8');

test('nimo mode makes Task Audit default and fail-closed for deliverable engineering tasks', () => {
  const mode = read('skills/nimo-mode/SKILL.md');
  assert.match(mode, /Task Audit 默认开启/);
  assert.match(mode, /\.nimo\/tasks\/<task-id>\/audit\.md/);
  assert.match(mode, /Audit 缺失、结构无效/);
  assert.match(mode, /不能进入 VERIFIED／delivered/);
});

test('show-me-your-work is the decision protocol for one Task Audit, not a second decision artifact', () => {
  const skill = read('skills/nimo-show-me-your-work/SKILL.md');
  assert.match(skill, /不再为新任务单独维护 `decisions\.tsv`/);
  assert.match(skill, /Artifact.*Scope.*Risk.*Acceptance.*Verification/s);
  assert.match(skill, /Decision 被推翻时新增一条记录/);
  assert.match(skill, /Host.*UNAVAILABLE/s);
});

test('verification records acceptance results into Task Audit without moving execution semantics', () => {
  const verify = read('skills/nimo-verify/SKILL.md');
  assert.match(verify, /唯一执行语义/);
  assert.match(verify, /audit\.mjs append/);
  assert.match(verify, /required.*不得通过重试偷偷降级/s);
  assert.match(verify, /Artifact Version/);
});

test('opening-a-pr validates final Task Audit after Final Verify and before external PR writes', () => {
  const opening = read('skills/nimo-mode/playbooks/opening-a-pr.md');
  const verify = opening.indexOf('**Final Verify。**');
  const audit = opening.indexOf('**Task Audit 最终门禁。**');
  const forge = opening.indexOf('**forge。**');
  assert.ok(verify >= 0 && audit > verify && forge > audit);
  assert.match(opening, /返回 `BLOCK`.*不 push、不创建 PR/s);
  assert.match(opening, /Artifact Version 和 Verdict 作为 expected 值/);
});

test('Task Audit design keeps runtime trace as provenance and local task state out of product artifact', () => {
  const design = read('docs/changes/2026-09-17-task-audit-protocol.md');
  assert.match(design, /Task Audit 是语义事实入口，不是底层事实源/);
  assert.match(design, /Host Trace 只引用，不复制/);
  assert.match(design, /\.nimo\/tasks\/<task-id>\/audit\.md/);
  assert.match(design, /Learning Candidate/);
});
