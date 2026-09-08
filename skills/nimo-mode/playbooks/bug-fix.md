# 缺陷修复

标识：PB02。缺陷修复时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-fix-root-causes](../../nimo-principle-fix-root-causes/SKILL.md)
- [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)

## 步骤

你拥有这个任务。规划、审查、验证；把调查和修复委派给子 Agent，保持主导。

按科学方法行事。每行上线的代码都要能追溯到运行时证据。"也许有帮助"的保险式改动是假设不是修复，不上线。证据推翻某个假设时，撤销它所促动的改动。上线的只有证据支持的最小改动，仅此而已。性能问题同此纪律，证据就是 trace。

1. 亲自在匹配的操作面上复现（按 [nimo-verify](../../nimo-verify/SKILL.md) 的真实操作面规则，不可协商）。不把复现交给用户。某个调试或插桩协议说"让用户来跑"也不能覆盖本条；由你驱动插桩后的运行时。只有给出明确的、具体的理由说明控制面够不到目标时才问用户，且要先把控制面推到它能到达的极限。直接复现不了就强制它触发：合成触发条件、收紧条件或加插桩，直到它触发。复现不了的缺陷，无法证明已修复。
2. 二分定位成因。列出候选假设，逐个排除直到只剩一个。用 [nimo-how](../../nimo-how/SKILL.md)（受影响子系统）和 [nimo-why](../../nimo-why/SKILL.md)（回归历史）给假设做种子。每轮选能切掉最多剩余问题空间的分割，拿到运行时证据，排除一个。程序状态不清楚时，加插桩或日志，在代码运行时读取。不许猜。漫长或顽固的搜索用宿主的长任务／循环机制驱动；宿主没有这类机制时，由主 Agent 自行维持迭代纪律并记录。在第 3 步 architect／interrogate 扇出之前，先用运行时证据确认幸存的机制；建立在貌似合理但未确认成因上的设计，可能全体一致地错，而真实成因就在隔壁子系统。
3. 规划修复。跨函数边界时先跑 [nimo-architect](../../nimo-architect/SKILL.md)。把实现委派给子 Agent（用户配置的缺陷修复模型），给出明确范围；亲自审阅它的 diff。宿主没有独立子 Agent 时，主 Agent 顺序扮演实现者并记录降级，降级下的自审不称独立审查。
4. 在同一操作面上验证；原始复现现在通过。"无法判定"或操作面错误不算通过；标记出来。单元测试显示的是分支行为，不是缺陷消失。
5. 安排提交顺序，让失败的复现先于修复落在 git 历史里；diff 讲述这个故事。缺陷存在便宜的本地测试路径时，按 [nimo-tdd](../../nimo-tdd/SKILL.md) 的失败测试先行节奏做；测试会昂贵、重集成或结果不清楚时，跳过它改用实际复现证据。这是 [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md) 的规范用法：失败测试在前，修复叠在其上。
6. 按授权运行 [整理并创建 PR](opening-a-pr.md)。

调查阶段把 nimo-how 和 nimo-why 作为并行子 Agent 扇出；宿主不支持并行时按委派纪律串行独立执行并记录降级。

交付时说明：什么坏了、根因、修复、如何验证。逐字粘贴修复前失败、修复后通过的复现输出。

## 必要条件与停止

先复现再修复；无法复现时可继续只读调查，但结果不得写成"缺陷已修复并验证"。每行上线代码可追溯到运行时证据；假设被证据推翻时，撤销它所促动的改动，"也许有帮助"的改动不上线。便宜明确的回归测试采用失败先于修复的顺序。不依靠修改预期结果掩盖缺陷。推送、PR、评论、合并等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-why](../../nimo-why/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-interrogate](../../nimo-interrogate/SKILL.md)
- [nimo-tdd](../../nimo-tdd/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack bug-fix](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/bug-fix.md)。
