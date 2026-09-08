---
name: nimo-principle-migrate-callers-then-delete-legacy-apis
description: "内部 API 或数据模型被替换时使用。迁完调用再删旧接口。"
---

# 迁完调用再删旧接口

## 适用

内部 API 或数据模型被替换。

## 规则

同一变更波次迁移实际调用和文档引用，再删除旧 API。不留没有实际兼容要求的壳。用户数据和已承诺公共兼容仍受任务约束，不能随意删除。

## 决策例子

新配置同时更新入口、安装版本来源和说明。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack migrate-callers-then-delete-legacy-apis](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)。
