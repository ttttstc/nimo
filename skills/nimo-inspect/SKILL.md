---
name: nimo-inspect
description: "按需生成当前工作区的本地离线任务报告：读取任务记录、最终验证记录、证据状态和显式会话引用；不重跑验证，不自动关联会话。"
---

# 查看任务链路和证据

当用户要查看一次任务承诺、交付版本、验收检查或验证依据时使用。自然语言请求“看看这次执行链路和证据”“看看验证依据”交由本技能处理。

## 不适用

- 用户要求验证功能时使用 [nimo-verify](../nimo-verify/SKILL.md)。
- 用户要求保存审计日志时使用 [nimo-show-me-your-work](../nimo-show-me-your-work/SKILL.md)。
- 用户要求修改目标、范围或验收时先由 [nimo-mode](../nimo-mode/SKILL.md) 持有任务记录。

## 输入

- 当前工作区。
- 可选的 `taskId`。没有 `taskId` 时只在当前工作区的 `.nimo/tasks/` 中按 `createdAt` 选择最新任务记录，同时间按 `taskId` 排序。
- `.nimo/tasks/<task-id>/task.json`、`verification.json` 和可选的旧格式 `audit.md`。
- 可选的、与任务记录中 `basis=declared` 会话引用精确匹配的 Codex JSONL 源路径 `source` 和事件边界。脚本核对 `session_meta.payload.id` 与 `cwd`；不接受模型手工重构的事件数组。

## 步骤

1. 精确读取指定任务，或展示当前工作区的确定性选择依据。
2. 读取任务记录的当前合同修订和历史修订。`required` 以任务记录为准。
3. 读取验证记录，检查验收覆盖、结果、跳过声明、未解决失败和记录本身的有效性。任务检查器不信任 `recordedVerdict` 字符串。
4. 比较合同修订、Git HEAD、未提交差异指纹、文件摘要和可知环境，分别显示 `MATCH`、`STALE` 或 `UNKNOWN`。
5. 逐项显示证据的引用、存在绑定和支持主张三层状态。任务检查器不读取引用内容来拼装报告。
6. 只投影显式声明且有事件边界的会话活动。无边界只显示引用；未知事件保持 `UNOBSERVED`；不实现自动关联。
7. 引用或摘要已有审计记录的关键决策、执行工具、执行记录、产物、验证和经验。冲突单独显示，不覆盖结构化事实。
8. 生成一页自包含 HTML。HTML 只允许安全链接协议，转义外部文本，不复制完整会话、工具载荷、凭据或内部推理。

## 产物

- 默认写入 `.nimo/inspector/<task-id>.html`。`output` 只能指定该目录内的 HTML，避免覆盖任务事实或业务文件。
- 报告显示 `recordedVerdict` 与当前 `applicability`，不会把历史结论当作当前通过。
- 没有任务记录、验证记录、审计记录或会话源时生成可读的降级报告，并保留缺失原因。

脚本入口为 [inspect.mjs](scripts/inspect.mjs)。任务记录由 [task-anchor.mjs](../nimo-mode/scripts/task-anchor.mjs) 管理，验证记录由 [record.mjs](../nimo-verify/scripts/record.mjs) 管理。

```powershell
node skills/nimo-inspect/scripts/inspect.mjs --input .\inspect-request.json
```

## 验证

- 用临时工作区黑盒测试任务记录、验证工具、任务检查器和恶意输入边界。
- 打开生成的 HTML，检查离线页面可读、状态可见、外部文本未执行。
- 需要真实验证时回到 [nimo-verify](../nimo-verify/SKILL.md)，不要把任务检查器输出当作验证本身。

## 边界

- 不重跑业务验证，不修改 Git、任务记录、验证记录或审计记录。
- 不根据时间、cwd、路径、提示文本或模型推断会话归属。
- 不建设状态机、通用报告框架或系统级 CLI。
- 不授予发布、合并、部署或其他外部操作权限。
