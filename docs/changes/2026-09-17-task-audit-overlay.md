# Task Audit Overlay 设计与适配方案

## 1. 结论

Task Audit 保留，但从 Nimo 的横切硬依赖改为 **可插拔审计层**。

> **Audit 是可插拔的观察与审计层，不是每个 Skill 的协议依赖。**

普通 Skill 继续只负责自己的领域语义；只有进入 Audited Run 时，`nimo-show-me-your-work` 才创建、维护和校验 Task Audit。

第一版不再修改 `nimo-mode`、`feature`、`bug-fix`、`refactoring`、`nimo-verify`、`opening-a-pr` 等叶子能力来适配 Audit。

## 2. 为什么回退 #24 的横切设计

#24 的目标是提高任务级可追溯性，但把“需要 Audit 的任务必须可靠地产生 Audit”实现成了“多数工程 Skill 都知道 Audit”。结果形成了明显耦合：

```text
nimo-mode
feature
bug-fix
refactoring
nimo-verify
opening-a-pr
...
    ↓
都知道 audit.md
都知道 append / validate
```

这种结构有四个长期问题：

1. Audit schema 或生命周期一变，需要修改多个业务 Skill。
2. 单独复用叶子 Skill 时会被迫携带与自身职责无关的审计语义。
3. `nimo-verify` 等能力从“产生事实”变成“产生事实 + 写 Audit”，职责扩张。
4. Audit 逐渐成为 Harness 中心依赖，削弱 Nimo 的组合性和宿主无关性。

因此回退原则是：

> **Leaf Skill 零 Task Audit 知识。**

叶子能力产生真实结果；Audit Overlay 在调用层消费和组织结果。

## 3. 目标架构

```text
                    Nimo Skills
   ┌────────────────────────────────────┐
   │ Feature / Bug Fix / Refactor       │
   │ Architect / Verify / Opening PR    │
   │ Shipping / Investigation / ...     │
   └────────────────────────────────────┘
                    ▲
                    │ compose
                    │
         ┌────────────────────────┐
         │ nimo-show-me-your-work │
         │                        │
         │ Task Audit             │
         │ Decision Recording     │
         │ Evidence Collection    │
         │ Audit Validation       │
         └────────────────────────┘
                    ▲
                    │ optional
               Audit Policy
```

执行方式：

```text
普通执行
Target Skill → Result

审计执行
show-me-your-work
      ↓
audit init
      ↓
Target Skill
      ↓
collect facts / decisions
      ↓
audit finalize + validate
      ↓
Task Audit
```

## 4. 职责边界

### 4.1 `nimo-show-me-your-work`

它是 Task Audit 的唯一语义 Owner：

- 决定 Audited Run 中什么时候创建 Audit。
- 定义什么算关键 Decision。
- 从目标 Skill 的真实输出中收集 Artifact、Verification、Evidence。
- 记录 Host Trace 引用与 Observed Boundary。
- 收敛 Outcome 与 Learning Candidate。
- 调用确定性工具校验 Audit 一致性。

### 4.2 叶子 Skill

保持原有职责，不增加 Audit 代码或协议：

- `feature`：设计、实现、验收。
- `bug-fix`：复现、定位、修复、回归。
- `refactoring`：保持行为的结构调整。
- `nimo-verify`：执行验证并返回结果与证据。
- `opening-a-pr`：整理并创建 PR。

它们不负责：

- 初始化 Audit。
- 追加 Decision。
- 写 Verification 到 Audit。
- 校验 Audit。
- 因 Audit 缺失而拒绝自己的独立动作。

### 4.3 `audit.mjs`

确定性工具归属：

```text
skills/nimo-show-me-your-work/scripts/audit.mjs
```

不再放在 `nimo-mode/scripts/` 下，避免暗示 Mode 是审计生命周期 Owner。

工具只做：

```text
init
append
validate
```

不执行测试、不创建 PR、不调度 Agent、不判断设计优劣。

## 5. Audit Policy

V1 不把 Audit 默认强制到所有工程任务。

第一版策略：

```text
explicit → risk-based → required
```

含义：

1. **explicit**：用户明确要求审计／可追溯，或上层显式选择 Audited Run。
2. **risk-based**：调用层可根据长时无人值守、多 Agent、迁移、安全、发布等风险选择启用。
3. **required**：未来只有经过真实使用验证后，才考虑由组织／宿主策略把某些任务类型设为必须审计。

无论策略如何演进，都通过调用层包装目标 Skill，不把 `if audit ...` 下沉到每个叶子 Skill。

## 6. 单一 Task Audit

Audited Run 只维护一个任务级主记录：

```text
<projectRoot>/.nimo/tasks/<task-id>/audit.md
```

结构：

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

不再同时维护 Task Episode + Decision Log + Handoff 三份主记录。

Task Audit 是任务级语义事实入口；底层事实仍来自：

