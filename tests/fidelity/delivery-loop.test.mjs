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
 *    opening-a-pr (deslop, no-comments, interrogate fixes, rebase) precedes
 *    it, and nothing semantic runs after it.
 * B. nimo-architect designs only — no implementation stage, and callers
 *    compose architect -> implement themselves.
 * C. An interrogate "处理" verdict blocks delivery in every pre-delivery
 *    caller and forces the fix -> re-cleanup -> re-review -> re-verify loop.
 * D. A drifted verification map cannot back a PASS, and feature/bug-fix
 *    must sync affected map entries before final verification.
 */

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDirectory, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('A: opening-a-pr runs cleanup, review, and commit organization before Final Verify; nothing semantic after it', () => {
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
  // freeze semantics are spelled out
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

test('C: a blocking interrogate verdict stops delivery in every pre-delivery caller', () => {
  const interrogate = read('skills/nimo-interrogate/SKILL.md');
  assert.match(interrogate, /不得继续 PR／交付/, 'the output contract must block callers');
  // interrogate itself stays read-only; the caller owns the fix
  assert.match(interrogate, /只评审，不自动修改代码/);

  const feature = read('skills/nimo-mode/playbooks/feature.md');
  assert.match(feature, /停止交付[\s\S]*?处理项清零并通过前不继续/);

  const openingApr = read('skills/nimo-mode/playbooks/opening-a-pr.md');
  assert.match(openingApr, /停止创建 PR[\s\S]*?处理项清零并通过前不创建 PR/);
});

test('D: drifted verification maps cannot back a PASS and callers sync affected entries', () => {
  const verify = read('skills/nimo-verify/SKILL.md');
  assert.match(verify, /旧地图不能继续作为 PASS 依据/);
  assert.match(verify, /地图已漂移/);
  assert.match(verify, /不等于新行为已被验证/);
  assert.match(verify, /只证明其绑定的当前产物版本/);

  for (const playbook of ['feature.md', 'bug-fix.md']) {
    const text = read(`skills/nimo-mode/playbooks/${playbook}`);
    assert.ok(text.includes('.nimo/verification/'), `${playbook} must gate delivery on affected map entries`);
    assert.match(text, /更新后的路径执行验证|更新后的路径验证/, `${playbook} must verify through the updated paths`);
  }
});
