# skill-why 移植台账（nimo-why）

upstream 源：cursor/plugins 仓库 `pstack/skills/why/`（固定 SHA `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`）。目标：`skills/nimo-why/`（SKILL.md + references/ 全量，文件名与 upstream 一致）。

本台账记录所有**有意义的差异**——即会改变 Agent 决策/执行行为的适配；纯中文翻译（措辞改写但语义等价）不计入。列含义：

- **artifact**：差异所在的文件与小节。
- **upstream rule**：upstream 的原始规则/表述。
- **nimo adaptation**：nimo-why 中的对应表述。
- **reason**：适配原因（宿主无关化 / 安全增强 / nimo 包结构）。
- **semantic impact**：对 Agent 行为的语义影响（无 / 低 / 中 / 高，附说明）。
- **verification**：验证该适配被正确落实的方式。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
|---|---|---|---|---|---|
| SKILL.md frontmatter | `disable-model-invocation: true`（仅限用户显式触发，模型不可自动调用） | 删除该键；触发条件全部写入中文 description（含七类证据机制与 nimo-how 分流） | nimo 是宿主无关包，各宿主对调用控制的机制不同；包内其他 Skill 均只用 name+description | 低：触发方式由"仅手动"变为"描述驱动"，与包内其他 Skill 一致；无执行语义损失 | 检查 frontmatter 仅有 name/description；人工复核 description 含触发条件 |
| SKILL.md 第 3 步「发现」 | 从 Cursor 环境列出可用 MCP：用 available-tools map，否则检查 Cursor 暴露的 `mcps/` 目录 | 枚举当前宿主在运行时提供的连接器/工具（MCP 或等价接口）；宿主缺某类连接器时把该类别记为缺口（"该类别在本环境不可搜索"），不跳过、不虚构 | Cursor 私有发现接口不可用于宿主无关包 | 无：发现、映射七类、缺口语义全部等价保留 | check-package 禁止 `.cursor` 引用；人工复核"发现"小节 |
| SKILL.md 第 3 步「派发要求」+ 第 4 步「汇总」 | `subagent_type: generalPurpose`；`readonly: false` 且明令禁止 readonly/Ask 模式（会剥离 MCP 访问）；"调查者不写入是姿态不是沙箱"；"汇总者抽查引用需要 MCP 访问" | 改为：用宿主提供的独立子 Agent / 独立上下文能力派发；保留"不得在剥离工具访问的受限模式下运行""不写入是纪律姿态不是沙箱""汇总者抽查引用可能需要连接器访问"的语义；新增：宿主无独立上下文能力时诚实降级为主 Agent 按类别顺序执行，并在"查询来源"中显式记录该降级 | Cursor 私有子 Agent 参数改为宿主无关能力描述 | 中：并行度取决于宿主能力；降级若不记录会让覆盖图失真，故强制记录降级 | 人工复核第 3/4 步的降级条款与受限模式禁令 |
| SKILL.md 第 3/4 步 模型 | 固定默认模型名（调查者与汇总者各指定一个具体型号） | "用户配置的 why-investigators / why-synthesizer 模型" | 宿主无关包不携带固定模型名 | 无：仅命名适配，模型选择权交给用户配置 | check-package 固定模型名扫描通过 |
| SKILL.md 第 3 步「授权边界」+「边界与交付」+ investigator-prompt.md「授权边界」 | 无显式授权条款（仅各 sources 手册有"私有内容/访问受限记为缺口"） | 新增：只读取用户授权的数据源；不扫描其他项目的私人会话或无关空间；遵守宿主权限模式 | nimo 安全边界要求（任务明确要求的适配项） | 增量收紧：缩小可搜索范围；证据方法与缺口语义不变 | 人工复核 SKILL.md 两处与 investigator-prompt.md 的授权段落 |
| SKILL.md「边界与交付」 | 无此段落 | 保留 nimo 包统一的"边界与交付"段（链接 ../nimo-mode/references/host-contract.md 与 ../nimo-mode/references/delegation.md），并追加授权数据源一句 | nimo 包级交付合同；任务要求保留既有 nimo 增强结构 | 增量：追加交付纪律，不改 upstream 主体结构 | check-package missing-reference 校验两个链接指向真实文件 |
| references/sources/slack.md「怎么搜」 | "Check which Slack MCP is available and inspect its tool schema first. It may require `mcp_auth`. If authentication fails, stop and report the gap." | "先确认当前宿主提供的是哪个 Slack 连接器，检查它的工具形态与查询词汇；连接器需要认证而认证失败时，停下并报告缺口"；并追加"只搜索用户授权的工作区与频道" | `mcp_auth` 是 Cursor 私有认证机制，改为宿主无关表述 | 无：认证失败→停下并报告缺口的行为等价；授权范围是增量收紧 | 人工复核 slack.md 开头段 |
| references/sources/*.md 各「Use the X MCP.」+ incident-postmortem.md 来源要点 | 直接指示"使用 X MCP"；事故追查要点以产品名开头（"Notion: …""Linear: …"） | "使用 X 连接器（工具名以 X MCP 为例）"；事故要点改为"证据类别（如产品名）：…"，产品名降为类别示例 | 宿主无关化的同时完整保留各产品的查询词汇、查询模式与坑清单 | 无：类别→连接器映射为主轴，"该类别查什么、怎么查、有什么坑"语义完整保留 | 人工逐文件比对 upstream sources/（重点：databricks/datadog/sentry 的工具名、调查模式与坑清单无遗漏） |
| SKILL.md「何时跳过某个调查者」+ synthesizer-prompt.md「查询来源」 | "No MCP is available for that category in this environment"（缺口而非选择） | "该类别在本环境没有可用连接器"（保留"缺口，不是选择"与两条例外门槛的语义不变） | 术语宿主无关化 | 无：跳过条件、书面理由、缺口语义等价 | 人工复核"何时跳过某个调查者"与查询来源示例行 |

## 未计入台账的差异（纯翻译/命名）

- 全文中文改写；`how`/`why` Skill 名改为 `nimo-how`/`nimo-why`。
- upsteam 措辞指南中的英文置信词（because / appears to 等）保留原文并附中文对应词，供两种输出语言使用。
- git/`gh`/`rg` 命令示例原样保留（宿主无关）。
