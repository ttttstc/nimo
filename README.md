# nimo

**AI 原生工程栈。** 在现有 AI 编程工具中，通过一个入口获得工程指导或执行研发任务。

> v0.1 骨架已提供可安装实现：统一入口（指导／执行识别、明确措辞优先）、最小工程原则索引、能力合同与默认组合、项目覆盖约定、Codex 安装与卸载脚本。v0.2 接入 Bug／Feature Playbook、子 Agent 协作纪律（任务合同、启动规格、验收与停止）与最小检查点／恢复。各能力实际验证状态见下方「验证状态」，未验证的能力不视为已可用。

## 一个入口

知道要做什么时，让 nimo 执行；不知道下一步时，让它根据项目现状给出指导。

```text
$nimo 这个需求接下来应该怎么推进？
$nimo 看看方案还缺什么，先不要实现。
$nimo 修复登录后一直加载的问题，复现并验证。
```

nimo 根据自然语言识别意图，优先遵守“先讨论”“不要修改”“开始实现”等明确要求；“继续”只承接最近一条具体行动提议。

## 安装（Codex）

见 [integrations/codex/README.md](integrations/codex/README.md)。安装脚本只写入 `CODEX_HOME/skills` 下的 nimo 自有文件并以清单记录所有权，不触碰用户其他配置；支持隔离目录测试安装与干净卸载。

## 核心能力（v0.1 状态）

- **工程指导与任务执行**：入口已实现；Bug／Feature Playbook 已接入（`skills/nimo/references/playbooks/`）。
- **按需加载工程原则**：已实现最小原则索引（10 条，含适用情境与例外）。
- **可替换研发 Skill**：能力合同与默认组合已实现（默认为宿主原生能力），项目可经 `.nimo/project.yaml` 覆盖。
- **子 Agent 协作**：已实现协作纪律（非简单默认委派、六项任务合同、启动规格有效指定优先、待验收／接受／退回、分片缺失与停止未知处理；`skills/nimo/references/delegation.md`）。
- **项目验证与功能地图**：计划中（[#4](https://github.com/ttttstc/nimo/issues/4)）。
- **检查点与恢复**：已实现最小检查点模板、证据版本区分、进度与质量分开、恢复核实现场（`skills/nimo/references/checkpoints.md`）。
- **Skill 评测维护**：计划中（#4）。

## 验证状态（2026-09-06）

**已验证（Windows，PowerShell 5.1；协作纪律实测宿主为 TRAE）：**

- 安装／卸载脚本隔离目录行为测试 12 项全部通过（证据：[docs/evidence/issue-2/install-scripts-test.log](docs/evidence/issue-2/install-scripts-test.log)，可用 `integrations/codex/test-install.ps1` 复跑）：干净安装、幂等重装、用户修改不被覆盖、卸载只删自有文件、他人同名文件冲突保护、干净卸载无残留、过期用户修改文件保留清单记录、`-Source` 相对路径／尾分隔符／8.3 短路径规范化、清单越界路径（`..`／绝对路径）时卸载拒绝删除任何文件、安装跳过旧文件清理并自愈清单。
- 子 Agent 协作纪律 9 项实测通过（证据：[docs/evidence/issue-3/README.md](docs/evidence/issue-3/README.md) 与 [final-verification.log](docs/evidence/issue-3/final-verification.log)）：Feature 任务默认委派＋父 Agent 验收、启动规格三用例（默认／部分指定／不可用指定报错）、嵌套禁止（合同＋宿主双重）、必需分片缺失不误报完成、检查点证据失效识别与重跑、停止未知先核实现场、独立上下文审查实际差异、非强制跳过如实标注且强制门禁不被对话覆盖、检查点单一写入所有者。
- Skill 文件布局与内部引用静态检查。

**未验证（不视为已可用）：**

- **候选比较（A17）、Bug Playbook 端到端、“无独立上下文”降级、正向嵌套拆分、子 Agent 级暂停／取消传递**：见 [docs/evidence/issue-3/README.md](docs/evidence/issue-3/README.md) 未验证清单；对应规则已写入指令，行为未经实跑。
- **Codex 内真实发现与调用 nimo**（含“先讨论不写文件”“继续只承接提议”“仅位于 `~/.agents/skills` 的 provider 检测”，以及委派调用约定在 Codex 内的行为）。复验步骤：按 [integrations/codex/README.md](integrations/codex/README.md)「隔离测试安装」与「验证发现与调用」两节，在隔离 `CODEX_HOME` 安装后运行 `codex exec "使用 nimo skill：……先讨论，不要修改任何文件。"`，核对回答包含现状／缺口／下一步，且 `git status` 无文件修改。
- **macOS／Linux 安装脚本**（本机无 bash 执行环境，仅静态复查；两个脚本已带可执行位）。
- Cursor、Claude Code 接入未开始。

## 工具接入计划

Codex 为首个完整验收目标，Cursor、Claude Code 逐一接入。核心工程内容共用，工具、模型和子 Agent 使用宿主原生能力。缺少必要能力时明确报告限制。

## 设计文档

[阅读 nimo 总体方案](docs/nimo-overall-design.md)，了解系统结构、用户路径、功能地图、评测维护、交付范围和验收要求。
