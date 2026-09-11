# 独立事项实现并合入

标识：PB19。独立事项实现并合入时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

你拥有的是 verdict，从来不是 PR。一个 owner（所有者）把每个 PR 从构建一路带到合并，没有你的干净 swarm verdict，任何东西不得合入。适用于"autopilot this queue（把这条队列自动驾驶）""full autopilot（全自动）"和一 PR 一 owner 的程序：任务是接过一队被移交的独立 PR，以完全自主把它们驱动到合并。与 [orchestrate](orchestrate.md) 的分工：那边运行常驻程序，协调者自己落地已验证工作、执行者从不合并；这边每个 PR 的 owner 承担直到合并的完整生命周期，root（主 Agent）只保留验证、会签与审计。

1. **标记 operator 的事项并遵守先陈述后等待（state-then-wait）。** operator（发出请求的用户）点名的事项始终归她：她审查、她点击合并，任何 owner 不得合并这些事项。她要求陈述流程或计划时，给出陈述即停；只有她明确说开始，执行才启动。收到该开始信号后，把完整程序目标布防为持久目标：宿主提供原生目标机制时用它承载，否则用 [工具用法](../references/tools.md) 的 state.mjs 初始化 program 并把目标写入 goal，此后每轮迭代和每个审计 tick 都重读它。目标跨轮次保持，直到队列完成。
2. **为每个 PR 派一个承担完整生命周期的 owner，并尽早留下轨迹。** forge 对整个程序只解析一次：默认 GitHub（`gh`）；用户配置的当前 forge CLI 能解析该仓库时，用它的等价命令做 PR 创建、编辑、查看、观察和合并操作，否则留在 `gh` 并记录回退；不要求任何栈管理工具。每个 PR 一个宿主独立执行者（独立子 Agent／独立上下文；宿主无独立执行者时按 [宿主合同](../references/host-contract.md) 降级并在交付中如实说明）。owner 端到端拥有：构建、首次推送、ready PR、在真实产物上自证（[验证真实产物](../../nimo-principle-prove-it-works/SKILL.md)）、按 [审查分类](../references/review-triage.md) 对机器人审查意见做怀疑分诊、一次去噪清理（[nimo-deslop](../../nimo-deslop/SKILL.md)）、[nimo-no-comments](../../nimo-no-comments/SKILL.md)、rebase 到当前 trunk、按 [babysit](babysit.md) 跟进到绿，以及合并本身。约 15 分钟内，每个 owner 按 [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md) 开始 decisions.tsv 决策轨迹、推送首个分支快照、以 ready 状态打开 PR——绝不是草稿。PR 在自证之前先开，让 URL、决策和检查构成一条持久轨迹。decisions.tsv 保持未提交，随报告一起返回。rebase 永远先于 babysit 执行，绝不为漂移或冲突等待。合并是 owner 唯一不得单独迈出的一步，由第 4 步把门。
3. **owner 真并行，绝不堆叠。** PR 自包含时同时开多个 owner：一个分支一个写入者、文件互不相交、跨 PR 漂移由 rebase 吸收。只有真正重叠的工作才串行。自包含 PR 直接从 main 切分支；需要排序的工作是先合并再切分支。唯一例外：owner 必须拆分真正有依赖的变更时，可以持有一条短暂的私有 base-branch 栈。
4. **每个 merge-ready head 在合并前过 swarm 验证。** 在 owner 的 merge-ready head SHA 上，按 [nimo-swarm](../../nimo-swarm/SKILL.md) 扇出并行独立验证者并聚合为一个 verdict；扇出机制以该 Skill 为准，此处不复述。泳道：在该 SHA 重跑门禁；在变更触及的真实操作面上现场证明承重行为（按 [nimo-verify](../../nimo-verify/SKILL.md) 选择实际工具）；审计回执与 diff，不信任 PR 描述正文。**对 trunk 的回归泳道。** 在当前 trunk 上跑同一承重场景；trunk 没有该功能时，如实记录这一事实，改为把关 diff 新增的行为加上用户等待的最终状态，而不是假装 trunk 能产出它。现场泳道是底线，没有它的 verdict 不算干净。没有 root 的干净 verdict 不得合并。发现回给 owner 前向修复，新 head 得到一次全新的 swarm 和全新的 verdict。
5. **干净 verdict 下 owner 合并并领取下一项。** owner 只从刚 rebase 到 trunk 的 head 合并。merge-ready 报告在 trunk 当前的 head 上做出，swarm verdict 钉住该 SHA。合并前 trunk 又前进时，按 [shipping](shipping.md) 的 patch-id 规则决定重验：patch-id 不变才能保留 verdict，否则新 head 使 verdict 失效。owner 通过已解析的 forge squash 合并自己的 PR（GitHub 上 `gh pr merge <pr> --squash` 或当前 forge 的等价命令），然后从队列领取下一个自包含事项。operator 的完全自主授权加上 root 的干净 verdict 才构成合并授权——仅靠跟进到绿本身永远没有这种授权。operator 点名的事项停在 merge-ready，等她点击。
6. **运行 root 层。** 真正新抬高被钉住的门禁或预算值（CI 只允许收紧的那种上限）需要你的新会签，且只在验证者给出证据后授予；吸收已在 main 落地的值是漂移，不是抬高。约每 30 分钟对所有 owner 跑一次审计 tick：节奏必须由真实唤醒机制承载（宿主原生定时器／自动化），绝不交给记忆或易丢失的完成通知；宿主无后台／定时能力时，审计并入当前会话的清收点推进，并如实说明会话结束即停止。每个 tick 先从安装位置重读本 Playbook 的当前正文，再重读已布防的程序目标，对照两者审计运行；当轮 tick 内修复漂移，并按紧急事项处理。用一次通用存活或状态探测逐个点名 owner，收集决策轨迹。只把副作用计为进度：提交、推送、PR 或检查状态的变化、已落盘入库的报告；一条泳道跑过预期运行时长仍无副作用即视为卡死，立即让其退场并派替代者，不等它客气地返回。合并成批发生时，跑一次复盘 pass，外加一遍合并后机器人评论清扫。
7. **operator 停止时立即退场。** 她的暂停或退场指令立即作为零写入命令传达到每个 owner。owner 持各自简报待命，直到她解除。

