---
name: nimo-show-me-your-work
description: "为需要可信回溯的任务提供可插拔审计层：在不侵入目标 Skill 的前提下，把 Contract、实际 Harness、关键 Decision、Artifact、Verification、Evidence、Trace 边界与 Outcome 收敛到一份 Task Audit。普通任务不会因此自动启用审计。"
---

# 保留可审查的任务证据

本 Skill 是 Nimo 的**可插拔审计层**。它用于长时间运行、无人值守、高风险、多人／多 Agent 协作，或用户明确要求可追溯审计的任务。

它不改变 `feature`、`bug-fix`、`nimo-verify`、`opening-a-pr` 等目标 Skill 的协议，也不要求这些 Skill 知道 Task Audit 的存在。目标 Skill 只负责产生自己的真实结果；本 Skill 从外部组织这些事实。

```text
普通执行： Target Skill → Result

审计执行： nimo-show-me-your-work
               ↓
           audit init
               ↓
           Target Skill
               ↓
       收集事实 / 关键 Decision
               ↓
         audit validate
               ↓
           Task Audit
```

## 何时启用

只有以下情况之一成立时启用：

- 用户明确要求记录、审计、可追溯或事后复盘。
- 上层 Harness／宿主策略明确选择 `audited run`。
- 长时间无人值守、多 Agent 并发、跨模块迁移、安全／发布等高风险任务需要独立审计记录。

普通 `feature`、`bug-fix`、`refactoring`、`nimo-verify`、`opening-a-pr` 不因为本 Skill 存在而自动进入审计流程。审计策略属于调用层，不下沉到叶子 Skill。

## 单一审计制品

一次 Audited Run 只维护一份主记录：

```text
<projectRoot>/.nimo/tasks/<task-id>/audit.md
```

固定结构：

```text
Contract
Harness
Trace
Decisions
Artifacts
Verification
Outcome
Learning
```

Task Audit 是**任务级语义事实入口**，不是底层事实源。Git、真实 Artifact、目标 Skill 输出、Verification Evidence、Host Trace、CI／Runtime Result 仍然是原始事实。

## 生命周期

进入 Audited Run 时，先运行本 Skill 自带的 [scripts/audit.mjs](scripts/audit.mjs) `init`。Audit 初始化成功后再执行目标 Skill。

任务过程中只在出现审计价值时追加：

- 实际生效的 Harness 及使用证据。
- 会实质改变 Artifact、Scope、Risk、Acceptance 或 Verification 的关键 Decision。
- 目标 Skill 已经产生的 Artifact 引用。
- 目标 Skill 已经产生的 Verification Result 与 Evidence。
- 最终 Outcome 与 Artifact Version。
- 仅作为候选的 Learning。

目标 Skill 不负责调用 `audit.mjs`。记录动作由当前 Audited Run 的审计持有者完成。

## Decision 记录协议

Decision 只记录可公开审查的工程理由，不保存内部推理全文。

推荐字段：

```text
Decision + Reason + Evidence + Result
```

以下节点检查是否发生实质选择：

- 方案收口。
- Scope 扩大、缩小或责任边界变化。
- 新证据推翻原方向并导致转向。
- Verification 范围、关键不变量或影响范围的非显然选择。
- Capability 缺失导致执行或验证降级。
- 风险接受、停止、BLOCKED／UNVERIFIED 判断。

机械动作不记录：读文件、grep、安装依赖、每条命令、每次 Tool Call 都不属于 Decision。

采用只追加方式。决定后来被推翻时，新加一条 Decision 记录新的选择、原因和结果；不编辑或删除历史来让过程显得更顺畅。旧 `decisions.tsv` 若仍被既有调用使用，也继续遵守同一只追加纪律。

每条 Evidence 都应指向能够直接检查的证据位置，例如 commit SHA、PR 编号、`file:line`、trace、截图、测试输出或目标 Skill 的结构化结果；不要写成无法复查的一段解释。

## 事实收集

### Harness

只记录本次实际使用的 Harness。配置存在、Skill 可读、Principle 被索引都不能单独证明“已应用”。Evidence of use 应指向真实产物、Decision、Verification 或路由事实。

### Trace

宿主能提供当前 Session／Run／Trace 时只记录引用，不复制完整 Transcript。宿主没有可用 Trace 时写 `UNAVAILABLE`，并明确 Observed Boundary；不可观察过程不得从结果反推。

### Verification

