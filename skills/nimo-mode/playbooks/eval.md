# Skill 行为评测

标识：PB12。Skill 行为评测时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)

## 步骤

1. 先确定实验问题和评分依据。
2. 候选使用互相隔离且名称中立的工作目录。
3. 下发同一自然用户任务，不泄露候选身份及评分材料。
4. 独立裁判在同一尺度上评分。
5. 主 Agent 阅读全部产物并核对执行证据。
6. 给出是否推广建议。

## 必要条件与停止

Skill 版本比较固定模型和环境；多模型比较单独标记实验变量。裁判不知道模型身份，执行者不知道其他候选存在，但任务必要验收要求必须正常提供。无法读取宿主工具轨迹时，涉及“实际读取过原则”的评分标为不可判定，不能用自报替代。

候选工作目录和输入不泄露评分或候选身份。执行者不知其他候选存在，裁判不知模型身份。版本比较固定模型和环境。轨迹不可见的判定记不可判定，不凭自报评分。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-arena](../../nimo-arena/SKILL.md)
- [nimo-skill-evaluate](../../nimo-skill-evaluate/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack eval](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/eval.md)。
