---
name: nimo-technical-writing
description: "写规格、指南、README、PR 或提交说明时使用。组织技术说明。"
---

# 组织技术说明

## 步骤

1. 根据任务选择教程、操作、参考或解释主结构；操作先给步骤，解释先给机制。
2. 统一术语，写清动作前提、作用域、输入和可见结果，不用模糊代词跨模块。
3. 路径和命令来自实际产物。PR 写具体问题、结果、影响和验证，遵守项目语言与模板。
4. 使用 nimo-unslop 删除无信息语句，不删除失败边界。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。

依赖：[nimo-unslop](../nimo-unslop/SKILL.md)。
