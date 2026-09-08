# pstack 来源与覆盖

固定版本 93b00b89ef425a9c1bac0d0b317dfc49c930ac99。中文工程规则以 [实现方案](../nimo-v1-issue-13-spec.md) 的宿主解耦和授权边界为准；运行时不下载上游。

## 23 个 Playbook

| 来源 | 实现 | 行为案例 |
|---|---|---|
| [feature](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/feature.md) | [nimo](../../skills/nimo-mode/playbooks/feature.md) | PB01 |
| [bug-fix](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/bug-fix.md) | [nimo](../../skills/nimo-mode/playbooks/bug-fix.md) | PB02 |
| [investigation](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/investigation.md) | [nimo](../../skills/nimo-mode/playbooks/investigation.md) | PB03 |
| [refactoring](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/refactoring.md) | [nimo](../../skills/nimo-mode/playbooks/refactoring.md) | PB04 |
| [prototype](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/prototype.md) | [nimo](../../skills/nimo-mode/playbooks/prototype.md) | PB05 |
| [perf-issue](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/perf-issue.md) | [nimo](../../skills/nimo-mode/playbooks/perf-issue.md) | PB06 |
| [hillclimb](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/hillclimb.md) | [nimo](../../skills/nimo-mode/playbooks/hillclimb.md) | PB07 |
| [runtime-forensics](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/runtime-forensics.md) | [nimo](../../skills/nimo-mode/playbooks/runtime-forensics.md) | PB08 |
| [trace-forensics](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/trace-forensics.md) | [nimo](../../skills/nimo-mode/playbooks/trace-forensics.md) | PB09 |
| [visual-parity](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/visual-parity.md) | [nimo](../../skills/nimo-mode/playbooks/visual-parity.md) | PB10 |
| [authoring-a-skill](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md) | [nimo](../../skills/nimo-mode/playbooks/authoring-a-skill.md) | PB11 |
| [eval](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/eval.md) | [nimo](../../skills/nimo-mode/playbooks/eval.md) | PB12 |
| [opening-a-pr](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/opening-a-pr.md) | [nimo](../../skills/nimo-mode/playbooks/opening-a-pr.md) | PB13 |
| [babysit](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/babysit.md) | [nimo](../../skills/nimo-mode/playbooks/babysit.md) | PB14 |
| [shipping](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/shipping.md) | [nimo](../../skills/nimo-mode/playbooks/shipping.md) | PB15 |
| [multi-phase-plan](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md) | [nimo](../../skills/nimo-mode/playbooks/multi-phase-plan.md) | PB16 |
| [autonomous-run](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autonomous-run.md) | [nimo](../../skills/nimo-mode/playbooks/autonomous-run.md) | PB17 |
| [orchestrate](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/orchestrate.md) | [nimo](../../skills/nimo-mode/playbooks/orchestrate.md) | PB18 |
| [autopilot-full](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-full.md) | [nimo](../../skills/nimo-mode/playbooks/autopilot-full.md) | PB19 |
| [autopilot-stack](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-stack.md) | [nimo](../../skills/nimo-mode/playbooks/autopilot-stack.md) | PB20 |
| [session-pickup](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/session-pickup.md) | [nimo](../../skills/nimo-mode/playbooks/session-pickup.md) | PB21 |
| [pause-safely](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/pause-safely.md) | [nimo](../../skills/nimo-mode/playbooks/pause-safely.md) | PB22 |
| [worktree-cleanup](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md) | [nimo](../../skills/nimo-mode/playbooks/worktree-cleanup.md) | PB23 |

## 21 个原则

