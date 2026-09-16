---
name: nimo-show-me-your-work
description: "Task Audit 的审计纪律与关键决策记录协议。核心研发任务默认建立一份 Task Audit；只记录会实质改变产物、范围、风险、验收或验证方式的关键选择，并把选择绑定到可检查证据。任务结束前核对 Audit 与真实产物、Verification 和可用 Host Trace；不记录内部推理全文。"
---

# Task Audit 与关键决策记录

Task Audit 是 Nimo 的任务级语义审计入口。它让评审者不依赖完整会话也能回答：本次任务承诺什么、实际用了哪些 Harness、模型做了哪些关键选择、产生了什么 Artifact、每个 Acceptance 如何验证、最终结论绑定哪个版本、哪些过程不可观察。

Task Audit 不是 Runtime Trace，也不是内部思维记录。底层事实仍来自 Git／Artifact、Host Trace、`nimo-verify` Evidence、CI 和实际运行结果；Audit 只组织这些事实。

## 默认开启

进入会产生项目资产变更、需要交付 `VERIFIED | UNVERIFIED | BLOCKED` 结论，或属于长程／多 Agent 的工程任务时，默认建立 Task Audit。重要纪律不能依赖模型先意识到“该调用本 Skill 了”。公共初始化与最终门禁由 `nimo-mode` 负责，本 Skill 负责 Audit 中需要模型判断的关键 Decision 记录和结束审计。

默认位置：

```text
<projectRoot>/.nimo/tasks/<task-id>/audit.md
```

`.nimo/tasks/` 是本地任务状态，不作为待交付产品差异；Audit 更新本身不使已经绑定产品 Artifact 的 Final Verify 失效。

纯只读、纯方案且没有实现交付的任务可以不创建。任务一旦从只读转为实际变更，必须先初始化 Audit 再继续写入。

## 一份记录，不再维护第二套日志

Task Audit 固定包含：

- Contract
- Harness
- Trace
- Decisions
- Artifacts
- Verification
- Outcome
- Learning

不再为新任务单独维护 `decisions.tsv`、Task Episode 或 Handoff 主文件。Decision 是 Task Audit 中的过程事实；Outcome 同时提供最终 Handoff 所需的当前状态和未完成项。

旧的 TSV / `log.mjs` 仅用于兼容已有调用，不作为新的任务审计事实源。

## 什么必须记录成 Decision

只有当换一个选择会实质改变以下任一项时才记录：

- **Artifact**：产物形状、核心实现结构、公共接口或持久化方式。
- **Scope**：任务范围、跨模块责任或是否扩大修改边界。
- **Risk**：接受／规避一个会影响安全、兼容、迁移或交付风险的取舍。
- **Acceptance**：验收边界或用户可见预期发生实质变化。
- **Verification**：验证操作面、关键不变量、影响范围或必要检查的非显然选择。

机械动作不记录：读文件、执行普通命令、安装依赖、格式化、搜索符号本身都不是 Decision。

一个简单确定性 Feature 可以没有 Decision；Audit 默认开启不等于制造流水账。

## 固定检查点

在这些节点主动检查是否发生值得记录的选择：

1. **设计收口**：多个可行方案中选定一个。
2. **范围变化**：新增／删除模块、接口、兼容层或任务责任。
3. **证据导致转向**：运行证据推翻原假设、实现方案或调查方向。
4. **Verification 计划**：决定哪些 Acceptance、关键不变量和合理影响范围必须验证，以及使用什么真实操作面。
5. **Capability 降级**：浏览器、设备、独立上下文、权限等缺失导致工作方式或验证结论下降。
6. **风险或停止判断**：接受已知风险、进入 BLOCKED／UNVERIFIED、停止继续扩大修改。

不要等到任务结束再凭记忆还原。发生实质选择时立即追加；结束审计只负责发现遗漏，不伪造当时的完整思考过程。

## Decision 记录形状

统一通过 `nimo-mode/scripts/audit.mjs` 的 `append` + `kind=decision` 写入。每条记录包含：

- **Time**：记录时间。
- **ID**：工具自动生成 `D1, D2...`。
- **Phase**：`contract | design | implementation | verification | review | handoff`。
- **Decision**：做出的关键选择，一句话说清。
- **Reason**：可公开审查的工程理由，回答“为什么这个选择成立”。
- **Evidence**：可直接检查的路径、版本、Trace、Acceptance、Verification 或其他证据引用。
- **Result**：如 `accepted`、`reverted`、`supersedes D1`、`UNVERIFIED`、`BLOCKED`。

Reason 不是内部推理全文。不要写“我首先想到……然后考虑……”；只写能让评审者复核该选择的工程理由。

