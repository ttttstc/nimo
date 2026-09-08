---
name: nimo-principle-boundary-discipline
description: "外部配置、网络或工具输入进入系统时使用。边界校验。"
---

# 边界校验

## 适用

外部配置、网络或工具输入进入系统。

## 规则

在边界解析并验证原始输入，内部传递明确的领域数据。不要在每层重复检查同一事实。业务判断尽量是纯函数，I/O 放在外层；公共接口不要泄露存储和框架的私有类型。

## 决策例子

把 YAML 原文一次转换成有效引用，内部函数不再猜测字段种类。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack boundary-discipline](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-boundary-discipline/SKILL.md)。
