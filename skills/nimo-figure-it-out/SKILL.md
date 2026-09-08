---
name: nimo-figure-it-out
description: "固定 Playbook 不匹配或一次大型任务需要特殊顺序时使用。组合特殊任务做法。"
---

# 组合特殊任务做法

## 步骤

1. 先读 nimo-mode 原则索引，明确完成条件、范围、预算和阻塞，不重造已有窄流程。
2. 按关键未知项优先安排可验证单元，准备基线与验证；设计取舍使用 nimo-architect。
3. 写具体阶段，不创建 YAML steps 或工作流语言；只要求方案时停止。
4. 获准执行后每单元提出假设、最小修改、测量、保留或只撤销自有失败改动。
5. 用 nimo-show-me-your-work 记录结果，最后在真实产物验证整体目标，区分通过、未验证和受阻。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。

依赖：[nimo-architect](../nimo-architect/SKILL.md)。

依赖：[nimo-show-me-your-work](../nimo-show-me-your-work/SKILL.md)。
