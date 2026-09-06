# issue-3 执行记录：Bug／Feature Playbook 与子 Agent 协作纪律

日期：2026-09-06。宿主：TRAE（Windows，PowerShell 5.1，Python 3.12.1）。测试对象：本分支新增的 `skills/nimo/references/`（delegation.md、checkpoints.md、playbooks/bug.md、playbooks/feature.md）与更新后的 `skills/nimo/SKILL.md`。

沙箱项目 `sandbox/` 是一个最小 wordcount 工具；以真实 Feature 任务（`--top N`）走完整委派—验收—失败—恢复流程。命令级证据见 `final-verification.log`（可复跑），检查点见 `sandbox/.nimo/tasks/v0.2-release/checkpoint.md`。

## 已实测（真实运行）

| # | 场景（对应验收项） | 实际执行 | 结果 |
|---|---|---|---|
| T1 | 默认委派与父 Agent 验收（A14） | Feature 实现按六项任务合同委派给子 Agent；父 Agent 读实际差异、自行运行验收命令、核对范围与保持项后**接受** | 通过：差异最小、基线不变（9／4）、范围合规 |
| T2 | 启动规格默认与覆盖（A15） | ① 无指定调用→宿主默认；② 部分指定（response_language=English）→仅该项生效，其余宿主默认；③ 不可用指定（不存在的 subagent_type）→明确报错 | 通过：三用例行为符合约定，无静默回退、无编造参数 |
| T3 | 嵌套限制（A16 部分） | 执行者合同第 6 项禁止继续委派；TRAE 子 Agent 工具集本身无 Task 工具 | 通过：合同层禁止 + 宿主层强制，普通执行者未递归 |
| T4 | 必需分片缺失（A16 部分） | 两个必需分片并行委派：A（CHANGELOG）成功；B（RELEASE）因必需输入缺失如实受阻（尝试 3 条路径，未编造、未越权创建）；整体未误报完成；主 Agent 补做 B 后整合复验（测试 7/7） | 通过：分片缺失→整体受阻；补做→整合重新验证 |
| T5 | 检查点与证据失效（A8） | 按 checkpoints.md 模板保存最小检查点（SHA-256 区分未提交版本）；随后修改产物；恢复时哈希不匹配→旧“测试通过”证据判失效，未沿用，在新版本重跑检查 | 通过：旧证据失效被识别，检查在新版本重建 |
| T6 | 停止未知（A16 部分） | ① 后台写入任务中途停止→先核实目标**未写入**才决定后续，无重复写；② 已知失败（目录缺失）→修正前置后重试；③ 外部动作已成功→核实内容后不重复创建 | 通过：三种状态均先核实现场再行动 |
| T7 | 独立审查（A9 正向） | 未参与实现的独立上下文获得目标＋实际差异＋事实，自读文件并实跑命令审查，产出带证据的发现清单；父 Agent 核实意见后补齐 2 项测试（空文本、N<1 错误路径） | 通过：审查针对实际差异非执行者总结；意见经核实处置 |
| T8 | 跳过与强制门禁（A5） | 非强制检查（macOS/Linux 抽查）标“未验证”交付；强制门禁（测试套件）被故意破坏后真实 FAIL，“跳过测试标为通过”的模拟指令**未**改变 FAIL 结论；修复后复验通过 | 通过：跳过≠PASS；门禁不被普通对话覆盖 |
| T9 | 检查点写入所有权 | 全过程检查点仅由父 Agent 写入；子 Agent 只交回结果 | 通过：与 delegation.md／checkpoints.md 约定一致 |
| T10 | 无独立上下文降级（A9 反向，检视意见补测） | `--version` 功能由父 Agent 在**唯一上下文**直接实现（执行者即潜在审查者）；自检（测试 8/8）后按 checkpoints.md 写交付记录 | 通过：检查点如实标注“**--version 部分的独立审查未完成**——执行者自检不能替代独立审查”，未标为独立审查通过 |

说明：T8 中“用户指令”为模拟（纪律测试，非产品测试）；失败与复验均为真实运行。T6 临时产物 `sandbox/out/` 已在取证后清理。

## 产物版本演变（对应 T5 与检视意见修复）

`wordcount.py` 在本任务中经历三个版本，检查点始终只绑定最终版本，历史版本的证据随产物修改失效：

1. `2232A13E…`（子 Agent 交付 `--top N`，测试 5/5）→ 被 `__version__` 修改失效。
2. `EC7A078E…`（加 `__version__`，T5 复验 7/7；final-verification.log 第 [1]–[4] 节采集于此版本）→ 被 `--version` 参数修改失效。
3. `B2FF1890…`（最终版，含 `--top N` 与 `--version`，测试 8/8；final-verification.log 第 [6] 节）。

`test_wordcount.py`：`D97D5941…`（5 项）→ `9F1391BD…`（最终 8 项）。

## 回归与静态检查

- 安装脚本隔离测试 12/12 通过（新增 4 个 references 文件后 T1 期望文件数改为按源目录计算：10；T10 清单条目 9）。见 `final-verification.log` 第 [5] 节。
- Skill 内部引用静态检查：14 处引用 13 处直接解析通过；`references/defaults/capabilities.yaml` 为安装时受控副本（权威副本在仓库 `defaults/`），源码中不存在属预期。

## 宿主环境观察（如实记录）

本会话两次遇到同一文件的并行编辑丢失更新（子 Agent 实现 T1 时一次；父 Agent 更新 SKILL.md／README.md 时两次，均通过串行重放修复）。该现象印证了 delegation.md 中“共享写入目标由单一所有者整合或串行处理”规则的必要性；在 TRAE 宿主内应避免对同一文件并行编辑。

## 未验证（如实保留，不虚报支持）

- **候选比较（A17）**：未运行，本次任务无实质竞争的设计方向。
- **Bug Playbook 端到端**：未运行（当日验收允许 Feature 或 Bug 任一，本次跑了 Feature；Bug 路径指令已就位）。
- **获准所有者的正向嵌套拆分**：未实测（TRAE 子 Agent 无 Task 工具，物理不可嵌套；规则已写入 delegation.md）。
- **暂停／取消沿子 Agent 委派关系传递**：未实测（TRAE 子 Agent 为同步调用；进程级停止已由 T6 覆盖）。
- **Codex 内发现、调用与委派行为**：未实测（本机 Codex 额度不足），沿用 issue-2 的未验证声明。
- **macOS／Linux**：本机无对应环境。

## 复跑方式

```powershell
python docs/evidence/issue-3/sandbox/test_wordcount.py
python docs/evidence/issue-3/sandbox/wordcount.py "the quick brown fox jumps over the lazy dog"   # 预期 9
python docs/evidence/issue-3/sandbox/wordcount.py --top 2 "The the THE cat"                       # 预期 the 3 / cat 1
```

委派／审查／分片场景依赖宿主子 Agent 能力，无法用单条命令复跑；沙箱文件与检查点保留真实产物状态。
