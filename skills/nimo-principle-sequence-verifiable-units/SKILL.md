---
name: nimo-principle-sequence-verifiable-units
description: "多文件任务、迁移或 PR 依赖链时使用。分成可验证单元。"
---

# 分成可验证单元

## 适用

多文件任务、迁移或 PR 依赖链。

## 规则

每单元结束检查再前进，提交顺序可核对基线、改变和证据。失败复现可先于修复，但中间失败不叫最终通过。避免无验证改动堆积。

## 决策例子

配置路径检查通过，再接对话写入。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack sequence-verifiable-units](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-sequence-verifiable-units/SKILL.md)。
