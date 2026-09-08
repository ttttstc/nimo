# nimo-no-comments 与 nimo-interrogate 移植台账

upstream 源：cursor/plugins 仓库 `pstack/skills/no-comments/` 与 `pstack/skills/interrogate/`（固定 SHA `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`）。no-comments 的评审者规则另取自同仓库 `pstack/agents/comment-sicko.md`（upstream SKILL.md 通过预装 Cursor agent 引用它的语义）。目标：`skills/nimo-no-comments/SKILL.md`、`skills/nimo-interrogate/`（SKILL.md + references/ 四个文件，文件名与 upstream 一致）。

本台账记录所有**有意义的差异**——即会改变 Agent 决策/执行行为的适配；纯中文翻译（措辞改写但语义等价）不计入。列含义：

- **artifact**：差异所在的文件与小节。
- **upstream rule**：upstream 的原始规则/表述。
- **nimo adaptation**：nimo 中的对应表述。
- **reason**：适配原因（宿主无关化 / 安全增强 / nimo 包结构）。
- **semantic impact**：对 Agent 行为的语义影响（无 / 低 / 中 / 高，附说明）。
- **verification**：验证该适配被正确落实的方式。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
|---|---|---|---|---|---|
| nimo-no-comments/SKILL.md frontmatter | `disable-model-invocation: true`（仅限用户显式触发） | 删除该键；触发条件写入中文 description（提交前注释清理、检查多余注释、约束编码、根因修复） | nimo 是宿主无关包，包内 Skill 统一只用 name+description | 低：触发方式由"仅手动"变为"描述驱动"，无执行语义损失 | check-package 元数据校验通过；人工复核 description 含触发条件 |
| nimo-no-comments/SKILL.md 步骤 1（Comment Sicko 派发） | 用 Cursor 私有 Task 工具派 `subagent_type: "Comment Sicko"` 预装 agent，"Do not restate its rules"（角色规则在环境里的 agents/comment-sicko.md，SKILL.md 不复述） | 新增"注释评审者角色"一节，把 comment-sicko.md 的完整行为语义（猎物清单、五条例外、清单是唯一缰绳、怀疑即杀、lint/TS suppression 规则、IMPORTANT/do-not-remove 先读附近代码再跑 how/why、只报告不写应用代码、报告格式）内联进 SKILL.md，随派发原样传给独立上下文执行 | nimo 不预装任何评审 agent；独立上下文需要拿到角色规则才能忠实执行（任务适配规则：comment-sicko 适配为"宿主独立上下文中的评审者角色"） | 中：规则语义等价保留（keep/kill 证据规则、`MUST KILL` 标记、重构建议均不变）；差异是规则载体从环境预装文件变为随 Skill 派发 | 人工比对 pstack/agents/comment-sicko.md 逐条核对：例外清单 5 条、suppression 规则、追查后怀疑即杀、"从不写应用代码"、报告字段无遗漏 |
| nimo-no-comments/SKILL.md（comment-sicko 人设） | agent 定义带表演性开场白（"Yes... Ha ha ha... Yes!"）与"deranged comment-hater"人设自述 | 去掉开场白；保留影响行为的人设语义（"对注释抱最强的删除倾向，以删注释为乐，对 workaround 代码严词谴责"） | 开场白是 Cursor agent 的展示惯例，不改变决策；删除倾向影响判定阈值，必须保留 | 无：影响判定的姿态（最强删除倾向、谴责 workaround）等价保留 | 人工复核角色节首段 |
| nimo-no-comments/SKILL.md 步骤 1 + 委派机制 | Cursor Task 工具单次派发即得独立上下文 | 宿主提供的独立子 Agent／独立上下文；宿主无独立上下文时诚实降级为主 Agent 亲自执行评审者角色，明确记录降级，降级下的评审不称独立审查 | Cursor 私有接口宿主无关化（任务适配规则） | 中：无子 Agent 宿主上失去独立性，降级必须显式记录，不得冒称独立审查 | 链接 ../nimo-mode/references/delegation.md 存在（check-package 校验）；降级语句人工复核 |
| nimo-no-comments/SKILL.md（角色节 + 步骤 2） | 评审者与主 Agent 用 `/how`、`/why` 斜杠命令验证符号 | 改为运行 nimo-how、nimo-why Skill | Cursor 斜杠命令宿主无关化 | 无：验证时机与对象不变（薄 kill/keep 接受前、主张不显然时） | check-package 名称白名单通过；人工核对两处引用 |
| nimo-no-comments/SKILL.md 步骤 2 末句 | "fail `/no-comments`"（Cursor 斜杠命令宣告失败） | "宣告本次 nimo-no-comments 运行失败"，并把问题报告为 open | Cursor 命令语法宿主无关化 | 无：两拒即失败的终止语义不变 | 人工复核 |
| nimo-no-comments/SKILL.md 步骤 3 | "run `/architect` once for the accepted set and surrounding code. Stop at the sketch." | 对被接受集合与周边代码运行一次 nimo-architect，停在草图——nimo-architect 出形状，步骤 4 实现 | Cursor 斜杠命令宿主无关化 | 无：单次、停在草图的分工语义不变 | 人工核对与 ../nimo-architect/SKILL.md 的链接有效 |
| nimo-no-comments/SKILL.md 边界与交付 | 无对应段落 | 保留 nimo 包统一段（链接宿主合同与委派纪律），并新增授权边界："本 Skill 修改代码仅限范围内的注释删除与被接受的修复，不自动扩大范围" | nimo 授权边界增强（任务要求的适配项：no-comments 修改代码但不得自动扩大 scope） | 增量收紧：upstream 步骤 4 已有"不授权扩大边界"，边界段对整个 Skill 重复申明并扩展到全部步骤 | check-package 校验两个链接指向真实文件；人工复核新增句 |
| nimo-interrogate/SKILL.md frontmatter | `disable-model-invocation: true` | 删除该键；触发条件（interrogate／对抗性评审／多模型评审／挑战／压力测试／找盲点／拆解等触发词）写入中文 description | 同 no-comments | 低：同上 | check-package 元数据校验通过 |
| nimo-interrogate/SKILL.md 步骤 3（评审者模型） | 从 Cursor 私有配置文件读取 `interrogate reviewers` 模型列表，每条目一名评审者，标签 A/B/C/D 按条目数伸缩；无配置时用一张绑定四个固定模型名的默认表（Reviewer A–D） | 用户配置的评审模型列表，每模型一名评审者，标签按数量编号；用户未配置时用宿主当前模型派一名；宿主只有一种模型时可用同模型独立上下文但必须报告缺少跨模型多样性，此时"跨模型一致"信号不可用（委派机制节） | Cursor 私有配置路径宿主无关化；固定模型名禁用；降级规则来自宿主合同 | 中：不再内置固定默认多模型；单模型宿主上评审仍可运行但缺跨模型多样性，必须显式报告而非隐藏，共识信号降级说明保留 | check-package 固定模型名扫描通过；人工复核降级条款 |
| nimo-interrogate/SKILL.md 步骤 3（派发参数） | Task 工具参数：`subagent_type: generalPurpose`、`model`、`readonly: true`；"Launch all reviewers in a single message" | 宿主提供的独立子 Agent／独立上下文，只读授权；一次性并行派发，宿主不支持并行时按委派纪律串行派发，保持各自独立上下文 | Cursor 私有接口宿主无关化 | 中：只读语义不变；并行度取决于宿主，串行降级时独立性不缩减 | 人工复核步骤 3 与委派机制节 |
| nimo-interrogate/SKILL.md 步骤 3（模型回退） | slug 被拒时：读 Task 工具错误信息中的合法 slug，选最近似（优先同家族最高推理档），派发并另开一个 PR 更新配置值或默认表，不阻塞评审；配置值为 `inherit-parent`/`auto` 时省略 model，不当坏 slug | 配置的模型在宿主上不可用时：从宿主实际可用模型里选最接近的等价物（优先同家族中推理档位更高者）派发，报告该替换并建议用户更新配置，不阻塞评审；配置值为"继承宿主模型"之类语义时不单独指定模型直接用宿主当前模型，不进入回退 | Task 工具错误信息与"另开 PR 更新默认表"是 Cursor 私有机制；nimo 无固定默认表可更新，且不自动开 PR | 低：回退决策（最接近等价、优先高档位、不阻塞）与"继承宿主模型"语义等价保留；差异仅是把"自动开 PR 改配置"弱化为"报告并建议用户更新配置" | 人工复核步骤 3 回退段 |
| nimo-interrogate/SKILL.md 边界与交付 | 无对应段落；正文仅有交付物是综合裁决、"Do NOT auto-apply changes" | 保留 nimo 包统一段并追加"只读评审，不自动应用修改" | nimo 授权边界增强（任务要求的适配项：interrogate 只读评审） | 增量收紧：评审者只读授权 + 主 Agent 不自动应用，双向申明 | check-package 校验两个链接指向真实文件；人工复核新增句 |
| nimo-interrogate/references/rubric.md（根因 vs 症状） | "Use the tools available to you (Read, Grep, Glob) to explore"（点名 Cursor 工具） | "用你可用的工具去探索（按文件名找、按符号搜、读实现）" | 工具名宿主无关化（与 nimo-how 移植同一处理） | 无：探索动作语义不变 | 人工复核 |

