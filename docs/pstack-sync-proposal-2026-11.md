# pstack → nimo 能力同步方案（2026-11）

上游：`https://github.com/cursor/plugins/tree/main/pstack`
本仓：`D:\AI\workspace\nimo`（`main`，HEAD `11618e4`）
分析基线：上游 `6b03002`（2026-11-06）

本文是**实施方案**，不是清单。每个条目都带目标路径、要写的内容骨架、注册触点、验收命令和风险。四份支撑子报告在 `.analysis/`，行号级证据在那里，本文只保留判断与动作。

---

## 0 一页结论

### 0.1 三个数字

| 数字 | 含义 |
|---|---|
| **80** | `f5bdd68`（nimo 声明的同步基线，2026-09-10）之后，触及 pstack 且非 statechart 的上游提交数 |
| **16 + 1** | 上游有、nimo 完全没有对应物的能力：16 个 task skill + 1 条原则 |
| **4** | 其中真正值得动代码的件数。其余是「并入现有文件」「只搬一个 reference」「不移植」 |

### 0.2 五个判断

**① nimo 有 provenance，但没有「同步」这个动作。**
62 个 Markdown 文件底部有 `来源：[pstack …](.../blob/<sha>/...)` 链接，记录自己取自哪个上游 revision。问题在分布：**`93b00b8` ×48、`f5bdd68` ×8、`23e4138` ×3、`9511e60` ×1、`a586282` ×1、`4dd1d05` ×1**——48 个文件仍钉在最早的基线上，只有 `statechart` 一个跟到了基线之后。

更麻烦的是两个入口 skill：`nimo-mode` 与 `nimo-setup` **没有任何来源行**，而它们分别派生自 `poteto-mode` 和 `setup-pstack`。50 个 SKILL.md 里有 11 个无引用，其中 9 个是 nimo 自研（`configure-nimo`、`deslop`、`grilling`、`inspect`、`knowledge-audit`、`knowledge-maintain`、`skill-author`、`skill-evaluate`、`verify`），另外 2 个正是这两个入口。

而且这些 SHA 只是散文里的链接：没有任何脚本能回答「这个文件自它引用的 SHA 以来被上游改过几次」。**provenance 记录了历史，却没有制造同步压力。** 两个月的落后不是懒，是结构问题。

**② 上游有 40% 的内容对 nimo 是毒，不能成批同步。**
固定模型名（`grok-4.7-xhigh-fast`、`claude-opus-5-5-xhigh`）、`subagent_type: "poteto-agent"`、`Task` 参数、`/loop`、`$HOME/.cursor/projects/*/agent-transcripts`、`bun` 自举、`commander` 依赖——这些在 `references/host-contract.md:3` 和 `check-package.mjs` 的 `FORBIDDEN_EXECUTION_PATTERNS` 里是明令禁止的。上游同期还有 11 个提交只改这些（`df58112`、`70b2dc8`、`889ec4b`、`5bf2b15`、`12d587d`、`b42effe`…），**整个线程跳过**。这意味着「成批 merge」这条路走不通，只能逐项移植。

**③ 真正缺的只有 4 件，其余要么已有、要么不该有。**

| 真缺 | 为什么算缺 |
|---|---|
| `blast-radius` | `playbooks/opening-a-pr.md:27` 已在要求作者写「为什么这个改动安全」，而 nimo 没有任何 skill 教怎么证。要求存在、方法不存在 |
| `principle-explain-the-number` | 23 条原则里没有一条管「你测出来的这个数字能不能信」。而 `perf-issue` / `hillclimb` / `eval` 三个 playbook 都在产出数字 |
| `ketchup` | 长时/无人值守跑完后「按用户视角把他错过的讲清楚」没有规定动作。`autopilot-*` 只说「报告」，没说报告要让用户能立刻做决定 |
| `review-triage.md` 的正文 | `playbooks/babysit.md:33` 已经写死「第三次之后倾向驳回」，但 `references/review-triage.md` 只有 3 行（492 B）。**规则指向一份没有内容的文件** |

其余 12 项上游能力，nimo 要么已有等价物（`nimo-verify`、`nimo-interrogate`、`nimo-how`、`nimo-why`、`nimo-no-comments`、`delegation.md`），要么是宿主机制的包装（`agents/`、`benny`、`make-bot-ui`、`plugin.json`），要么只值得当一份 reference 而不是一个 skill（`benchmark-checklist`、`typescript-best-practices`、`formal-verification` 两件）。

**④ 有一个已经在流血、零成本的缺陷：文档说 48，断言是 50。**
`integrations/README.md:5` 与五个 `integrations/*/README.md:3` 都写「相同的 48 个 Skill」，而 `check-package.mjs:110` 和 `install.mjs:110` 强制 50。这是当前唯一一处「文档与强制断言直接矛盾」。修它零风险，且它正好证明第五个判断。

**⑤ nimo 不缺内容，缺一条不会漂的路径。**
`README.md` 341 行，已经有安装、24 个 playbook 表、50 个 skill 表、23 条原则表、知识飞轮。缺的是：一次完整首跑轨迹、场景配方、坑、长时运行契约、「这个活该配多少设计」。而上游 `docs/guide/` 11 篇 92 KB 正是这个。但 `install.mjs:109-127` 只发 `skills/**` + `VERSION`，`check-package.mjs:300` 只校验 `skills/` 和 `integrations/`——**手册若放 `docs/`，既到不了用户手上，也不会被任何检查发现**。落点必须是 `skills/nimo-mode/references/guide/`。

### 0.3 三批做什么

| 批次 | 内容 | 规模 | 收益 |
|---|---|---|---|
| **第一批（一周内，零风险）** | 修 48→50 六处；`review-triage.md` 写实；三条回复级规则；`explain-the-number` 原则叶；`typescript.md` reference；`verification-maintain` 补 5 行 | 6 项，5 项 S | 消掉两处「规则指向空文件」、补上原则层唯一的洞、修掉唯一一处文档自相矛盾 |
| **第二批（两到三周）** | `nimo-blast-radius` 新目录；`measurement-review.md`；formal verification 两份 reference；手册最小心脏 3 页 + 防漂移挂钩 | 4 项，1 个新目录 | 补上「证明改动安全」与「数字可信」两个硬缺口；手册开始随安装到达 |
| **第三批（观察后决定）** | `nimo-ketchup`、`nimo-recall`、`repro-discipline.md`、`audit-worktrees` 扩展、`check-plan` 测试 | 5 项 | 长时运行的可用性；工具面补强 |
| **不做** | `agents/`、`benny` 端到端、`plugin.json`、`make-bot-ui`、queued-stack 推进机、`ketchup-video` 渲染、`poteto-help` 独立目录 | — | 见 §5 |

