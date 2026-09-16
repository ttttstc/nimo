### 3.9 少量本地工具的实现契约

工具使用 **Node.js 22 或更高版本、ES modules（`.mjs`）**，跨 Windows / macOS / Linux。YAML 使用 `yaml` 包的文档解析与编辑 API；实现时选择并锁定实际版本，提交 lockfile，不使用 `latest`。不保留 Bun 自动安装和 TypeScript 运行时前提。

脚本功能边界如下。没有模型调用、Agent 创建、持续调度、PR 写操作或隐式联网安装。

| 文件 | 输入与输出 | 职责与限制 |
|---|---|---|
| config.mjs | JSON 请求 → JSON 引用、诊断或修改结果 | 解析、路径、合并、去重、校验、增删；不决定原则语义冲突 |
| state.mjs | JSON 请求 → 当前记录或变更结果 | 本地项目单元、收件箱、验证记录、知识影响和版本；不运行单元、不运行知识审计 |
| knowledge-state.mjs | JSON 请求 → 知识维护状态 | 原子维护 `.nimo/state/knowledge.json`、计算/比较知识文件内容指纹、保护 revision；不读取知识语义、不决定漂移 |
| inspect-pr.mjs | 仓库与 PR → JSON 状态 | 只读 GitHub 事实，有限请求后返回，不无限轮询 |
| audit-worktrees.mjs | 仓库 → 目录审计 JSON | 只读枚举和分类，不删除路径 |
| check-plan.mjs | Markdown 计划 → 问题与行号 | 检查单元依赖、证据、作用域和停止点，不强制模型／宿主句式 |
| audit.mjs | JSON 请求 → Task Audit 创建、追加或校验结果 | 确定性维护 `.nimo/tasks/<task-id>/audit.md`；不执行验证、不判断设计质量、不生成 Agent |
| log.mjs | 一条 JSON 决策 → TSV 记录 | 兼容旧调用；追加事实、理由、证据与结果。新任务统一写 Task Audit，不再以 TSV 为主审计记录 |

`config.mjs`、`state.mjs`、`knowledge-state.mjs` 与 `audit.mjs` 支持 `--input <request.json>`；请求通过文件传递，不把用户路径拼到 shell 代码。其他脚本使用参数数组，调用外部程序一律关闭 shell。stdout 只输出结果，stderr 输出简短诊断，不回显凭据或完整配置内容。

公共返回结构：

```json
{
  "status": "OK",
  "changed": false,
  "data": {},
  "diagnostics": []
}
```

`status` 为 `OK | WARN | BLOCK`。退出码 0 对应 OK／WARN，2 对应输入或配置无效，3 对应文件冲突／I/O 故障，4 对应当前运行前提不足。调用者同时读取 JSON，不把退出码 0 当成任务质量通过。

每条诊断包含 `code`、`message`、适用时的 `source`、`configPath`、条目位置和目标引用。避免只有“加载失败”而无定位信息。

#### audit.mjs 与 Task Audit

Task Audit 固定写在 `<projectRoot>/.nimo/tasks/<taskId>/audit.md`。`projectRoot` 必须是绝对路径；`taskId` 只允许小写字母、数字、`.`、`_`、`-`，长度最多 64，防止调用者把任务标识当路径片段注入。

操作为 `init | append | validate`。

**init** 需要本次任务的 `title / goal / scope[] / acceptance[] / playbook / nimoRevision / trace`。`trace` 至少包含 `host` 与 `observedBoundary`，无法获得 Session／Run 引用时 `ref` 写 `UNAVAILABLE`，不能编造。初始化创建固定八区块：Contract、Harness、Trace、Decisions、Artifacts、Verification、Outcome、Learning；初始 Outcome 为 `running / PENDING`。同一合法 Task Audit 重复 init 幂等；已有文件格式或 Task ID 不匹配时拒绝接管。

示例：

