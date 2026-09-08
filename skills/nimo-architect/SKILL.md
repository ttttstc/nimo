---
name: nimo-architect
description: "跨边界修改、架构决定或实质设计取舍时使用。比较并确定设计。"
---

# 比较并确定设计

## 步骤

1. 使用 nimo-how 理解系统；责任和分层变化补充 nimo-why。
2. 先写调用者用法，再写领域数据、签名、模块责任和伪代码，不直接锁定实现。
3. 使用 nimo-arena 比较至少两个结构性不同的候选。按接口复杂度、约束、真实路径和可验证性比较。
4. 主 Agent 读全部候选并选一个基础，记录整合与拒绝理由，不机械拼接。
5. 只要求方案时交付后停止；已有实施授权才继续。反复出现无法容纳的特殊分支或共享锁时回到理解和设计。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。

依赖：[nimo-how](../nimo-how/SKILL.md)。

依赖：[nimo-why](../nimo-why/SKILL.md)。

依赖：[nimo-arena](../nimo-arena/SKILL.md)。