---

## 1 基准事实

### 1.1 nimo 有三个不同的基线，没有一个是"当前上游"

| 常量 | SHA | 日期 | 覆盖什么 |
|---|---|---|---|
| `LEGACY_UPSTREAM_SHA` | `93b00b8` | — | 早期一批 skill（多数原则、为何、how 等） |
| `CURRENT_UPSTREAM_SHA` | `f5bdd68` | 2026-09-10 | 「当前上游」的通用基线 |
| `PROCESS_SYNC_UPSTREAM_SHA` | `23e4138` | 2026-10-03 | `autopilot-full` / `autopilot-stack` / `opening-a-pr` |
| `CORRECT_SKILL_UPSTREAM_SHA` | `9511e60` | 2026-10-03 | `correct` |
| `ARCHITECT_FLAGS_UPSTREAM_SHA` | `a586282` | 2026-10-03 | `architect` 反错误设计 |
| 上游 HEAD | `6b03002` | 2026-11-06 | — |

`poteto-mode` 自身最后一次变动是 `c742dd6`（2026-10-27，"make Orchestrate agentic and delete the orch scripts"）。自 `93b00b8` 起，触 `poteto-mode` 的上游提交 **29 个**，累计 33 文件 **+740 / −3154**（其中 −2819 是上游自己删掉的 `scripts/orch/*`）。

### 1.2 数量对照

| 维度 | pstack | nimo | 差异 |
|---|---|---|---|
| skill 总数 | 58 | 50 | −8 |
| 非原则 skill | 34 | 27 | −7（16 个上游项无对应物，但 nimo 另有 9 个自研项） |
| 原则 | 24 | 23 | −1（`explain-the-number`） |
| playbook | 23 | 24 | **+1**（nimo 的 `codebase-health`，上游无对应物） |

nimo 自研、上游没有的 9 个：`configure-nimo`、`nimo-deslop`、`nimo-grilling`、`nimo-inspect`、`nimo-knowledge-audit`、`nimo-knowledge-maintain`、`nimo-skill-author`、`nimo-skill-evaluate`、`nimo-verify`。
已完整映射、文件级一致的 18 个（除 statechart 外每个只差 1 个文件，且多为我们自己加的许可证/包装）：`architect`、`arena`、`correct`、`figure-it-out`、`how`、`interrogate`、`mode`、`no-comments`、`setup`、`show-me-your-work`、`statechart`、`swarm`、`tdd`、`technical-writing`、`unslop`、`verification-create`、`verification-maintain`、`why`。

### 1.3 statechart 不是缺口

`skills/nimo-statechart` 与上游结构完全一致（pipeline、backends×4、frontends×9、passes×8、test 全套含 TLC corpus + `ConfigOracle.java`）。CRLF 归一后只剩 6 个文件有内容差异（`frontends/messages.ts`、`run.ts`、`statechart.ts`、`cli.test.ts`、`messages.test.ts`、`SKILL.md`），且 `SKILL.md` 是完整中文化 + 引用 `4dd1d05` + MIT 声明。

> **方法教训（要写进贡献指南）**：跨平台比较仓库文件必须用 CRLF 归一后的哈希。直接用 MD5 会让 Windows 检出把每个文件都报成「已修改」（statechart 曾因此误报 407 个文件全变）。

### 1.4 根因诊断：为什么两个月没人发现

**provenance 是有的，而且是逐文件的。** `skills/` 下 144 个 Markdown 里有 62 个带 `来源：[pstack …](https://github.com/cursor/plugins/blob/<sha>/…)` 行。问题是它只记录了**历史**，没有制造**压力**：

| SHA | 引用它的文件数 | 说明 |
|---|---|---|
| `93b00b8` | 48 | 最早的基线，占了绝大多数 |
| `f5bdd68` | 8 | 「当前上游」，2026-09-10 |
| `23e4138` | 3 | 三个流程 playbook |
| `9511e60` / `a586282` / `4dd1d05` | 各 1 | 三次 cherry-pick 的孤证 |

也就是说：**只有 1 个文件（`statechart`）跟到了基线之后的上游 revision**，其余 61 个引用全部停在 9 月及更早。而上游在 `f5bdd68` 之后又走了 80 个非 statechart 提交。

| 缺口 | 证据 | 后果 |
|---|---|---|
| SHA 是散文里的链接，不是机器可读的元数据 | 62 处 `来源：` 行；无脚本解析 | 没人能回答「这个文件自其引用 SHA 以来被上游改过几次」 |
| 两个入口 skill 没有来源行 | `nimo-mode/SKILL.md`、`nimo-setup/SKILL.md`（分别派生自 `poteto-mode`、`setup-pstack`）；50 个 SKILL.md 中 11 个无引用，其余 9 个是 nimo 自研 | 最重要的两个文件恰好是「不知道取自哪一版」的 |
| `docs/` 完全不在包校验范围 | `check-package.mjs:300-302` 的 `packageFiles()` 只扫 `skills` 与 `integrations` | 文档漂移（48 vs 50）无任何检查能发现 |
| `check-package.mjs` 被 `run.mjs` 排除 | `tests/run.mjs:18`，只被 `tests/fidelity/inspector-contract.test.mjs:14` 以读文本方式间接引用 | 「改包结构必须先跑它」只活在人的记忆里 |
| 同步靠 cherry-pick | `c1143ec` 一次性移植 correct + architect + process rules 三批 | 每批只覆盖被点名的文件，共享文件的后续改动全丢 |

**所以 Phase 3 的防漂移挂钩要做的不止是「扫 docs」**：真正需要的是一个小脚本（纯 Node ESM、零依赖），读每个 `来源：` 行，解析出 `sha` + 上游路径，`git log --oneline <sha>..HEAD -- <path>` 数出落后提交数，输出一张「哪些文件落后几版」的表。这是 nimo 目前完全没有、上游也没有的能力——上游的 `scripts/check-pstack-docs.mjs` 只校验文档与树一致，不校验**版本落后**。


---

## 2 能力缺口全景

判定口径：
- **PORT**＝新建目录，进 `TASK_SKILLS` 或 `PRINCIPLE_NAMES`，走完整注册面
- **MERGE**＝不建目录，内容并入现有文件（零或近乎零注册）
- **SKIP**＝不移植，理由见 §5

