中文 | [English](./README.en.md)

# nimo

我维护 nimo。这一年我看着大家把越来越多的活交给 agent：写得越来越快，验证得越来越少，交付越来越像抽奖。我不接受用吞吐换质量。想走得快，先挖得深。

**nimo 是我的回答。** 它不运行模型、不执行工具——那是宿主（Codex、Claude Code）的事。nimo 做的是工程纪律本身：原则、任务做法、可替换的研发能力、真实验证、持续改进。目标不是最大化代码行数，恰恰相反：**nimo 帮你写得更少，但每一行都有证据。**

**nimo 给你可审计的交付。** 每个结论都挂在产物和证据上：没验证就标未验证，缺条件就报告受阻，跳过的检查如实标注。子 agent 说「已完成」不算数，主 agent 核对过才算数。

**换什么都不换标准。** 换模型、换宿主、换研发 skill，任务目标、工程要求和交付标准不变。换 skill 只换能力层，换宿主只换运行时。

fork 它，改它，把它变成你自己的。欢迎 PR。

## 安装

前置：Codex CLI 0.144+ 或 Claude Code 2.0.20+。

```powershell
# Windows（PowerShell）
git clone https://github.com/ttttstc/nimo.git
cd nimo
.\integrations\codex\install.ps1          # Codex
.\integrations\claude-code\install.ps1    # Claude Code
```

```bash
# macOS / Linux
git clone https://github.com/ttttstc/nimo.git
cd nimo
./integrations/codex/install.sh           # Codex
./integrations/claude-code/install.sh     # Claude Code
```

安装脚本只写 nimo 自己的文件，清单记录所有权，不碰你任何其他配置。卸载干净，隔离目录测试安装随时可复跑。

## 上手

两步：

1. 安装（上面已完成）。
2. 在任意项目目录里说一句：

```text
claude -p "使用 nimo skill：看看这个项目接下来应该怎么推进，先讨论，不要修改任何文件。"
```

就这些。预期得到当前状态、主要缺口、优先动作和完成条件——「先讨论」阶段不修改任何文件，`git status` 可以核对。其余 skill 都是按需的，入口会在需要时调用它们。

## 怎么用

在任务开头用统一入口。它读你的请求，从 playbook 里选，按步骤调用其他 skill。

### 就用 `nimo`

```text
$nimo 这个需求接下来应该怎么推进？

$nimo 修复登录后一直加载的问题，复现并验证。

$nimo 实现项目列表筛选，保持现有接口兼容。
```

被调用后它：

1. 判断意图：指导还是执行。判断不了就按指导处理，没有副作用。
2. 匹配 playbook，拷贝步骤；推荐步骤可按任务重排，必要检查不能静默省略。
3. 按步骤调用 skill；非简单实现默认委派子 agent，带完整任务合同，主 agent 验收。
4. 交付带证据的结论：通过、失败、未验证，分别说清。

明确措辞永远优先于推断：「先讨论」「不要修改」只读不改；「继续」只承接最近一条具体提议，不扩大范围；「停下」就停下并保存现场。完整约定见 [skills/nimo/SKILL.md](skills/nimo/SKILL.md)。

### playbooks

| playbook                                               | 用于                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| [bug](skills/nimo/references/playbooks/bug.md)         | 复现缺陷，保留失败证据，定位根因，最小修复，区分修复前／后结果。                |
| [feature](skills/nimo/references/playbooks/feature.md) | 新行为或改行为，从明确验收开始，行为验证后交付。                               |

### skills

入口会在需要时调用大部分 skill。下表是你要直接用的时候：

| skill                                                          | 什么时候用                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [nimo](skills/nimo/SKILL.md)                                   | 任何正经任务的默认入口。                                                 |
| [nimo-setup](skills/nimo-setup/SKILL.md)                       | 安装检测与配置：安装、更新、卸载、能力检测。                              |
| [verification-create](skills/verification-create/SKILL.md)     | 你的项目还没有可证明行为的验证方式。生成项目本地验证 skill 和功能地图。      |
| [verification-maintain](skills/verification-maintain/SKILL.md) | 功能地图和产品漂移了。源码核对＋实际跑一遍，三分类处置。                    |
| [skill-evaluate](skills/skill-evaluate/SKILL.md)               | 你想知道改 skill 有没有真的变好。隔离比较，盲评，回归检查。                |

