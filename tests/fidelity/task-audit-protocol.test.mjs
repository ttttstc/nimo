import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDirectory, '../..');
const read = relative => fs.readFileSync(path.join(projectRoot, relative), 'utf8');

test('nimo mode makes Task Audit default and fail-closed for lifecycle-owned engineering tasks', () => {
  const mode = read('skills/nimo-mode/SKILL.md');
  assert.match(mode, /Task Audit 对任务生命周期默认开启/);
  assert.match(mode, /\.nimo\/tasks\/<task-id>\/audit\.md/);
  assert.match(mode, /Audit 缺失、结构无效/);
  assert.match(mode, /不能进入 VERIFIED／delivered/);
  assert.match(mode, /独立的交付／仓库动作不因自身被调用而自动创建 Task Audit/);
  assert.match(mode, /opening-a-pr.*不进入 Task Audit 生命周期/s);
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

test('opening-a-pr stays independent from Task Audit and still freezes on Final Verify', () => {
  const opening = read('skills/nimo-mode/playbooks/opening-a-pr.md');
  const verify = opening.indexOf('**Final Verify。**');
  const forge = opening.indexOf('**forge。**');
  assert.ok(verify >= 0 && forge > verify, 'Final Verify must precede external PR operations');
  assert.match(opening, /不要求 Task Audit、不创建 Task Audit、不写入 Task Audit/);
  assert.match(opening, /不以 Audit 是否存在作为 push／创建 PR 的门禁/);
  assert.match(opening, /本流程不创建或校验 Task Audit/);
  assert.doesNotMatch(opening, /Task Audit 最终门禁/);
  assert.doesNotMatch(opening, /audit\.mjs/);
});

test('lifecycle playbooks consume opening-a-pr facts and retain their own audit ownership', () => {
  const feature = read('skills/nimo-mode/playbooks/feature.md');
  const bugFix = read('skills/nimo-mode/playbooks/bug-fix.md');
  const refactoring = read('skills/nimo-mode/playbooks/refactoring.md');

  assert.match(feature, /opening-a-pr.*不创建、不修改、不校验 Task Audit/s);
  assert.match(feature, /Feature.*audit validate final/s);
  assert.match(bugFix, /opening-a-pr.*不创建、不修改、不校验 Task Audit/s);
  assert.match(bugFix, /Bug Fix.*Audit finalize \/ validate/s);
  assert.match(refactoring, /opening-a-pr.*不接管 Task Audit/s);
  assert.match(refactoring, /自己的 Audit finalize \/ validate/);
});

test('Task Audit design keeps runtime trace as provenance and local task state out of product artifact', () => {
  const design = read('docs/changes/2026-09-17-task-audit-protocol.md');
  const boundary = read('docs/changes/2026-09-17-opening-a-pr-audit-boundary.md');
  assert.match(design, /Task Audit 是语义事实入口，不是底层事实源/);
  assert.match(design, /Host Trace 只引用，不复制/);
  assert.match(design, /\.nimo\/tasks\/<task-id>\/audit\.md/);
  assert.match(design, /Learning Candidate/);
  assert.match(boundary, /Task Audit 审计任务；opening-a-pr 交付 Git 变更/);
  assert.match(boundary, /PR_CREATED = true[\s\S]*TASK_AUDIT_VALID = false/);
});