### 2.1 上游独有技能（16 + 1）

| # | 上游项 | 它真正提供的 | nimo 现状 | 判定 | 落点 | effort |
|---|---|---|---|---|---|---|
| 1 | `blast-radius` | 改一处会崩哪里的**证伪**流程：读调用链不是为了理解而是为了找出反例；列「会受影响但没人测」的面 | 无。`opening-a-pr.md:27` 已在要求「为什么安全」 | **PORT** | `skills/nimo-blast-radius/` | M |
| 2 | `principle-explain-the-number` | 度量前先写决策、问「为什么不是两倍」、从 profile 点名 limiter、列出它还可能测了什么 | 23 条原则无一条管度量 | **PORT** | `skills/nimo-principle-explain-the-number/` | S |
| 3 | `ketchup` | 「用户离开后回来」的同步：按用户视角、平实语言、小图、**逐条列出等他拍板的决定**（凑字数不许砍条目） | 只有 `autopilot-*` 的「报告」，无「可决策同步」 | **PORT**（第三批） | `skills/nimo-ketchup/` | M |
| 4 | `recall` | 从会话历史 + 活状态 + 共享记录重建「当前状态简报」 | `session-pickup.md` 只覆盖「接管别人进行中的工作」 | **PORT**（第三批） | `skills/nimo-recall/` | M |
| 5 | `teach` | 同时跑 how + why，织成一份平实解释；保留 why 的置信度语言 | `nimo-how`（源码依据的理解）/ `nimo-why`（七类证据）各自独立，无「合成一份讲解」 | **PORT**（缓） | `skills/nimo-teach/` | M |
| 6 | `reflect` | 3 个并行评审子 agent 扫会话 → 学习点**必须落成具体的 skill 编辑** | `nimo-correct` 覆盖「同类错误反复出现」，但不覆盖「一次会话的复盘生产」 | **PORT**（缓） | `skills/nimo-reflect/` | L |
| 7 | `benchmark-checklist` | 报告性能数字前的四问：算术上界、limiter 点名、配置≠实现的调优判据、工作到底发生了没有 | `verification-create/references/performance-testing.md` 已覆盖约 65% | **MERGE** | `skills/nimo-mode/references/measurement-review.md` | S–M |
| 8 | `create-formal-verification-skill` | 把不变量做成**可重跑的持久资产**：落盘、覆盖记录、sync commit、能失败的证明、漂移四分类 | `nimo-statechart` 写一次性 SPEC 到临时目录，跑完即弃，无持久化 | **MERGE** | `nimo-verification-create/references/formal-verification.md` + 授权门 | M |
| 9 | `maintain-formal-verification-skill` | 代码漂移后重对齐：区分「模型漂移」与「真 bug」；**passing but stale** 这个危险 | 无 | **MERGE** | `nimo-verification-maintain/references/formal-drift.md` | S |
| 10 | `typescript-best-practices` | 17 条 TS 专属规则（原则层已覆盖 8 条）+ 具体代码 | `nimo-principle-type-system-discipline` 只有原则，无语言落地 | **MERGE** | `nimo-principle-type-system-discipline/references/typescript.md` | S |
| 11 | `automate-me` | 把用户的个人惯例提炼成一个 `-mode` skill | `configure-nimo` 管个人原则与知识来源，不管「生成一个人的工作方式」 | **MERGE/SKIP**（需先定落点） | 见 §5 | L |
| 12 | `poteto-help` | 引导式帮助/路由：setup、`/poteto-mode`、挑 skill/playbook/principle | `nimo-mode` 路由表已是 24 行且更细 | **MERGE** | `nimo-mode` 帮助节 + `references/prompt-recipes.md` | M |
| 13 | `bro` | 用平实人话复述上一条消息 | `nimo-unslop` 已管「去 AI 腔」，缺「复述」这个动作 | **MERGE** | `nimo-unslop` 复述节 | S |
| 14 | `in-your-own-words` | 开工前把目标与问题复述给用户 | 无（见 §3 Phase 0 第 3 项，与 D1 同源） | **MERGE** | `nimo-grilling` 步骤 0 + `nimo-mode` 规则区 | S |
| 15 | `sharpen` | 把任务问**深**不是问**大**，然后重写提示词 | `nimo-grilling` 管「设计前讨论清楚」，不管「把提示词本身问深」 | **MERGE** | `nimo-grilling` 的「先把任务问深」四问 | S |
| 16 | `ketchup-video` | 同上，但产出带字幕的幻灯片视频 | 无渲染设施、无视频验收能力 | **MERGE（降级）** | `nimo-ketchup/references/video-variant.md` + 显式受阻 | L（不实现） |
| 17 | `make-bot-ui` | 自定义 UI 通过 webhook 唤醒 Grok Bot | 无（Cursor webhook / routine / secret 卡片） | **SKIP** | 6 条不变量写进手册 recipes | S |

> 判定要点：**`nimo-statechart` 不是形式化验证，它是引擎。** 上游 create/maintain 这对要补的不是「再跑一次 TLC」，而是**持久化与覆盖记录**。但它**不能做成新 skill**——`nimo-verify/SKILL.md:10` 写明「本 Skill 是 Nimo Verification 体系的唯一执行语义」，`nimo-verification-maintain/SKILL.md:10` 明令「不维护第二套验证执行语义」。形式检查必须以**新资产种类**的身份进入现有 create→verify→maintain 三段。

### 2.2 共享文件的语义缺口（规则级，来自 `poteto-mode` 对比）

| # | 上游规则 | nimo 现状 | 落点 |
|---|---|---|---|
| D1 | 开工首条消息用你自己的话复述目标、问题、最小改动预期，不等确认；最终报告也以它开头 | 无。八条规则里没有「先复述目标」 | `nimo-mode/SKILL.md` 规则区 |
| D2 | 全授权下：授权覆盖的决定直接做并报告，不给「回复某个词」的钩子；只有操作者能定的给默认值 + 说明他可改成什么 | 无。`never-block-on-the-human` 只说可逆工作别问 | `SKILL.md` 授权段 |
| D3 | 自己跑 benchmark / 量性能 / 报 speedup 前先过 checklist | 无路由。只有「一次性能问题修复 → perf-issue」 | `SKILL.md` 路由表 + `measurement-review.md` |
| D4 | `Explain the Number` 原则 | 叶技能不存在（23 vs 24） | §2.1 #2 |
| D5 | **每条主张在同一句里带证据或标注**（实测／推断／猜测）；能自己跑的检查不交给用户跑 | 无。`opening-a-pr.md:28` 只要求 `## Verification` 点名运行路径 | `SKILL.md` 交付规则 |
| D6 | autopilot 阻断判据：只为**你能展示**的问题阻断；基线本来就有、PR 没复制也没新触达的不阻断 | 有周边语义，无这条判据 | `playbooks/autopilot-full.md` 第 4 步 |
| D7 | `bugbot-triage` 全文（三分类 + learned pattern 置信分级 + ask-by-default 清单） | `references/review-triage.md` 只有 3 行 | §3 Phase 0 第 2 项 |

