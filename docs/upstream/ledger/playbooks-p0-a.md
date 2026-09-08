# P0 Playbook 移植账本（playbooks-p0-a）

上游固定版本：pstack/skills/poteto-mode/playbooks @ 93b00b89ef425a9c1bac0d0b317dfc49c930ac99。本表记录 feature（PB01）、bug-fix（PB02）、refactoring（PB04）、perf-issue（PB06）、hillclimb（PB07）、eval（PB12）六个 Playbook 相对 upstream 的每个有意义适配；纯语言翻译不算差异，不记录。

适用于全部六个文件、不逐行重复的共性适配：

- 语言改为中文，全部会改变执行行为的语义（MUST/NEVER/ALWAYS、停止条件、失败分类与恢复规则、判断信号、anti-pattern、evidence/verdict/checkpoint 规则）等价保留，未压缩成口号。
- 命名映射：how→nimo-how、why→nimo-why、architect→nimo-architect（skip 记录格式改为 `nimo-architect skipped: <原因>`）、arena→nimo-arena、interrogate→nimo-interrogate、tdd→nimo-tdd、figure-it-out→nimo-figure-it-out、Comments→nimo-no-comments、"Opening a PR"→链接 nimo 的 opening-a-pr.md（整理并创建 PR）、"Autonomous run playbook"→链接 autonomous-run.md（持续完成一个目标）、"Hillclimb playbook"→链接 hillclimb.md（持续改善一个指标）、各 principle skill→nimo-principle-<名字>。
- 固定模型名（grok-4.6-fast-xhigh、claude-fable-5-1-thinking-max）一律改为"用户配置的 <场景> 模型"。
- Cursor Task 工具派子 Agent 改为宿主独立子 Agent；委派步骤统一附降级规则：宿主无独立子 Agent 时主 Agent 顺序扮演实现者并记录降级，实现与审查分离的语义保留，降级下的自审不称独立审查（适用于 feature §4、bug-fix §3、refactoring §5、perf-issue §3、hillclimb §5）。
- 增加 nimo 授权边界：推送、PR、评论、合并等外部动作受用户当前授权约束；PR 步骤一律"按授权运行"。
- nimo 结构约定：标识行、"执行前读取"（按 upstream 正文引用补充原则链接）、"必要条件与停止"（保留各文件既有 nimo 授权内容并融入 upstream 语义）、公共规则行、"所需 Skill"（按正文实际引用）、"交付"、"来源"行。
- "执行前读取"清单在原摘要版基础上按 upstream 正文新增引用补充了原则链接（如 feature 补 separate-before-serializing-shared-state / laziness-protocol / sequence-verifiable-units；refactoring 补 foundational-thinking 等 6 条；hillclimb 补 guard-the-context-window 等 3 条；bug-fix、perf-issue 补 sequence-verifiable-units）。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
|---|---|---|---|---|---|
| feature.md §4 委派纪律 | "You can spawn a subagent even though you are one; 'the app is small' and 'a subagent cannot spawn one' are both wrong. A subagent forbidden to spawn satisfies this by owning the diff directly with the same review separation; no 'standing by' reply" | 完整保留：你是一个 Agent 也能派子 Agent；两个借口都错；被禁止再派子的子 Agent 亲自持有 diff 并保持同等审查分离；不许"待命中"式回复 | 检视定为 P0 丢失语义 | 等价恢复 | 人工对照 upstream 逐句复核 |
| feature.md §4 arena 逃逸 | "When the implementation admits multiple valid shapes… delegate via the arena skill instead… Mandatory: no skip-with-reason escape, and Laziness Protocol does not override it (the gain is review separation, not lines saved)" | 完整保留：多种有效形状（错误处理、抽象层、测试结构）时必须走 nimo-arena；无 skip-with-reason 逃逸；nimo-principle-laziness-protocol 不覆盖它，收益是审查分离不是省行数 | 检视定为 P0 丢失语义 | 等价恢复 | 人工对照 upstream 逐句复核 |
| feature.md §3 吞吐量检查点 | 四项 todo，"A dimension that genuinely does not apply keeps its item with `n/a: <reason>` rather than being dropped" | 完整保留四项（阻塞的第一步/独立工作流/共享可变状态/最小安全拆分），不适用项保留并标 `n/a: <原因>` | 检视定为 P0 丢失语义 | 等价恢复 | 人工对照 upstream 逐句复核 |
| feature.md §6 提交堆叠 | "Rebase into small, ordered commits; stack follow-ups"（pstack 默认 Graphite 栈） | rebase 成小而有序的本地提交；后续事项堆叠用 Git 原生能力与当前 forge 的 PR 链表达 | Graphite 命令禁用，改用 Git 原生 | 等价（栈语义保留，工具宿主无关化） | 人工复核 |
| feature.md 所需 Skill | upstream 无该段 | 按正文引用列 nimo-how、nimo-architect、nimo-arena、nimo-interrogate、nimo-no-comments、nimo-verify；摘要版原有的 nimo-deslop 移除（由 opening-a-pr Playbook 自带，正文不直接引用） | nimo 结构约定"按正文实际引用" | 无行为损失 | 人工复核 |
| bug-fix.md §1 复现 | "Reproduce it yourself on the matching surface via the control skill (Non-negotiables)" | 亲自在匹配操作面按 nimo-verify 的真实操作面规则复现（不可协商）；"调试/插桩协议让用户来跑不能覆盖本条、先推到控制面极限、复现不了就强制触发"全部保留 | 上游 control skill 是 Cursor 私有 UI 控制 Skill；nimo 的"真实操作面"语义由 nimo-verify 承载 | 等价（都是"在真实操作面由 Agent 亲自驱动"） | 人工复核 |
| bug-fix.md §2 长搜索 | "Drive a long or stubborn hunt with Cursor's `/loop` command" | 用宿主的长任务／循环机制驱动；宿主没有时由主 Agent 自行维持迭代纪律并记录 | /loop 是 Cursor 私有命令 | 降级宿主上无自动循环，改为显式维持并记录 | 人工复核 |
| bug-fix.md §5 测试节奏 | "skip it when the test would be expensive, integration-heavy, or unclear" | 保留跳过条件，并按 nimo-tdd 现行语义补"跳过它改用实际复现证据"（nimo-tdd 第 3 条已有该语义） | 与被引用 Skill 的降级路径对齐 | 增强（跳过时明确证据替代物） | 人工复核 |
| refactoring.md §6 等价检查 | "a smoke run on the matching surface via the relevant control skill" | 匹配操作面上按 nimo-verify 冒烟运行 | 同 bug-fix §1 的 control skill 适配 | 等价 | 人工复核 |
| refactoring.md 必要条件段 | upstream 无对应段落（规则在正文步骤内） | 保留摘要版 nimo 注记"本次 nimo 重建属于 feature / multi-phase-plan，不能假装是纯行为等价重构"，并融入 upstream 停止语义（pin 先行、无 shim、rename 全量清扫、reader load 不降则撤销） | 保留既有 nimo 授权内容 | 增强（仓库自适用示例） | 人工复核 |
| perf-issue.md §1 基线 | "Capture a baseline trace via the matching control skill" | 在匹配操作面按 nimo-verify 的真实操作面规则采集基线 trace | 同 bug-fix §1 的 control skill 适配 | 等价 | 人工复核 |
| hillclimb.md §3 决策日志 | "A `decision.tsv`, one row per attempt: id, hypothesis, change, before, after, delta, tests, verdict (kept or reverted), note" | 按 nimo-show-me-your-work 的 decisions.tsv（经 log.mjs）记录；每行字段语义按 upstream 保留（假设、改动、前值、后值、差值、测试结果、结论、备注） | nimo 复用既有 show-me-your-work 工具链 | 等价（记录内容一致，落盘格式走 nimo 工具） | 人工复核 |
| hillclimb.md §5 worktree | "fan them to parallel subagents, each in its own worktree so they can't collide" | 完整保留 worktree 隔离（Git 原生）；子 Agent 派发按宿主能力并附降级 | worktree 是 Git 原生能力，无需改写 | 等价 | 人工复核 |
| hillclimb.md 所需 Skill | upstream 无该段 | 按正文引用列 nimo-how、nimo-show-me-your-work；摘要版原有的 nimo-verify 移除（正文不引用；测量与回归门禁语义已在冻结 harness 步骤内完整保留） | nimo 结构约定"按正文实际引用" | 无行为损失 | 人工复核 |
| eval.md §6 轨迹来源 | "Read each candidate's local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names this path)" | 读宿主为当前工作区记录的执行轨迹（工具调用与文件访问记录）；宿主不提供轨迹时涉及"实际读取"的评分记不可判定，不用自报顶替 | agent-transcripts/ 是 Cursor 私有目录 | 降级宿主上链条评分不可判定（诚实降级，不自报） | 人工复核 |
| eval.md §6 越界禁令 | "Do not glob across `~/.cursor/projects/*/`; that crosses workspace boundaries and reads private chats from unrelated projects" | 不跨工作区搜索宿主的私有会话存储——会越过工作区边界、读到无关项目的私人对话 | Cursor 私有路径宿主无关化 | 等价（同一禁令泛化到宿主会话存储） | 人工复核 |
| eval.md（新增引用） | 无 | 导语引用 nimo-skill-evaluate（案例定义与运行规则） | nimo 复用原仓库行为契约（见 pstack-coverage.md"另有 Skill 评测"节） | 增强：与既有评测 Skill 的隔离/盲评/启动规格规则显式对齐 | 人工复核 |
| eval.md 必要条件段 | upstream 无对应段落（规则在盲化条款内） | 保留摘要版全部 nimo 语义（固定模型环境、多模型单独标记、盲评不隐藏必要验收要求、轨迹不可见记不可判定），合并重复句；补 upstream 分歧处理语义 | 保留既有 nimo 授权内容并融入 upstream 语义 | 等价 + 增强授权边界 | 人工复核 |
