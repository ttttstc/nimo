# Skill 移植账本：nimo-swarm、nimo-tdd、nimo-unslop、nimo-technical-writing

- 上游来源：pstack（cursor/plugins 仓库，固定 SHA `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`）的 `skills/swarm/SKILL.md`、`skills/tdd/SKILL.md`、`skills/unslop/SKILL.md`、`skills/technical-writing/SKILL.md`。
- 本账本只记录相对上游的有意义适配。纯中文化翻译与统一命名适配不逐条记录，包括：swarm→nimo-swarm、tdd→nimo-tdd、unslop→nimo-unslop、technical-writing→nimo-technical-writing。
- 语义等价要求：上游中所有改变 Agent 决策/执行行为的强约束（MUST/NEVER 级语义）、停止条件、判定信号（覆盖缺必要分片即不完整、失败测试必须因预期原因失败、宁可不加测试也不写坏测试等）、unslop 的 31 条 anti-pattern、technical-writing 的 Diátaxis 四模式完整约束、三层句法规则、review checklist 8 条均已逐条保留等价语义，未压缩。
- 列含义：upstream rule 为上游原始规则；nimo adaptation 为 nimo 版的对应处理；reason 为适配依据；semantic impact 说明适配后行为等价、增强还是降级；verification 为核对方式。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
| --- | --- | --- | --- | --- | --- |
| 4 个 SKILL.md frontmatter | 含 `disable-model-invocation: true`，禁止模型自动调用该 Skill | 仅保留 `name` 与 `description` | Cursor 私有元数据；nimo 基本元数据只依赖 name/description（host-contract.md 3.8） | 无行为语义损失；是否自动触发交由宿主与用户 | check-package 元数据校验通过 |
| nimo-swarm 描述 | 触发入口为 Cursor 斜杠命令 `/swarm`、"swarm this" | 改为自然语言触发条件：用户要求扇出（swarm）、并行覆盖、多工作者竞赛、连环挑战或并行探索 | nimo 无宿主私有斜杠命令入口 | 无；用户显式要求时进入的触发语义等价 | 人工复核 description |
| nimo-swarm 阶段 B 及正文 | 一条消息内以 `subagent_type: generalPurpose`、`environment: "cloud"`、`run_in_background: true` 派发 N 个云端工作者 | 宿主提供的独立子 Agent／独立上下文一次性派发；宿主不支持并行或后台时按委派纪律串行派发、保持各自独立上下文并记录降级；无独立子 Agent 时主 Agent 顺序扮演各工作者并记录降级，不伪造并行与独立性 | Cursor 私有接口宿主无关化（允许适配第 2 条） | 并行不再是硬前提；工作者互相隔离、任务书独立成立、`PASS`/`ISSUES`/`BLOCKED` 报告契约不变；降级被显式记录而非隐藏 | delegation.md"降级与必要条件"条款；人工复核 |
| nimo-swarm 阶段 B | `environment: "local"` 仅当工作者需要访问用户本机上的资源 | 保留等价条件语义：仅当工作者需要访问用户本机资源时，为其选择具备本机访问能力的执行环境 | 云/本地二分是 Cursor 概念；nimo 只保留"本机访问条件"语义 | 无；本机访问需求的判定不变 | 人工复核 |
| nimo-swarm 阶段 B | 工作者从非默认已推送分支起步时传 `cloud_base_branch` | 在工作者的任务合同中写明起始分支 | Cursor 私有参数宿主无关化 | 无；起始分支显式传递的语义不变 | check-package `cursor-private-api` 模式不触发 |
| nimo-swarm 阶段 A | 工作者模型来自 `~/.cursor/rules/pstack-models.mdc` 的 `swarm workers`，缺省 `grok-4.6-fast-xhigh` | 用户明确指定时用指定模型；未指定时用宿主当前模型；模型竞赛（每组不同模型）时预先声明每组的模型（该句保留） | `.cursor` 私有路径与固定模型名禁用；nimo 配置格式不含 model 字段（configuration.md 3.6：模型由宿主和任务指令提供） | 默认模型档位不再隐含；"模型竞赛须预先声明每组的模型"语义保留 | check-package `fixed-model-name` 与 `.cursor` 模式不触发 |
| nimo-swarm 阶段 A | 输出位置缺省 `/tmp/swarm-<slug>/worker-<n>/` | 系统临时目录下 `swarm-<slug>/worker-<n>/`；worktree、分支优先不变 | `/tmp` 是 Unix 路径约定，Windows 宿主应使用系统临时目录 | 无；每工作者独立可写位置的语义不变 | 人工复核 |
| 4 个 SKILL.md | 上游无授权边界段落 | 保留"边界与交付"段（4 个文件均引用 host-contract.md 与 delegation.md）；nimo-technical-writing 另保留"依赖：nimo-unslop"链接 | nimo 授权边界增强（允许适配：增加 nimo 授权边界） | 新增授权约束（不扩大授权、诚实交付），不放松任何上游语义 | check-package 校验引用文件与 nimo-unslop/SKILL.md 存在 |
| nimo-unslop 模式目录 | 31 条 anti-pattern 的检测信号全部为英文引语 | 英文检测信号逐条保留原文；在浮夸拔高、-ing 短语、推销语言、模糊归因、套路转折、AI 高频词、"是"的花哨说法、同义词轮换、虚假范围、破折号、聊天套话、知识截止免责、谄媚语气、填充、对冲、空泛结论、抽象隐喻、删副词、平实用词等条目增补中文平行检测信号；条目数与编号 1-31 与上游一一对应 | nimo 以中文写作为主，仅英文信号对中文文本不可执行；检视要求"可本地化措辞，但要有足够具体的检测信号" | 检测能力增强：英文信号零损失，中文文本获得等价信号；不删除、不泛化任何上游条目 | 人工复核：31 条逐条对应上游编号，英文信号词逐一核对 |
| nimo-technical-writing"声音与仓库细节" | "Apply the **unslop** skill to every doc this skill touches" | 对每份文档应用 nimo-unslop，保留"该 Skill 拥有 slop 模式目录"的职责划分 | 命名适配；依赖显式化为包内链接 | 无 | check-package 名称白名单与相对链接校验 |
| nimo-technical-writing 改写示例 | 英文改前/改后示例加逐层修复说明 | 示例原文保留英文，逐层修复说明译为中文，八处修复点一一对应 | 示例演示的是英文句法修复（被动语态、名词串、only 位置），翻译示例会丢失演示语义 | 无；教学语义完整保留 | 人工复核：八处逐层修复说明与上游一一对应 |
| nimo-technical-writing 描述 | 触发入口含 Cursor 斜杠命令 `/technical-writing` | 改为自然语言触发条件：撰写或评审文档、RFC、README、PR 描述或提交说明时 | nimo 无宿主私有斜杠命令入口 | 无；触发语义等价 | 人工复核 description |