### 2.3 nimo 独有的脚本 vs 上游脚本：调用机制不兼容

| 维度 | 上游 | nimo | 移植含义 |
|---|---|---|---|
| 运行时 | `bun` + TS 直跑 | Node 22 + `.mjs` + JSDoc | 所有 `.ts` 必须重写 |
| 入口 | shell 包装 + `commander` | `node x.mjs --input <request.json>` + `lib/common.mjs` | 13 个 flag 折叠成请求 JSON |
| 输出 | 默认 NDJSON 流式 | 单行 JSON `{status, changed, data, diagnostics}` | 流式与「一次调用一个结果」冲突 |
| 退出码 | 2/3/4/5/6/7/64 | 0/2/3/4 | 混用会把「有冲突」读成「输入错误」 |
| 依赖 | 运行时自举（`bootstrap.ts`） | 提交 lockfile，不自举 | 上游脚本不能假设首次运行会自动装好 |
| 测试 | `bun test` | `node --test` + `tests/run.mjs` | 改名 `*.test.mjs` 并落 `tests/pr/`、`tests/plan/` |

---

## 3 分阶段实施

> 约定：S ≤ 半天，M ≤ 两天，L ≥ 三天。每批结束都必须跑 `node tests/run.mjs` 与 `node tests/assets/check-package.mjs`。

### Phase 0 止血（6 项，全部 S，建议一个 PR）

#### 0-1 修文档漂移：48 → 50

- **改什么**：`integrations/README.md:5`、`integrations/{claude-code,codex,cursor,dsh,opencode}/README.md:3` 六处「48 个 Skill」。
- **怎么改**：优先改成不写具体数字的表述（「相同的 Skill 集」），避免下次再漂；若要留数字，必须与 `EXPECTED_SKILLS.length` 一致。
- **加断言**：`check-package.mjs` 增一条「`(\d+) 个 Skill` 必须等于 50」，把这类漂移变成红灯。
- **验收**：`node tests/assets/check-package.mjs` 绿；`git grep "48 个 Skill"` 零命中。
- **风险**：零。这是当前唯一「文档与强制断言直接矛盾」的缺陷。

#### 0-2 把 `references/review-triage.md` 从 3 行写成 ~50 行

- **为什么最贵**：`playbooks/babysit.md:33` 已经写死「第三次之后倾向驳回」，而目标文件只有 3 行 492 B。**规则指向一份没有内容的文件**——人会退化成「照做全部机器人意见」或「凭感觉驳回」。
- **写什么**（章节骨架）：
  1. 三分类判据（`修复` / `驳回` / `问`），每类给「触发条件 + 必须产出的东西（提交 SHA / 当前代码反证 / 一个具体问题）」。
  2. **默认问清单**：安全、隐私、鉴权、计费、数据留存、权限边界、迁移与幂等、高严重度、跨系统影响。
  3. 驳回的硬度要求：必须能指向当前代码或一次运行结果；风格类不构成修复理由。
  4. learned pattern 模板五字段（`Confidence: candidate|recurring|strong`、`Skip when`、`Do not skip when`、`Example signal`、`Source`）与晋升规则（candidate＝1–2 例，recurring＝多次真实驳回，strong＝窄且反复验证）。
  5. **必须一起搬的那句免责**：上游原话「Historical data showed humans sometimes dismiss security/data-flow comments. Treat those as owner judgment calls, not team-wide skip rules.」——不搬这句等于给未来埋免责条款。
  6. 收尾动作：一次跟进结束后扫本轮分诊，把可复用驳回模式提为候选。
- **保留 nimo 现有两条**：回复正文用参数或文件不拼 shell；CI 区分代码故障／过期基线／暂时设施故障。
- **存放**：pattern 登记走 `.nimo/` 项目记录（`state.mjs` 已有 program 记录，不新增状态机）。
- **验收**：`check-package.mjs` 绿（相对链接可解析）；`evals/cases/PB14-babysit.md` 加一条「驳回必须带反证」；新增 `evals/negative/N15-dismiss-without-counterevidence.md` 并在 `semantic-anchors.test.mjs` 挂锚点。
- **风险**：中低。主要风险是把上游「具体案例」照抄成「团队结论」。

#### 0-3 三条回复级规则（D1 / D2 / D5）

- **改什么**：`skills/nimo-mode/SKILL.md` 规则区（八条之后）+ 交付段。
- **写什么**（每条 1–2 句中文）：
  1. **目标复述**：开工首条消息用你自己的话说明用户的目标、他在解决的问题、以及（若交付改动）你预期能满足它的最小改动；不等确认。最终报告也以它开头，除非是完整指定的一行改动。
  2. **证据或标注**：每条主张在同一句里带证据或标注（实测／推断／猜测）；预测和未见原因是猜测；**能自己跑的检查不交给用户跑**。
  3. **授权内作答**：全授权下，授权覆盖到的决定直接做、只报告，不反问也不给「回复某个词」的钩子；只有操作者能定的决定给默认值并说明「你可以改做什么」。已点名的门禁与不可逆写操作仍然要等。
- **必须先做去重**：grep `nimo-unslop` / `nimo-technical-writing`，若已有「不要给用户跑检查」或语气类条款，只保留**一处真源 + 互链**。
- **验收**：`check-package.mjs` 绿；新增 `evals/negative/N16-shorthand-token-reply.md`（给用户一个代号让他回复）、`N17-claim-without-label.md`，两条都在 `semantic-anchors.test.mjs` 挂锚点。
- **风险**：低，仅重复风险。

#### 0-4 新原则 `nimo-principle-explain-the-number`

