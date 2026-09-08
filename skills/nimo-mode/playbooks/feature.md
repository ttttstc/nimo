# 新增或改变行为

标识：PB01。新增或改变行为时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-model-the-domain](../../nimo-principle-model-the-domain/SKILL.md)
- [nimo-principle-exhaust-the-design-space](../../nimo-principle-exhaust-the-design-space/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 理解受影响系统。
2. 比较设计。
3. 记录阻塞前提、独立工作、共享状态和最小拆分。
4. 委派实现。
5. 主 Agent 审阅差异。
6. 验证真实产物。
7. 整理可验证提交。
8. 必要时独立质疑。
9. 按授权进入 PR 流程。

## 必要条件与停止

必须先明确领域数据和组织结构。`nimo-architect` 跳过时保留原因；跨边界或存在实质设计取舍时不能用“任务小”自动跳过。实现与最终审查分开；子 Agent 各自通过后仍须验证整合产物。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-arena](../../nimo-arena/SKILL.md)
- [nimo-interrogate](../../nimo-interrogate/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-deslop](../../nimo-deslop/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack feature](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/feature.md)。
