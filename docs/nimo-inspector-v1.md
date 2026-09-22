# Nimo Inspector V1

## 事实边界

Inspector 只读取当前 workspace 的任务记录和宿主明确提供的 Session 源。它不重跑验证，不从时间、cwd、路径、prompt 或模型推断会话归属。

任务目录为 `.nimo/tasks/<task-id>/`。运行记录不进入 Git：

- `task.json` 是 Task Anchor。它保存目标、范围、合同修订、完整验收快照、初始产物指纹和显式 `sessionRefs`。
- `verification.json` 是 Final Verification Record。它保存 `contractRevision`、`artifactVersion`、`environment`、逐项检查、跳过声明、`recordedVerdict` 和未解决失败。
- `audit.md` 是可选的旧格式 Task Audit。Inspector 只读取它的摘要和增强事实。

Anchor 的验收项是 `required` 的唯一权威。Verify JSON 的检查用 `acceptanceIds` 关联验收项。一个验收项可以对应多个检查；检查是否必要由 Anchor 推导，不能由验证记录降级。

## 判定

逐项结果为 `PASS`、`FAIL`、`NOT_RUN` 或 `NOT_APPLICABLE`。任务结论沿用公共契约：

- `VERIFIED`：必要检查全部 `PASS`，且没有未解决失败。
- `PASS_WITH_SKIPS`：必要 `NOT_RUN` 全部有同任务、同产物、同环境的用户声明，其他必要检查通过，且没有未解决失败。
- `BLOCKED`：必要检查未执行，且没有适用的用户声明。
- `UNVERIFIED`：存在失败、无效证据、必要项缺失或其他不能放行的情况。

验证记录不会用新的 `NOT_RUN`、`NOT_APPLICABLE` 或跳过声明覆盖历史 `FAIL`。只有同一检查的适用后续 `PASS` 才能从 `unresolvedFailures` 中移除它。

## 当前适用性

报告分开展示历史 `recordedVerdict` 和当前 `applicability`：

- `MATCH`：合同修订、可比较的产物指纹和目标环境匹配。
- `STALE`：合同修订、Git HEAD、未提交差异指纹、产物文件摘要或环境发生变化。
- `UNKNOWN`：缺少可比较的版本或环境事实。

历史 `VERIFIED` 只有在 `MATCH` 且记录自身校验通过时，才可作为当前结论。Inspector 生成的是带 `generatedAt` 的静态快照。

## 证据层

每条证据记录 `source` 和 `location`。报告分别显示：

1. 引用是否完整。
2. 本地文件是否存在，摘要或版本是否可绑定。远程引用默认 `REMOTE_UNCHECKED`。
3. 生产者是否声明 machine-result 主张。声明显示为 `CLAIM_DECLARED`，Inspector 不把声明当作独立复核。文件内容绑定需要摘要匹配，仅有版本字符串不足以检测覆盖。

Inspector 只读取文件元数据和必要的摘要来检查绑定，不复制引用内容。路径穿越、符号链接、危险协议和超过资源限制的文件会保留诊断。

## Session 与 Audit

V1 只接受 `basis=declared` 的 Session Ref。Ref 没有事件起止边界时只显示引用，不展示整段会话。宿主事件只投影 `inspect/read`、`change`、`execute/check` 和 `git/delivery`；未知格式显示 `UNOBSERVED`。自动关联延期到独立任务。

Codex Ref 的 `source` 指向明确的 JSONL rollout。读取上限为 16 MiB，拒绝符号链接，核对 Session ID 和 workspace。`turnStart` 与 `turnEnd` 是从 1 开始的不同 turn_context 序号；`eventStart` 与 `eventEnd` 是非空 JSONL 记录的序号字符串，范围包含两端。只按源记录顺序切片，不按 ID 字符串排序。未知工具调用保留 UNOBSERVED，不解释完整命令或工具载荷。

未提供当前目标 `environment` 时，适用性为 UNKNOWN。PASS 证据缺失或没有可检查的内容绑定时，当前结论为 UNVERIFIED，历史结论保留。

没有 Audit 时核心合同、验证、适用性和证据视图仍生成。有 Audit 时只增加 Decisions、Harness、Trace、Artifacts、Verification 和 Learning 摘要。Audit 与结构化记录冲突时显示冲突，不静默覆盖。

## 调用和输出

`skills/nimo-mode/scripts/task-anchor.mjs` 管理 Anchor，`skills/nimo-verify/scripts/record.mjs` 管理 Verify JSON，`skills/nimo-inspect/scripts/inspect.mjs` 生成 HTML。三者使用原子写入，Anchor 和 Verify 通过任务级锁保护更新，并拒绝越界或符号链接路径。

```powershell
node skills/nimo-inspect/scripts/inspect.mjs --input .\inspect-request.json
```

默认输出 `.nimo/inspector/<task-id>.html`。HTML 没有运行时脚本，离线打开即可阅读。

请求示例：`{"projectRoot":"D:/projects/example","taskId":"fix-login","environment":"local"}`。`output` 仅可指定 `.nimo/inspector/` 内的 HTML 路径。`currentSnapshot` 用于显式提供已观察的目标快照；普通本地调用省略它，由脚本读取实际工作区。