- **为什么**：唯一一个**规则级**缺失而非文件级缺失。`perf-issue` / `hillclimb` / `eval` 三个 playbook 都在产出数字，却没有一条原则约束它们。
- **写什么**（叶正文，中文，≥400 字符去空白）：
  - 先写决策，再测量：这个数字要支持哪个决定？不能改变决定就不要测。
  - 找 limiter：从 profile 点名，不靠猜；问「为什么不是两倍」。
  - 排除「它测的不是你以为的那件事」：测的是缓存／空跑、分母变了、噪声大于效应。
  - 报告时**必须同时给限制条件**。
- **注册触点**：12 处，见 §4.2。
- **落笔前必须去重**：`nimo-verification-create/references/performance-testing.md` 可能已有相近内容，否则会出现两份「怎么量性能」。
- **验收**：`check-package.mjs` 50→51、23→24 同步；`semantic-anchors` 的原则体例检查（必须有 `## ` 方法节、body ≥400 字符、含 SHA `93b00b8…`）通过；三个 playbook 各命中一次链接。
- **风险**：中——它是本批唯一改计数断言的项。

#### 0-5 `typescript.md` reference（零注册，最先落地）

- **改什么**：新建 `skills/nimo-principle-type-system-discipline/references/typescript.md`；`SKILL.md` 两处小改（加链接 + 一句「语言落地见此」）。
- **写什么**：上游 17 条规则中原则层尚未覆盖的 5 条 + 具体代码示例（品牌类型用类型守卫而非 `as`、判别联合替代布尔束、`satisfies` 而非断言、`readonly` 边界、exhaustive switch）。
- **为什么不建目录**：上游靠 Cursor 的 `paths: ["**/*.ts"]` 自动附加触发；nimo 没有也不该有这个机制。作为原则的落地 reference 才符合「能力与实现解耦」。
- **验收**：`check-package.mjs` 绿（reference 无占位检查，需自查写实）；相对链接闭合。
- **风险**：极低。

#### 0-6 `verification-maintain` 补 5 行（三分类 → 四分类）

- **改什么**：`skills/nimo-verification-maintain/SKILL.md` 的分类表 + 5 行规则。
- **写什么**：**代码承诺有意变更时，预期必须改，且必须引用证明它是有意变更的证据**（doc comment／测试／changelog／commit message）。
- **为什么值**：nimo 现在只有反向半条（「不要因为产品当前表现异常就先修改预期」，`:39`），缺正向半条。这条与形式化无关，5 行、零注册、覆盖全部行为验证。
- **验收**：`check-package.mjs` 绿；`evals/cases/PB2*/` 相关样例补一条期望。
- **风险**：零。

### Phase 1 轻量 reference（2 项，S–M）

#### 1-1 `skills/nimo-mode/references/measurement-review.md`（benchmark-checklist 的 35%）

- **只搬这四条**（其余与 `performance-testing.md` 重叠，不必复制）：
  1. **算术上界**：声称的加速比是否超过理论可能？
  2. **limiter 点名**：限制它的是什么？从 profile 读出来，不靠猜。
  3. **配置≠实现**：调的是配置还是代码？配置改动不能证明实现变快。
  4. **工作到底发生了没有**：这段代码真的被执行了吗，还是测了个缓存/空跑？
- **插入点（5 处）**：`verification-create/references/performance-testing.md`（划界 + 互链）、`playbooks/perf-issue.md`、`playbooks/hillclimb.md`、`playbooks/eval.md` 的「执行前读取」、`playbooks/opening-a-pr.md:28`。
- **依赖**：先做 0-4（reference 需要一个指向它的主语）。
- **验收**：五处链接闭合；`check-package.mjs` 绿；可选 `evals/negative/N18-benchmark-default-config.md`。
- **风险**：中——必须先与 `performance-testing.md` 写清分工，否则同一件事两套说法。

#### 1-2 `nimo-verification-create/references/formal-verification.md` + `nimo-verification-maintain/references/formal-drift.md`

- **写什么（create 侧）**：形式检查的相对位置（**它证明的是模型，不是产品**）；授权门（形式化只在用户明确要求或高风险不变量时启动）；目录约定（落盘到项目内、可重跑、覆盖记录「哪些文件哪些函数」）；记法（先写不变量再写模型）；交接（把结论交给 `nimo-verify` 时怎么标「这是模型证据，不是行为证据」）。
- **写什么（maintain 侧）**：**passing but stale** 的识别与四分类处置（模型漂移／真 bug／覆盖缺口／已废弃不变量）；sync commit 的记录方式。
- **两处定点改**：`nimo-verification-create/SKILL.md` 的 §0 授权门、§2 目录、§3 记法、§4 交接；`nimo-verification-maintain/SKILL.md` 维护流程步骤 2。
- **加一条硬规则**：`nimo-verify/SKILL.md` 明写「模型检查结论属于范围外证据，不得当作行为证据」。
- **为什么不建新 skill**：见 §2.1 判定要点。
- **验收**：`check-package.mjs` 相对链接闭合；`semantic-anchors` 绿；可选 `evals/negative/N19-formal-check-as-pass.md`。
- **风险**：中高——最大的语义污染风险是「形式检查被当成行为证据」。这条规则必须先落地再写 reference。

### Phase 2 新目录（1 项本轮，M）

#### 2-1 `skills/nimo-blast-radius/SKILL.md`

- **为什么是本轮唯一值得新建的目录**：唯一完全无重叠、且 `playbooks/opening-a-pr.md:27` 已经在要求一个 nimo 不会写的东西。
- **写什么**：
  - 触发：改动跨越模块/进程/持久化/协议边界，或用户问「这会影响什么」。
  - 与 `nimo-how` 的分工：how 读调用链是为了**理解**，blast-radius 读调用链是为了**证伪**——读同样的代码，问相反的问题。
  - 步骤：① 列出直接调用方与被调用方（用真实检索，不靠记忆）；② 对每个面问「什么会坏、没人测的话怎么发现」；③ 区分「会编译失败」（安全）与「能编译但行为变」（危险）；④ 产出「未覆盖影响面」清单，交 `nimo-verify` 作为验证范围输入；⑤ 明确不停在「看起来没影响」。
  - 与 `nimo-interrogate` 的分工：interrogate 是让别人攻你的 diff，blast-radius 是自己先找反例。
- **注册触点**：11 处，见 §4.1。
- **验收**：`check-package.mjs` 24→25、50→51；`nimo-mode` 路由行不与 `nimo-verify`/`nimo-interrogate` 撞车（人工核对）；`semantic-anchors` 的 `DIRECT_TASK_SKILLS` 加名 + 3 条锚点；`evals/negative/N15-…`。
- **风险**：中——注册面最大，建议单独一次提交。