## 未计入台账的差异（纯翻译/命名）

- 全文中文改写；upstream 的结构性 token（`MUST KILL`、`critical` | `warning` | `nit`、`{INTENT}`/`{DIFF_OR_FILES}`/`{RUBRIC_CONTENTS}`/`{CODE_QUALITY_CONTENTS}` 占位符、`eslint-disable`/`@ts-ignore`/`@ts-expect-error`、`do not remove` 等约束注释原句）保留原文。
- `git diff main...HEAD` 命令原样保留（宿主无关）。
- code-quality-review.md、lead-judgment.md、reviewer-prompt.md 三个 reference 为纯翻译，无行为适配（维度 0–7、批准门槛、四类过滤原则、裁决校准、严重度定义、好发现/坏发现标准、输出模板逐条等价）。
- interrogate 输出格式中 "Reviewer [label]: [model name]" 的模型列，在 nimo 中可为实际模型名或降级说明（"宿主当前模型""同模型独立上下文"），是模型配置适配的自然结果，不单独计行。
- 步骤 2 的意图陈述、步骤 4 的共识/单模型/去重/分歧综合、步骤 5 的负责人裁决（非投票器）、输出格式的意图/评审者/处理/考虑/记录/驳回/一致性图谱结构，均为纯翻译，语义逐条等价保留。
