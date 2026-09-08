# 验证后合入

标识：PB15。验证后合入时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-make-operations-idempotent](../../nimo-principle-make-operations-idempotent/SKILL.md)

## 步骤

本流程拥有落了什么：逐个 PR 独立验证，只从根部落连续已验证区间，然后把手从队列上拿开。适用于"落这条栈""发布它""启用就绪即合"，或 [babysit](babysit.md) 已弄绿的栈的后半程。

这是 babysit 之后的半程。babysit 让栈可合并；shipping 决定实际安全可合并什么，并自底向上一次落一个 PR。绿不等于安全，这两个词之间的差距就是本流程的生存空间。

1. **先解析 forge，再逐个 PR 独立验证。** 默认 GitHub（`gh`）；用户配置的当前 forge CLI 能解析该仓库时，用它的等价命令做 PR 查看、观察、编辑和合并，否则留在 `gh` 并记录回退。不要求任何栈管理工具。每个 PR 一个独立执行者（宿主独立子 Agent 或独立上下文），不批量；多个执行者按 [nimo-swarm](../../nimo-swarm/SKILL.md) 组织。每个执行者都在真实操作面上按变更所需驱动（按 [nimo-verify](../../nimo-verify/SKILL.md) 选择实际工具），对照父版本与 head 版本执行。每个返回 `PASS`、`PASS+NOTES` 或 `FAIL`，并在评论授权允许时把 verdict 发布到它自己的 PR 上，让记录活得比会话长；无评论授权时在交付中给出完整 verdict 记录并说明缺口。安全的含义是 verdict 来自没写过这段代码的执行者。CI 绿不是 verdict，机器人的同意审查也不是。宿主无独立执行者时按 [宿主合同](../references/host-contract.md) 降级；shipping 必要的独立验证无法完成时，停在未验证状态。
2. **只落以底部为根的连续已验证区间。** 从最底部未合并 PR 往上走，停在第一个没有通过 verdict 的 PR；`PASS` 和 `PASS+NOTES` 都算通过。坐在未验证项上面的已验证 PR 不可落地：合并它会把缺口拉进它下面。把上限报告为 PR 编号，并说明是什么断了链。
3. **复查每个 verdict 仍描述当前补丁。** 记录 verdict 的 head SHA、base SHA 和该 PR base 到 head 差异的稳定 `git patch-id`。rebase 或改 base 会重写 SHA，可能不碰任何检查就悄悄让 verdict 失效。落一个 PR 前，把记录的 patch-id 与当前 base 到 head 的 patch-id 比较：补丁变了就重新验证；没变则保留代码 verdict，但在当前 head 重查 mergeability 和 CI。绝不用相同的提交消息或旧 SHA 的绿色检查当替代。patch-id 相同只支持补丁内容等价的静态结论，不能覆盖基线改变带来的集成风险，必要的运行验证仍针对当前整合结果。
4. **只准备最底部 PR。** 拉取当前 trunk。必要时把最底部已验证分支 rebase 到确切的 trunk tip，推送，只把该 PR 的 base 改到 trunk（`gh pr edit <pr> --base <trunk>` 或当前 forge 的等价命令）。推送后重跑第 3 步。还不要给任何后代改 base、布防或合并。rebase、推送、改 base 在用户对本流程的授权范围内执行；未授权时停止并报告。
5. **一次落一个 PR。** 底部 PR 现在可合并就 squash 合并（`gh pr merge <pr> --squash` 或当前 forge 的等价命令）。必需项还在跑且用户要求了就绪即合时，只给该 PR 布防自动合并（`--squash --auto` 或当前 forge 的 merge-when-ready 等价项，不同 forge 的开关语义以当前 forge 为准）。等这个 PR 真正合并后，再准备下一个。请求自动合并不等于已经合并。
6. **不把 GitHub 的 autoMergeRequest 读成栈就绪。** 它最多说明这一个 GitHub PR 请求过 GitHub 的 auto-merge；不证明其他 forge 的 merge-when-ready 已布防、后代已排队、补丁 verdict 仍当前、或连续栈安全。确认当前 forge 对当前底部 PR 的状态；当前 forge 报不出来，就说状态未知。
7. **每次合并后重算。** 拉取 trunk，确认合并的 SHA 已在 trunk，把已合并 PR 从冻结的自底向上清单去掉，检查新底部 PR 的 base、head、检查和 patch-id。宿主可能自动给子项改 base，但不要假设它改了。对该 PR 重复第 3 到 6 步。独立工作留在这条链之外，自己单独发布。
8. **盯当前前沿直到它合并或失败，不围绕它改动队列。** GitHub 上把观察只用作事件唤醒：每次唤醒后查该 PR 的 state、mergedAt、mergeStateStatus、statusCheckRollup、autoMergeRequest（用 `gh pr view --json` 或 `inspect-pr.mjs` 的事实），忽略 `READY`，直到 mergedAt 非空或 state 为 MERGED 才执行第 7 步。硬失败仅限三种：state 为 CLOSED 且无 mergedAt；必需检查结论为 FAILURE 或 CANCELLED 且自动合并不再 pending 后仍阻塞合并；mergeStateStatus 为 UNSTABLE 或 DIRTY 且无自动合并 pending。检查还在跑或自动合并已布防时的 BLOCKED 不是失败。不用 babysit 的队列 WAITING／merge-queue 停止条件。观察在宿主持续运行机制下持有；无后台唤醒时仅当前会话运行，结束保存检查点。每次合并报告新的上限。队列停滞时先诊断再改动，因为停滞的必需检查和过期基线从外面看一模一样。
9. **停在上限。** 已验证区间全部合并后，报告落了什么、下一个未验证 PR 是什么、验证它要什么。扩大区间是回第 1 步重新过一遍独立验证，不是凌晨三点拍的判断。

## 必要条件与停止

CI 绿不等于独立验证通过；请求自动合并不等于已经合并。head 变化必须重新核对证据。稳定 patch-id 可辅助复用代码审查结论，但不能证明运行环境和基线行为没变；必要运行验证仍须针对当前整合结果。

每条验证保存 head/base、证据和独立执行者。patch-id 仅辅助静态审查复用，当前基线的运行验证仍须核对。每次只操作最底部项，合并后确认远端结果再核对下一项。已验证区间耗尽即停在上限并报告下一个缺口；扩大区间是重新走第 1 步。

push、评论、合并、rebase 等外部动作受用户当前授权约束；宿主无独立执行者时，必要独立验证无法完成就停在未验证状态，不用源码审阅或 CI 绿冒充。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

回复已验证区间及其上限、每个 PR 的 verdict 和产出者、布防了什么及如何确认、落了什么、下一个缺口需要什么；返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack shipping](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/shipping.md)。