### Phase 3 手册与防漂移（2 项，M）

#### 3-1 手册最小心脏：`skills/nimo-mode/references/guide/`（3 页）

- **落点不能是 `docs/`**：`install.mjs:109-127` 只拷 `skills/**` + `VERSION`；`check-package.mjs:300` 只校验 `skills/` 与 `integrations/`。放 `docs/` 的手册**既到不了用户手上，也不会被任何检查发现**。放 `skills/nimo-mode/references/guide/` 能同时拿到三样：随安装到达 + 相对链接闭合检查 + 未知 skill 名检查 + 禁止执行模式检查。
- **三页**：
  1. `README.md` —— 阅读顺序 + **只记一件事**（nimo 是什么、不是什么）。
  2. `02-first-task.md` —— 一次完整首跑轨迹：从 `/nimo` 到交付，标注每一步谁在做决定（用户/主 agent/子 agent）。
  3. `10-recipes-and-pitfalls.md` —— 10 个工况 + 坑。必须包含：小改动该配多少设计、什么时候不该开子 agent、验证受阻时怎么如实报告、长时运行的前后契约、`make-bot-ui` 的 6 条不变量（作为「自定义 UI 唤醒 agent」的通用做法）。
- **不写全套**：上游 11 篇 92 KB 一次搬完必然烂尾；三页就能验证「落在 skills/ 下能被校验」这个假设。
- **验收**：`check-package.mjs` 绿；三页内所有 `nimo-*` 提及都是已知 skill；无禁止执行模式。
- **风险**：低。真正的风险是承诺了做不到的篇幅。

#### 3-2 防漂移挂钩

- **改什么**：
  0. **新增 `tests/assets/upstream-drift.mjs`（纯 Node ESM，零依赖）**：扫 `skills/**/*.md` 里的 `来源：[…](…/blob/<sha>/<path>)` 行，解析出 `sha` + 上游路径，对每个路径跑 `git log --oneline <sha>..<上游HEAD> -- <path>`，输出一张「文件 → 落后提交数 → 最近一次上游改动」的表；再加一个 `--check` 模式，超过阈值就 exit 1。**这是 nimo 目前没有、上游也没有的能力**（上游只校验文档与树一致，不校验版本落后），用它替换「靠人回忆哪些文件该复检」。
  1. `check-package.mjs:300` 的 `pending` 从 `['skills','integrations']` 扩到含 `docs`、`README.md`、`README.en.md`（先只加两个根 README，验证不误伤后再加 `docs/`）。
  2. 新增断言：「`(\d+) 个 Skill` 必须等于 `EXPECTED_SKILLS.length`」（今天就能抓 0-1 那个 bug）。
  3. 明确 `check-package.mjs` 的调用路径：要么在 `tests/run.mjs` 里作为独立前置步骤跑一次（它是 validator 不是 test），要么在贡献指南写死「改包结构必须先跑它」。
  4. 给两个入口补来源行：`nimo-mode`（← `poteto-mode`）与 `nimo-setup`（← `setup-pstack`），否则它们永远无法进入漂移报告。
- **验收**：故意把某处改成「49 个 Skill」，断言必须报错；`upstream-drift.mjs` 在今天的树上应报出「48 个文件停在 `93b00b8`」。
- **风险**：低。加 `docs/` 时可能命中历史证据文件里的旧表述（`docs/evidence/**`），必要时对 `docs/evidence/` 做豁免——历史证据不该改。

### Phase 4 观察后决定（5 项）

| 项 | 落点 | 为什么缓 |
|---|---|---|
| `nimo-ketchup` | 新目录 | 价值高但依赖「长时运行」这个使用场景先成熟；`autopilot-*` 的报告要求应先写清 |
| `nimo-recall` | 新目录 | 与 `session-pickup.md` 有重叠面，需先定「接管别人」与「回忆自己」的边界 |
| `repro-discipline.md` | `nimo-verify/references/` | benny 里唯一能提升交付质量的资产：「两次真机 + 前后证据」；与 `host-contract.md:27` 完全兼容 |
| `audit-worktrees.mjs` 扩展 | 现有脚本 | 加 `size`/`age`/`prState`/`remote` 列与桶阶梯；不实现 transcript 扫描（宿主私有路径），改为可选 `activityHints` 入参 |
| `check-plan` 测试 | `tests/plan/` | 零规则变化、纯降风险；只搬**围栏扫描的测试思路**，不搬上游计划格式与标点门禁（nimo 正文是中文，破折号合法） |

## 4 注册清单（精确到行，行号以当前 HEAD 为准）

#### 4.1 新增一个 task skill（如 `nimo-blast-radius`）：11 处

| # | 文件 | 行 | 改动 |
|---|---|---|---|
| 1 | `tests/assets/check-package.mjs` | `:17-42` | `TASK_SKILLS` 加名 |
| 2 | 同上 | `:108` | `24` → `25`，message 改 `twenty-five task Skills` |
| 3 | 同上 | `:110` | `50` → `51`（唯一性断言） |
| 4 | `skills/<name>/SKILL.md` | 新建 | frontmatter `name` == 目录名；`description` 非空；body ≥80 字符；**无 `paths`、无 `disable-model-invocation`** |
| 5 | `skills/nimo-mode/SKILL.md` | `:60-89` 路由表 | 加一行 |
| 6 | `README.md` | skills 表 | 加一行 |
| 7 | `README.en.md` | skills 表 | 加一行 |
| 8 | `THIRD_PARTY_NOTICES.md` | `:7` 后 | 加来源行 |
| 9 | `tests/fidelity/semantic-anchors.test.mjs` | `:47` | `DIRECT_TASK_SKILLS` 加名 |
| 10 | 同上 | `:88-249` | `SEMANTIC_ANCHORS` 加 3 条 |
| 11 | `evals/negative/N..-*.md` + `evals/negative/README.md` | 新建 + 表加行 | 否定用例 |
| **+** | `tests/installation/install.test.mjs` | `:13`、`:146` | `EXPECTED_SKILLS` 加名（`deepEqual`） |
| **+** | `tests/installation/host-wrapper.test.mjs` | `:108`、`:219` | `50` → `51`，两处 message |
| **+** | `skills/nimo-mode/scripts/install.mjs` | `:110` | `names.length !== 50` → 51，message 改 `exactly the 51 nimo skills` |

> **注意**：C 的统计是「11 个文件、8 处硬断言」，B 的清单是「11 处注册」。合并后是 **14 个触点**（含安装测试与 `install.mjs`）。少改任何一处都会红。