```json
{
  "operation": "init",
  "projectRoot": "/repo/demo",
  "taskId": "feature-refund",
  "title": "订单退款",
  "goal": "支持用户申请订单退款",
  "scope": ["order-service", "order-web"],
  "acceptance": [
    {"id": "AC-01", "text": "用户可以申请退款"},
    {"id": "AC-02", "text": "已退款订单不能再次退款"}
  ],
  "playbook": "feature",
  "nimoRevision": "git:abc123",
  "trace": {
    "host": "codex",
    "ref": "UNAVAILABLE",
    "observedBoundary": "当前任务的工作区差异与本地验证可观察；此前实现过程不可观察"
  }
}
```

**append** 的 `kind` 为：

- `decision`：追加 `Time / ID / Phase / Decision / Reason / Evidence / Result`，ID 自动生成 `D1...`；Phase 只允许 `contract | design | implementation | verification | review | handoff`。
- `harness`：记录本次实际应用的 Harness 及 Evidence of use；同名条目幂等，不把静态配置存在当使用。
- `artifact`：记录可审查产物与版本／路径引用，ID 默认 `A1...`。
- `verification`：记录 `Check / Source / Required / Verification / Evidence or Reason / Result`。结果只允许 `PASS | FAIL | NOT_RUN | NOT_APPLICABLE`；同一 Check 可追加重试历史。
- `outcome`：追加任务执行状态、`PENDING | VERIFIED | UNVERIFIED | BLOCKED`、Artifact Version、Open 与 Next。
- `learning`：只允许 `candidate`，第一版工具不能把单次观察直接提升为 Harness 变更。

所有 Markdown 单元格转义 `& | < >` 与换行，写入使用短锁和原子替换；拒绝符号链接 Audit，避免通过 Audit 路径改写其他文件。

**validate** 只检查确定性关系，不重新执行测试。普通校验允许 Acceptance 暂无 Verification，但给 WARN；`final=true` 时采用 fail-closed，至少检查：

- 固定格式、唯一 marker、Task ID 与 Nimo Revision。
- Trace Host 与 Observed Boundary；Trace ref 不可用是 WARN，不伪造为已观察。
- Acceptance 唯一且非空。
- 每个 Harness 条目有 Evidence of use。
- Decision ID 唯一、Phase 合法、Evidence 非空。
- Artifact 有引用。
- `PASS` 必须有 Evidence。
- 同一 Verification Check 在重试中不能改变 Source 或 Requiredness，防止把失败检查改名／降级来获得通过。
- 每个 Acceptance 在 final validate 时都有 Required Verification。
- Final Outcome 不能是 PENDING，必须有 Artifact Version 和至少一个 Artifact。
- Verdict 为 VERIFIED 时，每个 Acceptance 与其他 Required Check 的最新结果都必须 PASS。
- 调用方传 `expectedArtifactVersion` / `expectedVerdict` 时必须与 Final Verify 结论一致。

`audit.mjs` 不决定某个 Decision 是否聪明，也不决定某个 Verification 业务上是否足够；这些属于 Playbook、`nimo-show-me-your-work` 和 `nimo-verify`。工具只防止记录缺失、自相矛盾和明显降级绕过。

#### config.mjs 请求与内部数据

操作为 `inspect | validate | add | remove`。作用域为 `team | personal | all`，其中 add / remove 只能选 team 或 personal。显式传入 `projectRoot`、`homeDir`、`cwd`，路径工具校验绝对位置，不能由脚本所在目录推断。

```json
{
  "operation": "add",
  "scope": "team",
  "projectRoot": "D:/work/demo",
  "homeDir": "C:/Users/example",
  "cwd": "D:/work/demo/src",
  "collection": "knowledge",
  "entry": "../docs",
  "expectedHash": "sha256-of-observed-file-or-absent"
}
```

对话入口先把 entry 解析为所指目标，再按目标作用域保存。手工 YAML 由第 3.6 节规则解析，两条入口最终产生同一目标身份。

`inspect` 返回配置路径与哈希、引用的原值／实际位置／所有来源／可读性、尚待宿主验证的 Skill 引用。宿主发现结果可通过当前调用的 `discoveredSkills` 快照传入；该快照不写入 YAML，也不作为可执行命令。会话排除可以作为 `exclusions` 输入，仅影响本次返回。

