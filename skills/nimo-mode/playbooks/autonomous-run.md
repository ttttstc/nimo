# 持续完成一个目标

标识：PB17。持续完成一个目标时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 先写可判定完成条件和停止边界。
2. 选择宿主事件等待／定时唤醒，或明确仅当前会话运行。
3. 每轮最小有效动作。
4. 对完成条件验证。
5. 写决策与检查点。
6. 继续或停止。

## 必要条件与停止

不把提示词当后台进程。无持续运行能力时不能承诺离线继续；保存恢复点并报告限制。用户停止、预算耗尽和真实阻塞不是成功；不能降低完成条件。无关新问题记录为后续事项。

记录退出条件和预算。没有后台工具只在当前会话推进，结束留下恢复点，不建立私有服务或模型 API。达到目标、预算耗尽和阻塞分别报告。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack autonomous-run](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autonomous-run.md)。
