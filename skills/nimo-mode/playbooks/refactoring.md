# 保持行为的结构调整

标识：PB04。保持行为的结构调整时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-model-the-domain](../../nimo-principle-model-the-domain/SKILL.md)
- [nimo-principle-subtract-before-you-add](../../nimo-principle-subtract-before-you-add/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 先固定行为基线。
2. 明确目标结构。
3. 必要设计比较。
4. 去除冗余。
5. 分步调整并迁移全部内部调用。
6. 验证行为等价。
7. 检查是否减少理解成本。
8. 按授权交付。

## 必要条件与停止

类型检查不等于行为等价证明。发现新功能或 Bug 时记录为独立事项，不借重构改变行为。本次 nimo 重建属于 feature / multi-phase-plan，不能假装是纯行为等价重构。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack refactoring](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/refactoring.md)。
