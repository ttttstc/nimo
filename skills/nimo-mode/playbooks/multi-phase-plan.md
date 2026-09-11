# 多阶段实施计划

标识：PB16。多阶段实施计划时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-foundational-thinking](../../nimo-principle-foundational-thinking/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)

## 步骤

本流程拥有计划，不拥有代码。计划是所有者逐格执行的清单，是操作者据证据审计的合同：一格是一个工作单元，勾一格只当它的证据存在。适用于跨阶段或跨 PR 栈的工作。计划就是交付物，不实施。

1. 变更只有一两个文件、做法显然时，跳过计划：说明这一点并停止。
2. 写计划前先用原型消灭可观测未知。关于布局、时序、行为或某个 API 是否可用的问题，跑 [prototype](prototype.md)。保留分支、SHA 和截图给附录 A。只把任何试验都裁定不了的产品或偏好决定拿去问操作者，并给出选项（[nimo-principle-never-block-on-the-human](../../nimo-principle-never-block-on-the-human/SKILL.md)）。
3. 用独立子 Agent（独立上下文）探索（[nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)），模型按用户配置。每个返回文件指针、约定、测试命令和入口点，不内联转储。
4. 把计划骨架复制进计划文件并填满每个占位符。操作者未指定路径时，写到任务工作区的 docs/ 目录。保留每个标题和每个子块的既有顺序。一节一个 PR：一个 PR 是一个带独立证据的变更（[nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)）。在"怎么读这份计划"里点名执行 Playbook：按 [autopilot-stack](autopilot-stack.md) 末尾的规则在 [autopilot-full](autopilot-full.md) 和 autopilot-stack 之间选；长期项目用 [orchestrate](orchestrate.md)。骨架内容见下文"计划骨架"。
5. 按 [nimo-technical-writing](../../nimo-technical-writing/SKILL.md) 全文写作，再过 [nimo-unslop](../../nimo-unslop/SKILL.md)。正文是单一 Diátaxis 模式 how-to，附录承载解释和参考。两条规则逐字适用："不要任何抽象比喻"，"像海明威一样写作"。每个标题陈述任务或结论。不用长破折号，句中不用冒号。
6. 运行 `node skills/nimo-mode/scripts/check-plan.mjs <plan.md>`，修掉它打印的每一行（[nimo-principle-encode-lessons-in-structure](../../nimo-principle-encode-lessons-in-structure/SKILL.md)）。它强制每个单元的单元标题与目标、文件、依赖、可观察结果、自动检查、真实操作、性能验证、停止点字段，依赖引用、依赖环和未解决的占位符。
7. 交回。发计划路径和脚本输出，然后停止。执行只在操作者明确放行后开始，按计划点名的执行 Playbook 运行。

## 验证规则

单测不足以构成验证。一个 PR 只有 unit、live、perf 三类格子全部勾上才算已验证（[nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)）。这句话就是验证规则，每个验证块都以它开头。

live 块强制。在 PR head 上按 [nimo-swarm](../../nimo-swarm/SKILL.md) 组织真实操作 lane 驱动真实操作面；lane 数量与模型按变更所需和用户配置决定，不固定条数、不固定模型。每条 lane 是一格：一个具体场景、它保存的截图、它的通过判定。其中一条固定是对 trunk 的回归 lane：在 trunk 和 head 上跑同一承载场景。trunk 没有该功能时，这条 lane 记录这一事实，把关 diff 新增的行为加上用户等待的最终状态，而不是编造一个 trunk 结果。

perf 门是双边的：trunk 和 head 都必须产出指定指标。trunk 缺该功能时，还要隔离出 diff 新增的工作，为该工作设绝对预算，加上用户等待的端到端状态；不在不同类场景之间声称比率。perf 块写明指标名、交替执行的探针、先测得的 trunk 基线、以及带失败数字的规则。

改变交互的 PR 有审查门：操作者合并前在对话里带截图和视频审查它。不改交互的 PR 写明"无审查门"，下面没有任何格子。

## 操作面驱动

按操作面选择驱动方式：浏览器和 Web UI 用浏览器自动化，CLI 和 TUI 用终端，原生移动用仓库现有的模拟器驱动能力（[nimo-verify](../../nimo-verify/SKILL.md) 的"选择实际工具"）。一个 PR 触及两个操作面，两侧都要有 lane。没有可用驱动手段的操作面记入附录 C 的风险，且它的 live 块仍要写明每条 lane 如何驱动它；确实无法驱动时如实写验证受阻，不用源码审阅冒充操作面结果。

## 计划骨架

单元结构按 [计划模板](../references/plan-template.md)（目标、文件、依赖、可观察结果、自动检查、真实操作、性能验证、停止点，每个 PR 一节重复），外加以下必备节，顺序保持：

