---
name: nimo-project-verification
description: nimo 项目当前任务验证资产入口，执行由 nimo-verify 统一负责。
---

# 当前功能验证

[how 画布](features/how-canvas.md)覆盖默认解释与画布、浏览器导览、输入与产物边界、源码快照复用和包安装影响。

[Knowledge 状态身份](features/knowledge-state.md)覆盖内部目标路径、根目录别名、手工修改刷新与外部目标边界。

运行结果保存在 `.nimo/tasks/how-canvas/`，不把旧运行当作当前版本结果。其他已有测试仍由 `node tests/run.mjs` 发现；这里不宣称建立了全项目 Coverage。
