# 实现并交付 PR 链

标识：PB20。实现并交付 PR 链时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

你拥有的是链，从来不是落地。以完全自主构建并验证整个队列，然后交给 operator（发出请求的用户）一条由她审查、由她自己落地的线性 base-branch 链。适用于"autopilot-stack""堆起来但别发布""把链建好，我自己落"。它是 [autopilot-full](autopilot-full.md) 的姊妹流程：owner（所有者）循环与验证门禁完全相同，只有终点不同——那边干净 verdict 授权 owner 合并；这边它只是把一个环节追加进唯一受审的链，任何东西都不自动发布。

1. **原样运行 owner 循环（与 [autopilot-full](autopilot-full.md) 相同）。** forge 对整个程序只解析一次：默认 GitHub（`gh`）；用户配置的当前 forge CLI 能解析该仓库时，用它的等价命令做 PR 创建、编辑、查看、观察和合并操作，否则留在 `gh` 并记录回退；不要求任何栈管理工具。每个 PR 一个宿主独立执行者（独立子 Agent／独立上下文；宿主无独立执行者时按 [宿主合同](../references/host-contract.md) 降级并在交付中如实说明），端到端拥有其变更：构建、首次推送、自证之前先开好的 ready PR、自证（门禁、CI、回执）、按 [审查分类](../references/review-triage.md) 对机器人审查意见做怀疑分诊、一次去噪清理（[nimo-deslop](../../nimo-deslop/SKILL.md)）、[nimo-no-comments](../../nimo-no-comments/SKILL.md)，以及按 [babysit](babysit.md) 跟进到绿。工作自包含时 owner 并行。约 15 分钟内，每个 owner 按 [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md) 开始 decisions.tsv 决策轨迹、推送首个分支快照、以 ready 状态打开 PR——绝不是草稿。轨迹保持未提交，随报告一起返回。
2. **在唤醒链上审计。** root（主 Agent）约每 30 分钟跑一次审计 tick：节奏必须由真实唤醒机制承载（宿主原生定时器／自动化），绝不交给记忆或易丢失的完成通知；宿主无后台／定时能力时并入当前会话的清收点推进，并如实说明会话结束即停止。每个 tick 先从安装位置重读本 Playbook 的当前正文，再重读已布防的程序目标，对照两者审计运行；当轮 tick 内修复漂移，并按紧急事项处理。用通用存活或状态探测逐个点名 owner。只把副作用计为进度：提交、推送、PR 或检查状态的变化、已落盘入库的报告；跑过预期运行时长仍无副作用的泳道视为卡死，立即退场并派替代者，不等它客气地返回。
3. **守住 operator 门禁。** 先陈述后等待（state-then-wait）：要求陈述计划不是开始信号。她明确说开始后，把完整程序目标布防为持久目标：宿主提供原生目标机制时用它承载，否则用 [工具用法](../references/tools.md) 的 state.mjs 初始化 program 并把目标写入 goal，此后每轮重读。目标持续到链完成。她停止时，每个 owner 立即零写入待命。
4. **在 STACK-READY 处验证。** owner 报告 STACK-READY 及确切 head SHA。root 对该 SHA 做 swarm 验证，按 [nimo-swarm](../../nimo-swarm/SKILL.md) 扇出：并行独立验证者在该 SHA 重跑门禁、在承重行为上跑真实运行时底线（按 [nimo-verify](../../nimo-verify/SKILL.md) 在真实操作面驱动）、做不信任 PR 描述正文的回执与 diff 审计。swarm 聚合为一个 verdict。发现回给 owner；任何未验证的东西不得进入链。
5. **干净 verdict 只追加，绝不发布。** 任何 owner 不合并、不布防自动合并、不关闭。干净 verdict 把该 PR 追加进唯一的线性 base-branch 链，按已验证顺序或 operator 指定的顺序。
6. **拓扑唯一写入者，构建并行写入者。** owner 只推自己的分支，并报告 tip、当前 base 和预期父项。root 是唯一拓扑写入者。追加 PR 时：fetch 预期父项，把子分支 rebase 到该父项的确切 tip 上，先做 `git ls-remote` 核对远端版本，再以 `--force-with-lease` 推送，并把该 PR 的 base 设为父分支（按已解析的 forge：GitHub 上新建 PR 用 `gh pr create --base <父分支>`，已有 PR 改 base 用 `gh pr edit <pr> --base <父分支>`）。只有链根 PR 指向 trunk。绝不通过栈管理工具提交或登记链。
7. **在 root 吸收漂移，再重验被移动的部分。** root fetch 当前 trunk，并自底向上 rebase 整条链。rebase 在某个 owner 的文件里浮出冲突时，由该 owner 修自己的部分，root 推送结果。rebase 重写其上所有 SHA，并使旧 SHA 上的 verdict 失效。把每个 PR 在其 verdict SHA 上 base 到 head 差异的稳定 `git patch-id`，与它新的 base 到 head 差异比较：patch-id 不变则保留代码 verdict；任何变化的补丁在交付前回到第 4 步重新验证。即使 patch-id 不变，每次改写后的推送也要重跑 mergeability 和 CI。会签规则与 autopilot-full 相同：真正新钉住或抬高门禁／预算值要停下等 root 的新会签，吸收已落地值的漂移不算抬高。
8. **交付链。** 交付物是一条由已验证 PR 构成的线性链，在已解析 forge 中可自底向上审查，每个环节在 PR 正文或评论里带着它的验证者 verdict。operator 自己审查并落地——用她自己的点击，或她本人布防的 merge-when-ready。

两个 autopilot 的选择：PR 独立且落地授权已授予时用 [autopilot-full](autopilot-full.md)；operator 要在落地前审查、工作有顺序或耦合、或合并授权被保留时用本流程。

## 必要条件与停止

该流程不合并、不启用自动合并、不关闭 PR；交付物是链，落地永远归 operator。独立实现可以并行，改 base / rebase / 推送改写后的链必须串行，且只由唯一拓扑所有者执行。只能在自有分支、授权允许且 `git ls-remote` 核对远端预期版本一致时使用 `--force-with-lease` 推送。要求陈述计划不是开始信号；operator 停止时每个 owner 立即零写入。

拓扑所有者自底向上维护链，执行者只改自己的范围。追加和变基后重查 head/base/证据：rebase 重写其上全部 SHA 并使旧 verdict 失效，patch-id 不变仅保留静态代码结论，mergeability 与 CI 仍须重验，补丁变化回炉第 4 步重新验证。不得 merge、auto-merge 或 close；记账和等待不增加权限；真正新钉住的门禁或预算值停下等会签，吸收已落地值的漂移不算。宿主无独立执行者时 owner 工作可由主 Agent 串行承担，必要的独立验证无法完成即停在未验证状态。push、评论、合并、rebase 等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-deslop](../../nimo-deslop/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)
- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)

## 交付

回复链根与链尖的链接、每个环节一行的 verdict 摘要、任何被搁置或排除的事项及原因。另返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack autopilot-stack](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/autopilot-stack.md)。
