---
name: nimo-grilling
description: "把一件事讨论清楚。用持续追问把主题展开成设计树，每轮抛出整条待决前沿，直到用户决策分支全部收敛、事实缺口全部由调查补齐。只碰用户能拍板、代码查不出的东西：意图、边界、验收、术语、业务规则、优先级；结构设计交给 nimo-architect。需要对齐意图、出现未定义术语、设计空间开放或跨边界取舍时使用；机械修改和范围明确的修复不适用。"
---

# 把一件事讨论清楚

在设计或实现之前，把用户的意图问到不再有隐含假设。你对齐的是**要什么**，不是**怎么建**。

## 边界：只走非结构分支

设计树只展开用户能拍板、agent 查不出来的分支：意图、范围边界、验收标准、领域术语、业务规则、优先级。

任何"结构长什么样"的分支——模块划分、接口、类型、seam、架构决定——不在这里解决，留给 [nimo-architect](../nimo-architect/SKILL.md)。在这里问结构，会和 architect 的候选比较重复占用用户。

## 委派机制

事实是 agent 的活，决策是用户的活。前沿问题需要环境事实（文件、工具、当前实现）时，交给 [nimo-how](../nimo-how/SKILL.md) 或独立子 Agent 去查，绝不让用户回答可自查的事实。子 Agent 在跑时只让下游问题等待，其余前沿问题现在照问。

遵守 [委派纪律](../nimo-mode/references/delegation.md)。

## 第 0 步：用自己的话复述目标

开问之前，先写三句，写给用户看，等他纠正：

1. 他想要的是什么（一句话，用他的词，不加你的方案）。
2. 他要解决的问题是什么（一句话，说清现状哪一点让他难受）。
3. 你以为不在这件事范围内的东西（一句话）。

写不准就说不确定在哪一句。这三句只是给用户纠正的靶子，不是结论；用户不反驳也不等于批准，后续步骤照样要做。

并入自上游 in-your-own-words（[pstack 6b03002](https://github.com/cursor/plugins/blob/6b0300214a09fd6029cfb7077043125758cd1fd2/pstack/skills/in-your-own-words/SKILL.md)）。

## 把任务变深，不是变大

讨论中发现「这件事其实可以更认真做」时，先答四问，再重写用户给的请求：

1. 这个领域的顶级专业人士会在这里做哪些用户没要求的事。
2. 他们会从多原始的材料起步，而不是从已经消化好的二手总结起步。
3. 他们会用哪些具体方法与工具。
4. 除了用户和模型自己，什么能证明结果是对的。

重写后的请求只追求这四问指向的东西，不增加交付物数量。属于用户的选择（范围、优先级、取舍）留空让他定，不替他拍板。

并入自上游 sharpen（[pstack 6b03002](https://github.com/cursor/plugins/blob/6b0300214a09fd6029cfb7077043125758cd1fd2/pstack/skills/sharpen/SKILL.md)）。

## 步骤

1. 把主题映射成**设计树**：每个决策分叉出依赖它的决策，并分开标注"事实缺口"与"用户决策"。
2. 补事实缺口：交给 nimo-how 或子 Agent，不带进用户问题。
3. 每轮抛出**整条前沿**，即所有前置已定、现在就能问而不必猜答案的问题。每条给出编号、推荐答案和一句理由。格式：

   ```
   Q1 <标题>：<问题正文，含选项>
   推荐：<答案与一句理由>
   ```
4. 用户回答后重算前沿，进入下一轮。答案依赖本轮仍开放问题的问题，属于后续轮次。
5. 可逆的细节按 [nimo-principle-never-block-on-the-human](../nimo-principle-never-block-on-the-human/SKILL.md) 给默认值直接过，不占前沿。
6. 前沿清空且用户确认达成共识后收口。

## 产物与分流

- 稳定**领域术语** → 项目知识词汇页（按 [知识维护契约](../nimo-mode/references/knowledge.md) 登记）。
- 本次任务的**决议与未决分支** → 任务记录（Task Contract 的确认来源与验收快照，经 `task-anchor.mjs` 修订）。属未来计划，不写入项目知识。
- **架构决策**（难逆转、不看会意外、真有权衡）→ 落地后才写项目知识 + ADR。

## 与相邻 skill 的关系

- [nimo-how](../nimo-how/SKILL.md)：事实来源。grilling 需要现状事实时调用它。
- [nimo-architect](../nimo-architect/SKILL.md)：串行在后。grilling 定意图，architect 出结构。
- [nimo-interrogate](../nimo-interrogate/SKILL.md)：正交。grilling 问用户，interrogate 让其它模型对抗评审代码或方案。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先；只产出决议、术语与未决分支，不改代码。交付具体产物、未决分支及原因。
