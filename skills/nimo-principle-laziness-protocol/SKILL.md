---
name: nimo-principle-laziness-protocol
description: "准备增加抽象、配置或整理差异时使用。最少实现完整解决。"
---

# 最少实现完整解决

## 适用

准备增加抽象、配置或整理差异。

## 规则

先判断需求，再用标准库和现有机制。优先删除冗余、隐藏状态和单调用者包装。不能以简化为由省略已要求能力、边界校验或真实验证。

## 决策例子

直接调用足够时不创建 provider 工厂。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack laziness-protocol](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-laziness-protocol/SKILL.md)。
