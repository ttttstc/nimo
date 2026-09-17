import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDirectory, '../..');
const read = relative => fs.readFileSync(path.join(projectRoot, relative), 'utf8');

test('show-me-your-work owns Task Audit as an optional overlay', () => {
  const skill = read('skills/nimo-show-me-your-work/SKILL.md');
  assert.match(skill, /可插拔审计层/);
  assert.match(skill, /普通.*不会.*自动启用审计/s);
  assert.match(skill, /audit init/);
  assert.match(skill, /audit validate/);
  assert.match(skill, /Decision.*Reason.*Evidence.*Result/s);
  assert.match(skill, /Task Audit 无效只影响.*Audited Run/s);
  assert.match(skill, /Target Skill → 强依赖 Task Audit/);
});

test('leaf skills remain independent of Task Audit implementation', () => {
  const leaves = [
    'skills/nimo-mode/SKILL.md',
    'skills/nimo-mode/playbooks/feature.md',
    'skills/nimo-mode/playbooks/bug-fix.md',
    'skills/nimo-mode/playbooks/refactoring.md',
    'skills/nimo-mode/playbooks/opening-a-pr.md',
    'skills/nimo-verify/SKILL.md',
  ];
  for (const file of leaves) {
    const text = read(file);
    assert.doesNotMatch(text, /Task Audit|audit\.mjs/, `${file} must not depend on Task Audit`);
  }
});

test('Task Audit tool is owned by show-me-your-work rather than nimo-mode', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'skills/nimo-show-me-your-work/scripts/audit.mjs')));
  assert.ok(!fs.existsSync(path.join(projectRoot, 'skills/nimo-mode/scripts/audit.mjs')));
});

test('design document states overlay and policy boundary explicitly', () => {
  const design = read('docs/changes/2026-09-17-task-audit-overlay.md');
  assert.match(design, /Audit 是可插拔的观察与审计层/);
  assert.match(design, /Leaf Skill.*零 Task Audit 知识/s);
  assert.match(design, /explicit.*risk-based.*required/s);
  assert.match(design, /Audited Run/);
});
