### 3.10 状态、版本与完成判断

任务执行状态和质量结论分开保存：

- 任务执行状态：`running | waiting-input | blocked | paused | delivered | cancelled`。
- 子任务状态：`queued | running | returned | accepted | integrated | failed | abandoned | cancelled`。returned 必须经过主 Agent 验收才变为 accepted；代码类单元完成整合后才记 integrated。
- 检查结果：`PASS | FAIL | NOT_RUN | NOT_APPLICABLE`，另存证据、独立性和原因。检查未执行不能改成 PASS。
- 交付结论：`VERIFIED | UNVERIFIED | BLOCKED`。即使用户接受跳过非强制检查，也只能交付 UNVERIFIED 并列出跳过项。
- 知识影响：`NOT_APPLICABLE | NONE | REVIEW_RECOMMENDED`，另存原因、受影响知识领域和当前产物版本。它只是后续知识审计的优先级信号，不是 `knowledge-audit` 结论。

```mermaid
stateDiagram-v2
    [*] --> running
    running --> waitingInput: 需要真实产品决定
    waitingInput --> running: 得到有效回答
    running --> blocked: 必要前提不可用
    blocked --> running: 前提恢复并重新核实
    running --> paused: 用户暂停或宿主无法续跑
    paused --> running: 明确恢复并核对现场
    running --> delivered: 交付产物及独立质量结论
    running --> cancelled: 用户取消
    waitingInput --> cancelled
    blocked --> cancelled
    paused --> cancelled
```

状态本身不启动工具，也不授予权限。等待输入没有“超时默认批准”；用户说继续，只承接最近明确的目标和范围。

验证记录至少包括目标、验收场景、环境、命令或实际操作、结果、时间、产物版本、执行者及是否独立。Git 产物记录 head 与未提交差异标识；文件产物记录内容哈希。配置和工程包版本也是长任务恢复的输入。

项目有实际变更时，进入 `delivered` 前根据当前差异、设计决定和验证事实做轻量知识影响判断。高信号包括核心模块增删、职责/主链路改变、公共接口/协议/Schema/配置契约改变、构建/部署/测试/运行方式改变、安全权限模型改变、关键领域模型改变、大规模迁移或能力正式废弃/落地。判断不扫描知识库、不主动调用 `nimo-knowledge-audit`、不因 `REVIEW_RECOMMENDED` 阻断交付。长期 program 将结果写入 `knowledgeImpact`；短任务在最终 checkpoint/交付摘要记录需要审计的领域。

修改 head、依赖、基线或运行环境时，识别受影响证据并重新检查。没有变化且能证明适用范围未变的证据可复用，不机械重跑所有检查。patch-id 相同仅支持判断补丁内容等价，不能覆盖基线改变引入的集成风险。

普通任务在会话内保留必要信息即可。长任务每个可验证单元后保存 checkpoint 和决策记录；不要让每条工具调用都变成一段流水账。恢复时先读摘要和相关证据，原始日志按问题查阅。
