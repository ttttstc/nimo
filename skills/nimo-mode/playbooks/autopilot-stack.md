# 实现并交付 PR 链

标识：PB20。实现并交付 PR 链时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 所有者实现并报告 head、base、预期父项。
2. 独立验证。
3. 唯一拓扑所有者把通过项追加到普通 base-branch 链。
4. 自底向上吸收变更并复核。
5. 交付完整可审查链。

## 必要条件与停止

该流程不合并、不启用自动合并、不关闭 PR。独立实现可以并行，改 base / rebase / 推送改写后的链必须串行。只能在自有分支、授权允许且远端预期版本一致时使用带明确 lease 的推送。

拓扑所有者自底向上维护链，执行者只改自己的范围。追加和变基后重查 head/base/证据。不得 merge、auto-merge 或 close；记账和等待不增加权限。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-deslop](../../nimo-deslop/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack autopilot-stack](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-stack.md)。
