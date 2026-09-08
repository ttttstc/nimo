# 持续改善一个指标

标识：PB07。持续改善一个指标时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-build-the-lever](../../nimo-principle-build-the-lever/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 确定指标、方向、目标、最低尝试要求和预算。
2. 验证测量工具有区分能力并冻结。
3. 记录基线与回归门禁。
4. 每轮一个假设、一次独立修改、前后测量。
5. 保留有效改动或仅撤销该轮自有改动。
6. 记录全部尝试。

## 必要条件与停止

平台期应更换假设，不降低目标。达到目标和约定尝试要求、耗尽预算、用户停止或真实无可行路径时结束，并区分“目标达到”与“未达到后停止”。不自行编造性能目标或最低轮数。

测量工具冻结后修改会使旧数据不可比。噪声不算改进，保持正确性门禁。失败尝试也写日志，只撤销该轮自有差异。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack hillclimb](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/hillclimb.md)。