#### 4.2 新增一个原则（`nimo-principle-explain-the-number`）：12 处

| # | 文件 | 行 | 改动 |
|---|---|---|---|
| 1 | `tests/assets/check-package.mjs` | `:44-68` | `PRINCIPLE_NAMES` 加 `'explain-the-number'` |
| 2 | 同上 | `:109` | `23` → `24`，message 改 `twenty-four principle Skills` |
| 3 | 同上 | `:110` | `50` → `51` |
| 4 | `skills/nimo-principle-explain-the-number/SKILL.md` | 新建 | 满足 `semantic-anchors.test.mjs:289-306`：有 `## ` 方法节（标题含 `模式|启发|检验|…`）、body 去空白 ≥400 字符、含 SHA `93b00b89ef425a9c1bac0d0b317dfc49c930ac99` |
| 5 | `skills/nimo-mode/SKILL.md` | `:27-49` 原则索引 | 加一行（不满足则 `check-package.mjs:430-443` 报 `principle-index-link`） |
| 6 | `tests/fidelity/semantic-anchors.test.mjs` | `:34-45` | `PRINCIPLES` 加名 |
| 7 | `README.md` | `:241` | 「23 条原则」→「24 条原则」 |
| 8 | `README.md` | 原则表 | 加一行 |
| 9 | `README.en.md` | `:336` | `twenty-three` → `twenty-four` |
| 10 | `README.en.md` | 原则表 | 加一行 |
| 11 | `THIRD_PARTY_NOTICES.md` | `:7` 后 | 加来源行 |
| 12 | `perf-issue.md` / `hillclimb.md` / `eval.md` | 执行前读取 | 各加一行 |
| **+** | `tests/installation/install.test.mjs`、`host-wrapper.test.mjs`、`install.mjs:110` | 同上 | 50 → 51 |

#### 4.3 新增 reference 文件：6 条约束

| # | 约束 | 出处 |
|---|---|---|
| 1 | **无计数断言改动**——`check-package` 只数 skill 目录与 playbook | `check-package.mjs:107-112` |
| 2 | 文件内所有相对 markdown 链接必须指向存在的文件，且不得逃出包 | `check-package.mjs:236-260`、`:298-313` |
| 3 | 出现 `bun`／`Task(`／`gt` 等 token 的行必须命中豁免正则（含 `pstack`、`来源`、`不要`、`禁止`、`示例`） | `check-package.mjs:129-152` |
| 4 | 不得出现固定模型名（GLM-5／GPT-x／Claude-x／Gemini-x／Luna Max） | 同上 |
| 5 | reference **无**占位内容检查（该检查只作用于 playbook），必须自查写实 | `check-package.mjs` 主流程 |
| 6 | 指向新 reference 的 SKILL.md 链接必须真实存在 | `check-package.mjs:236-260` |

#### 4.4 零注册改动的项（安全，可随时插入）

`nimo-verification-create/SKILL.md` 定点改、`nimo-verification-maintain/SKILL.md` 三分类→四分类、`nimo-verify` 的范围外证据一条、`nimo-statechart` 的落盘出口 5 行、`nimo-principle-type-system-discipline` 两处小改、`perf-issue`/`hillclimb`/`eval`/`opening-a-pr` 定点插入、`review-triage.md`、`measurement-review.md`、`typescript.md`、两份 formal reference。

> 这些**不新增 playbook**（`PLAYBOOKS.length` 不动），也不新增 skill 目录，因此不会与 §4.1/§4.2 的计数断言冲突。

---

## 5 明确不移植

| 项 | 理由 | 依据 |
|---|---|---|
| `scripts/bootstrap.ts`、`scripts/bun.lock` | 违反零依赖自举；`check-package` 把 `bun-bootstrap` 列为禁忌模式 | `references/tools.md:3`、`check-package.mjs:129-150` |
| 固定模型名、每角色模型默认、「Match the model to the job」全套 | 宿主解耦契约明文禁止；降级表已把「只有一种模型」写成可报告的运行差异 | `host-contract.md:3`、`:19` |
| `subagent_type: "poteto-agent"`、`Task` 参数、`run_in_background`、`/loop`、`.cursor` 目录 | 宿主私有机制；`delegation.md` 已给「用宿主原生创建/等待/中断」的等价写法 | `host-contract.md:3`、`delegation.md` |
| `$HOME/.cursor/projects/<slug>/agent-transcripts` 扫描 | 宿主私有路径；nimo 改为「由宿主提供轨迹位置」并保留「不跨工作区搜索」 | `session-pickup.md`、`worktree-cleanup.md` |
| `control-ui` / `control-cli`（cursor-team-kit） | nimo 用真实操作面路由替代，且不得写死具体工具 | `multi-phase-plan.md:36` |
| 上游 `check-plan.mjs` 的计划格式（九个 `**Bold.**` 子块、`Ten lanes on` 正则） | nimo 计划模板是八字段单元，采用上游格式会让 `PB16` 与 `plan-template.md` 同时失效 | `references/plan-template.md` |
| 固定泳道数（"Ten lanes on `<surface>`"） | nimo 明确「不使用固定 lane 数或固定模型」 | `multi-phase-plan.md:59` |
| `agents/`（comment-sicko、poteto-agent） | 不可移植（agent 注册根、`is_background`、plugins 发现路径）；方法论已被 `nimo-no-comments` + `nimo-how`/`nimo-why` + `delegation.md` 覆盖 | `.analysis/D` §1 |
| `automations/benny/` 端到端 | 触发/等待/创建三层由 Cursor Automations 拥有；`host-contract.md:25` 已给降级 | `.analysis/D` §2 |
| `plugin.json` ×2 | 五个目标宿主无一消费 manifest；nimo 用 `install.mjs` 的哈希清单分发，加它会多一个版本源 | `.analysis/D` §3 |
| `make-bot-ui` 作为 skill | 内核（webhook / routine / secret 卡片）不可移植；6 条不变量已被原则覆盖 | `.analysis/D` §5 |
| `ketchup-video` 的渲染实现 | 无渲染设施、无视频验收；按 `host-contract.md` 第七类降级为「显式受阻」 | `.analysis/C` §2.4 |
| queued-stack 推进机（`ADVANCE` / merge-queue） | nimo 现在用「宿主等待 + 冻结清单」在 Prose 层解决；做成脚本会与 `state.mjs` 的 `frontier.generation` 争权威 | `.analysis/A` P7 |
| `poteto-help` 独立目录 | 它的 40 行 picker 会与 `nimo-mode` 的 24 行路由表形成第二套路由真源 | `.analysis/C` §2.10 |
| `bro` / `in-your-own-words` / `sharpen` 独立目录 | 每个 ≤16 行；不足以撑起一个目录。内容并入 `nimo-unslop` / `nimo-grilling` | `.analysis/C` §2 |
| `automate-me` | 与 `configure-nimo` 会形成两套个人配置真源；需先定「个人 mode skill」的落点与授权 | `.analysis/C` §2.9 |

