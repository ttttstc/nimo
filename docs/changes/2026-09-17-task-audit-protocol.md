# Task Audit 可信审计协议与适配方案

## 1. 背景

Nimo 已经具备 Task Contract、Playbook、Verification、Evidence、Gate、Handoff 等执行控制语义，也有 `nimo-show-me-your-work` 记录长任务关键决定。但当前记录仍存在三个缺口：

1. 决策日志与任务结果分散，评审者需要同时查会话、`decisions.tsv`、验证结果和交付摘要。
2. 是否创建决策日志依赖 Agent 主动意识到“该记录了”，容易出现应记未记。
3. 日志本身没有进入交付门禁；即使缺失或与最终产物、验收、验证不一致，任务仍可能被描述为已验证。

本变更把这些能力收敛成一份 **Task Audit**：以单个任务目标和验收边界为单位，记录本次实际生效的 Harness、关键 Decision、Artifact、Verification、Evidence、Trace 边界与最终 Outcome，并为后续 Harness Review 提供可比较的任务样本。

## 2. 设计目标

第一版只解决四件事：

- **可追溯**：可以从一次任务回到 Contract、关键选择、产物版本、验收验证与证据。
- **可校验**：Task Audit 的关键关系由确定性工具检查，不依赖 Agent 自报完整。
- **难遗漏**：核心研发任务默认建立 Audit；缺失或无效 Audit 不能形成 Nimo 的 VERIFIED 交付。
- **可学习**：单次任务只记录 Learning Candidate；多个可比 Task Audit 出现相同问题后，才进入 Harness Review。

## 3. 非目标

第一版不建设：

- 完整模型思维链、Token、每次 Tool Call 或会话 Transcript 的复制。
- Runtime Event Bus、Span 系统、Session 数据库、Replay Runtime。
- 自动聚类、自动修改 Skill / Principle / Playbook、自动提交 Harness PR。
- 全项目测试覆盖率平台或独立评测平台。

这些属于宿主 Runtime / Observability 或后续 Harness Review 的演进范围。Nimo 只定义任务级语义审计。

## 4. 核心边界

### 4.1 Task Audit 是语义事实入口，不是底层事实源

Task Audit 组织以下已有事实：

```text
Task Contract ───────┐
Git / Artifact ──────┤
Host Trace ──────────┤
Verification ────────┼──→ Task Audit
Evidence ────────────┤
Runtime / CI Result ─┘
```

底层事实仍属于 Git、真实产物、`nimo-verify` 证据、宿主 Trace、CI 和运行结果。Audit 不能用一段自然语言替代它们。

### 4.2 Host Trace 只引用，不复制

宿主能提供 Session / Run / Trace 时记录引用；不能提供时明确写 `UNAVAILABLE`，同时写清 Observed Boundary。没有 Trace 不能被补推断成“已观察”。

### 4.3 Harness 只记录实际使用

配置存在、Skill 可读、Principle 被索引，不等于本次任务实际应用。`Harness` 区每个条目必须带 Evidence of use，例如 Decision、Verification、Artifact 或实际路由事实。

### 4.4 决策记录不保存内部推理全文

Decision 只记录可公开审查的：

```text
Decision + Reason + Evidence + Result
```

如果换一个选择会实质改变 Artifact、Scope、Risk、Acceptance 或 Verification，则记录；机械动作不记录。

## 5. 单一主记录

第一版不再维护独立的 Decision Log、Task Episode、Handoff 主文件。

每个需要审计的任务只维护：

```text
<projectRoot>/.nimo/tasks/<task-id>/audit.md
```

该目录已经属于 Nimo 本地任务状态，默认不进入 Git。这样 Task Audit 可以在 Final Verify 后更新，而不会反过来改变待交付产品版本并制造验证循环。

Task Audit 固定包含：

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

其中：

- `Decisions` 保留按时间追加的历史。
- `Verification` 保留同一检查的重试历史，以最后一条为当前结果。
- `Outcome` 保留状态变化历史，以最后一条为当前结论。
- `Learning` 第一版只能是 `candidate`。

## 6. 生命周期

```text
Task route
   ↓
audit init
   ↓
Task Audit = RUNNING / PENDING
   ↓
执行任务
   ├─ 关键选择 → audit append decision
   ├─ 实际 Harness → audit append harness
   ├─ 产物 → audit append artifact
   └─ nimo-verify → audit append verification
   ↓
Final Verify
   ↓
audit append outcome
   ↓
audit validate --final
   ↓
Delivery Gate
```

