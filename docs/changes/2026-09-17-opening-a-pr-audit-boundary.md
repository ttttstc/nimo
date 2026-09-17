# opening-a-pr 与 Task Audit 边界优化

## 1. 背景

Task Audit 第一版把最终 Audit 写入与 `opening-a-pr` 绑定在一起：PR 创建前由 `opening-a-pr` 写最终 Artifact / Verification / Outcome，并执行 `audit validate final`。该设计可以防止漏 Audit，但把“任务生命周期审计”和“Git PR 包装”耦合在同一个动作里。

这会产生三个问题：

1. 用户直接对已有差异调用 `opening-a-pr` 时，也被迫反向创建一份大部分历史不可观察的 Task Audit。
2. `opening-a-pr` 同时承担 cleanup、review、Final Verify、分支组织、PR 描述、push、PR 创建和 Task Audit finalize，职责过重。
3. Task Audit 是任务级语义审计；PR 是交付出口之一。把 Audit 作为 PR 的前置条件，会把两条本应独立的状态线绑定起来。

本文调整并覆盖 `2026-09-17-task-audit-protocol.md` 中关于“`opening-a-pr` 创建／最终校验 Task Audit”的相关设计。Task Audit 主协议的其他部分保持不变。

## 2. 核心结论

`opening-a-pr` 是独立 Git 交付动作，不拥有 Task Audit 生命周期。

```text
任务生命周期                           PR 交付动作

Feature / Bug Fix / Refactor           opening-a-pr
        │                                  │
        ├─ Contract                         ├─ cleanup
        ├─ Decisions                        ├─ review
        ├─ Verification                     ├─ commit / rebase
        ├─ Task Audit                       ├─ PR Final Verify
        │                                  ├─ push / create PR
        └─ VERIFIED / delivered             └─ readback
```

两者可以组合，但互不成为对方的存在前提。

## 3. opening-a-pr 的职责

`opening-a-pr` 只回答：

> 当前准备 push / 创建 PR 的 Git Artifact 是否经过必要收口和验证，可以被准确包装成 PR？

固定职责：

1. 工作目录与分支整理。
2. cleanup。
3. 对抗评审。
4. commit / rebase / 冲突处理。
5. 对当前 Artifact 做 PR Final Verify。
6. 生成 PR title / body。
7. push。
8. create / update PR。
9. 读回真实状态。

明确不负责：

- 不创建 Task Audit。
- 不写 Task Audit。
- 不执行 `audit validate final`。
- 不因 Task Audit 缺失阻止 push / 创建 PR。
- 不为了直接开 PR 反向补造此前任务历史。

## 4. Task Audit 的职责

Task Audit 只由拥有任务生命周期的 Playbook 管理。

一个 Playbook 如果拥有：

```text
Goal + Scope + Acceptance + Execution Lifecycle
```

并需要形成 Nimo 的：

```text
VERIFIED | UNVERIFIED | BLOCKED
```

则该 Playbook 负责：

```text
audit init
   ↓
执行中 append Decision / Verification / Artifact
   ↓
获得最终 Artifact 与 Final Verify 事实
   ↓
audit finalize
   ↓
audit validate final
   ↓
任务 VERIFIED / delivered
```

Task Audit 的门禁约束“任务是否可以宣称完成”，不约束“一个 PR 是否允许存在”。

## 5. 两种调用路径

### 5.1 直接调用 opening-a-pr

用户已有代码差异，只要求：

> 整理并提交 PR。

流程：

```text
existing diff
   ↓
opening-a-pr
   ↓
cleanup / review / commit organization
   ↓
PR Final Verify
   ↓
push / create PR
```

不要求 Task Audit。

即使此前实现过程完全不可观察，也不需要创建一份以 `UNOBSERVED` 为主体的 Audit。

### 5.2 audited task 调用 opening-a-pr

例如 Feature：

```text
Feature
   ↓
Task Audit 已存在
   ↓
实现 / Verification
   ↓
opening-a-pr
   ↓
返回：
- final Artifact Version
- PR Final Verify results
- Evidence
- PR URL / state
- 本流程内的实质转向
   ↓
Feature 继续拥有 Task Audit
   ↓
audit finalize / validate
   ↓
Feature VERIFIED / delivered
```

