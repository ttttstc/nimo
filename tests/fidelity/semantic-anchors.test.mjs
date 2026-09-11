import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

/**
 * Methodology fidelity layer.
 *
 * check-package proves asset counts and reference closure; it cannot prove
 * that upstream behavioral semantics survived the adaptation.  These tests
 * pin stable semantic anchors (not full-text snapshots) for the artifacts the
 * PR review flagged, verify every directly-derived artifact still cites the
 * pinned upstream SHA, and verify every negative eval case is backed by a
 * rule anchor that actually exists in the package.
 */

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testsDirectory, '../..');
const UPSTREAM_SHA = '93b00b89ef425a9c1bac0d0b317dfc49c930ac99';

const PLAYBOOKS = [
  'feature.md', 'bug-fix.md', 'investigation.md', 'refactoring.md', 'prototype.md',
  'perf-issue.md', 'hillclimb.md', 'runtime-forensics.md', 'trace-forensics.md',
  'visual-parity.md', 'authoring-a-skill.md', 'eval.md', 'opening-a-pr.md',
  'babysit.md', 'shipping.md', 'multi-phase-plan.md', 'autonomous-run.md',
  'orchestrate.md', 'autopilot-full.md', 'autopilot-stack.md', 'session-pickup.md',
  'pause-safely.md', 'worktree-cleanup.md',
];

const PRINCIPLES = [
  'boundary-discipline', 'build-the-lever', 'encode-lessons-in-structure',
  'exhaust-the-design-space', 'experience-first', 'fix-root-causes',
  'foundational-thinking', 'guard-the-context-window', 'laziness-protocol',
  'make-operations-idempotent', 'migrate-callers-then-delete-legacy-apis',
  'minimize-reader-load', 'model-the-domain', 'never-block-on-the-human',
  'outcome-oriented-execution', 'prove-it-works', 'redesign-from-first-principles',
  'separate-before-serializing-shared-state', 'sequence-verifiable-units',
  'subtract-before-you-add', 'type-system-discipline',
];

const DIRECT_TASK_SKILLS = [
  'nimo-how', 'nimo-why', 'nimo-architect', 'nimo-arena', 'nimo-swarm',
  'nimo-interrogate', 'nimo-figure-it-out', 'nimo-tdd', 'nimo-unslop',
  'nimo-technical-writing', 'nimo-no-comments', 'nimo-show-me-your-work',
  'nimo-verification-create', 'nimo-verification-maintain',
];

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

/**
 * Semantic anchors: one row per artifact the review flagged.  Each anchor is a
 * stable behavioral assertion (regex) that must survive any faithful
 * adaptation; losing it means the methodology was summarized away again.
 */
