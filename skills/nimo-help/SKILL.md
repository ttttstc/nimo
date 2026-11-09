---
name: nimo-help
description: 回答怎么用 nimo、这件事该用哪个技能或 playbook、跑歪了怎么修，并直接给出可以发送的提示词与出处文件。自己不执行任务。
---

# nimo 帮助

## 定位与边界

回答三类问题：装好没装好、这件事该用哪个技能、这次跑歪了怎么修。

- 只回答、给可发送的提示词、指出原文出处。
- 不在求助时替用户开始干活。一次真正的任务要走入口 SKILL 的流程、读 playbook、跑验证，代价高，何时开始应由用户决定。
- 分工：安装与环境走 `nimo-setup`；团队约定与配置走 `configure-nimo`；任务路由与执行走 `nimo-mode` 的路由表，本文不重写那张表。

## 先判断是哪一种求助

一次问清，给选项而不是开放式追问：

1. 装好并开始用
2. 做一件具体的事，要一段可以直接发送的提示词
3. 挑一个技能或一个 playbook
4. 跑歪了要修
5. 把 nimo 改成自己团队的样子

状态判断时只陈述事实，不臆测：仓库里有没有 `.nimo/verification/` 决定能不能直接跑验证；有没有 `nimo-verify` 生成的技能决定验证是不是空口；有没有形式化资产决定形式化那条线要不要提。

## 安装与环境

- 转 `nimo-setup`；宿主差异看 `integrations/<宿主>/README.md`。
- 不给「先跑起来再说」的建议。装完要能回答四个问题：装了哪些技能、装到哪、宿主看得到哪些能力、缺哪些。
- 宿主不支持子 agent 或常驻模式时，明说降级后果，不要假装能力存在。

## 挑一个技能

| 想干什么 | 用哪个 |
| --- | --- |
| 先搞清楚代码在做什么 | [nimo-how](../nimo-how/SKILL.md) |
| 搞清楚某个设计为什么这样 | [nimo-why](../nimo-why/SKILL.md) |
| 讲给同事或客户听 | [nimo-teach](../nimo-teach/SKILL.md) |
| 需求还糊、要盘问 | [nimo-grilling](../nimo-grilling/SKILL.md) |
| 方案还没成形、要先摸清边界 | [nimo-figure-it-out](../nimo-figure-it-out/SKILL.md) |
| 设计跨边界、要定结构 | [nimo-architect](../nimo-architect/SKILL.md) |
| 同一个 brief 要几份独立方案 | [nimo-arena](../nimo-arena/SKILL.md) |
| 并行切分或赛跑取优 | [nimo-swarm](../nimo-swarm/SKILL.md) |
| 审一份 diff 或评审意见 | [nimo-interrogate](../nimo-interrogate/SKILL.md) |
| 要证明行为真的成立 | [nimo-verify](../nimo-verify/SKILL.md) |
| 还没有可执行的验证资产 | [nimo-verification-create](../nimo-verification-create/SKILL.md) |
| 验证资产与代码脱节了 | [nimo-verification-maintain](../nimo-verification-maintain/SKILL.md) |
| 状态机、并发模型要画成图 | [nimo-statechart](../nimo-statechart/SKILL.md) |
| 改完要清残留 | [nimo-deslop](../nimo-deslop/SKILL.md) |
| 提交前删注释噪音 | [nimo-no-comments](../nimo-no-comments/SKILL.md) |
| 说清自己做了什么、证据在哪 | [nimo-show-me-your-work](../nimo-show-me-your-work/SKILL.md) |
| 写技术文档 | [nimo-technical-writing](../nimo-technical-writing/SKILL.md) |
| 去 AI 味 | [nimo-unslop](../nimo-unslop/SKILL.md) |
| 测试先行 | [nimo-tdd](../nimo-tdd/SKILL.md) |
| 方法本身跑偏了要纠 | [nimo-correct](../nimo-correct/SKILL.md) |
| 事实与判断要分开检验 | [nimo-inspect](../nimo-inspect/SKILL.md) |
| 知识库写入 | [nimo-knowledge-maintain](../nimo-knowledge-maintain/SKILL.md) |
| 知识库健康检查 | [nimo-knowledge-audit](../nimo-knowledge-audit/SKILL.md) |
| 写一个新技能 | [nimo-skill-author](../nimo-skill-author/SKILL.md) |
| 评估一个技能值不值得留 | [nimo-skill-evaluate](../nimo-skill-evaluate/SKILL.md) |