### 6.1 默认开启

发生项目资产变更、需要形成 `VERIFIED | UNVERIFIED | BLOCKED` 交付结论，或进入长程 / 多 Agent 研发流程的任务，Task Audit 默认必需。

纯只读、纯方案且没有实现交付的请求可以不创建 Audit；一旦从只读切换到实际变更，必须先初始化 Audit 再继续写入。

### 6.2 直接接手已有差异

用户直接调用 `opening-a-pr` 或接续一个此前没有 Task Audit 的既有工作时，不允许伪造过去过程。初始化一份收口 Audit：

- Contract 来自当前明确目标和验收。
- Trace 标明此前实现过程 `UNOBSERVED`。
- Harness 只记录当前真正执行的收口、评审与验证。
- Final Verify 和最终 Artifact Version 仍必须完整记录。

## 7. Decision Recording

`nimo-show-me-your-work` 从“长任务 TSV 日志 Skill”升级为 Task Audit 的关键决策记录协议。

### 7.1 固定触发点

以下节点检查是否发生实质选择：

- 设计方案收口。
- Scope 扩大、缩小或责任边界变化。
- 新证据推翻原方向并导致转向。
- Verification 范围、关键不变量或 Blast Radius 的非显然选择。
- Capability 缺失导致执行或验证降级。
- 风险接受、停止、BLOCKED / UNVERIFIED 判断。

### 7.2 稀疏记录

Audit 默认开启不等于每个任务都必须有 Decision。简单确定性 Feature 可以是零条 Decision。禁止把读文件、运行命令、安装依赖等机械动作写成流水账。

### 7.3 只追加

Decision ID 自动按 `D1, D2...` 递增。旧选择被推翻时追加新 Decision，`Result` 中说明替代关系；不得重写历史来让过程看起来更顺畅。

结束前执行 Decision Audit：对照当前差异、Verification、Artifact 和可用 Host Trace，检查关键转向、降级与验证范围决定有没有漏记。事后补录必须只写可观察事实，不伪造当时的内部思维过程。

## 8. 确定性工具

新增 `skills/nimo-mode/scripts/audit.mjs`，统一暴露三种操作。

### 8.1 `init`

职责：

- 校验 `projectRoot`、`taskId`、Goal、Scope、Acceptance、Playbook、Nimo Revision 与 Trace 边界。
- 创建 `.nimo/tasks/<task-id>/audit.md`。
- 初始化状态为 `running / PENDING`。
- 同一 Task ID 重复调用幂等；冲突文件拒绝接管。

### 8.2 `append`

支持：

- `decision`
- `harness`
- `artifact`
- `verification`
- `outcome`
- `learning`

工具只做确定性记账：不决定某个设计是否合理、不执行验证、不自行改变任务结论。

### 8.3 `validate`

普通校验检查结构与引用关系；`final=true` 时作为交付门禁，至少检查：

- Task ID、Nimo Revision、Trace Boundary 存在。
- Harness 条目有 Evidence of use。
- Decision ID 唯一、Phase 合法、Evidence 非空。
- Artifact 有引用。
- 每个 Acceptance 有 Required Verification。
- `PASS` 必须有 Evidence。
- 同一 Check 重试时不能改变 Source 或 Requiredness。
- Final Audit 不能保持 `PENDING`。
- Final Audit 必须绑定 Artifact Version。
- `VERIFIED` 时所有 Acceptance 和其他 Required Check 的最新结果必须 `PASS`。
- 可选的 expected Artifact Version / Verdict 必须和 Audit 最终状态一致。

缺失或无效 Audit 采用 fail-closed：不能在 Nimo 协议下宣称 VERIFIED 或完成最终交付。

## 9. 与 Verification 的关系

`nimo-verify` 仍是 Verification 唯一执行语义。Audit 工具不能执行任何测试或判断业务 PASS / FAIL。

对于需要 Task Audit 的任务：

```text
Acceptance / Invariant / Blast Radius
          ↓
       nimo-verify
          ↓
  PASS / FAIL / NOT_RUN / NOT_APPLICABLE
          ↓
 audit append verification
```

每个场景的 Source、Requiredness、Verification Asset / 实际路径、Evidence / Reason 与 Result 都进入 Audit。最终 Overall Verdict 由 `nimo-verify` 形成，再由调用方写入 Outcome；`audit validate` 只检查这些事实是否自洽。

