---
name: nimo-principle-migrate-callers-then-delete-legacy-apis
description: "引入新内部 API 而旧调用方仍存在时使用。在同一波次里迁移调用方并删除旧 API，而不是保留兼容层。"
---

# 迁完调用再删旧接口

## 适用

内部 API 或数据模型被替换；认定新 API 是正确设计而旧调用方仍存在。

当我们认定新 API 是正确设计时，在同一波重构里迁移调用方并移除旧 API，而不是保留兼容层。

## 规则

- 不要仅因为内部调用方还存在就让旧 API 路径活着
- 清点调用方，迁移它们，然后立即删除旧 API
- 把临时适配器当例外且有时间盒，而不是默认架构
- 更新测试以断言新契约，并删除只保护重构前实现细节的测试

## 何时适用

- 没有外部用户依赖向后兼容（已承诺对外兼容的公共接口和用户数据不在本原则范围内，删除它们受任务边界与用户当前授权约束）
- 项目能吸收协调的破坏性变更
- 新 API 是简化或重构行动的一部分

同时保留新旧两套 API 会制造双路径复杂度，拖慢清理，让代码库感觉只能追加、不能删除。

## 决策例子

新配置同时更新入口、安装版本来源和说明。

## 应用证据

读取本文件后，指出它改变的具体决定和产物。没有改变决定时不列为已应用。当前授权、宿主权限和项目强制门禁始终有效。

来源：[pstack migrate-callers-then-delete-legacy-apis](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md)。