## 必要条件与停止

真正独立的 PR 并行；有依赖的事项在前项合入后再从最新基线创建。用户保留的事项停在 merge-ready 等她自己点击，不自动合入；要求陈述计划不是开始信号。验证覆盖当前行为、基线对照、差异与证据；候选 head 更新后不能复用旧通过状态——patch-id 不变才可按 [shipping](shipping.md) 规则保留静态结论，且 mergeability 与 CI 仍须重验。没有 root 的干净 swarm verdict 不合并；跑过预期时长仍无副作用的泳道视为卡死，退场换人；真正新抬高被钉住的门禁或预算值必须停下等验证者证据之后的新会签，吸收已落地值是漂移不是抬高；operator 暂停或退场立即转化为每个 owner 的零写入命令。

每个所有者有完整合同、独立分支和决策记录。主 Agent 只保留验证、会签与审计，验证当前 head 的门禁、真实操作面、基线对照、差异与证据。宿主无独立执行者时 owner 工作可由主 Agent 串行承担，但本流程必要的独立验证无法完成就停在未验证状态，不伪装独立。唤醒使用宿主实际工具，不固定云环境或无依据的周期；审计节奏由真实唤醒机制承载，宿主无后台能力时仅当前会话运行，会话结束即停止并保存检查点。push、评论、合并、rebase 等外部动作受用户当前授权约束；operator 的完全自主授权加干净 verdict 才构成合并授权，跟进到绿本身不构成。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-deslop](../../nimo-deslop/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)
- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)

## 交付

回复队列及每个 PR 的 owner、状态和 head SHA；每个 verdict 及产出它的 swarm；合并了什么、每个 owner 接下来领了什么；授予的会签及理由；打开的 operator 门禁；收集到的决策轨迹存放位置。另返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack autopilot-full](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-full.md)。
