---
name: nimo-principle-separate-before-serializing-shared-state
description: "执行者可能写同一文件、分支或记录时使用。先分离再串行共享写入。"
---

# 先分离再串行共享写入

## 适用

执行者可能写同一文件、分支或记录。

## 规则

先判断是否需要同一个可变对象。独立事实分开写，由所有者整合。真实共享不变量才采用短锁和版本检查。口头要求轮流不是并发控制。

## 决策例子

候选用不同 worktree，总表由协调者以 revision 更新。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack separate-before-serializing-shared-state](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md)。