Skill 的可用性与文件的可读性分别记录。文件工具不能仅凭字符串判断某个 Skill 可用。`add` 外部 Skill 在当前宿主无法确认时不落盘，给出缺失诊断；手工 YAML 允许被读取并显示诊断，但不能声称该原则已生效。

实现以少量函数完成，建议边界为 `readConfig`、`resolveReference`、`collectReferences`、`editConfig`。只有实际共享逻辑才提到 `lib/`，不按每个字段创建一层对象或类。

#### state.mjs 与长期项目记录

项目事实存储在 `<task>/program/program.json`，短任务只用 checkpoint，不创建 program。JSON 是事实记录，不包含可执行步骤、shell 命令或自动转换规则。

```text
formatVersion
taskId / goal / projectRoot / sourceVersion
revision
executionState / stopReason
owners[]                  宿主执行者标识、责任、状态、产物位置
units[]                   单元 id、依赖 id、所有者、分支／PR／head、状态、报告
verifications[]           验证对象版本、base、证据、执行者、独立性、结论
frontier                  generation、按依赖排序的 PR、当前最底部未合入项
gates[]                   待决定问题与状态，不带超时自动批准
knowledgeImpact           NOT_APPLICABLE / NONE / REVIEW_RECOMMENDED、原因、受影响领域、产物版本
```

`knowledgeImpact` 是任务完成时的轻量知识影响信号。它不读取知识库、不代表 `nimo-knowledge-audit` 已执行、也不授权 `nimo-knowledge-maintain`。`REVIEW_RECOMMENDED` 必须包含至少一个受影响领域；其他结论的 areas 为空。长期 program 中只要有 `accepted` 或 `integrated` 单元，从非 delivered 状态切换到 `delivered` 的**同一次 update** 必须显式带新的非空 `knowledgeImpact`；已有旧值不能被静默复用。

依赖 id 只表示已明确的工作前提，工具可以检查缺失、循环和重复，不能据此调度 Agent。`standing-orders.md` 保存范围和运行约束；每次启动与恢复均传递当前版本。

操作为 `init | read | update | reopen | inbox-add | inbox-drain | status`。update 携带 `expectedRevision`，由唯一协调者在短锁内校验后原子写入；revision 冲突返回 BLOCK。其余执行者只交报告，不能更新共享 program。收件箱每个结果写独立文件，同一事件标识幂等，drain 只处理本批已取得的结果，期间新到达结果留给下一批。

不引入服务数据库或常驻进程。锁不可取得时报告占用；不能仅因时间较久就强行清锁。自动回收仅限能够证明本机持有进程已结束的情况，其他情况交由当前所有者核实。

#### knowledge-state.mjs 与项目知识维护状态

项目知识正文不进入 `.nimo`；维护缓存固定写在 `<projectRoot>/.nimo/state/knowledge.json`。操作为 `init | read | check | update | status`。

`init` 只建立空状态，不宣称知识已经维护。`check` 是严格只读的内容指纹比较：调用者传当前配置解析出的目标绝对路径，工具与已有状态比较并返回 `UNCHANGED | CHANGED | MISSING | UNTRACKED`、基线哈希、当前哈希和目标验证版本；它不解释内容，也不把 CHANGED 判成语义漂移。

`update` 必须带 `expectedRevision`、本次 `projectVersion`、`maintainedAt` 和完整知识文件列表。每个知识文件传入当前宿主可访问的绝对路径、`user-managed | managed-by-nimo` 所有权、`verifiedRevision`、`expectedContentHash` 与唯一 `sources[]`，但绝对路径只用于本次读取，不写入状态。`verifiedRevision` 必须与本次 `projectVersion` 完全一致，否则返回 `STALE_TARGET_VERIFICATION`，防止全局 `lastMaintainedRevision` 领先于任一目标实际验证版本。