const SEMANTIC_ANCHORS = [
  {
    artifact: 'skills/nimo-mode/playbooks/babysit.md',
    anchors: [
      { id: 'merge-frontier-first', pattern: /只处理合入前沿/ },
      { id: 'no-topology-mutation', pattern: /绝不修改栈拓扑/ },
      { id: 'conflict-threads-ci-order', pattern: /顺序是冲突，然后审查意见串，然后 CI/ },
      { id: 'forge-verdict-over-green-checklist', pattern: /信当前 forge 的 verdict/ },
      { id: 'stale-base-vs-flake', pattern: /过期基线/ },
      { id: 'single-fresh-build', pattern: /换一次全新构建，绝不重试单个 job/ },
      { id: 'human-line', pattern: /停在人类线/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/shipping.md',
    anchors: [
      { id: 'independent-verifier-per-pr', pattern: /逐个 PR 独立验证/ },
      { id: 'contiguous-verified-run', pattern: /连续已验证区间/ },
      { id: 'patch-id-boundary', pattern: /patch-id 仅辅助静态审查复用/ },
      { id: 'head-evidence', pattern: /head\/base/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/multi-phase-plan.md',
    anchors: [
      { id: 'plan-is-audit-contract', pattern: /据证据审计的合同/ },
      { id: 'prototype-before-plan', pattern: /写计划前先用原型消灭可观测未知/ },
      { id: 'state-then-wait', pattern: /只在明确放行后开始执行/ },
      { id: 'trunk-regression-lane', pattern: /trunk/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/autonomous-run.md',
    anchors: [
      { id: 'explicit-predicate', pattern: /判定谓词/ },
      { id: 'keep-or-revert', pattern: /没有帮助的变更就丢弃/ },
      { id: 'mid-run-self-healing', pattern: /会阻塞判定谓词的可逆问题由当前执行者自行修复/ },
      { id: 'no-predicate-lowering', pattern: /绝不放低判定谓词/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/orchestrate.md',
    anchors: [
      { id: 'brief-is-the-product', pattern: /简报就是产品/ },
      { id: 'rolling-window', pattern: /滚动窗口/ },
      { id: 'one-writer-state', pattern: /one-writer state|恰好一个写入者/ },
      { id: 'verification-ledger', pattern: /验证台账/ },
      { id: 'liveness-probing', pattern: /存活/ },
      { id: 'zombie-reconciliation', pattern: /僵尸/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/eval.md',
    anchors: [
      { id: 'blinding-non-negotiable', pattern: /盲化不可协商条款/ },
      { id: 'single-judge-single-scale', pattern: /同一尺度/ },
      { id: 'judge-blind-to-model', pattern: /永远看不到模型名|永远不按模型名/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/feature.md',
    anchors: [
      { id: 'throughput-checkpoint', pattern: /吞吐量检查点/ },
      { id: 'arena-mandatory-for-multiple-shapes', pattern: /nimo-arena/ },
      { id: 'wrong-surface-not-pass', pattern: /不算通过|不能算通过|不是通过/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/bug-fix.md',
    anchors: [
      { id: 'evidence-first-repro', pattern: /复现/ },
      { id: 'hypothesis-elimination', pattern: /二分|排除/ },
      { id: 'failing-repro-before-fix', pattern: /失败的复现|failing/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/refactoring.md',
    anchors: [
      { id: 'behavior-pin', pattern: /先写 pin 再动结构|不是 pin/ },
      { id: 'no-compat-shim', pattern: /兼容垫片|shim|双轨/ },
    ],
  },
  {
    artifact: 'skills/nimo-why/SKILL.md',
    anchors: [
      { id: 'cite-everything', pattern: /引用一切/ },
      { id: 'null-result-is-evidence', pattern: /空结果是.*证据|把空结果记录下来/ },
      { id: 'surface-contradictions', pattern: /呈现矛盾/ },
      { id: 'fact-vs-inference-separation', pattern: /我们知道什么.*推断|明确分离/ },
      { id: 'hedged-language', pattern: /限定语言/ },
      { id: 'no-intent-from-code-shape', pattern: /代码形状|从代码.*倒推/ },
    ],
  },
  {
    artifact: 'skills/nimo-show-me-your-work/SKILL.md',
    anchors: [
      { id: 'append-only', pattern: /只追加。错误的决定用新的一行取代/ },
      { id: 'evidence-pointer', pattern: /证据是指针，不是散文/ },
      { id: 'trail-vs-runtime-audit', pattern: /对照运行轨迹审计日志/ },
    ],
  },
  {
    artifact: 'skills/nimo-arena/SKILL.md',
    anchors: [
      { id: 'cross-judge', pattern: /交叉评审|cross-judge/ },
      { id: 'convergence-strong-signal', pattern: /强一致信号/ },
      { id: 'divergence-reframe', pattern: /分歧/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/playbooks/autopilot-stack.md',
    anchors: [
      { id: 'sole-topology-writer', pattern: /唯一拓扑所有者/ },
      { id: 'force-with-lease-remote-check', pattern: /git ls-remote[\s\S]*force-with-lease/ },
      { id: 'deliver-chain-do-not-ship', pattern: /绝不发布|交付.*链/ },
    ],
  },
  {
    artifact: 'skills/nimo-mode/SKILL.md',
    anchors: [
      { id: 'user-wording-wins', pattern: /给方案只允许方案产物/ },
    ],
  },
];

test('semantic anchors for review-flagged artifacts survive the adaptation', () => {
  const missing = [];
  for (const entry of SEMANTIC_ANCHORS) {
    const text = read(entry.artifact);
    for (const anchor of entry.anchors) {
      if (!anchor.pattern.test(text)) missing.push(`${entry.artifact} :: ${anchor.id}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`semantic anchors lost (methodology was summarized away?):\n  ${missing.join('\n  ')}`);
  }
});

test('every directly-derived artifact cites the pinned upstream SHA', () => {
  const missing = [];
  const citations = [];
  for (const playbook of PLAYBOOKS) {
    citations.push(`skills/nimo-mode/playbooks/${playbook}`);
  }
  for (const principle of PRINCIPLES) {
    citations.push(`skills/nimo-principle-${principle}/SKILL.md`);
  }
  for (const skill of DIRECT_TASK_SKILLS) {
    citations.push(`skills/${skill}/SKILL.md`);
  }
  for (const relativePath of citations) {
    if (!read(relativePath).includes(UPSTREAM_SHA)) missing.push(relativePath);
  }
  if (missing.length > 0) {
    throw new Error(`artifacts missing the pinned upstream source citation (${UPSTREAM_SHA}):\n  ${missing.join('\n  ')}`);
  }
});

test('principles keep why plus actionable pattern, not summary slogans', () => {
  const ACTIONABLE = /模式|启发|检验|反模式|做法|执行|交付|边界|失败信号|结构选型|推论|护栏|先行/;
  const AUGMENTATION_SECTIONS = /^(?:适用|应用证据|决策例子)\s*$/;
  const degenerate = [];
  for (const principle of PRINCIPLES) {
    const relativePath = `skills/nimo-principle-${principle}/SKILL.md`;
    const text = read(relativePath);
    const body = text.replace(/^---[\s\S]*?---\s*/, '');
    const sections = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]);
    const methodSections = sections.filter((section) => !AUGMENTATION_SECTIONS.test(section));
    if (methodSections.length < 1) degenerate.push(`${relativePath}: no methodology section beyond the nimo augmentation sections`);
    if (!ACTIONABLE.test(body)) degenerate.push(`${relativePath}: no actionable pattern`);
    if (body.replace(/\s/g, '').length < 400) degenerate.push(`${relativePath}: body too thin (${body.replace(/\s/g, '').length} chars)`);
  }
  if (degenerate.length > 0) {
    throw new Error(`principles degraded to summaries:\n  ${degenerate.join('\n  ')}`);
  }
});

test('negative eval cases are backed by rule anchors that exist', () => {
  const negativeRoot = path.join(projectRoot, 'evals', 'negative');
  const cases = fs.readdirSync(negativeRoot).filter((name) => name.endsWith('.md') && name !== 'README.md');
  if (cases.length < 7) throw new Error(`expected at least 7 negative eval cases, found ${cases.length}`);
  const failures = [];
  for (const name of cases) {
    const text = fs.readFileSync(path.join(negativeRoot, name), 'utf8');
    const artifact = text.match(/^artifact:\s*(\S+)\s*$/m)?.[1];
    const anchor = text.match(/^anchor:\s*\/(.+)\/\s*$/m)?.[1];
    if (!artifact || !anchor) {
      failures.push(`${name}: front matter needs 'artifact:' and 'anchor: /regex/' lines`);
      continue;
    }
    const artifactPath = path.join(projectRoot, artifact);
    if (!fs.existsSync(artifactPath)) {
      failures.push(`${name}: artifact ${artifact} does not exist`);
      continue;
    }
    try {
      if (!new RegExp(anchor).test(fs.readFileSync(artifactPath, 'utf8'))) {
        failures.push(`${name}: anchor /${anchor}/ not found in ${artifact}`);
      }
    } catch (error) {
      failures.push(`${name}: invalid anchor regex: ${error.message}`);
    }
  }
  if (failures.length > 0) throw new Error(`negative eval cases not backed by rules:\n  ${failures.join('\n  ')}`);
});
