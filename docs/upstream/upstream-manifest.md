# Upstream Manifest

nimo 的方法资产派生自 pstack，固定 upstream 版本：

- 仓库：`https://github.com/cursor/plugins`
- Source SHA：`93b00b89ef425a9c1bac0d0b317dfc49c930ac99`
- 根路径：`pstack/skills/`

每个派生 artifact 的来源固定如下。`类型` 含义：

- `direct`：正文以该 upstream 文件为源忠实移植，差异全部登记在 [adaptation ledger](ledger/README.md)。
- `derived`：方法论来自所列 upstream 来源的组合或对应 Playbook，来源判断见 `skills-scan.md`。
- `original`：nimo 自有实现，无一一对应的 upstream 文件。

## 23 个 Playbook（direct）

| nimo artifact | upstream source |
|---|---|
| [skills/nimo-mode/playbooks/feature.md](../../skills/nimo-mode/playbooks/feature.md) | [poteto-mode/playbooks/feature.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/feature.md) |
| [skills/nimo-mode/playbooks/bug-fix.md](../../skills/nimo-mode/playbooks/bug-fix.md) | [poteto-mode/playbooks/bug-fix.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/bug-fix.md) |
| [skills/nimo-mode/playbooks/investigation.md](../../skills/nimo-mode/playbooks/investigation.md) | [poteto-mode/playbooks/investigation.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/investigation.md) |
| [skills/nimo-mode/playbooks/refactoring.md](../../skills/nimo-mode/playbooks/refactoring.md) | [poteto-mode/playbooks/refactoring.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/refactoring.md) |
| [skills/nimo-mode/playbooks/prototype.md](../../skills/nimo-mode/playbooks/prototype.md) | [poteto-mode/playbooks/prototype.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/prototype.md) |
| [skills/nimo-mode/playbooks/perf-issue.md](../../skills/nimo-mode/playbooks/perf-issue.md) | [poteto-mode/playbooks/perf-issue.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/perf-issue.md) |
| [skills/nimo-mode/playbooks/hillclimb.md](../../skills/nimo-mode/playbooks/hillclimb.md) | [poteto-mode/playbooks/hillclimb.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/hillclimb.md) |
| [skills/nimo-mode/playbooks/runtime-forensics.md](../../skills/nimo-mode/playbooks/runtime-forensics.md) | [poteto-mode/playbooks/runtime-forensics.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/runtime-forensics.md) |
| [skills/nimo-mode/playbooks/trace-forensics.md](../../skills/nimo-mode/playbooks/trace-forensics.md) | [poteto-mode/playbooks/trace-forensics.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/trace-forensics.md) |
| [skills/nimo-mode/playbooks/visual-parity.md](../../skills/nimo-mode/playbooks/visual-parity.md) | [poteto-mode/playbooks/visual-parity.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/visual-parity.md) |
| [skills/nimo-mode/playbooks/authoring-a-skill.md](../../skills/nimo-mode/playbooks/authoring-a-skill.md) | [poteto-mode/playbooks/authoring-a-skill.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md) |
| [skills/nimo-mode/playbooks/eval.md](../../skills/nimo-mode/playbooks/eval.md) | [poteto-mode/playbooks/eval.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/eval.md) |
| [skills/nimo-mode/playbooks/opening-a-pr.md](../../skills/nimo-mode/playbooks/opening-a-pr.md) | [poteto-mode/playbooks/opening-a-pr.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/opening-a-pr.md) |
| [skills/nimo-mode/playbooks/babysit.md](../../skills/nimo-mode/playbooks/babysit.md) | [poteto-mode/playbooks/babysit.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/babysit.md) |
| [skills/nimo-mode/playbooks/shipping.md](../../skills/nimo-mode/playbooks/shipping.md) | [poteto-mode/playbooks/shipping.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/shipping.md) |
| [skills/nimo-mode/playbooks/multi-phase-plan.md](../../skills/nimo-mode/playbooks/multi-phase-plan.md) | [poteto-mode/playbooks/multi-phase-plan.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md) |
| [skills/nimo-mode/playbooks/autonomous-run.md](../../skills/nimo-mode/playbooks/autonomous-run.md) | [poteto-mode/playbooks/autonomous-run.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autonomous-run.md) |
| [skills/nimo-mode/playbooks/orchestrate.md](../../skills/nimo-mode/playbooks/orchestrate.md) | [poteto-mode/playbooks/orchestrate.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/orchestrate.md) |
| [skills/nimo-mode/playbooks/autopilot-full.md](../../skills/nimo-mode/playbooks/autopilot-full.md) | [poteto-mode/playbooks/autopilot-full.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-full.md) |
| [skills/nimo-mode/playbooks/autopilot-stack.md](../../skills/nimo-mode/playbooks/autopilot-stack.md) | [poteto-mode/playbooks/autopilot-stack.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-stack.md) |
| [skills/nimo-mode/playbooks/session-pickup.md](../../skills/nimo-mode/playbooks/session-pickup.md) | [poteto-mode/playbooks/session-pickup.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/session-pickup.md) |
| [skills/nimo-mode/playbooks/pause-safely.md](../../skills/nimo-mode/playbooks/pause-safely.md) | [poteto-mode/playbooks/pause-safely.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/pause-safely.md) |
| [skills/nimo-mode/playbooks/worktree-cleanup.md](../../skills/nimo-mode/playbooks/worktree-cleanup.md) | [poteto-mode/playbooks/worktree-cleanup.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md) |

