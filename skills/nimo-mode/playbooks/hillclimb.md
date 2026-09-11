# 持续改善一个指标

标识：PB07。持续改善一个指标时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-build-the-lever](../../nimo-principle-build-the-lever/SKILL.md)
- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)
- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)
- [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)

## 步骤

你拥有指标和实验的完整性。监督和审查；把尝试委派出去。适用于对单个可测事物的持续迭代改进，对着一个目标（"在 X 上爬坡""让启动快 50%""系统性地压低 <指标>""持续尝试直到 <指标> 改善 N%"）。一次性修复走缺陷修复或一次性能问题修复；本 Playbook 是循环。

核心纪律：一次改动、一次测量、保留或撤销。不堆叠未测试的改动，不从代码检视宣称胜利。数据说了算（[nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)）。

1. 先给工作负载和架构打地基，再选尺子。对目标运行 [nimo-how](../../nimo-how/SKILL.md)，点名能移动结果的现实工作负载维度（数据规模、历史、状态、并发），选择一个能复现用户抱怨的场景。没有场景能复现它，先修复现，不爬坡。然后固定一个指标、什么方向算更好，以及一个可检验的停止谓词：目标配上最少尝试次数下限，防止侥幸的早期胜利提前结束整轮（"至少比基线好 50% 且至少 10 轮迭代"就是这个形状）。用户给了数字就用；没给，先商定。
2. 构建测量 harness，证明它的灵敏度，然后冻结它（[nimo-principle-build-the-lever](../../nimo-principle-build-the-lever/SKILL.md)）。跑对比性的现实工作负载，确认目标场景复现症状、更容易的场景按预期分开。尺子区分不了它们，就改工作负载或指标。一旦冻结，一条可重复的命令发出指标，采样足够清除噪声（N 次的中位数，不是单次运行）；改动它，之前所有数字作废。任何改动之前，记录基线指标和回归门禁（必须保持通过的测试）的一次绿色运行。
3. 按 [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md) 开决策日志（decisions.tsv）。每轮尝试记一行：假设、改动、前值、后值、差值、测试结果、结论（保留或撤销）、备注。这是本次运行的记忆。每轮尝试前先读它，让搜索累积而不是原地绕圈。放在 git 树外（gitignore），让它在撤销中幸存。
4. 每个假设锚定在第 1 步的架构模型上，让它点名具体机制（"把 X 推迟出启动路径，因为它阻塞首屏绘制"），不是"试试给什么东西加 memo"。
5. 循环，每轮一个假设：
   - 把改动交给子 Agent（用户配置的爬坡模型），给紧凑的范围；监督并审阅 diff，而不是亲自打字（[nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)）。宿主没有独立子 Agent 时，主 Agent 顺序扮演并记录降级，降级下的自审不称独立审查。多个独立假设同时活跃时，扇出到并行子 Agent，各在自己的 worktree 里，互不碰撞（[nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)）。
   - 用冻结的 harness 测量前后，并跑回归门禁。
   - 指标移动超过噪声且门禁保持绿，才接受；否则完整撤销该改动。"也许有帮助"的微调不搭车。
   - 每个被接受的修复一个 commit，只 stage 自己改的文件（`git add <文件>`，从不用 `-A`）。保留或撤销，都记一行。
   每轮迭代以下一轮开始前的检查收尾（[nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)）。运行无人值守时，只从 [持续完成一个目标](autonomous-run.md) 借用唤醒机制，不用它的停止规则；本 Playbook 的停止规则管辖一切，平台期意味着转向，不是停止。
6. 推过第一个平台期。停滞、连续几轮被拒时：换策略族、组合差一点的成功、重读源码，或试更激进的东西，然后再断定山已爬完。正确性和简单性排在数字前面。撤销破坏行为的胜利，保留保住数字的简化（[nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)）。
7. 谓词满足时停；或剩余想法真正边际、不值成本时停。不放松谓词宣布胜利；还有便宜的未试假设时不放弃。卡住了就浮出来，不空转。
8. 按授权运行 [整理并创建 PR](opening-a-pr.md)，被接受的 commit 按落地顺序堆叠，让指标的爬升从上到下可读。

交付时说明：指标与目标、基线到最终的百分比差值、运行轮数（保留 vs 撤销）、每个被接受的修复一行、决策日志路径，以及如果继续推进，下一个最想试的想法。

## 必要条件与停止

平台期应更换假设，不降低目标；停止谓词是目标加最少尝试次数下限，防侥幸早停。达到目标和约定尝试要求、耗尽预算、用户停止或真实无可行路径时结束，并区分"目标达到"与"未达到后停止"。不自行编造性能目标或最低轮数；用户没给数字先商定。不放松谓词宣布胜利，还有便宜未试的假设时不放弃；卡住浮出，不空转。

测量工具冻结后修改会使旧数据不可比。噪声不算改进，保持正确性门禁；失败尝试也写日志，只撤销该轮自有差异。每个被接受的修复独立 commit，只 stage 自己改的文件。推送、PR、评论、合并等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack hillclimb](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/hillclimb.md)。
