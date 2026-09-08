# 用廉价试验回答设计问题

标识：PB05。用廉价试验回答设计问题时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-exhaust-the-design-space](../../nimo-principle-exhaust-the-design-space/SKILL.md)
- [nimo-principle-experience-first](../../nimo-principle-experience-first/SKILL.md)

## 步骤

1. 明确要回答的问题。
2. 必要时获取参考。
3. 在隔离目录搭建最小试验。
4. 比较候选。
5. 运行并观察。
6. 给出证据和推荐。

## 必要条件与停止

产物标注为原型，不进入生产代码，不自动发布或转成正式功能。原型的验证是对应问题的实际观察，不强加完整产品测试。用户限制只读时不得以“原型”为由写文件或改运行环境。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack prototype](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/prototype.md)。
