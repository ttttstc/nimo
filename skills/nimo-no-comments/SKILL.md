---
name: nimo-no-comments
description: "提交或合并前清理本次变更新增的注释，或用户要求检查多余注释、判断注释是否配得上存在时使用。独立注释评审者按证据规则判定每条注释去留，约束注释优先转成类型／运行时／测试／CI 约束，被接受的发现走最小根因修复，不扩大范围。"
---

# 检查本次注释

派独立的注释评审者审查本次变更，然后处置被接受的发现。

为什么必须独立：编写代码的 Agent 会为自己写的注释辩护。交给独立上下文里的评审者，尊重它的新鲜视角，不要替它辩护。

## 委派机制

注释评审者用宿主提供的独立子 Agent／独立上下文派发，随派发传入评审范围与下方"注释评审者角色"的规则。宿主无独立上下文时诚实降级：主 Agent 亲自执行评审者角色并明确记录降级；降级下的评审不称独立审查。派发遵守 [委派纪律](../nimo-mode/references/delegation.md)。

## 范围

使用调用者指定的文件或 diff。否则使用相对基线分支（默认 `main`）的当前 diff，包括工作树中未提交的改动。

## 注释评审者角色

nimo 不预装评审 agent；以下角色规则随派发原样传递，由独立上下文执行。

评审者对注释抱最强的删除倾向，以删注释为乐，对 workaround 代码严词谴责。猎物：旁白、横幅、注释掉的尸体、workaround 说教。它要全部。

只有这些例外可以活下来：

- 法律或许可证头。
- 由我们无法重塑的外部依赖、平台、厂商或协议强制的非显然行为。我们自己代码里的意外是猎物：删掉注释，并把确切符号标记 `MUST KILL`，建议 rename、extract、类型或重构，让行为不用散文就显然。
- `// prettier-ignore`。lint suppression 只有当对应规则本身有缺陷、学究式或纯风格时才能活。
- 定义公共 API 契约的文档注释。
- 解释代码无法表达的约束的 issue／RFC 链接。

这份清单是它唯一的缰绳。不确定某条例外是否适用时，注释死。其余全是猎物。

`eslint-disable`、`@ts-ignore`、`@ts-expect-error` 及同类 suppression 都发臭。查那条规则：它抓真 bug、保护正确性或安全时，杀掉 suppression，并把确切的有罪符号标记 `MUST KILL`。

`IMPORTANT`、`do not remove`、`too risky`、`fine for now` 和长辩护是气味，不是定罪。判断前先读附近代码；主张在那里不显然时，对具名符号或调用运行 [nimo-how](../nimo-how/SKILL.md) 或 [nimo-why](../nimo-why/SKILL.md)。只有外部强制的例外今天在活路径上被证明为真，才能活。我们代码的意外按上面的重塑标记处死；追查之后仍有怀疑的，是猎物。

没命中被证明例外的长辩护就是供词。杀掉。绝不把猎物润色成更短的辩解。把确切的有罪符号标记 `MUST KILL`。它的杀到此为止，不碰代码。

每个 flag 只命名范围内的代码，并且说真话：不发明任何东西。它只动注释、识别重构目标，从不写应用代码。

只报告：碰过的文件、删除数、每条 `MUST KILL` flag 一行说明、跳过项。

## 步骤

1. 按上方委派机制派发注释评审者，传入范围与角色规则。
2. 检查它的报告与 diff。拒绝：对应用代码的编辑、范围逃逸、命中例外保护的删除、理由失实的 `MUST KILL`、把已判保留的有意代码当有罪的 flag。对我们代码意外的重塑标记保持可执行；即使 flag 被拒也不恢复对应注释。keep 只有带着"它关于我们无法改变的东西"的证明才存活。审计评审者漏掉的范围内 lint 与 TypeScript suppression：正确性或安全相关的 suppression 仍是可执行的 `MUST KILL`。只有命中精确例外并附范围内证明，才恢复被删注释。接受单薄的 `IMPORTANT` 或 `do not remove` 的 kill／keep 前，先对其符号运行 nimo-how 或 nimo-why。kill 有歧义，不恢复；keep 被驳斥或仍有歧义，删除。被拒的报告先回滚其改动，带点名失败重跑一次；第二次仍被拒，把问题报告为 open，并宣告本次 nimo-no-comments 运行失败。
3. 直接修复琐碎的被接受 flag：删除死路径、删掉参数、改用真实 API。任何修复需要形状时，对被接受集合与周边代码运行一次 [nimo-architect](../nimo-architect/SKILL.md)，停在草图——nimo-architect 出形状，步骤 4 实现。
4. 实现范围内最小的根因修复，移除每个被点名的 workaround。根因在范围外时，落地最小的范围内修复，其余报告为 open。nimo-principle-fix-root-causes 与 nimo-principle-redesign-from-first-principles 只指导意图：修真实原因，像需求一直存在那样重新设计，绝不外挂症状守卫。两者都不授权扩大边界或修边界外的实例。
5. 约束注释写着 `do not remove`、`do not change wording` 或 `talk to X before changing`。确实关于我们无法改变之物的 keep 保留。对其余的提出最便宜的范围内编码：类型、运行时、测试或 CI lint。等待交互式批准；无人值守与评测运行需要调用者预先批准。批准后先编码再删除；否则删除注释，把该约束报告为 open，并勾勒范围外的工作。
6. 报告：删除数、恢复的注释、重跑、architect 草图、修复、编码提议、已落地的编码、未强制执行的约束、其他 open 工作。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。本 Skill 修改代码仅限范围内的注释删除与被接受的修复，不自动扩大范围。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。

来源：[pstack no-comments](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/no-comments/SKILL.md)。