## 21 个 Principle（direct）

| nimo artifact | upstream source |
|---|---|
| [skills/nimo-principle-boundary-discipline/SKILL.md](../../skills/nimo-principle-boundary-discipline/SKILL.md) | [principle-boundary-discipline/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-boundary-discipline/SKILL.md) |
| [skills/nimo-principle-build-the-lever/SKILL.md](../../skills/nimo-principle-build-the-lever/SKILL.md) | [principle-build-the-lever/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-build-the-lever/SKILL.md) |
| [skills/nimo-principle-encode-lessons-in-structure/SKILL.md](../../skills/nimo-principle-encode-lessons-in-structure/SKILL.md) | [principle-encode-lessons-in-structure/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-encode-lessons-in-structure/SKILL.md) |
| [skills/nimo-principle-exhaust-the-design-space/SKILL.md](../../skills/nimo-principle-exhaust-the-design-space/SKILL.md) | [principle-exhaust-the-design-space/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-exhaust-the-design-space/SKILL.md) |
| [skills/nimo-principle-experience-first/SKILL.md](../../skills/nimo-principle-experience-first/SKILL.md) | [principle-experience-first/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-experience-first/SKILL.md) |
| [skills/nimo-principle-fix-root-causes/SKILL.md](../../skills/nimo-principle-fix-root-causes/SKILL.md) | [principle-fix-root-causes/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-fix-root-causes/SKILL.md) |
| [skills/nimo-principle-foundational-thinking/SKILL.md](../../skills/nimo-principle-foundational-thinking/SKILL.md) | [principle-foundational-thinking/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-foundational-thinking/SKILL.md) |
| [skills/nimo-principle-guard-the-context-window/SKILL.md](../../skills/nimo-principle-guard-the-context-window/SKILL.md) | [principle-guard-the-context-window/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-guard-the-context-window/SKILL.md) |
| [skills/nimo-principle-laziness-protocol/SKILL.md](../../skills/nimo-principle-laziness-protocol/SKILL.md) | [principle-laziness-protocol/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-laziness-protocol/SKILL.md) |
| [skills/nimo-principle-make-operations-idempotent/SKILL.md](../../skills/nimo-principle-make-operations-idempotent/SKILL.md) | [principle-make-operations-idempotent/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-make-operations-idempotent/SKILL.md) |
| [skills/nimo-principle-migrate-callers-then-delete-legacy-apis/SKILL.md](../../skills/nimo-principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | [principle-migrate-callers-then-delete-legacy-apis/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) |
| [skills/nimo-principle-minimize-reader-load/SKILL.md](../../skills/nimo-principle-minimize-reader-load/SKILL.md) | [principle-minimize-reader-load/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-minimize-reader-load/SKILL.md) |
| [skills/nimo-principle-model-the-domain/SKILL.md](../../skills/nimo-principle-model-the-domain/SKILL.md) | [principle-model-the-domain/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-model-the-domain/SKILL.md) |
| [skills/nimo-principle-never-block-on-the-human/SKILL.md](../../skills/nimo-principle-never-block-on-the-human/SKILL.md) | [principle-never-block-on-the-human/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-never-block-on-the-human/SKILL.md) |
| [skills/nimo-principle-outcome-oriented-execution/SKILL.md](../../skills/nimo-principle-outcome-oriented-execution/SKILL.md) | [principle-outcome-oriented-execution/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-outcome-oriented-execution/SKILL.md) |
| [skills/nimo-principle-prove-it-works/SKILL.md](../../skills/nimo-principle-prove-it-works/SKILL.md) | [principle-prove-it-works/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-prove-it-works/SKILL.md) |
| [skills/nimo-principle-redesign-from-first-principles/SKILL.md](../../skills/nimo-principle-redesign-from-first-principles/SKILL.md) | [principle-redesign-from-first-principles/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-redesign-from-first-principles/SKILL.md) |
| [skills/nimo-principle-separate-before-serializing-shared-state/SKILL.md](../../skills/nimo-principle-separate-before-serializing-shared-state/SKILL.md) | [principle-separate-before-serializing-shared-state/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md) |
| [skills/nimo-principle-sequence-verifiable-units/SKILL.md](../../skills/nimo-principle-sequence-verifiable-units/SKILL.md) | [principle-sequence-verifiable-units/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-sequence-verifiable-units/SKILL.md) |
| [skills/nimo-principle-subtract-before-you-add/SKILL.md](../../skills/nimo-principle-subtract-before-you-add/SKILL.md) | [principle-subtract-before-you-add/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-subtract-before-you-add/SKILL.md) |
| [skills/nimo-principle-type-system-discipline/SKILL.md](../../skills/nimo-principle-type-system-discipline/SKILL.md) | [principle-type-system-discipline/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-type-system-discipline/SKILL.md) |

## 任务 Skill

| nimo artifact | 类型 | upstream source |
|---|---|---|
| [skills/nimo-how/SKILL.md](../../skills/nimo-how/SKILL.md) | direct | [how/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/how/SKILL.md) 及 `how/references/*` |
| [skills/nimo-why/SKILL.md](../../skills/nimo-why/SKILL.md) | direct | [why/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/why/SKILL.md) 及 `why/references/*`（含 `sources/*`） |
| [skills/nimo-architect/SKILL.md](../../skills/nimo-architect/SKILL.md) | direct | [architect/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/architect/SKILL.md) 及 `architect/references/*` |
| [skills/nimo-arena/SKILL.md](../../skills/nimo-arena/SKILL.md) | direct | [arena/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/arena/SKILL.md) |
| [skills/nimo-swarm/SKILL.md](../../skills/nimo-swarm/SKILL.md) | direct | [swarm/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/swarm/SKILL.md) |
| [skills/nimo-interrogate/SKILL.md](../../skills/nimo-interrogate/SKILL.md) | direct | [interrogate/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/interrogate/SKILL.md) 及 `interrogate/references/*` |
| [skills/nimo-figure-it-out/SKILL.md](../../skills/nimo-figure-it-out/SKILL.md) | direct | [figure-it-out/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/figure-it-out/SKILL.md) |
| [skills/nimo-tdd/SKILL.md](../../skills/nimo-tdd/SKILL.md) | direct | [tdd/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/tdd/SKILL.md) |
| [skills/nimo-unslop/SKILL.md](../../skills/nimo-unslop/SKILL.md) | direct | [unslop/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/unslop/SKILL.md) |
| [skills/nimo-technical-writing/SKILL.md](../../skills/nimo-technical-writing/SKILL.md) | direct | [technical-writing/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/technical-writing/SKILL.md) |
| [skills/nimo-no-comments/SKILL.md](../../skills/nimo-no-comments/SKILL.md) | direct | [no-comments/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/no-comments/SKILL.md) 及 `agents/comment-sicko.md`（评审者角色语义内联） |
| [skills/nimo-show-me-your-work/SKILL.md](../../skills/nimo-show-me-your-work/SKILL.md) | direct | [show-me-your-work/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/show-me-your-work/SKILL.md) 及 `references/decision-log-template.tsv` |
| [skills/nimo-verification-create/SKILL.md](../../skills/nimo-verification-create/SKILL.md) | direct | [create-verification-skill/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/create-verification-skill/SKILL.md) 及 `references/feature-map-example/*` |
| [skills/nimo-verification-maintain/SKILL.md](../../skills/nimo-verification-maintain/SKILL.md) | direct | [maintain-verification-skill/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/maintain-verification-skill/SKILL.md) |
| [skills/nimo-skill-author/SKILL.md](../../skills/nimo-skill-author/SKILL.md) | derived | [poteto-mode/playbooks/authoring-a-skill.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)（写作纪律部分） |
| [skills/nimo-skill-evaluate/SKILL.md](../../skills/nimo-skill-evaluate/SKILL.md) | derived | [poteto-mode/playbooks/eval.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/eval.md)（评测语义部分） |
| [skills/nimo-deslop/SKILL.md](../../skills/nimo-deslop/SKILL.md) | derived | pstack guide 05 的四类 slop 目标与 [unslop/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/unslop/SKILL.md) 的过程纪律 |
| [skills/nimo-verify/SKILL.md](../../skills/nimo-verify/SKILL.md) | derived | [create-verification-skill/SKILL.md](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/create-verification-skill/SKILL.md) 的证据标准与 pstack guide 06 的验证方法论 |
| [skills/nimo-mode/SKILL.md](../../skills/nimo-mode/SKILL.md) | original | 宿主无关路由与授权边界为 nimo 自有；路由思想参考 poteto-mode |
| [skills/nimo-setup/SKILL.md](../../skills/nimo-setup/SKILL.md) | original | nimo 安装器自有 |
| [skills/configure-nimo/SKILL.md](../../skills/configure-nimo/SKILL.md) | original | nimo 配置体系自有 |

## 校验

- 每月或 upstream 变更时重核本清单：`tests/fidelity/semantic-anchors.test.mjs` 会校验所有 direct 派生 artifact 的 `来源` 行固定指向本 SHA。
- 任何相对 upstream 的语义差异必须登记在 [adaptation ledger](ledger/README.md)；未登记的行为删除视为缺陷。
