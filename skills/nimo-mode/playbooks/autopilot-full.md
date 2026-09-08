# 独立事项实现并合入

标识：PB19。独立事项实现并合入时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 需要明确的逐项实施和合并授权。一个事项一个所有者、一个独立分支。
2. 所有者实现、自验、PR 与跟进。
3. 主 Agent 对指定 head 组织独立验证。
4. 通过后由获授权的所有者合并。
5. 确认远端结果后领取下一项。

## 必要条件与停止

真正独立的 PR 并行；有依赖的事项在前项合入后再从最新基线创建。用户保留的事项停在可审查状态，不自动合入。验证覆盖当前行为、基线对照、差异与证据；候选 head 更新后不能复用旧通过状态。

每个所有者有完整合同、独立分支和决策记录。主 Agent 验证当前 head 的门禁、真实操作面、基线对照、差异与证据。用户保留事项不能合入。唤醒使用宿主实际工具，不固定云环境或无依据的周期。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-deslop](../../nimo-deslop/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack autopilot-full](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-full.md)。
