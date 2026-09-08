---
name: nimo-principle-redesign-from-first-principles
description: "把新需求集成进既有设计时使用。当作它从第一天起就是基础假设来重新设计，而不是外挂补丁。"
---

# 从第一性原理重新设计

集成一个变更时，不要把它拴在现有设计上。当作这个需求从第一天起就存在来重新设计。结果应当长得像：如果我们第一天就知道，会构建出来的那个东西。

## 适用

新需求或新约束改变了既有设计的根基假设时；反复打补丁才能适配时。

## 做法

- 通读所有受影响文件，整体理解当前设计。
- 问："如果带着这个新需求从零写，我们会构建什么？"
- 把变更传播到每一处引用：类型、文档、示例、理由段落。
- 整体思考这次重设计，再增量交付。

这是把变更集成进既有设计时保留选择价值的方法。

## 决策例子

跨宿主核心不保留写死云 Agent 的接口。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack redesign-from-first-principles](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-redesign-from-first-principles/SKILL.md)。
