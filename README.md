# nimo

**AI 原生工程栈。** 在现有 AI 编程工具中，通过一个入口获得工程指导或执行研发任务。

> v0.1 骨架已提供可安装实现：统一入口（指导／执行识别、明确措辞优先）、最小工程原则索引、能力合同与默认组合、项目覆盖约定、Codex 安装与卸载脚本。各能力实际验证状态见下方「验证状态」，未验证的能力不视为已可用。

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

- **工程指导与任务执行**：入口已实现；Bug／Feature Playbook 由后续版本接入。
- **按需加载工程原则**：已实现最小原则索引（10 条，含适用情境与例外）。
- **可替换研发 Skill**：能力合同与默认组合已实现（默认为宿主原生能力），项目可经 `.nimo/project.yaml` 覆盖。
- **子 Agent 协作**：计划中（[#3](https://github.com/ttttstc/nimo/issues/3)）。
- **项目验证与功能地图**：计划中（[#4](https://github.com/ttttstc/nimo/issues/4)）。
- **检查点与恢复**：入口已识别恢复请求并查找 `.nimo/tasks/` 检查点；检查点细则由 #3 接入。
- **Skill 评测维护**：计划中（#4）。

## 验证状态（2026-09-06）

**已验证（Windows，PowerShell 5.1）：**

- 安装／卸载脚本隔离目录行为：干净安装、幂等重装、用户修改不被覆盖、卸载只删自有文件、他人同名文件冲突保护，5 项全部通过（证据：[docs/evidence/issue-2/install-scripts-test.log](docs/evidence/issue-2/install-scripts-test.log)，可用 `integrations/codex/test-install.ps1` 复跑）。
- Skill 文件布局与内部引用静态检查。

**未验证（不视为已可用）：**

- **Codex 内真实发现与调用 nimo**。复验步骤：按 [integrations/codex/README.md](integrations/codex/README.md)「隔离测试安装」与「验证发现与调用」两节，在隔离 `CODEX_HOME` 安装后运行 `codex exec "使用 nimo skill：……先讨论，不要修改任何文件。"`，核对回答包含现状／缺口／下一步，且 `git status` 无文件修改。
- **macOS／Linux 安装脚本**（本机无 bash 执行环境，仅静态复查）。
- Cursor、Claude Code 接入未开始。

## 工具接入计划

Codex 为首个完整验收目标，Cursor、Claude Code 逐一接入。核心工程内容共用，工具、模型和子 Agent 使用宿主原生能力。缺少必要能力时明确报告限制。

## 设计文档

[阅读 nimo 总体方案](docs/nimo-overall-design.md)，了解系统结构、用户路径、功能地图、评测维护、交付范围和验收要求。
