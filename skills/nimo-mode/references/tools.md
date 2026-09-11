### 3.9 少量本地工具的实现契约

工具使用 **Node.js 22 或更高版本、ES modules（`.mjs`）**，跨 Windows / macOS / Linux。YAML 使用 `yaml` 包的文档解析与编辑 API；实现时选择并锁定实际版本，提交 lockfile，不使用 `latest`。不保留 Bun 自动安装和 TypeScript 运行时前提。

脚本功能边界如下。没有模型调用、Agent 创建、持续调度、PR 写操作或隐式联网安装。

| 文件 | 输入与输出 | 职责与限制 |
|---|---|---|
| config.mjs | JSON 请求 → JSON 引用、诊断或修改结果 | 解析、路径、合并、去重、校验、增删；不决定原则语义冲突 |
| state.mjs | JSON 请求 → 当前记录或变更结果 | 本地项目单元、收件箱、验证记录、知识影响和版本；不运行单元、不运行知识审计 |
| inspect-pr.mjs | 仓库与 PR → JSON 状态 | 只读 GitHub 事实，有限请求后返回，不无限轮询 |
| audit-worktrees.mjs | 仓库 → 目录审计 JSON | 只读枚举和分类，不删除路径 |
| check-plan.mjs | Markdown 计划 → 问题与行号 | 检查单元依赖、证据、作用域和停止点，不强制模型／宿主句式 |
| log.mjs | 一条 JSON 决策 → TSV 记录 | 追加事实、理由、证据与结果，不记录内部推理全文 |

`config.mjs` 与 `state.mjs` 支持 `--input <request.json>`；请求通过文件传递，不把用户路径拼到 shell 代码。其他脚本使用参数数组，调用外部程序一律关闭 shell。stdout 只输出结果，stderr 输出简短诊断，不回显凭据或完整配置内容。

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

`knowledgeImpact` 是任务完成时的轻量知识影响信号。它不读取知识库、不代表 `nimo-knowledge-audit` 已执行、也不授权 `nimo-knowledge-maintain`。`REVIEW_RECOMMENDED` 必须包含至少一个受影响领域；其他结论的 areas 为空。

依赖 id 只表示已明确的工作前提，工具可以检查缺失、循环和重复，不能据此调度 Agent。`standing-orders.md` 保存范围和运行约束；每次启动与恢复均传递当前版本。

操作为 `init | read | update | reopen | inbox-add | inbox-drain | status`。update 携带 `expectedRevision`，由唯一协调者在短锁内校验后原子写入；revision 冲突返回 BLOCK。其余执行者只交报告，不能更新共享 program。收件箱每个结果写独立文件，同一事件标识幂等，drain 只处理本批已取得的结果，期间新到达结果留给下一批。

不引入服务数据库或常驻进程。锁不可取得时报告占用；不能仅因时间较久就强行清锁。自动回收仅限能够证明本机持有进程已结束的情况，其他情况交由当前所有者核实。

#### PR 状态与依赖链

首个可执行代码托管集成为 GitHub，使用现有 `gh` 认证读取事实。GitHub 是外部业务工具，不是编程宿主依赖。其他托管平台可由宿主现有工具提供等价事实；事实不足时报告，不在 V1 建通用 forge 插件系统。

`inspect-pr` 至少返回仓库、PR、head/base、开放／关闭／合并状态、是否草稿、mergeability、必需检查、未解决审查项及数据缺失。支持分页，不根据第一页或空检查列表推断通过。合并状态为 UNKNOWN 或权限导致字段缺失时返回未知，不转换成可合并。

PR 事实结论分为 `COMPLETE | READY | WAITING | BLOCKED | UNKNOWN`，另列 blocker 类型。READY 仅表示平台状态满足当前合并条件，不代表独立验证或动作授权满足。脚本不执行“试一下合并”来探测状态。

PR 链从明确目标列表和平台实际 base/head 关系核对，禁止用分支名排序推断。拓扑修改前后更新 generation；旧 generation 的跟进结果不可用于新链。执行 merge、rebase、push 的是获授权 Agent 使用的工具，记账脚本只记录和核对结果。

#### 计划检查与决策记录

计划检查要求每个工作单元有目标、文件范围、依赖、可观察结果、适用验证和停止点。缺少验证不能用固定句式填充通过。性能或界面检查不适用时必须给出具体原因。

决策 TSV 包含 `time, phase, decision, reason, evidence, result`，转义制表符和换行，并处理表格公式前缀。它记录可公开解释的简短理由，不保存私密推理过程。证据使用路径和版本引用；提交或上传前去除个人路径和敏感内容。
