# Skill 移植账本：nimo-architect 与 nimo-arena

- 上游来源：pstack（cursor/plugins 仓库，固定 SHA `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`）的 `skills/architect/`（含 3 个 references）与 `skills/arena/`。
- 本账本只记录相对上游的有意义适配。纯中文化翻译与统一命名适配不逐条记录，包括：architect→nimo-architect、arena→nimo-arena、how→nimo-how、why→nimo-why、interrogate→nimo-interrogate、原则名加 `nimo-principle-` 前缀、Graphite/Origin（gt）→ forge + Git 原生能力、粗体引用改为正文内联相对链接。
- 语义等价要求：上游中所有改变 Agent 决策/执行行为的强约束（MUST/NEVER 级语义）、停止条件、判定信号（候选趋同/分歧的处理）、anti-pattern、模板与 rubric 条目、"为什么这个步骤存在"、"什么信号说明执行错了"均已逐条保留等价语义，未压缩。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
| --- | --- | --- | --- | --- | --- |
| nimo-architect/SKILL.md frontmatter | 含 `disable-model-invocation: true` | 未保留该字段 | Cursor 私有元数据；nimo 宿主无关，基本元数据仅依赖 name/description（host-contract.md 3.8） | 无行为语义损失；模型自动触发与否交由宿主与用户决定 | tests/assets/check-package.mjs 只校验 name/description |
| nimo-architect/SKILL.md 阶段 B | architect runners 默认为四个固定模型名 | 使用用户配置的 architect runners；宿主多模型可用时优先不同模型家族各开一个，仅单模型时按委派纪律降级并记录 | 固定模型名宿主无关化（允许适配第 3 条）；增加诚实降级 | 模型多样性不再由 Skill 默认保证，改由用户配置决定；降级路径显式化 | check-package.mjs `fixed-model-name` 模式不触发；delegation.md 降级条款 |
| nimo-architect/SKILL.md 阶段 C | 检查点触发话术为 Cursor 斜杠命令（如 `/architect with checkpoint`） | 改为用户明确要求的通用话术（"带检查点运行"、"实现前停下来给我看"） | nimo 无宿主私有斜杠命令入口 | 无；opt-in 语义等价（仅用户显式要求时加检查点） | 人工复核：默认无检查点、显式要求才暂停的语义未变 |
| nimo-architect/references/rationale-template.md | 阶段 A 链接带英文标题锚点 `../SKILL.md#phase-a-ground-the-problem` | 链接指向 `../SKILL.md`，锚点随中文标题省略 | 中文标题的锚点 slug 随渲染器而异，英文锚点不可移植 | 无；导航目标仍为"阶段 A：锚定问题"一节 | check-package.mjs 校验链接目标文件存在 |
| nimo-arena/SKILL.md 阶段 A | runner 配置来源 `~/.cursor/rules/pstack-models.mdc`，缺省为四个固定模型 | 用户配置的 arena runners；未配置时用用户可用的模型，仅单模型时降级并记录 | `.cursor` 私有路径与固定模型名宿主无关化 | 配置发现方式移交用户/宿主；默认模型多样性不再隐含承诺 | check-package.mjs `.cursor`/`fixed-model-name` 模式不触发 |
| nimo-arena/SKILL.md 阶段 A | 候选输出路径缺省 `/tmp/arena-<slug>/candidate-<n>/` | 改为"系统临时目录下 `arena-<slug>/candidate-<n>/`"，git worktree 优先不变 | `/tmp` 是 Unix 路径约定，Windows 宿主应使用系统临时目录 | 无；候选输出隔离语义不变 | 人工复核 |
| nimo-arena/SKILL.md 阶段 B | 一条消息内以 `run_in_background: true` 派发 N 个子 Agent（Cursor 私有接口参数） | 宿主提供的并行/后台子 Agent 机制一次性派发；宿主不支持时按委派纪律串行独立执行并记录降级 | Cursor 私有接口宿主无关化（允许适配第 2 条） | 并行不再是硬性前提；候选互相隔离、互不可见的语义保留，降级被显式记录 | delegation.md"降级与必要条件"条款（不能并行但能提供独立上下文时串行） |
| nimo-arena/SKILL.md 阶段 C | 交叉评审模型池来自 `~/.cursor/rules/pstack-models.mdc`，缺省四个固定模型，优先与父 Agent 不同家族 | 用户配置的交叉评审池；未配置时用用户可用的模型，优先不同家族，仅单模型时降级并记录 | 同阶段 A 的配置来源适配 | 同阶段 A；"只读评审子 Agent、与父 Agent 的阅读并行而非与候选并行"的时序语义原样保留 | 同上；人工复核评审与候选的时序约束未变 |
| 两个 SKILL.md | 上游无授权边界段落 | 保留"边界与交付"段，引用 host-contract.md 与 delegation.md | nimo 授权边界增强（允许适配第 5 条） | 新增授权约束（不扩大授权、诚实交付），不放松任何上游设计/比较语义 | check-package.mjs 校验两个引用文件存在 |