```text
Git
Artifact
Target Skill Result
Verification Evidence
Host Trace
CI / Runtime Result
```

## 7. Decision Recording

Decision 只记录会实质影响以下任一对象的选择：

```text
Artifact
Scope
Risk
Acceptance
Verification
```

记录：

```text
Decision + Reason + Evidence + Result
```

不记录完整思维链，不记录每次 Tool Call 或机械动作。

Decision append-only。后续推翻旧选择时新增记录，不覆盖历史。

## 8. Verification 关系

`nimo-verify` 不写 Audit。

正确关系：

```text
nimo-verify
   ↓
Verification Result
   ↓
show-me-your-work consumes
   ↓
Task Audit
```

Audit 中可以记录：

```text
Check
Source
Required
Verification
Evidence
Result
Artifact Version
```

但这些必须来自实际验证结果，不能由审计层自行判断 PASS。

## 9. opening-a-pr 关系

`opening-a-pr` 完全独立于 Audit：

```text
existing diff
   ↓
opening-a-pr
   ↓
cleanup / review / Final Verify / PR
```

没有 Audit 也可以正常创建 PR。

如果一个 Audited Run 内部调用 `opening-a-pr`，关系是：

```text
show-me-your-work
      ↓
opening-a-pr
      ↓
PR Result
      ↓
show-me-your-work 收集结果
```

而不是 `opening-a-pr → Task Audit`。

## 10. 强制生成如何保证

普通任务不保证生成 Audit，因为没有审计要求。

一旦进入 Audited Run，生命周期由 `nimo-show-me-your-work` 自己控制：

```text
Audited Run start
      ↓
audit init
      ↓
Target Skill
      ↓
append selected facts
      ↓
audit validate
      ↓
Audited Run complete
```

因此强制点位于 wrapper，而不是散落在每个业务 Skill。

Audit 缺失或无效时：

- 不能声称该 **Audited Run** 审计完成。
- 不代表目标 Skill 本身不能独立完成。
- 不自动阻止 `opening-a-pr`、`nimo-verify` 等独立动作。

## 11. 确定性校验

V1 `audit.mjs` 保留以下可信性约束：

- 同一 Task ID 只能幂等复用同一 Goal / Scope / Acceptance 边界。
- Contract Hash 可检测 Audit 中 Contract 被直接篡改。
- Decision ID 只追加并保持唯一。
- Verification retry 不能改变 Source 或 Requiredness 来规避历史失败。
- Acceptance 在 Final Audit 中必须有 Required Verification。
- PASS 必须有 Evidence。
- `VERIFIED` 必须绑定 Artifact Version。
- `VERIFIED` 下所有 Required Check 最新结果必须 PASS。
- Host Trace 缺失显式 WARN，不伪造观察。
- Learning V1 只能保持 `candidate`。

## 12. Learning 与 Harness Review

单个 Task Audit 只产生 Learning Candidate。

```text
Audit A ─┐
Audit B ─┼─→ repeated pattern → Harness Review → intervention
Audit C ─┘                                      ↓
                                      later comparable audits
                                                ↓
                                      验证改进是否有效
```

Harness 改动合入只证明“改造发生了”，不证明“效果改善了”。效果必须由后续可比 Audited Run 验证。

## 13. 兼容

- `nimo-mode/scripts/log.mjs` 与 `decisions.tsv` 暂时保留给既有调用，不在本变更删除。
- 新的 Audited Run 使用单一 Task Audit，不额外创建第二份 Decision 主文件。
- 不修改现有 Mode 路由、Feature、Bug Fix、Refactor、Verify、Opening PR、Shipping 等协议。
- 后续宿主若支持 task-start / task-end Hook，可以直接包装 `nimo-show-me-your-work`，无需修改叶子 Skill。

## 14. 测试

专项黑盒测试覆盖：

1. Init 创建和幂等。
2. 同 Task ID 的 Contract 漂移拒绝复用。
3. Decision 稀疏追加。
4. Artifact / Verification / Outcome 完整链路。
5. Acceptance 缺 Verification 时 Final Validate 阻断。
6. Verification retry 不能改变 Source / Requiredness。
7. Contract 手工篡改可检测。
8. Host Trace 缺失保持显式警告。
9. Learning 不能在 V1 自动提升为 accepted。

Fidelity Test 额外固定：

> `nimo-mode`、Feature、Bug Fix、Refactor、`nimo-verify`、`opening-a-pr` 必须保持零 Task Audit 实现依赖。

## 15. 第一版验收

第一版完成的判定标准：

- `show-me-your-work` 可以独立包装一次任务并生成合法 Task Audit。
- 不启用 `show-me-your-work` 时，所有现有 Skill 行为保持原样。
- Leaf Skill 不出现 Task Audit / `audit.mjs` 依赖。
- Audit 工具的完整链路和负例校验通过。
- Audit 失效只阻断 Audited Run 的审计完成状态，不改变其他 Skill 的独立动作授权和业务语义。
