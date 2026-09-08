# Playbook 移植账本（P0 批次 C：autonomous-run、orchestrate）

上游固定版本：pstack/skills/poteto-mode/playbooks @ 93b00b89ef425a9c1bac0d0b317dfc49c930ac99。本表记录 PB17 autonomous-run 与 PB18 orchestrate 相对 upstream 的每个有意义适配；纯语言翻译不算差异，不记录。semantic impact 说明适配后行为等价、增强还是降级；verification 说明核对方式。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
|---|---|---|---|---|---|
| autonomous-run.md 步骤 2 | 唤醒机制使用 Cursor 内置 `/loop` 命令 | 宿主提供原生等待／唤醒（事件监听、定时器、自动化）时才使用；宿主无后台／定时能力时明确仅当前会话运行、会话结束即停止、结束前保存恢复点并报告限制 | Cursor 私有接口宿主无关化（宿主合同"持续运行"节） | 有能力宿主语义等价；无能力宿主诚实降级，不伪装后台 | 人工对照 host-contract.md 持续运行节 |
| autonomous-run.md 步骤 2 | 事件监视由 watcher subagent 承担，长定时心跳兜底 | 宿主支持后台子 Agent／事件监听时设事件监视者＋长心跳兜底；无此能力时并入当前会话推进 | 同上 | 同上 | 同上 |
| autonomous-run.md 必要条件与停止 | 无对应表述 | 增加宿主合同持续运行纪律：唤醒后先核实目标是否已停止／取消／完成；每个目标只有一个有效跟进者，不叠加多套轮询 | nimo 增强（host-contract 持续运行节） | 增强，无 upstream 行为损失 | 人工对照 host-contract.md |
| autonomous-run.md 步骤 4 | 中途发现 "via poteto-mode" 自行修复 | 按 nimo-mode 路由自行修复 | 命名适配（poteto-mode→nimo-mode） | 等价 | check-package 名称白名单通过 |
| autonomous-run.md 步骤 4 | 不把可逆工作留给用户、不使用 AskQuestion 工具 | 不把可逆决策推给用户，也不用宿主提问机制阻塞等待回答 | AskQuestion 为 Cursor 私有工具 | 等价（与 never-block-on-the-human 原则一致） | 人工复核 |
| autonomous-run.md 步骤 4 / 交付 | 题外修复放单独 PR；无授权表述 | 保留单独 PR 语义，并增加：push、评论、合并、rebase 等外部动作受用户当前授权约束 | nimo 授权边界增强 | 相比 upstream 增加授权约束，无行为损失 | 人工复核交付段 |
| autonomous-run.md 交付 | Reply＝退出条件、迭代数、落地、丢弃、最终谓词状态 | 与 nimo 既有交付（产物版本、实际验证和证据、未完成项及跳过原因、授权边界）合并 | 保留 nimo 结构约定 | 增强（两份契约都保留） | 人工复核 |
| orchestrate.md 角色 | 执行者启动／恢复／清收只经 Task 工具；"spawn the next wave in one message" | 经宿主原生委派机制（按委派纪律与宿主合同），执行者＝独立子 Agent／独立上下文；一次性启动下一波，宿主不支持并行时按委派纪律串行派发 | Cursor 私有接口宿主无关化 | 等价；无并行宿主上扇出变串行，覆盖面不缩减 | 人工对照 delegation.md |
| orchestrate.md 角色 | 执行者默认 `environment: "cloud"`；本机例外为 cursor-team-kit 的 control-ui/control-cli 验证、agent-transcripts/ 本地记录、模拟器与本地 IDE、本机认证；云端执行者读不到本地 store | 默认宿主独立执行环境；例外改为：真实 UI／CLI 运行时验证、本地会话记录、模拟器与本地 IDE 状态、本机认证；独立执行环境读不到本地任务记录，简报内联或指向仓库路径；宿主无独立执行者时按宿主合同降级（不伪造协调者／执行者分离） | 私有接口与工具名宿主无关化 | 等价；无独立执行环境宿主上明确受阻或降级 | 人工对照 host-contract.md 降级节 |
| orchestrate.md 角色 | 单元验证者运行在与执行者不同的 model family | 尽量运行在用户配置的不同模型上；单一模型宿主用同模型独立上下文并报告缺少跨模型多样性 | 固定模型策略宿主无关化 | 等价／单模型宿主降级并显式报告 | 人工对照 host-contract.md |
| orchestrate.md 记录布局 | `orchestrate/<project-slug>/` 下 preferences.md、overview.md、units.tsv、frontier.json、ledger.tsv、inbox/、gates.md、decisions.tsv、status.md，经 `bun scripts/orch/orch.ts`（写作 orch）记账 | 任务目录 `<task>/program/`：program.json（units／verifications／frontier／gates／owners）＋ standing-orders.md ＋ inbox/ ＋ decisions.tsv；status 为派生视图；记账经 state.mjs（init／read／update／inbox-add／inbox-drain／status），规范 JSON 不经工具可读 | nimo 本地工具契约（tools.md 3.9）；Bun／TS 运行时不作为前提 | 记账语义等价（one-writer、事实发布、读取时聚合、状态派生、append 不整体重写全部保留）；文件形态合并为单一 JSON，命令面收窄为 tools.md 定义的操作 | 人工对照 tools.md state.mjs 节 |
| orchestrate.md 记录布局 | gates.md 门禁记录 "question, options, default on no answer" | gates 登记问题、选项、状态；按 nimo 工具契约不带超时自动批准，无回答时门禁保持开放并绕开它路由工作 | tools.md／checkpoints.md 明确无超时自动批准 | 轻微收紧：无回答不再隐式取默认值，改由用户后续裁决 | 人工对照 tools.md gates 字段说明 |
| orchestrate.md 链安全 | frontier 从 `gt` 重算（gt tracking 为权威）；每链一个栈主可跑 `gt`；restack 在云端跑（本机 restack 会拖垮笔记本） | 用当前 forge（GitHub 等）＋ Git 原生：从明确目标列表和平台实际 base/head 关系重算，禁止分支名排序推断，拓扑修改前后更新 generation；大规模 restack 放独立执行环境，无独立环境时栈主本机串行执行并控制规模 | Graphite／gt 命令不在 nimo 工具面 | 等价（链事实来源从 gt 元数据改为平台事实＋Git 原生）；无独立环境宿主上 restack 规模受本机能力约束 | 人工对照 tools.md PR 链节 |
| orchestrate.md 队列与清收 | 前沿监视者 "arm it via the loop skill, with a long heartbeat fallback" | 按 autonomous-run 的唤醒机制设监视，长时间隔心跳兜底 | loop skill 为 pstack／Cursor 机制 | 等价 | 人工对照 autonomous-run.md 步骤 2 |
| orchestrate.md 存活与失败 | Cursor 重启恢复：本地 agent 死、云端工作活；store 锁自动清除，orch 替换持有进程已消失的锁 | 宿主会话中断恢复：已外部化工作（已推送分支、台账行、平台 PR）存活，按 PR／分支重挂；锁回收收紧为仅当能证明持有进程已结束时才自动回收，否则交由当前所有者核实 | tools.md 锁规则比 upstream 更保守 | 恢复语义等价；锁回收更保守（宁可报告占用不误清） | 人工对照 tools.md 锁规则 |
| orchestrate.md 必要条件 | 无对应表述（隐含常驻协调 chat 与 Cursor 云端执行者） | 增加声明：不存在独立 nimo 调度进程，协调随会话进行、跨会话靠持久记录恢复，宿主提供 event／timer／automation 时才可后台运行；宿主无独立执行者时不伪造协调者／执行者分离 | nimo 诚实降级增强（宿主合同） | 相比 upstream 增加运行边界声明，无行为损失 | 人工对照 host-contract.md |
| orchestrate.md 必要条件 / 交付 | 无对应表述 | 增加授权边界：push、评论、合并、rebase 等外部动作受用户当前授权约束 | nimo 授权边界增强 | 增强 | 人工复核 |
| orchestrate.md 交叉引用 | the arena skill、figure-it-out、sequence-verifiable-units 等技能名与 `playbooks/babysit.md` | nimo-arena、nimo-figure-it-out、nimo-principle-sequence-verifiable-units 等命名适配；babysit Playbook 名保持不变 | 命名适配 | 等价 | check-package 名称白名单与相对链接校验通过 |