`nimo-verify` 等验证能力仍保持自己的执行语义。本 Skill只消费其已经产生的：

```text
Check / Source / Required / Verification / Evidence / Result / Artifact Version
```

不得为了填 Audit 把未执行的验证写成 PASS。

### Artifact

记录可解析的 Artifact 引用，例如 commit、文件、PR、构建产物或发布包。最终 Outcome 必须绑定精确 Artifact Version 才能支持 `VERIFIED`。

## 结束前审计

交回 Audited Run 前，对照本次运行实际发生的事情检查日志是否真实；再对照实际产物、目标 Skill 输出、Verification、可用 Host Trace 和 Decision 记录做一致性检查：

- 每个记录对应真实发生的事实。
- Evidence 能解析，并确实支持对应主张。
- 关键转向、能力降级、Verification 范围决定没有遗漏。
- `PASS` 不得缺 Evidence。
- `VERIFIED` 与 `PASS_WITH_SKIPS` 必须绑定当前 Artifact Version，并遵守 [公共判定契约](../nimo-mode/references/checkpoints.md#验证判定契约唯一真源)。
- `PASS_WITH_SKIPS` 的 outcome 请求携带 `skips` 数组，每项包含 `check`、`source`（用户声明引用）、`reason`、`taskId`、`artifactVersion`、`environment`；对应检查保持 NOT_RUN。final validate 必须传 `expectedEnvironment`，工具核对任务、版本、环境以及其他必要检查均 PASS。旧 v1 Outcome 没有 User Skips 列时按空数组读取；追加时补该列。
- source 是供审查的用户声明引用，工具检查结构与适用范围，不能自行证明用户确实授权；调用方必须核对真实用户消息。FAIL 未被后续有效 PASS 解决时，跳过不能使审计放行。
- 不可观察过程继续保持不可观察，不事后补造原因。

工作事实与 Audit 不一致时，修正 Audit，不改写事实叙述来迎合旧记录。

随后运行 `audit.mjs validate`。需要把这次 Audited Run 作为完成的审计样本时使用 `final=true`。

Task Audit 无效只影响**本次 Audited Run 的审计结论**；它不会反向禁止目标 Skill 独立使用，也不会成为 `opening-a-pr`、`nimo-verify` 等能力的隐藏前置条件。

## 独立复核

独立复核按风险触发，不要求每一份 Audit 都额外派 Agent：

- 长时间无人值守。
- 多 Agent 并发或跨模块大改。
- 安全、发布、迁移等高风险任务。
- 关键 Decision 缺少确定性证据。
- Task Contract 明确要求独立审计。

普通 Audited Run 完成一致性检查和确定性 `validate` 即可。

## Learning

单次 Task Audit 只能记录 `candidate`。一个 correction、retry 或单次成功不能直接提升为稳定 Harness 规则。只有多个可比 Task Audit 支持同一重复问题后，才进入后续 Harness Review；Harness 修改落地也不能单独证明改进有效，还要由后续可比任务验证结果是否改善。

## 工具

本 Skill 自带 `scripts/audit.mjs`，通过 JSON 请求提供：

```text
init      创建或幂等打开一份 Task Audit
append    追加 decision / harness / artifact / verification / outcome / learning
validate  校验 Contract、Evidence、Verification、Artifact Version 与 Verdict 的一致性
```

工具只做确定性记账和校验，不判断设计是否合理、不执行测试、不创建 PR、不控制其他 Skill。

旧的 `decisions.tsv` / `nimo-mode/scripts/log.mjs` 暂时保留给既有调用兼容；新的 Audited Run 以单一 Task Audit 为主记录，不再额外创建第二份 Decision 主文件。

## 与其他 Skill 组合

组合方向始终是：

```text
nimo-show-me-your-work(Target Skill)
```

而不是：

```text
Target Skill → 强依赖 Task Audit
```

任何目标 Skill 都应能在完全不知道 Task Audit 的情况下独立工作。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案、停止或外部动作授权仍以用户当前要求为准；启用 Audit 不扩大任何动作权限。

交付 Task Audit 位置、关键 Evidence、不可观察边界、最终 Verdict 与未验证项。不要交付内部推理全文。

来源：[pstack show-me-your-work](https://github.com/cursor/plugins/blob/f5bdd6826fd0a0d9cbc4347134c3a74a200b9d9d/pstack/skills/show-me-your-work/SKILL.md)，Task Audit Overlay 为 Nimo 扩展设计。