Evidence 不能只是一段自我解释。没有可检查证据支撑的“已验证”选择必须保持未验证或不确定。

## 只追加，不美化历史

Decision 被推翻时新增一条记录，不修改或删除旧 Decision。例如：

```text
D1 design         选择状态机方案           accepted
D4 implementation 运行证据推翻 D1，改为独立状态模型  supersedes D1
```

旧选择和后续转向共同构成可审计历史。不得为了让过程看起来顺畅而改写已发生事实。

## Harness 与 Trace 的记录纪律

Harness 区只写本次**实际应用**的 Playbook、Skill、Principle 或 Verification 资产，并给出 Evidence of use。文件存在、配置中声明或被读取，不能单独证明本次实际使用。

Host 提供 Session／Run／Trace 引用时记录引用；无法获得时明确写 `UNAVAILABLE`，并在 Observed Boundary 中写清还能观察什么。不可观察的过程保持不可观察，不能根据最终结果反推“肯定执行过”。

## 与 Verification 的关系

本 Skill 不执行测试，也不判定业务 PASS／FAIL。`nimo-verify` 是唯一 Verification 执行语义；它产出的逐场景结果、证据和 Artifact Version 进入同一 Task Audit。

Verification 范围存在实质判断时，把“为什么这些 Acceptance／不变量／影响范围足够”记录成 `verification` Decision；具体运行结果另写 Verification 表，不能用 Decision 替代证据。

## 结束前 Decision Audit

最终交付前，对照当前事实检查 Task Audit：

- Contract 与当前用户目标／验收是否一致。
- 关键方案收口、Scope 变化、证据导致的转向有没有漏记。
- Verification 范围与 Capability 降级有没有对应 Decision（适用时）。
- Decision 的 Evidence 是否仍可解析，且确实支持该行声称的内容。
- Harness 条目是否有真实使用证据，不把“存在”写成“应用”。
- Audit 与当前 Artifact、`nimo-verify` 结果和可用 Host Trace 是否一致。
- 未观察到的过程是否被如实标成不可观察。

如果结束审计才发现遗漏，可以补录可观察到的 Decision 事实，并在 Result 或 Evidence 中表明来自 final audit；不得补造内部推理或假装它是当时实时记录。

事实与 Audit 冲突时修正／追加 Audit，不修改事实叙述去迎合旧记录。

## 确定性工具与最终门禁

`audit.mjs` 提供：

- `init`：建立 Audit 骨架并绑定 Task Contract、Nimo Revision、Playbook 与 Trace 边界。
- `append`：追加 Decision、实际 Harness、Artifact、Verification、Outcome 和 Learning Candidate。
- `validate`：确定性检查结构、Acceptance→Verification、PASS→Evidence、版本与 Verdict 一致性。

最终 `validate` 由交付路径执行。缺 Audit、Audit 无效、Acceptance 缺必要验证、PASS 无 Evidence、Artifact Version 不匹配，都不能在 Nimo 协议下形成 VERIFIED 交付。

## 独立复核按风险触发

普通 Feature 不再因为出现两条 Decision 就强制启动独立 Agent 审 TSV；结束前 Decision Audit + 确定性 `audit validate` 是默认要求。

以下情况需要独立复核 Task Audit 与关键证据：

- 长时间无人值守或多 Agent 并发。
- 跨模块大型迁移、发布、安全或其他高风险变更。
- 关键 Decision 缺少确定性证据，只能依赖判断性分析。
- Task Contract 或调用 Playbook 明确要求独立审计。

宿主无法提供独立上下文时按 [委派纪律](../nimo-mode/references/delegation.md) 记录降级，不声称已经独立复核。

## Learning 只产生候选

一次 Task Audit 只能记录 `candidate`。单次纠正、一次失败或一次成功都不能直接修改 Harness。

多个可比 Task Audit 出现同类 Decision／Verification／Outcome 问题后，后续 Harness Review 才判断应落到 Principle、Playbook、Skill、Verification、Gate、Knowledge 或 Capability；Harness 改造完成后仍需后续可比任务证明效果。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，Task Audit 不扩大写入或外部动作授权。秘密、凭据、生产数据和私密内部推理不得进入 Audit。

交付时给出 Task Audit 位置、最终 Artifact Version、Verification 证据、Verdict 和未完成项。Audit 是任务级语义审计入口，不宣称替代宿主 Runtime Trace。

来源：[pstack show-me-your-work](https://github.com/cursor/plugins/blob/f5bdd6826fd0a0d9cbc4347134c3a74a200b9d9d/pstack/skills/show-me-your-work/SKILL.md)。