---

## 6 风险与验收

### 6.1 冲突热点

- **只有两处会改 `check-package.mjs` 的计数断言**：Phase 0 的 `explain-the-number`（50→51、23→24）与 Phase 2 的 `blast-radius`（24→25、50→51）。若并行开发，这两处**必然冲突**。建议各自单独成 commit，并在 commit message 里写明改了哪几个数字。
- `nimo-mode/SKILL.md` 路由表被两批同时改（Phase 0 的规则区与 Phase 2 的路由行），按文件分段改、先后合并。
- 新增 reference 不受占位检查约束，必须靠自查写实——这是最容易被糊弄的地方。

### 6.2 每批的验收命令

```powershell
node tests/assets/check-package.mjs   # 结构、计数、链接、禁止模式
node tests/fidelity/semantic-anchors.test.mjs
node tests/run.mjs                    # 全量
```

`check-package.mjs` 会在四处报错：计数、`principle-index-link`（原则未进索引）、相对链接、禁止执行模式。
`semantic-anchors.test.mjs` 会在三处报错：SHA 引用、原则体例、否定用例锚点。

### 6.3 提交粒度建议

| commit | 内容 | 触发断言 |
|---|---|---|
| 1 | Phase 0-1 + 0-2（文档 + review-triage） | 无计数改动 |
| 2 | Phase 0-3（三条回复级规则） | 无 |
| 3 | 0-5 + 0-6（typescript.md + verification-maintain 5 行） | 无 |
| 4 | 0-4（explain-the-number）**单独** | 50→51、23→24 |
| 5 | Phase 1-1 + 1-2（reference 三份） | 无 |
| 6 | Phase 2-1（blast-radius）**单独** | 24→25、50→51 |
| 7 | Phase 3（手册 + 防漂移挂钩） | 新增文档断言 |

---

## 7 附录 A：与本文相关的上游提交（按主题）

| 主题 | 提交（日期） |
|---|---|
| 新增 ketchup 及 6 次迭代 | `978ca6e`(10-10) → `ea32d95`(10-12) → `d00ba6e`/`c86f349`(10-13) → `afd51cf`(10-14) → `16541c6`/`bc14437`(10-17) |
| ketchup-video | `3c0fdb4`(10-23) |
| in-your-own-words / sharpen | `7d8d909`/`dbf4981`(10-13)、`79afd75`(10-13)、`75fabac`/`88d4751`(10-18/19) |
| formal verification 三件 | `4382e68`(10-17)、`f9be7aa`/`6b78e9f`(10-18/19)、`7b353f7`(10-19)、`00d5dec`(10-23) |
| poteto-help | `4e5b1cf`(10-04)、`00b52d9`/`807c031`/`1e56b29`(10-05) |
| 原则改成「推理而非规则」大扫除 | `e5136d8`(10-15)、`99743e9`(10-15)、`08bd59b`(10-11)、`b0b9c7a`(09-23)、`00b14f1`(10-10) |
| orchestrate 去脚本化 | `ce649c0`(10-14)、`c742dd6`(10-27) 删除 `scripts/orch/*` |
| watch-pr / check-plan / worktree-audit 修复 | `ff8f83d`、`87c8103`、`cf9a111`、`fe096ef`、`96dec8e`、`86c2448`、`f83fbe6`(10-11~10-23) |
| 打包与 agent 层 | `e5a02f8`(10-11)、`182f2ce`(10-16)、`b93e811`/`2bd5dd4`(10-11)、`de2dba6`(10-11) |
| 文档 vs 树检查 | `019a6a2`(10-17) → 新增 `scripts/check-pstack-docs.mjs`（152 行，纯 Node ESM，无依赖） |
| **不移植：模型漂移** | `889ec4b`、`5bf2b15`、`70b2dc8`、`df58112`、`12d587d`、`b42effe`、`1e56b29` |

> `scripts/check-pstack-docs.mjs` 是 §3-2 防漂移挂钩的直接蓝本：它从树里列出 skills/playbooks/agents，然后检查 README 与 guide 里说的 slash 命令、相对链接与锚点、README 表格、**数量词**（"the twenty-three playbooks"）与模型名是否与树一致，不一致就 exit 1。纯 `.mjs`、零依赖、152 行——nimo 版只需把 `pstack`→`nimo`、`poteto-mode`→`nimo-mode`、去掉模型名检查（反向断言「不得出现固定模型名」）。

## 8 附录 B：支撑报告

| 文件 | 覆盖 | 行数 |
|---|---|---|
| `.analysis/A-mode-drift.md` | `poteto-mode` 文件级缺口 + D1–D7 规则级漂移 + P1–P8 移植计划 + 不移植清单 | 305 |
| `.analysis/B-verification-quality.md` | 六个验证/质量类技能逐项评估 + 注册触点逐行清单 + 执行顺序 | 913 |
| `.analysis/C-interaction-comms.md` | 十个交互类技能逐项评估 + 小 skill 打包成本模型 + 注册清单 | 481 |
| `.analysis/D-automation-packaging.md` | 五层（agents/benny/plugin.json/guide/make-bot-ui）+ 7 个打包缺陷 | 486 |

---

## 9 一句话总结

nimo 的问题不是「少了 16 个技能」，而是**有 provenance、没有同步压力**：62 个文件用 `来源：` 行记着自己取自哪个上游 revision，其中 48 个停在最早的 `93b00b8`，而只有 1 个跟到了基线之后；两个入口 skill（`nimo-mode`、`nimo-setup`）连来源行都没有；文档说的数字和断言说的数字已经打架；唯一能抓这类漂移的校验器还没把手伸到 `docs/`。所以先修 4 件真缺的（`blast-radius`、`explain-the-number`、`review-triage` 正文、三条回复级规则），再写一个能把「落后几版」算出来的小脚本，把校验器的扫描范围扩到文档和手册——**之后每一次同步才不依赖人的记忆。**