## 10. 与 Checkpoint / Program State 的关系

两者职责不同：

- Checkpoint / Program State：恢复执行现场、Owner、Unit、Frontier、长期状态。
- Task Audit：任务级语义审计，回答目标、实际 Harness、关键选择、产物、验收证明和最终结果。

短任务可以只有 Task Audit 而没有 Program State；长任务复用同一个 `taskId`，Program State 与 Audit 并存，不能互相替代。

## 11. 与交付门禁的关系

`nimo-mode` 公共规则负责保证 Audit 被初始化；`opening-a-pr` 和无 PR 的最终交付路径负责最终校验。

关键规则：

```text
Audit missing / invalid
        ↓
不能 VERIFIED
不能以 Nimo 完成交付
```

`opening-a-pr` 在 Final Verify 之后、首次外部 PR 写操作之前：

1. 写入最终 Artifact 与逐场景 Verification。
2. 写入最终 Outcome。
3. 运行 `audit validate final` 并绑定 Final Verify 的 Artifact Version / Verdict。
4. 只有校验通过才继续 push / create PR。

Task Audit 位于 `.nimo/tasks/`，不属于产品交付差异，因此这一步不会使刚完成的 Final Verify 失效。

## 12. 独立复核

现有 `show-me-your-work` 对所有决策日志强制尝试独立复核成本过高。第一版改成风险触发：

- 长时间无人值守。
- 多 Agent 并发或跨模块大改。
- 安全、发布、迁移等高风险变更。
- 关键 Decision 缺少确定性证据。
- Task Contract 明确要求独立审计。

普通 Feature 只需要结束前一致性审计和确定性 `audit validate`。

## 13. Learning 与 Harness 自进化

单个 Task Audit 的 Learning 只能产生 `candidate`，不能直接修改 Harness。

后续 Harness Review 至少基于多个可比 Task Audit：

```text
Audit A ─┐
Audit B ─┼─→ repeated pattern → Harness Review → intervention
Audit C ─┘                                      ↓
                                      later comparable audits
                                                ↓
                                      验证改进是否有效
```

重复问题最终可能进入 Principle、Playbook、Skill、Verification Asset、Gate、Knowledge 或 Capability；默认不把每个问题都新增成 Skill。

## 14. 兼容与迁移

- `log.mjs` 第一版保留，避免已有调用立即失效；标记为 legacy，不再作为新的 Nimo 任务审计主入口。
- `decision-log-template.tsv` 不再是 Task Audit 的事实源；新任务不生成独立 TSV。
- 既有 `.nimo/tasks`、Program State、Checkpoint 结构不迁移，Audit 只增加同 Task ID 下的 `audit.md`。
- 宿主若以后支持 task-start / before-delivery Hook，可以原生调用 `audit init / validate`；Core 协议不依赖任何特定宿主 Hook。

## 15. 测试与验收

### 工具链测试

必须覆盖：

1. Init 创建 Audit 且幂等。
2. Decision 稀疏追加、Markdown 安全转义。
3. Verification 重试保留历史，最新结果决定当前状态。
4. 缺某个 Acceptance Verification 时 Final Validate 阻塞。
5. `VERIFIED` + Required Check 非 PASS 时阻塞。
6. Artifact Version / Verdict 与调用方预期不一致时阻塞。
7. Host Trace 不可用时明确 WARN，不伪装已观察。
8. 从 init → append → verify → outcome → final validate 的完整链路通过。

### 行为评测

新增负例：

- Agent 完成 Feature 和验证却不生成 Task Audit，仍宣称 VERIFIED / 创建 PR。
- Task Audit 存在，但 Acceptance 缺验证或 PASS 无 Evidence，仍宣称 VERIFIED。

两者都必须失败。

## 16. 第一版验收结论

本方案完成后，Nimo 的可信链路为：

```text
Task Contract
      ↓
Task Audit init
      ↓
Playbook execution
      ├─ Decisions
      ├─ Harness use
      └─ Artifacts
      ↓
nimo-verify
      ↓
Verification + Evidence
      ↓
Outcome
      ↓
Task Audit validate
      ↓
Delivery Gate
```

第一版的核心承诺不是“记录 Agent 的一切”，而是：**任何由 Nimo 宣称完成的重要工程任务，都有一份可回到真实证据、明确可观察边界、绑定当前产物版本且能被确定性校验的任务审计记录。**
