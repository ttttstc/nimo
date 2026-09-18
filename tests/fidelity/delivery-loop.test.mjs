import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Delivery reliability loop (issue #21).
 *
 * semantic-anchors.test.mjs pins that the four reliability rules *exist*;
 * these tests pin their *ordering semantics* so the rules cannot be
 * reshuffled back into a gap:
 *
 * A. Final Verify is a code freeze point: every code-modifying action in
 *    opening-a-pr (deslop, no-comments, interrogate fixes, and ALL branch
 *    topology work — rebase, stack shaping, conflict resolution, amend)
 *    precedes it, and nothing that can change the worktree/repository runs
 *    after it.
 * B. nimo-architect designs only — no implementation stage, and callers
 *    compose architect -> implement themselves.
 * C. An interrogate "处理" verdict blocks delivery in the pre-delivery
 *    callers that run interrogate, forcing the fix -> re-cleanup ->
 *    re-review -> re-verify loop.
 * D. Missing or drifted verification assets cannot back a PASS. Asset
 *    creation/maintenance is routed to nimo-verification-create /
 *    nimo-verification-maintain, while nimo-verify remains the single
 *    execution and verdict authority.
 *
 * These are static rule/fidelity checks. The behavioral negative evals
 * (N08-N11) pin the same rules as prompts; their host runs remain
 * UNVERIFIED per the negative-evals README.
 */

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDirectory, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('A: opening-a-pr runs cleanup, review, commit organization, and all topology work before Final Verify; nothing semantic after it', () => {
  const text = read('skills/nimo-mode/playbooks/opening-a-pr.md');
  const positions = {
    cleanup: text.indexOf('**最后收口。**'),
    review: text.indexOf('**对抗评审。**'),
    commits: text.indexOf('**提交组织。**'),
    finalVerify: text.indexOf('**Final Verify。**'),
    title: text.indexOf('**标题。**'),
    freeze: text.indexOf('**冻结纪律。**'),
  };
  for (const [name, index] of Object.entries(positions)) {
    assert.ok(index >= 0, `opening-a-pr.md is missing step marker: ${name}`);
  }
  const ordered = Object.values(positions);
  assert.deepEqual(
    [...ordered].sort((a, b) => a - b),
    ordered,
    'cleanup / review / commit organization must all precede Final Verify, and PR packaging must follow it',
  );
  // the duplicate post-PR close-out (interrogate + deslop + no-comments after creation) is gone
  assert.ok(!text.includes('执行者收尾'), 'the duplicate post-PR close-out step must not exist');
  // invariant 1: every step that can change the worktree/repository sits before Final Verify
  assert.ok(
    text.indexOf('先在 trunk 上 rebase') >= 0 && text.indexOf('先在 trunk 上 rebase') < positions.finalVerify,
    'topology rebase instructions must live in commit organization, before Final Verify',
  );
  assert.ok(
    text.indexOf('rebase 到父分支的确切 tip') < positions.finalVerify,
    'stack-tip rebase must happen before Final Verify',
  );
  // invariant 2: after Final Verify no rebase/amend/cleanup/repair is allowed, and any
  // post-freeze change returns to the FULL close-out, not just a re-verify
  assert.ok(!text.includes('回到第 5 步'), 'post-freeze changes must return to the full close-out, not only re-verify');
  assert.ok(text.includes('回到第 2 步完整收口'), 'post-freeze changes must return to the full close-out');
  assert.match(text, /不再对待交付代码做任何 rebase／amend/);
  assert.match(text, /代码冻结点/);
  assert.match(text, /只能发生在 Final Verify 之前/);
  assert.match(text, /不再执行可能修改代码的 cleanup/);
});

test('B: nimo-architect designs only and carries no implementation stage', () => {
  const text = read('skills/nimo-architect/SKILL.md');
  assert.match(text, /只设计，不实现/);
  assert.match(text, /默认不修改生产实现代码/);
  // the old "按草案实现" / "废弃并重设计" stages must be gone from the stage list
  assert.ok(!text.includes('按草案实现'));
  assert.ok(!/^## 阶段 [A-E]：.*实现/m.test(text), 'no stage may own implementation');
  assert.ok(!/^## 阶段 [A-E]：.*重设计/m.test(text), 'no stage may own redesign');
  assert.match(text, /architect → implement/, 'callers compose architect -> implement instead');
});

test('B (callers): feature, bug-fix, and refactoring keep architect design-only semantics', () => {
  const feature = read('skills/nimo-mode/playbooks/feature.md');
  const bugFix = read('skills/nimo-mode/playbooks/bug-fix.md');
  const refactoring = read('skills/nimo-mode/playbooks/refactoring.md');
  assert.match(feature, /architect 只交付设计/);
  assert.match(bugFix, /architect 只出设计/);
  assert.match(refactoring, /architect 只交付设计/);
});

test('B (supporting contract): runner prompt and rationale template carry no production-write semantics', () => {
  const runnerPrompt = read('skills/nimo-architect/references/runner-prompt.md');
  assert.match(runnerPrompt, /不修改生产源码/);
  assert.match(runnerPrompt, /不写入生产源码/);
  assert.match(runnerPrompt, /worktree 只用于读取上下文/);
  const rationale = read('skills/nimo-architect/references/rationale-template.md');
  assert.ok(!rationale.includes('你会立即开始写'), 'the template must not put the architect on the implementation path');
  const skill = read('skills/nimo-architect/SKILL.md');
  assert.ok(!skill.includes('包含新类型与签名的文件'), 'output must be a draft, not delivered source files');
});

test('C: a blocking interrogate verdict stops delivery in the pre-delivery callers that run interrogate', () => {
  const interrogate = read('skills/nimo-interrogate/SKILL.md');
  assert.match(interrogate, /不得继续 PR／交付/, 'the output contract must block callers');
  // interrogate itself stays read-only; the caller owns the fix
  assert.match(interrogate, /只评审，不自动修改代码/);

  const feature = read('skills/nimo-mode/playbooks/feature.md');
  assert.match(feature, /停止交付[\s\S]*?处理项清零并通过前不继续/);

  const openingApr = read('skills/nimo-mode/playbooks/opening-a-pr.md');
  assert.match(openingApr, /停止创建 PR[\s\S]*?处理项清零并通过前不创建 PR/);
});

test('D: missing or drifted verification assets cannot back a PASS and are routed through the asset lifecycle', () => {
  const verify = read('skills/nimo-verify/SKILL.md');
  assert.match(verify, /没有可执行验证资产[\s\S]*?nimo-verification-create/);
  assert.match(verify, /明显不符[\s\S]*?nimo-verification-maintain/);
  assert.match(verify, /不等于新行为已被验证/);
  assert.match(verify, /只证明其绑定的当前产物版本/);

  const feature = read('skills/nimo-mode/playbooks/feature.md');
  assert.ok(feature.includes('.nimo/verification/'), 'feature.md must map current acceptance scenarios to verification assets');
  assert.match(
    feature,
    /缺资产走 `nimo-verification-create`，已有资产漂移走 `nimo-verification-maintain`，然后由 `nimo-verify`/,
    'feature.md must hand off to nimo-verify after create/maintain completes',
  );

  const bugFix = read('skills/nimo-mode/playbooks/bug-fix.md');
  assert.ok(bugFix.includes('.nimo/verification/'), 'bug-fix.md must map current acceptance scenarios to verification assets');
  assert.match(
    bugFix,
    /先走 `nimo-verification-maintain` 定向修复资产；如果新出现稳定且必要的修复场景没有资产，走 `nimo-verification-create` 补齐。最终执行仍统一由 `nimo-verify` 完成/,
    'bug-fix.md must hand off to nimo-verify after create/maintain completes',
  );
});

test('D (boundary): nimo-verify executes and judges but never owns verification-asset writes', () => {
  const verify = read('skills/nimo-verify/SKILL.md');
  assert.match(verify, /本 Skill 不修改 Verification Map、harness 或辅助脚本/);
  assert.match(verify, /缺资产转 `nimo-verification-create`/);
  assert.match(verify, /资产漂移转 `nimo-verification-maintain`/);

  const feature = read('skills/nimo-mode/playbooks/feature.md');
  assert.match(feature, /缺资产走 `nimo-verification-create`/);
  assert.match(feature, /已有资产漂移走 `nimo-verification-maintain`/);

  const bugFix = read('skills/nimo-mode/playbooks/bug-fix.md');
  assert.match(bugFix, /走 `nimo-verification-maintain` 定向修复资产/);
  assert.match(bugFix, /走 `nimo-verification-create` 补齐/);
});
