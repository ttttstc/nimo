# 创建或修改 Skill

标识：PB11。创建或修改 Skill时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-encode-lessons-in-structure](../../nimo-principle-encode-lessons-in-structure/SKILL.md)
- [nimo-principle-minimize-reader-load](../../nimo-principle-minimize-reader-load/SKILL.md)

## 步骤

这个 Skill 的声音归你所有。面向 Agent 的文字标准高于面向人的文字：一句帮不上忙的话会被当成指令执行。

1. 用 [nimo-skill-author](../../nimo-skill-author/SKILL.md) 编写或修改 SKILL.md：触发、输入、步骤、产物与边界由它界定。
2. 校验 Skill：frontmatter 有 `name` 和 `description`；引用的文件真实存在；跨 Skill 链接全部可解析。
3. 结构或权限有变化的改动跑行为案例验证；纯主观措辞的可说明不适用后跳过。
4. 按 [整理并创建 PR](opening-a-pr.md) 交付，受用户当前授权约束。

拿不准就删：每一句正文都要靠"能改变一个决定"挣得自己的位置。直接告诉它做什么，省掉理由；只有规则缺了理由就令人困惑时才解释。语气与作用域匹配。指向结构性来源（类型、README、配置），不硬编码细节——硬编码的细节会过期（[把重复错误变成约束](../../nimo-principle-encode-lessons-in-structure/SKILL.md)原则）。委派给其他 Skill 时按路径引用，不复述它们的正文。一个反复出现却没被沉淀下来的工作流，提议新建一个 Skill。

## 必要条件与停止

避免只是把上游 Cursor 名称替换成 nimo。新 Skill 不得暗含自动发布、安装外部代码或修改全局配置的权限。

校验不过不进入交付：frontmatter 缺 `name` 或 `description`、引用文件缺失、跨 Skill 链接断开，先修复再继续。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-skill-author](../../nimo-skill-author/SKILL.md)

## 交付

Skill 概要、关键设计决定、校验记录；返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack authoring-a-skill](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/authoring-a-skill.md)。
