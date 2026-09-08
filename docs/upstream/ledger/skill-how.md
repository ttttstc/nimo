# nimo-how 移植账本

上游固定版本：pstack/skills/how @ 93b00b89ef425a9c1bac0d0b317dfc49c930ac99。本表记录 nimo-how 相对 upstream 的每个有意义适配；纯语言翻译不算差异，不记录。semantic impact 说明适配后行为等价、增强还是降级；verification 说明核对方式。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
|---|---|---|---|---|---|
| SKILL.md（frontmatter） | 含 `disable-model-invocation: true`，禁止模型自动调用该 Skill | 仅保留 `name` 与 `description`，不声明宿主私有元数据 | 宿主解耦契约：基础元数据只依赖 name/description | Cursor 上“仅手动触发”由包内强制；nimo 的触发与发现交由宿主机制，包内不再强制 | check-package 元数据校验通过；触发行为由各宿主接入文档说明 |
| SKILL.md（Explain 2a/2b/3、Critique 2） | 用 Cursor 私有 Task 工具派发子 Agent，参数 `subagent_type: generalPurpose`、`model`、`readonly: true` | 用宿主提供的独立子 Agent／独立上下文派发；宿主无独立上下文时诚实降级：主 Agent 顺序扮演各角色并明确记录降级；全部角色只读调查，不扩大权限 | Cursor 私有接口宿主无关化（移植适配规则） | 角色职责、提示词契约、只读语义不变；无子 Agent 宿主上失去独立性，降级须显式记录，降级下的评审不称独立审查 | 链接 ../nimo-mode/references/delegation.md 存在；降级语句人工复核 |
| SKILL.md（Explain 2a） | 探索者模型为用户配置的 how-explorer，带固定默认模型名 | 用户配置的模型；未配置时用宿主当前模型 | 不内置固定模型名 | 默认推理档位不再隐含；模型选择由用户／宿主决定 | check-package 固定模型名禁用模式通过 |
| SKILL.md（Explain 2b/3） | 解释者模型为用户配置的 how-explainer，带固定默认模型名 | 用户配置的模型；未配置时用宿主当前模型 | 同上 | 同上 | 同上 |
| SKILL.md（Critique 2） | how-critics 列表带四个固定默认模型，每个模型派一名评审者；"These are minimum reasoning levels. The lead should escalate any model…" | 为用户配置的评审模型列表中每个模型各派一名评审者；未配置时用宿主当前模型派一名；宿主只有单一模型时用同模型独立上下文并报告缺少跨模型多样性；“最低推理档位、值得更深分析时升级”语义保留，升级限于用户配置范围 | 固定模型名禁用；多样性降级规则来自宿主合同 | 单模型宿主上评审仍可运行但缺跨模型多样性，须显式报告而非隐藏 | 降级与升级语句人工复核 |
| SKILL.md（Explain 2a、Critique 2） | "Spawn all explorers in a single message"／"all in a single message"（单消息并行派发） | 一次性并行派发；宿主不支持并行时按委派纪律串行派发，保持独立上下文 | 并行语义依赖 Cursor 消息机制，各宿主能力不一 | 不能并行的宿主上改为串行完成派发；独立性与覆盖面不缩减 | 人工复核 |
| SKILL.md（交叉引用） | "Use why for motivation"、"Same framework as the interrogate skill" | nimo-why、nimo-interrogate | 命名适配 | 无 | check-package 名称白名单通过 |
| SKILL.md（边界与交付） | 无对应段落 | 保留 nimo 增强段：引用宿主合同与委派纪律，声明只读调查不扩大授权、交付证据与未完成项 | nimo 授权边界增强（移植规则要求保留既有结构） | 相比 upstream 增加授权与交付约束，无行为损失 | 相对链接指向真实文件（check-package 校验） |
| references/explorer-prompt.md、explainer-prompt.md | 模板点名 Glob／Grep／Read 工具名 | 改为“宿主的搜索与读取工具”（按文件名找、按符号搜、读实现） | 工具名宿主无关化 | 操作语义不变：先搜索定位、读实际代码、不凭名字猜 | 人工复核 |
