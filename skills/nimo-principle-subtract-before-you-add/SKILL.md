---
name: nimo-principle-subtract-before-you-add
description: "扩展、重写或重构已有系统时使用。先减少再增加。"
---

# 先减少再增加

## 适用

扩展、重写或重构已有系统。

## 规则

删除范围内确定无用的结构、失效引用和重复守卫，再建立需要的能力。按真实用法设计，不预置未来平台。删除必须有范围依据。

## 决策例子

移除旧绑定后直接引用 Skill，不增加 resolver。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack subtract-before-you-add](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-subtract-before-you-add/SKILL.md)。
