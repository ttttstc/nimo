---
name: nimo-mode
description: "nimo 工程任务总入口。用户明确调用 nimo，或任务涉及工程开发、修复、设计、调查、验证、PR 跟进或任务恢复时使用。根据用户意图选择流程，并遵守授权边界、工程原则和真实验证要求。"
---

# nimo

## 不可省略的规则

1. 用户明确措辞优先。只读、先讨论、先给方案、停止或不合并，不能被流程覆盖。给方案只允许方案产物，不允许代码实现。
2. 多步骤任务第一项完整读取下方原则索引。进入匹配流程后，按其“执行前读取”打开相关原则的完整叶文件；索引摘要不能代替正文。明确会改变的决定，再开始具体操作。只读过索引时不得声称已应用原则。
3. 按 [配置规则](references/configuration.md) 读取团队和个人引用，按需检索知识，不一次读取全部目录；错误不能静默忽略。
4. 读取匹配 Playbook，把其编号步骤原样保留到任务清单，具体步骤可细化。跳过写原因和影响，必要证据缺失不能通过。
5. 非简单变更先 nimo-how。跨边界或实质设计取舍使用 nimo-architect。实现委派与审查分离；主 Agent 保留设计、Bug 原始复现、实际差异审阅和最终验收。
6. 写有状态代码前明确数据结构。编写或修改测试时验证真实行为，不把内部调用关系当成结果。真实操作面验证不能被编译、类型检查或子任务自报替代。
7. 提交前 nimo-deslop，审查前 nimo-no-comments，技术说明使用 nimo-technical-writing 和 nimo-unslop。只清理本任务制造的问题。
8. 模型、工具、独立上下文、权限和后台能力按 [宿主合同](references/host-contract.md) 使用，不假造不存在的接口。

## 原则索引

- [先质疑共同前提](../nimo-principle-attack-the-premise/SKILL.md)：多个共享同一前提的修复连续在同一验证门槛失败。
- [边界校验](../nimo-principle-boundary-discipline/SKILL.md)：外部配置、网络或工具输入进入系统。
- [建立可重复的工具](../nimo-principle-build-the-lever/SKILL.md)：非简单修改、迁移、分析或验证。
- [把重复错误变成约束](../nimo-principle-encode-lessons-in-structure/SKILL.md)：同一纠正或错误反复出现。
- [比较实质方案](../nimo-principle-exhaust-the-design-space/SKILL.md)：缺少先例且存在多个可行结构或交互。
- [以使用结果为先](../nimo-principle-experience-first/SKILL.md)：产品、交互、接口和范围取舍。
- [修复根因](../nimo-principle-fix-root-causes/SKILL.md)：缺陷或运行状态异常。
- [先明确数据结构](../nimo-principle-foundational-thinking/SKILL.md)：写逻辑前选择核心类型、数据结构或共享状态关系。
- [保留必要上下文](../nimo-principle-guard-the-context-window/SKILL.md)：大文件、大输出、复杂调查、委派和恢复。
- [最少实现完整解决](../nimo-principle-laziness-protocol/SKILL.md)：准备增加抽象、层级、配置或扩大差异。
- [重复操作收敛](../nimo-principle-make-operations-idempotent/SKILL.md)：可能崩溃、重启、超时或重试的操作。
- [迁完调用再删旧接口](../nimo-principle-migrate-callers-then-delete-legacy-apis/SKILL.md)：内部 API 或数据模型被替换。
- [减少理解成本](../nimo-principle-minimize-reader-load/SKILL.md)：代码多层跳转或隐藏可变状态。
- [让结构表达领域](../nimo-principle-model-the-domain/SKILL.md)：状态分支多、重复结构假设或复杂状态逻辑。
- [授权内自主推进](../nimo-principle-never-block-on-the-human/SKILL.md)：想询问可逆细节或是否继续。
- [按目标架构收敛](../nimo-principle-outcome-oriented-execution/SKILL.md)：阶段边界明确的计划性重写或迁移。
- [验证真实产物](../nimo-principle-prove-it-works/SKILL.md)：交付、合入或宣称问题解决前。
- [从新约束推导结构](../nimo-principle-redesign-from-first-principles/SKILL.md)：新要求改变原有架构前提。
- [先分离再串行共享写入](../nimo-principle-separate-before-serializing-shared-state/SKILL.md)：执行者可能写同一文件、分支、键或状态对象。
- [分成可验证单元](../nimo-principle-sequence-verifiable-units/SKILL.md)：多文件任务、迁移或 PR 依赖链。
- [先减少再增加](../nimo-principle-subtract-before-you-add/SKILL.md)：扩展、重写或重构已有系统。
- [测试行为而非实现细节](../nimo-principle-test-behavior-not-implementation/SKILL.md)：编写、修改或决定是否保留测试。
- [让类型排除错误](../nimo-principle-type-system-discipline/SKILL.md)：类型、签名和外部数据边界。

