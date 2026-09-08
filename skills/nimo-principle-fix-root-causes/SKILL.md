---
name: nimo-principle-fix-root-causes
description: "缺陷或运行状态异常时使用。修复根因。"
---

# 修复根因

## 适用

缺陷或运行状态异常。

## 规则

先复现，用运行证据排除假设并确认机制。遮蔽异常的判空不等于根因修复。重启后才出错时检查持久状态。同类影响在任务范围内检查，不借机无限修复。

## 决策例子

删除缓存后恢复只是线索，应修复状态失效规则。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack fix-root-causes](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-fix-root-causes/SKILL.md)。
