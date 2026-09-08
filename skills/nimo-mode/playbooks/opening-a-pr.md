# 整理并创建 PR

标识：PB13。整理并创建 PR时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 核对授权、分支和工作区。
2. 只整理任务内差异。
3. nimo-deslop 清理无关复杂度，nimo-no-comments 检查注释。
4. 完成适用验证与审查。
5. 写清问题、改动、取舍、影响和证据。
6. 创建或更新 PR。
7. 读回真实状态。

## 必要条件与停止

没有推送／PR 授权时停在本地可审查结果；已授权不重复索要确认。创建 PR 不自动进入 babysit，不获得合并权限。草稿／正式状态遵守用户要求；未验证成果不得包装成已验证成果。分支按真实默认分支或明确指定的父分支建立，不硬编码 main。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-deslop](../../nimo-deslop/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)
- [nimo-technical-writing](../../nimo-technical-writing/SKILL.md)
- [nimo-interrogate](../../nimo-interrogate/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack opening-a-pr](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)。