## 请求与路由

引用增删查使用 [configure-nimo](../configure-nimo/SKILL.md)，安装与环境检测使用 [nimo-setup](../nimo-setup/SKILL.md)。配置查询不启动代码设计。

| 请求 | Playbook |
|---|---|
| 新增或改变行为 | [feature](playbooks/feature.md) |
| 缺陷修复 | [bug-fix](playbooks/bug-fix.md) |
| 只读理解与判断 | [investigation](playbooks/investigation.md) |
| 保持行为的结构调整 | [refactoring](playbooks/refactoring.md) |
| 用廉价试验回答设计问题 | [prototype](playbooks/prototype.md) |
| 一次性能问题修复 | [perf-issue](playbooks/perf-issue.md) |
| 持续改善一个指标 | [hillclimb](playbooks/hillclimb.md) |
| 运行时取证 | [runtime-forensics](playbooks/runtime-forensics.md) |
| 分析已有取证产物 | [trace-forensics](playbooks/trace-forensics.md) |
| 保持视觉一致 | [visual-parity](playbooks/visual-parity.md) |
| 创建或修改 Skill | [authoring-a-skill](playbooks/authoring-a-skill.md) |
| Skill 行为评测 | [eval](playbooks/eval.md) |
| 整理并创建 PR | [opening-a-pr](playbooks/opening-a-pr.md) |
| 检查或跟进 PR | [babysit](playbooks/babysit.md) |
| 验证后合入 | [shipping](playbooks/shipping.md) |
| 多阶段实施计划 | [multi-phase-plan](playbooks/multi-phase-plan.md) |
| 持续完成一个目标 | [autonomous-run](playbooks/autonomous-run.md) |
| 跨会话项目协调 | [orchestrate](playbooks/orchestrate.md) |
| 独立事项实现并合入 | [autopilot-full](playbooks/autopilot-full.md) |
| 实现并交付 PR 链 | [autopilot-stack](playbooks/autopilot-stack.md) |
| 接续已有工作 | [session-pickup](playbooks/session-pickup.md) |
| 安全暂停 | [pause-safely](playbooks/pause-safely.md) |
| 核实后清理工作目录 | [worktree-cleanup](playbooks/worktree-cleanup.md) |

没有匹配固定流程或一次大型任务需要特殊组合时使用 [nimo-figure-it-out](../nimo-figure-it-out/SKILL.md)，不是第 24 个固定 Playbook。单会话可完成工作不升级项目编排。

只看方案不实现。检查 PR 用 babysit check；跟到可合并才用 drive；合并进入 shipping。用户自己合并用 autopilot-stack。明确授权逐项实现并合入的独立事项才用 autopilot-full。

## 委派与恢复

按 [委派纪律](references/delegation.md) 传完整合同，按 [检查点](references/checkpoints.md) 保留长任务现场。本地 [工具](references/tools.md) 只记账，不运行工作流。

继续只承接最近明确提议。暂停停止派发；停止所有写入时不再写检查点。退出 nimo 后不再应用路由，新会话通过明确调用进入。

## 必要依赖

- [nimo-how](../nimo-how/SKILL.md)
- [nimo-architect](../nimo-architect/SKILL.md)
- [nimo-verify](../nimo-verify/SKILL.md)
- [nimo-deslop](../nimo-deslop/SKILL.md)
- [nimo-no-comments](../nimo-no-comments/SKILL.md)
- [nimo-technical-writing](../nimo-technical-writing/SKILL.md)
- [nimo-unslop](../nimo-unslop/SKILL.md)

## 完成

交付具体产物、版本证据、必要限制及实际使用来源。只列影响结果的原则和资料；查询状态时才显示全部登记项。未验证不能写通过，检查通过不增加动作授权。
