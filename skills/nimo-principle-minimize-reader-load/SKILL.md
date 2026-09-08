---
name: nimo-principle-minimize-reader-load
description: "代码多层跳转或隐藏可变状态时使用。减少理解成本。"
---

# 减少理解成本

## 适用

代码多层跳转或隐藏可变状态。

## 规则

检查回答问题需跨多少层包装。收回单调用者转发，缩小可变状态范围，保持领域边界。少行数不是唯一指标，必要结构不压成难懂表达式。

## 决策例子

没有独立责任的转发层删除。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack minimize-reader-load](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-minimize-reader-load/SKILL.md)。
