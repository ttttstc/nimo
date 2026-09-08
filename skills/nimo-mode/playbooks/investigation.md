# 只读理解与判断

标识：PB03。只读理解与判断时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)
- [nimo-principle-boundary-discipline](../../nimo-principle-boundary-discipline/SKILL.md)

## 步骤

你拥有答案。规划、路由、撰写。

只读请求："X 是怎么工作的？""Y 当初为什么建成这样？""我们确定 Z 吗？""该做 X 还是 Y？"它们产出一份带引用的解释或一份建议，不是代码改动。

1. 经 [nimo-how](../../nimo-how/SKILL.md) 路由：窄问题用 Explain 模式；"我们确定吗？"用 Critique 模式（先完整解释，再多模型独立识别架构问题，主 Agent 裁决处理／考虑／记录／驳回）。动机问题（"当初为什么建成这样"）另经 [nimo-why](../../nimo-why/SKILL.md) 路由。
2. 吞吐量检查点保持一行：`吞吐量检查点：n/a，只读调查`。四项版本只用于代码形工作。
3. 产出 nimo-how 形状的输出（概述／关键概念／运行机制／位置／易错点）；请求是在备选项之间做决定时，改为产出一份建议，附取舍表。
4. 对回复应用 [nimo-unslop](../../nimo-unslop/SKILL.md)。

不开 PR、不做 PR 跟进，也不跑 nimo-architect，除非这次调查是某个代码改动的前奏。是前奏时，交还给用户，重新路由到 [缺陷修复](bug-fix.md) 或 [新增或改变行为](feature.md)。

交付时说明：调查输出本身。"我们确定吗？"类回答必须包含带理由的真实判断——建议是判断，不是背书；前提不成立时直接反驳并说明理由，附和不是默认，坦率优先于迎合。

## 必要条件与停止

只读边界：产出带引用的解释或建议，不是代码改动。不改生产代码、不为只读问题制造原型；不开 PR、不做 PR 跟进、不跑 nimo-architect——除非这次调查先于一个代码改动，是则交还用户，重新路由到缺陷修复或新增或改变行为。需要实施时给出建议，只有已有实施授权才能转入对应流程。并行工作检查可标记"只读调查，不适用"。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-why](../../nimo-why/SKILL.md)
- [nimo-unslop](../../nimo-unslop/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack investigation](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/investigation.md)。