## 在栈里的位置

nimo 是 AI 研发栈里的「工程方法层」：

| 层             | 谁提供                        | 管什么                                     |
| -------------- | ----------------------------- | ------------------------------------------ |
| 模型层         | LLM                           | 推理                                       |
| agent 运行时层 | Codex / Claude Code / Cursor  | 模型调用、工具、权限、会话、子 agent        |
| **工程方法层** | **nimo**                      | 原则、playbook、能力合同、质量门禁、评测维护 |
| 项目资产层     | 你的项目 `.nimo/`             | 功能地图、验证脚本、检查点                  |
| 强制控制层     | 你的 CI 和仓库保护            | 合并、发布的强制门禁                       |

nimo 定义「怎样才算做对了、做完了」，宿主执行，你的 CI 兜底。你的 CI 永远是最后一道门，nimo 不替代它。

## 原则

十条工程原则，一条一个。入口在任务开始时读索引，按需展开，不逐条罗列原则名。

| 原则                    | 规则                                                        |
| ----------------------- | ------------------------------------------------------------ |
| P1 先理解事实与领域结构  | 先读相关代码、规格与运行方式，弄清结构再动手。                |
| P2 最少变更完整解决      | 最小变更解决问题，不引入当前任务不需要的抽象。               |
| P3 验证真实产物         | 结论与证据匹配，不以「代码看起来正确」替代真实验证。         |
| P4 bug 先复现并定位根因 | 先拿到可重复的失败，再修复；不遮蔽症状。                     |
| P5 拆成可验证单元       | 长任务拆小，实现顺序按「可验证」组织，不堆未验证变更。        |
| P6 明确状态所有权       | 明确每份状态的所有者与写入者，优先单一写入者。               |
| P7 重试前核对副作用     | 可重试操作检查幂等性；超时后先查询结果，不直接重发。          |
| P8 只携带必要上下文      | 委派与交接传必要摘要和文件引用，不原样转发整个会话。          |
| P9 确定性错误转成约束   | 重复出现的错误优先转成类型、lint、脚本或 CI，不靠提示词。    |
| P10 授权范围内自主推进   | 授权范围内自己干，产品取舍列选项交还用户。                   |

完整规则、适用情境与例外见 [references/principles.md](skills/nimo/references/principles.md)。

## 不做什么

- 不自建 agent 运行时、workflow engine、任务平台、长期记忆、插件 SDK。宿主有就用宿主的，宿主没有就如实降级。
- 不替代你的 CI 和仓库保护。完成检查是工程要求，不是强制门禁；提示词也不是安全沙箱。
- 不做多项目编排、自动合并发布队列。性能优化、专门重构以后再说，不进第一版。
- 不自动安装陌生 skill，不动态拉取未审查脚本。只用当前环境可见或项目已登记的能力。
- 宿主缺能力（无并行、无独立上下文、无产品操作工具）时，如实报告受阻，不把期望当结果。

## 实测状态

部分运行验证证据随仓库归档，其余按任务在本地保留。说几点真的：

- Claude Code 2.1.23 里真实跑通过：会话 attribution 证明 skill 被加载，「先讨论」后 `git status` 干净，指导输出四要素齐全（[issue-8](docs/evidence/issue-8/real-invocation.log)）。
- 功能地图维护巡检在样例项目上真实抓到过文档漂移、工具缺口和一个真产品缺陷——前两者修了并复跑通过，缺陷如实上报，没改预期去迎合它。
- 子 agent 协作纪律 10 项实测通过（[issue-3](docs/evidence/issue-3/README.md)）；安装脚本 12 项行为测试通过（[issue-2](docs/evidence/issue-2/install-scripts-test.log)）。

还没验证的：Codex 内真实调用、官方 Anthropic 端点下的行为、原生 macOS/Linux、bug playbook 端到端、候选比较。没验证就不算能用。

## 更多

- [nimo 总体设计](docs/nimo-overall-design.md)：系统结构、用户路径、功能地图、评测维护与验收要求。
- [Codex 接入](integrations/codex/README.md) / [Claude Code 接入](integrations/claude-code/README.md)：安装、隔离测试、更新与卸载。
- [skill-evaluate](skills/skill-evaluate/SKILL.md)：评测案例组织、隔离执行与评分流程。