## 几个容易混的选择

- **how、why、teach**：how 讲做什么与怎么验，why 讲为什么这样选与代价，teach 在两者之上合成一次能复述的讲解。只问「这段代码干什么」就别起 teach。
- **architect 与 figure-it-out**：architect 定结构并给出可执行边界；figure-it-out 是在设计还立不住时先设计一次严谨的探查。
- **arena 与 swarm**：arena 是同一 brief 多份独立方案再合并；swarm 是把一件大活切开并行或赛跑。
- **inspect 与 interrogate**：inspect 检验事实与判断是否对得上；interrogate 是对着一份 diff 追问评审意见。
- **knowledge-audit 与 knowledge-maintain**：前者只读体检，后者写。没有明确写入授权时只能走前者。
- **skill-author 与 skill-evaluate**：前者造，后者判。改现有技能先 evaluate 拿证据。

## playbook 不是技能

24 个 playbook 固化在入口 `nimo-mode` 的路由表里，没有斜杠命令。用户说「审这个 PR」「把这个栈落下去」「接着上次那条分支」「稳妥地暂停」「把队列全自动跑完」，按路由表命中的那一条执行，不需要先挑技能。

完整清单与触发词见 [入口 SKILL](../nimo-mode/SKILL.md)。

## 原则怎么用

原则不按名字调用，按判据说事：「这里违背了根因原则」「这是守卫上下文窗口的问题」。索引在入口 SKILL，细则见对应原则技能的 `SKILL.md`。

## 跑歪了怎么修

| 症状 | 修法 |
| --- | --- |
| 一直在改但没验证 | 转 `nimo-verify` |
| 一上来就写代码 | 回 `nimo-how` |
| 结论没有实测证据 | 按 `nimo-principle-prove-it-works` 补证据 |
| 测试改成跟着实现走 | 按 `nimo-principle-test-behavior-not-implementation` 重写断言 |
| 上下文被塞满 | 按 `nimo-principle-guard-the-context-window` 重新装配 |
| 技能越加越多越写越长 | 先用 `nimo-skill-evaluate` 拿证据，再按 `nimo-principle-subtract-before-you-add` 删 |
| 每次都要重复同一段要求 | 走 `configure-nimo` 落成团队约定 |
| 改了但说不清改了什么 | 走 `nimo-show-me-your-work` |

## 把 nimo 改成自己的

- 团队约定与个人偏好走 `configure-nimo`。
- 新技能走 `nimo-skill-author`，流程见 playbook `authoring-a-skill`。
- 改现有技能先走 `nimo-skill-evaluate`，有证据再改。
- 报告技能缺陷单独开一条 issue，附最小复现，不要顺手在同一处改三件事。

## 手册与出处

- 第一次使用：[手册首页](../nimo-mode/references/guide/README.md)
- 第一件事怎么走：[第一件事](../nimo-mode/references/guide/01-first-task.md)
- 常见工况与坑：[工况与坑](../nimo-mode/references/guide/02-recipes-and-pitfalls.md)

## 回复格式

先给答案，最多一个提示词代码块，再给出处链接。用户要全景时才展开成多节。

来源：[pstack skills/poteto-help](https://github.com/cursor/plugins/blob/6b0300214a09fd6029cfb7077043125758cd1fd2/pstack/skills/poteto-help/SKILL.md)，按 nimo 的技能集合与手册位置改写。
