# 代码库健康巡检

标识：PB21。定期给代码库做健康巡检时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)
- [nimo-principle-subtract-before-you-add](../../nimo-principle-subtract-before-you-add/SKILL.md)
- [nimo-principle-minimize-reader-load](../../nimo-principle-minimize-reader-load/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

这是维护（upkeep），不是功能工作。它不产出可发布代码，只产出一份候选清单，供后续走主流程。适用于"巡检一下代码库""哪里该深化""保持代码库对 agent 友好"。

1. 扫热点。用 [nimo-how](../../nimo-how/SKILL.md) 理解主运行链路和关键模块，找出复杂度集中的区域（跨层调用、共享可变状态、反复出现的结构摩擦）。范围与巡检预算相称，不扫描全仓。
2. 派独立子 Agent 走读热点区域的真实代码，按 [设计红旗](../../nimo-architect/references/design-red-flags.md) 找深化机会：浅模块、信息泄漏、时序分解、透传方法，以及可合并、可删除、可下沉到更深接口的对象。
3. 复用 [nimo-how 的画布](../../nimo-how/SKILL.md) 管线，把每个候选组织成前后形状对比，生成一份可打开的报告。报告是巡检产物，不是交付代码。
4. 呈现候选及每个的收益与代价，让操作者挑选。这一步只做建议，不做结构设计。
5. 对选中项运行 [nimo-grilling](../../nimo-grilling/SKILL.md) 对齐意图，再路由到 [新增或改变行为](feature.md) 或 [nimo-figure-it-out](../../nimo-figure-it-out/SKILL.md) 走真正的设计与实现；结构由 [nimo-architect](../../nimo-architect/SKILL.md) 承担。

## 必要条件与停止

只做巡检，不改生产代码，不开 PR。候选是建议，不是已接受的方案；不挑选或用户未放行时停在报告。不为凑数制造候选，没有真实深化机会就如实报告。巡检本身不授予提交、推送、评论、合并或发布权限；改动的授权在它路由到的后续流程里单独取得。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-grilling](../../nimo-grilling/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-figure-it-out](../../nimo-figure-it-out/SKILL.md)

## 交付

返回候选清单、每个的收益与代价、报告路径、选中项的去向，以及未完成项和跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。