1. **头部摘要**。十行以内：改什么、为谁改、计划执行的规则、按序的 PR 编号。
2. **怎么读这份计划**。一格是一个工作单元，每格点名检查它的证据；嵌套格是上格的子步；证据存在（一个文件、一行日志、一张截图、一次测试运行或一个 SHA）才勾格。正文是 how-to，附录解释并记录。写明执行 Playbook、谁合并、哪些 PR 编号是操作者停在可合并状态的项，以及验证规则原文。
3. **项目清单**。
   - 布防：把协议和这份计划陈述给操作者，然后停止；只在明确放行后开始执行。放行时把计划路径、按序 PR 编号、验证规则、谁合并、完成条件固化为执行目标，写入 program.json 并在每次启动和恢复时传递。程序启动时从 trunk 读取执行 Playbook、nimo-swarm、操作面驱动说明、[opening-a-pr](opening-a-pr.md) 和其他所用 Skill 的当前版本，每次唤醒重读，不用旧副本。审计节奏由用户配置或计划指定，不靠记忆维持；宿主无后台唤醒时仅当前会话运行，结束保存检查点。操作者喊停时，立即向所有执行者发零写入指令。
   - 审计内容：每次唤醒重读 trunk 上的执行 Playbook 和已固化的执行目标，对照两者审计运行并修复本轮漂移；探测每条活跃 lane，只按副作用判断进展；叫停卡住的 lane 并立即派替代；然后无论有无变化都给操作者发状态：PR、所有者、状态、head SHA 的队列表，上次以来的 verdict，合并了什么，未决操作者门和阻塞。
   - 派执行者：每个 PR 一个所有者，完整生命周期由执行 Playbook 定义。依赖图：依赖工作只在父项合入后开始，或执行 Playbook 走栈时基于父分支；哪些 PR 独立且最先、谁排在谁之后，写进图里。守住文件边界：某 PR 只碰指定范围。守住审查门：改变交互的 PR 等操作者在对话里带截图和视频审查后才能合并。
   - 每个 PR 的机制：forge 只解析一次，默认 `gh`，用户配置的其他 forge CLI 能解析该仓库时用等价命令并记录，不要求栈管理工具。PR 按用户要求的状态创建（用户未指定时默认正式状态，不开草稿）；栈的子项 base 指向父分支。PR 面向推送前跑一次仓库的 lint 和类型检查，推送带钩子。每次提交前过 [nimo-deslop](../../nimo-deslop/SKILL.md)，审查前过 [nimo-no-comments](../../nimo-no-comments/SKILL.md)。机器人审查和安全审查意见逐条按 [审查分类](../references/review-triage.md) 分类。跟进前和可合并报告前各 rebase 一次当前 trunk。
   - 判定与合并：在可合并的 head SHA 上按 [nimo-swarm](../../nimo-swarm/SKILL.md) 组织 lane：一条门禁 lane、live 块的真实操作 lane、perf 块的 lane，加一条读 diff 和收据且不信任 PR 正文的审计 lane。全 lane `PASS` 才干净；发现回给所有者；新 head 换新一轮 lane 和新 verdict。合并规则来自执行 Playbook，patch-id 规则来自 [shipping](shipping.md)。
   - 真实 lane 启动配方：每条 live lane 在 PR head 的独立隔离环境运行：检出确切的 head SHA；启动后端和操作面并等就绪；输入只通过操作面驱动方式传递，点名只读诊断；截图保存到带 PR 和 lane 标识的路径，随报告返回路径。
4. **每个 PR 一节**（对应模板单元）。依赖；文件（编辑、创建、删除）；构建（一格一个变更，点名符号和文件）；你会看到（一个可观察结果，带确切的日志行或屏幕状态）；验证 unit（以验证规则开头；测试文件和它新增的用例，运行命令）；验证 live（以验证规则开头；lane 列表）；验证 perf（以验证规则开头；指标、探针、基线、规则）；审查门（把 lane 截图复制到媒体路径，录 30 到 60 秒的变更视频，贴进对话，停在可合并状态等操作者点击；无交互改变则写"无审查门"，下面没有格子）；合并条件（主协调 Agent 在确切 head SHA 的干净 verdict；机器人分类完成；verdict 后 rebase 到当前 trunk 且 patch-id 不变；按执行 Playbook 由所有者自合并，或主协调 Agent 追加到 base 分支栈后操作者自底向上落）。
5. **收尾**。全部格子带证据勾完；按执行 Playbook 点名的报告回复操作者。
6. **附录**。A 原型证据：每个原型回答的问题，带分支、SHA 和产物链接；仍未证实的问题。B 被否决的备选：每个权衡过的方案和它输掉的原因。C 风险：每个风险、它落在哪个 PR、所有者盯什么。D 链接与阅读清单：编辑前要读的文档；哪些 PR 用 [nimo-how](../../nimo-how/SKILL.md) 和 [nimo-interrogate](../../nimo-interrogate/SKILL.md)；按 [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md) 的轨迹。

## 必要条件与停止

只产出计划，不实施。交付后等待明确的实施请求；计划在操作者明确放行后才开始执行。计划指定后续采用 feature、自主运行、autopilot 或 orchestrate，不把所有多阶段计划强制升级为大项目编排。

每个单元列出自动检查、真实操作和性能验证的适用性；不适用项写具体原因，不编造指标，不使用固定 lane 数或固定模型。使用 [计划模板](../references/plan-template.md) 落笔，以 check-plan.mjs 检查。每单元写目标、文件、依赖、可见结果、自动检查、真实操作、性能验证和停止点。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

使用 [计划模板](../references/plan-template.md)，替换所有示例内容后运行结构检查。

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-deslop](../../nimo-deslop/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)
- [nimo-technical-writing](../../nimo-technical-writing/SKILL.md)
- [nimo-unslop](../../nimo-unslop/SKILL.md)
- [nimo-interrogate](../../nimo-interrogate/SKILL.md)
- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)

## 交付

回复计划路径、按序 PR 编号及其依赖与审查门集合、原型证实了什么和仍未证实什么、检查脚本输出；返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack multi-phase-plan](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)。
