# 创建或修改 Skill

标识：PB11。创建或修改 Skill时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-encode-lessons-in-structure](../../nimo-principle-encode-lessons-in-structure/SKILL.md)
- [nimo-principle-minimize-reader-load](../../nimo-principle-minimize-reader-load/SKILL.md)

## 步骤

1. 使用 `nimo-skill-author` 明确触发、输入、步骤、产物与边界。
2. 编写 Skill 和必要参考。
3. 检查前置元数据、引用与依赖。
4. 对结构和行为变化运行目标案例。
5. 按授权交付。

## 必要条件与停止

避免只是把上游 Cursor 名称替换成 nimo。新 Skill 不得暗含自动发布、安装外部代码或修改全局配置的权限。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-skill-author](../../nimo-skill-author/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack authoring-a-skill](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)。
