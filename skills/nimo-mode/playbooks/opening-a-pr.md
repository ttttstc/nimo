# 整理并创建 PR

标识：PB13。整理并创建 PR时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

本流程在其他每个 Playbook 的结尾被调用，也可被用户直接调用：对已完成的差异做最后收口（清理、对抗评审、最终验证），再包装成结构化 PR，读回真实状态后交回。本流程是“最后收口 + PR 包装”，不是新的实现流程；不发展出第二套 Feature / Bug Fix。

1. **工作目录。** 从切自主干（trunk／默认分支）的独立 git worktree 干活；子 Agent 继承这个位置。同一分支上的多次执行者派发各配一个独立 worktree，做不到就在两次派发之间 `git fetch && git reset --hard origin/<branch>` 重置。分支沾着无关的脏工作：把本任务差异打成补丁取出，开新 worktree，再应用。缠死的 worktree：从主干重置，最小化重做。
2. **最后收口。** 由 Feature / Bug Fix 调用时不假设上游的清理与验证仍然有效；用户直接调用时不假设上游已完成 cleanup / review / verify。对最终 diff 跑 [nimo-deslop](../../nimo-deslop/SKILL.md)，然后跑 [nimo-no-comments](../../nimo-no-comments/SKILL.md)。这些动作可能修改代码，只能发生在 Final Verify 之前。
3. **对抗评审。** 跑 [nimo-interrogate](../../nimo-interrogate/SKILL.md)。结论存在“处理”项：停止创建 PR，回到修复；修复后重新从第 2 步收口开始，处理项清零并通过前不创建 PR。
4. **提交组织。** 放开手脚提交；开 PR 前 rebase 成小而有序的提交。每个提交都是一个未来的 PR：可独立落地，顺序讲得出故事。修复属于刚做的提交就 amend 进去；可分离的就做新提交。rebase 或冲突解决使代码发生变化：重新执行受影响的 cleanup / review，再继续。
5. **Final Verify。** 按 [nimo-verify](../../nimo-verify/SKILL.md) 在匹配的操作面上对当前交付物做最终验证；由 Feature / Bug Fix 调用且本流程第 2–4 步未改动代码时，先核对既有验证仍然绑定当前产物版本，绑定成立才可沿用，否则重新验证。Final Verify 是代码冻结点：它只证明其绑定的当前产物版本，之后待交付代码发生任何语义变化，原结论立即失效，必须重新验证。从这里开始只允许不改变代码语义的动作：写 PR 标题和描述、push、创建或更新 PR、修改 base／draft 状态、读回 PR 状态。
6. **标题。** 用 Conventional Commits 形式 `type(scope): subject`。type 取 `feat`、`fix`、`docs`、`refactor`、`test`、`chore` 或 `perf`。scope 取改动区域，如 `nimo-mode` 或具体包名。subject 简短、祈使。与正文一样过 nimo-technical-writing 和 nimo-unslop。一个真实符号承载变更时就点名它，例如 `fix(nimo-mode): retarget opening-a-pr babysit trigger`。句尾不加句号。
7. **描述。** 按顺序使用下列小节，空则省略。
   - `## Why`：意图，以及为什么这个方案合适。
   - `## Scope`：只陈述来自 diff 的事实。点名真实符号和路径。rename 或 retarget 写出两侧。边界重要时写明什么在内、什么在外。
   - `## Tradeoffs`：只写真实取舍；没有就省略本节。
   - `## Blast Radius`：改动影响谁、影响什么。解释为什么安全或为什么有风险。没有这个修复主干就是红的时，写明持续代价。
   - `## Verification`：每个检查怎么跑的、严格到什么程度。点名真实路径，如实际驱动的 CLI、UI 操作面或目标测试。写每个检查的结果，不只是命令名。

   小节之后，视频或截图能证明某个主张时附上。不用 `## Summary` 或 `## Test plan` 样板。提交正文不复述 subject。
8. **行文。** 每个 PR 标题、PR 描述和提交正文都用 [nimo-technical-writing](../../nimo-technical-writing/SKILL.md) 组织，再过一遍 [nimo-unslop](../../nimo-unslop/SKILL.md)。技术写作的规则全部适用，只有主结构分类（教程／操作／参考／解释）不套用于 PR。每个动作用一个词表达，保持必要的语法成分，平实动词够用时不用进行式或名词化修饰。
9. **forge。** 第一次 PR 操作之前解析 forge，之后保持同一选择用于创建、编辑、查看、观察与合并。默认 GitHub CLI（`gh`）；用户配置的当前 forge CLI 能解析该仓库时用它的等价命令，否则留在 `gh` 并记录回退。不要求任何栈管理工具。
10. **尺寸与栈。** 五个窄 PR 优于一个大 PR。栈是 base 分支链：根 PR 指向 trunk；每个子分支 rebase 到父分支的确切 tip，其 PR 的 base 指向父分支。按已解析的 forge 创建子 PR（如 `gh pr create --base <parent-branch>`）；给既有子项改 base（如 `gh pr edit <pr> --base <parent-branch>`）。只有独立工作才从 trunk 开分支。实质性栈工作之前先在 trunk 上 rebase；这类 rebase 使待交付代码发生变化时，旧 Final Verify 失效，回到第 5 步重新验证。
11. **草稿状态。** PR 是 draft 还是 ready 遵守用户当前要求；未指定时默认按 ready 开并在交付中写明。用户要求 ready 而结果开成了 draft 时，按已解析的 forge 标记 ready（`gh pr ready <number>` 或等价命令）并读回确认。引用 PR 状态之前先读回真实状态（`gh pr view <number>` 或等价命令），不引用记忆里的状态。
12. **不自动 babysit。** 开 PR 不启动 [检查或跟进](babysit.md)。贴出 URL，继续构建。先完成当前阶段或整条栈。只有整条栈存在之后用户明确要求，才单独跑一次跟进。每个新 PR 都跟进一次会拖住构建，还把检查额度花在后续波次会重启的提交上。反馈偏离意图时顶回去。
13. **冻结纪律。** Final Verify 之后不再执行可能修改代码的 cleanup，不“顺手修一下”。写 PR 标题或描述时发现代码问题：回到修复阶段，旧 Final Verify 失效，修复后重新收口并重新验证。PR 描述只陈述已验证事实。

## 必要条件与停止

没有推送／PR 授权时仍完成 Final Verify，停在本地可审查交付结果——验证职责不与 PR 授权绑死；已授权不重复索要确认。存在未处理的“处理”项不得创建 PR。Final Verify 之后不得发生改变待交付代码语义的动作；发生了就必须重新验证。创建 PR 不自动进入 babysit，不获得合并权限。草稿／正式状态遵守用户要求；未验证成果不得包装成已验证成果。分支按真实默认分支或明确指定的父分支建立，不硬编码 main。forge 在第一次 PR 操作前解析一次并全程保持同一选择。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-deslop](../../nimo-deslop/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-interrogate](../../nimo-interrogate/SKILL.md)
- [nimo-technical-writing](../../nimo-technical-writing/SKILL.md)
- [nimo-unslop](../../nimo-unslop/SKILL.md)

## 交付

PR URL 与读回的真实状态；返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack opening-a-pr](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/opening-a-pr.md)。
