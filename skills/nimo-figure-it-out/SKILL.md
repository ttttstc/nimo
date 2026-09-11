---
name: nimo-figure-it-out
description: "没有更窄的 Playbook 可用时设计可审计的执行方案：大型迁移、跨多处的多部分改动，或用户离开后回来审查的工作。按任务伸缩严格度，跑科学方法假设循环，用 nimo-show-me-your-work 留决策轨迹。用户要求自己想办法、提出大型迁移，或任何更窄的 Playbook 都不匹配时使用。"
---

# 自己想办法

当任务不匹配任何 Playbook 时，设计一个。写代码之前的第一件交付物是工作流本身：一组阶段，严格度随任务伸缩，跑科学方法，并留下人离开后仍可审计的决策轨迹。宁可严格过头：做错东西的代价，远大于小心行事的代价。

不要重造已有的 Playbook。匹配[缺陷修复](../nimo-mode/playbooks/bug-fix.md)、[性能问题](../nimo-mode/playbooks/perf-issue.md)、[新功能](../nimo-mode/playbooks/feature.md)、[视觉一致](../nimo-mode/playbooks/visual-parity.md)、[Skill 评测](../nimo-mode/playbooks/eval.md)或[多阶段计划](../nimo-mode/playbooks/multi-phase-plan.md)的聚焦单单元任务，路由到对应 Playbook。但一个 Playbook 的大型或横切版本（跨大量调用点的迁移、有雄心的多部分改动），或用户离开后回来审查的工作，属于这里——即使它的单单元版本只是一个新功能。严格度和审计轨迹才是重点。

## 开始

开一份任务清单，第一项是完整读取 [nimo-mode](../nimo-mode/SKILL.md) 的原则索引；按 nimo-mode 的规则，进入匹配阶段后打开所用原则的完整叶文件。然后把下面各阶段加入清单。

## 阶段 A：定框

先落地，再承诺。下面三件事说得出来之前，不要开跑：

- 完成条件，写成可证伪的谓词（nimo-principle-prove-it-works 原则 Skill）。"做得好"必须是可检查的。
- 范围，量化：粗略的单元数和工作量，加上摸底过程中浮出的阻塞项。在花掉几个小时之前把它们提出来，而不是在五十个注定失败的提交之后。
- 严格度，往高了偏。单向门和高爆炸半径的工作多得；可逆的低风险步骤少得。严格度体现为门禁和工件，不是"更努力"。

在投入长时间运行之前，先呈现定框和其中的取舍。可逆的工作照常推进（nimo-principle-never-block-on-the-human 原则 Skill），但一次数小时的运行应换来一个检查点。

## 阶段 B：设计工作流

把工作分解为原子化、可独立落地的单元。风险最高的未知项排在最前，让期权价值保持高位。脚手架和验证先于功能（nimo-principle-foundational-thinking 原则 Skill）。

- 在动手之前搭好验证 harness，基线从改动前的状态采集，让检查读作"旧值对比新值"。
- 单向门性质的设计决策，运行 [nimo-architect](../nimo-architect/SKILL.md)（它运行 [nimo-arena](../nimo-arena/SKILL.md)）：多样、互相隔离、有主见的候选，加上一个用不同模型家族的只读评判——评判从用户配置的模型中优先选与做事者不同家族的一个，只有单一模型时按[委派纪律](../nimo-mode/references/delegation.md)降级并记录。形状已经具体、性质机械的工作跳过它。对已定案的设计再跑一次 arena 是过度工程（nimo-principle-laziness-protocol 原则 Skill）。
- 决定哪些部分扇出。只在真实的接缝上并行，并给每个执行者自己的 worktree 或分支（nimo-principle-separate-before-serializing-shared-state 原则 Skill）。不要过度扇出。
- 把设计出来的阶段清单写下来。人审查的就是这份清单。

然后把设计投入运行。它的各步骤作为具体条目加入任务清单，放在阶段 C 条目之后、阶段 D 条目之前。每一步都按阶段 C 的循环纪律执行，并把阶段 D 的日志编织进去——每落一步记一行——而不是把整条轨迹攒到最后。

## 阶段 C：跑循环

每个单元是一次实验：陈述假设，做最小的改动，在真实产物上对照谓词测量，推进了谓词就保留，没有推进就撤销它。

应用 nimo-principle-sequence-verifiable-units 原则 Skill：验证完一个单元再开始下一个，而不是把检查攒到最后批量做。

- 靠检查产物来验证，永远不靠自报。当某个东西轻易通过时，先怀疑观察方法，再怀疑系统。一张空白截图能骗过一个懒惰的门禁。
- 给委派的工作配一个评判者，并亲自审计被委派者的产物之后才信任。如果某个执行者骗过了门禁，重置并硬化它的合同。如果门禁本身错了，用一次独立的改动修门禁，而不是绕开它。
- 判定是 VERIFIED、NOT VERIFIED 或 INCONCLUSIVE 三者之一。INCONCLUSIVE 不是通过。不要藏起负面结果。

## 阶段 D：留审计轨迹

通过 [nimo-show-me-your-work](../nimo-show-me-your-work/SKILL.md) 记录这次运行：一份规范 TSV，每个决定一行、每个单元一行，证据用链接。nimo-figure-it-out 的工作通常大到值得把轨迹提交进仓库，让审查者在 PR 里读它；当信心必须被展示时，提交它——提交是写操作，按当前授权边界执行。优先使用由已提交脚本产出的证据，让审查者可以复跑。轨迹加上 diff，才是让人回来后能信任这份工作的东西。

## 阶段 E：验证并交回

对照阶段 A 的谓词，在真实产品上检查整体，而不只是 harness。把反复出现的纠正编码成门禁、lint 规则、检查或脚本，让这个成果无法静默回退（nimo-principle-encode-lessons-in-structure 原则 Skill）。

**回复：**你设计的 Playbook、严格度等级及其理由、决策轨迹的路径、对照谓词已验证的内容、仍然开放的内容。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。

## 必要依赖

- [nimo-architect](../nimo-architect/SKILL.md)
- [nimo-show-me-your-work](../nimo-show-me-your-work/SKILL.md)

来源：[pstack figure-it-out](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/figure-it-out/SKILL.md)。

