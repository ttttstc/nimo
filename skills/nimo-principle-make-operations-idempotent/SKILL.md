---
name: nimo-principle-make-operations-idempotent
description: "可能超时、重试或中断的写操作时使用。重复操作收敛。"
---

# 重复操作收敛

## 适用

可能超时、重试或中断的写操作。

## 规则

先查上次是否生效，使用稳定操作身份，重复请求返回同一结果或无变化。区分暂时与永久错误，不无限重试。外部动作未知时先查事实。

## 决策例子

重复登记不追加条目；PR 创建超时后先查现有结果。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack make-operations-idempotent](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-make-operations-idempotent/SKILL.md)。
