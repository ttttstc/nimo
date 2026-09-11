---
name: nimo-principle-separate-before-serializing-shared-state
description: "并发执行者可能写同一文件、分支、键或状态对象时使用。先消除共享；只有单一共享写者是真实不变量时，才结构化串行。"
---

# 先分离，再串行共享状态

当并发执行者可能共享可变状态时，先问：它们真的需要同一个可变对象吗？不需要，就消除共享。共享是真实不变量时，用结构强制串行：锁文件、顺序阶段、独占所有权。指令和约定不是并发控制。

## 适用

多个执行者可能写同一个文件、分支、键或状态对象时。

## 为什么存在

对共享状态的并发写会制造间歇性、难复现、调试昂贵的竞态条件。告诉两个执行者（或两个 goroutine）"轮流来"没有用。

## 模式

1. **识别共享可变状态**：被多方读写的文件、被多方推送的分支、被多方同时定义和消费的 API。
2. **默认：消除共享写目标。** 问：这些执行者需要一个规范对象，还是在各自发布独立事实？给每个执行者自己拥有的文件、键、分支或状态目录，只在读取/汇报的边界合并。两个 worker 往同一个 `state.json` 里各写一个 `lastX` 字段，仍然是共享变异；`indexer-state.json` + `metrics-state.json` 就不是。
3. **只有当"单一共享写目标"是真实不变量时，才用结构串行访问**：锁文件、顺序阶段、单写者执行者、原子比较交换。把"我们需要一把锁"当作待检验的设计坏味道，而不是默认答案。

## 决策例子

候选用不同 worktree，总表由协调者以 revision 更新。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack separate-before-serializing-shared-state](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-separate-before-serializing-shared-state/SKILL.md)。
