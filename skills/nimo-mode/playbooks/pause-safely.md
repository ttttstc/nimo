# 安全暂停

标识：PB22。安全暂停时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)

## 步骤

1. 停止新工作。
2. 请求所有执行者停止。
3. 在不扩大写入的前提下确认现场。
4. 保存已授权且必要的检查点。
5. 记录未确认停止的任务和外部动作。
6. 给出恢复位置。

## 必要条件与停止

“暂停”不自动授权提交、推送或撤销其他人的修改；“停止所有写入”时只能报告现有状态，不再为保存检查点写文件。记录和代码一致比强行制造干净工作区更重要。

停止所有写入时不再保存新检查点。只有允许保留现场时才写本地记录，不自动提交 WIP。报告所有无法确认停止的执行者和外部动作。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack pause-safely](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/pause-safely.md)。