`opening-a-pr` 不修改 Audit，只返回调用方完成审计所需的真实事实。

## 6. Final Verify 的两个语义

需要区分：

### Task Final Verify

证明 Task Contract 的 Acceptance 在最终 Artifact 上成立。

责任方：拥有任务生命周期的 Playbook。

### PR Final Verify

证明当前准备 push 的 Git Artifact 在 cleanup、review、rebase、冲突处理后仍然成立。

责任方：`opening-a-pr`。

两者可能复用同一组 Verification Asset，但责任边界不同。

如果上游验证仍然绑定当前 Artifact，且 `opening-a-pr` 没有改变代码语义，可以复用；否则 `opening-a-pr` 必须重新执行 Final Verify。

## 7. 状态解耦

可能存在以下状态：

```text
PR_CREATED = true
TASK_AUDIT_VALID = false
```

这是合法状态。

含义是：PR 已经存在，但上游 Nimo 任务还不能宣称 `VERIFIED／delivered`。

反过来也可以：

```text
TASK_AUDIT_VALID = true
PR_CREATED = false
```

例如用户只要求本地完成，不授权 push / PR。

因此：

```text
Task completion state
≠
PR existence state
```

## 8. Mode 规则调整

Task Audit 默认规则改为：

> 只对拥有 Goal／Scope／Acceptance 与执行生命周期的工程任务默认开启。

以下独立仓库／交付动作不因自身调用自动建立 Task Audit：

- `opening-a-pr`
- `babysit`
- `shipping`
- `worktree-cleanup`

如果它们由 audited task 调用，只返回事实，调用方继续维护自己的 Audit。

## 9. Playbook 适配

### Feature

`opening-a-pr` 返回后，Feature 使用最终 Artifact Version、PR Final Verify 逐项结果和 Evidence 完成自己的 Audit finalize / validate，之后才能宣称 Feature `VERIFIED／delivered`。

### Bug Fix

同样由 Bug Fix 自己维护 Audit。`opening-a-pr` 返回最终 Artifact 与原始复现／关键不变量／相关回归结果，Bug Fix 再收口 Audit。

### Refactoring

`opening-a-pr` 返回最终 Artifact 与等价性验证事实；Refactoring 自己完成任务 Audit。

### 直接 opening-a-pr

完全不要求 Audit。

## 10. 失败语义

### opening-a-pr 失败

由以下事实阻断：

- 对抗评审仍有处理项。
- 当前 Artifact Final Verify 未通过。
- PR 操作授权不足。
- forge / branch / remote 操作失败。

Task Audit 缺失不属于其阻断条件。

### audited task 失败

Audit 缺失、Acceptance Verification 不完整、PASS 无 Evidence、Artifact Version／Verdict 不一致等，仍会阻断该任务进入 Nimo `VERIFIED／delivered`。

它们不会反向删除或禁止一个已经创建的 PR。

## 11. 验收标准

1. 直接调用 `opening-a-pr`，没有 Task Audit，也能进入 PR cleanup → Final Verify → PR 创建流程。
2. `opening-a-pr` 文档与依赖中不存在 `audit.mjs`、`Task Audit 最终门禁` 或 `nimo-show-me-your-work` 强制依赖。
3. audited Feature 调用 `opening-a-pr` 后，Feature 仍负责 final Audit validate。
4. Audit 缺失不能再作为 `opening-a-pr` 停止 push / 创建 PR 的原因。
5. Audit 缺失仍然阻止 audited task 对外宣称 Nimo `VERIFIED／delivered`。
6. `opening-a-pr` 修改代码语义后必须重新 PR Final Verify；该结果由调用方用于绑定自己的最终 Audit。

## 12. 设计原则

最终边界：

> **Task Audit 审计任务；opening-a-pr 交付 Git 变更。**

Audit 是任务可信性的控制面，PR 是交付动作。两者可以交换 Artifact Version、Verification 和 Evidence，但不互相拥有生命周期。