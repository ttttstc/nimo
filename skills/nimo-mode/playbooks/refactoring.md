# 保持行为的结构调整

标识：PB04。保持行为的结构调整时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-model-the-domain](../../nimo-principle-model-the-domain/SKILL.md)
- [nimo-principle-foundational-thinking](../../nimo-principle-foundational-thinking/SKILL.md)
- [nimo-principle-redesign-from-first-principles](../../nimo-principle-redesign-from-first-principles/SKILL.md)
- [nimo-principle-subtract-before-you-add](../../nimo-principle-subtract-before-you-add/SKILL.md)
- [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)
- [nimo-principle-migrate-callers-then-delete-legacy-apis](../../nimo-principle-migrate-callers-then-delete-legacy-apis/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-minimize-reader-load](../../nimo-principle-minimize-reader-load/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)

## 步骤

你拥有契约。结构改变；行为不变。适用于"重构""重命名""提取""内联""去重""重整结构""移动这个模块""整理这块区域"。区别于新增或改变行为（feature，加行为）和缺陷修复（纠正行为）。

夹带行为变化的重构失去安全网。清理暴露出缺失功能或真实缺陷时，把它拆出去，先对着固定的契约交付结构变化。允许重新设计，但要点名并改走 feature。大型或跨切面的结构工作（跨大量调用点的迁移、多子系统的协同重塑）属于 [nimo-figure-it-out](../../nimo-figure-it-out/SKILL.md)；本 Playbook 只管聚焦到中等规模的改动。

1. 先固定行为契约。运行 [nimo-how](../../nimo-how/SKILL.md) 了解受影响子系统的契约，然后写特征测试、快照或等价性 harness，在任何结构移动之前捕获当前行为。harness 让"重构"成为可检验的主张（[nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)）。区域没有测试覆盖时，先写 pin 再动结构。类型检查和 lint 不是 pin。
2. 按 [nimo-principle-model-the-domain](../../nimo-principle-model-the-domain/SKILL.md) 点名代码缺失的结构：散落布尔量之上的状态机、分散分支之上的表或注册表、重复形状假设之上的类型化模型、临时拼凑变更之上的 reducer。形状已经清晰且局部时，无聊代码保留；重塑必须删除分支或非法状态，不是增加间接层。
3. 点名目标形状。陈述如果今天从头构建，模块布局、类型和调用图应该是什么样（[nimo-principle-foundational-thinking](../../nimo-principle-foundational-thinking/SKILL.md)、[nimo-principle-redesign-from-first-principles](../../nimo-principle-redesign-from-first-principles/SKILL.md)）。目标跨函数边界时，先运行 [nimo-architect](../../nimo-architect/SKILL.md) 对形状做并行设计探索再动手。
4. 先减后加。删除死重、折叠单调用包装、去掉冗余校验器、清除孤儿引用，然后才引入新形状（[nimo-principle-subtract-before-you-add](../../nimo-principle-subtract-before-you-add/SKILL.md)）。到达目标形状的最小改动上线（[nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)）。"也许有帮助"的投机清理被撤销，不是留着搭车。
5. 以保持行为的小步移动，每步保持 pin 绿。API 重塑时，同一波内迁移所有调用者并删除旧 API（[nimo-principle-migrate-callers-then-delete-legacy-apis](../../nimo-principle-migrate-callers-then-delete-legacy-apis/SKILL.md)）。不搞兼容 shim，不留新旧并行双轨。每个重命名都对着实际文件逐处核对；重命名会静默漏掉字符串、文档和反向引用中的使用。机械编辑委派给子 Agent（用户配置的重构模型），给出明确范围（文件路径、被移动的名称、要保持的行为）；亲自审阅它的 diff。宿主没有独立子 Agent 时，主 Agent 顺序扮演并记录降级，降级下的自审不称独立审查。
6. 在真实产物上证明行为不变，不是"能编译"（[nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)）。较大的重塑做等价性检查：diff 新旧输出的脚本、录制基线对新代码的回放，或在匹配操作面上按 [nimo-verify](../../nimo-verify/SKILL.md) 冒烟运行。验证自己来；不信任委派者"看起来不错"的总结。
7. 确认改动配得上它的位置。成功度量是理解成本（reader load）下降（[nimo-principle-minimize-reader-load](../../nimo-principle-minimize-reader-load/SKILL.md)）：问题与答案之间更少的层、更少的隐藏状态、没有第二个消费者时更少的间接层。diff 没有在任何地方降低理解成本，撤销它。
8. rebase 成讲述故事的小而有序的提交：先减法提交，再重塑，再后续清理，让单次 revert 撤销一片。按 [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md) 塑形，每个保持行为的切片在下一个之前保持绿。按授权运行 [整理并创建 PR](opening-a-pr.md)。

交付时说明：改变了什么结构、固定它的 pin、等价性证明、理解成本变化、上线了什么、撤销了什么。没有新行为。

## 必要条件与停止

类型检查不等于行为等价证明；pin（特征测试、快照或等价性 harness）先于任何结构移动。发现新功能或 Bug 时记录为独立事项，不借重构改变行为；要重新设计就点名并改走 feature。无兼容 shim、无新旧双轨；重命名对字符串、文档和反向引用做全量清扫。diff 未在任何位置降低理解成本则撤销。本次 nimo 重建属于 feature / multi-phase-plan，不能假装是纯行为等价重构。推送、PR、评论、合并等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-figure-it-out](../../nimo-figure-it-out/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack refactoring](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/refactoring.md)。