`expectedContentHash` 是 Agent 对**刚刚实际验证过的精确内容**计算的 SHA-256，只作为乐观并发前置条件。工具在持有状态锁期间重新解析目标并重算真实 SHA-256；两者不一致时返回 `CONTENT_CHANGED`，不写新基线。因此工具不信任调用者把哈希当事实值，同时能阻止“验证后、状态写入前”被其他进程修改的内容被误标为已验证。工具读取后到状态落盘之间再发生的修改，会在下一次 `check` 中表现为 CHANGED；跨文件原子事务不由本工具声称保证。

持久化标识避免保存**明文**本机绝对路径：仓库内知识文件记录为项目相对路径（例如 `./docs/architecture.md`）；仓库外知识记录为 `external-path-sha256:<sha256(actual-path)>`。这个值由绝对路径直接派生，只是路径伪名，**不提供保密性或不可猜测性**；低熵路径可能被枚举。若外部路径本身敏感，不应把该 Target 写入共享状态，应由宿主/团队采用仅本地的状态或其他受控标识。换机器后外部标识无法匹配时，上层应重新核对外部知识，而不是猜测路径。`sources[]` 不允许绝对路径，使用仓库相对范围或明确的非路径标识。

```text
formatVersion / revision
lastMaintainedRevision / lastMaintainedAt
targets{
  ./project-relative-file | external-path-sha256:<digest>:
    ownership / contentHash / verifiedRevision / sources[]
}
```

一次成功 `update` 表示同一项目版本的完整知识维护快照，只有全部目标均通过版本和内容并发校验后才推进 `lastMaintainedRevision`。状态工具只做确定性记账：不解析知识语义、不扫描仓库判断事实、不决定 Overview/Index/Page 结构，也不把 source/target 变化判成漂移。知识文件必须解析为当前可读普通文件；状态更新使用短锁、revision 比较和原子替换。状态缺失或损坏时上层 audit/maintain 扩大核对范围，而不是把已有知识判失效。

#### PR 状态与依赖链

首个可执行代码托管集成为 GitHub，使用现有 `gh` 认证读取事实。GitHub 是外部业务工具，不是编程宿主依赖。其他托管平台可由宿主现有工具提供等价事实；事实不足时报告，不在 V1 建通用 forge 插件系统。

`inspect-pr` 至少返回仓库、PR、head/base、开放／关闭／合并状态、是否草稿、mergeability、必需检查、未解决审查项及数据缺失。支持分页，不根据第一页或空检查列表推断通过。合并状态为 UNKNOWN 或权限导致字段缺失时返回未知，不转换成可合并。

PR 事实结论分为 `COMPLETE | READY | WAITING | BLOCKED | UNKNOWN`，另列 blocker 类型。READY 仅表示平台状态满足当前合并条件，不代表独立验证或动作授权满足。脚本不执行“试一下合并”来探测状态。

PR 链从明确目标列表和平台实际 base/head 关系核对，禁止用分支名排序推断。拓扑修改前后更新 generation；旧 generation 的跟进结果不可用于新链。执行 merge、rebase、push 的是获授权 Agent 使用的工具，记账脚本只记录和核对结果。

#### 计划检查、Task Audit 与旧决策日志

计划检查要求每个工作单元有目标、文件范围、依赖、可观察结果、适用验证和停止点。缺少验证不能用固定句式填充通过。性能或界面检查不适用时必须给出具体原因。

新的工程任务使用 Task Audit 作为唯一任务级审计主记录。Decision 直接写入 Audit 的 Decisions 区，不再产生第二份 `decisions.tsv`。Task Audit 记录可公开解释的简短理由，不保存私密推理过程；Evidence 使用路径、版本、Trace、Acceptance 或 Verification 引用，提交或导出前去除个人路径和敏感内容。

`log.mjs` 和旧 TSV 格式 `time, phase, decision, reason, evidence, result` 暂时保留兼容，不作为新任务的完成门禁或 Harness Learning 数据源。新的 fail-closed 规则只以 Task Audit 的 final validate 为准。