- [boundary-discipline](../../skills/nimo-principle-boundary-discipline/SKILL.md)，参考同名上游 Principle。
- [build-the-lever](../../skills/nimo-principle-build-the-lever/SKILL.md)，参考同名上游 Principle。
- [encode-lessons-in-structure](../../skills/nimo-principle-encode-lessons-in-structure/SKILL.md)，参考同名上游 Principle。
- [exhaust-the-design-space](../../skills/nimo-principle-exhaust-the-design-space/SKILL.md)，参考同名上游 Principle。
- [experience-first](../../skills/nimo-principle-experience-first/SKILL.md)，参考同名上游 Principle。
- [fix-root-causes](../../skills/nimo-principle-fix-root-causes/SKILL.md)，参考同名上游 Principle。
- [foundational-thinking](../../skills/nimo-principle-foundational-thinking/SKILL.md)，参考同名上游 Principle。
- [guard-the-context-window](../../skills/nimo-principle-guard-the-context-window/SKILL.md)，参考同名上游 Principle。
- [laziness-protocol](../../skills/nimo-principle-laziness-protocol/SKILL.md)，参考同名上游 Principle。
- [make-operations-idempotent](../../skills/nimo-principle-make-operations-idempotent/SKILL.md)，参考同名上游 Principle。
- [migrate-callers-then-delete-legacy-apis](../../skills/nimo-principle-migrate-callers-then-delete-legacy-apis/SKILL.md)，参考同名上游 Principle。
- [minimize-reader-load](../../skills/nimo-principle-minimize-reader-load/SKILL.md)，参考同名上游 Principle。
- [model-the-domain](../../skills/nimo-principle-model-the-domain/SKILL.md)，参考同名上游 Principle。
- [never-block-on-the-human](../../skills/nimo-principle-never-block-on-the-human/SKILL.md)，参考同名上游 Principle。
- [outcome-oriented-execution](../../skills/nimo-principle-outcome-oriented-execution/SKILL.md)，参考同名上游 Principle。
- [prove-it-works](../../skills/nimo-principle-prove-it-works/SKILL.md)，参考同名上游 Principle。
- [redesign-from-first-principles](../../skills/nimo-principle-redesign-from-first-principles/SKILL.md)，参考同名上游 Principle。
- [separate-before-serializing-shared-state](../../skills/nimo-principle-separate-before-serializing-shared-state/SKILL.md)，参考同名上游 Principle。
- [sequence-verifiable-units](../../skills/nimo-principle-sequence-verifiable-units/SKILL.md)，参考同名上游 Principle。
- [subtract-before-you-add](../../skills/nimo-principle-subtract-before-you-add/SKILL.md)，参考同名上游 Principle。
- [type-system-discipline](../../skills/nimo-principle-type-system-discipline/SKILL.md)，参考同名上游 Principle。

## 任务依赖

- [nimo-how](../../skills/nimo-how/SKILL.md)
- [nimo-why](../../skills/nimo-why/SKILL.md)
- [nimo-architect](../../skills/nimo-architect/SKILL.md)
- [nimo-arena](../../skills/nimo-arena/SKILL.md)
- [nimo-swarm](../../skills/nimo-swarm/SKILL.md)
- [nimo-interrogate](../../skills/nimo-interrogate/SKILL.md)
- [nimo-figure-it-out](../../skills/nimo-figure-it-out/SKILL.md)
- [nimo-tdd](../../skills/nimo-tdd/SKILL.md)
- [nimo-unslop](../../skills/nimo-unslop/SKILL.md)
- [nimo-technical-writing](../../skills/nimo-technical-writing/SKILL.md)
- [nimo-no-comments](../../skills/nimo-no-comments/SKILL.md)
- [nimo-show-me-your-work](../../skills/nimo-show-me-your-work/SKILL.md)
- [nimo-skill-author](../../skills/nimo-skill-author/SKILL.md)
- [nimo-deslop](../../skills/nimo-deslop/SKILL.md)
- [nimo-verify](../../skills/nimo-verify/SKILL.md)

另有 [项目验证初始化](../../skills/nimo-verification-create/SKILL.md)、[验证维护](../../skills/nimo-verification-maintain/SKILL.md)、[Skill 评测](../../skills/nimo-skill-evaluate/SKILL.md)，复用原仓库已建立的行为契约。

## 有意差异

固定模型、私有 Agent API、私有会话路径和周期唤醒由宿主实际机制替代。图形控制入口用项目验证地图和已有工具。Git 拓扑不用 Graphite；检查 PR 不等于跟进或合并。暂停不自动提交，工作目录清理不把未跟踪数据当垃圾。补丁哈希不替代当前环境验证。详见方案第 3.12 节。

## 校验方式

静态检查验证 42 个 Skill、23 个 Playbook、元数据和引用。行为案例在 [evals](../../evals/README.md)，必须结合真实轨迹和产物评分。目录齐全不等于所有宿主都验证通过。
