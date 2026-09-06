---
name: nimo-setup
description: "nimo 安装与配置检测。当用户要求安装、更新或卸载 nimo，检测已安装能力，初始化项目配置（.nimo/project.yaml），或排查能力绑定问题时使用。只检测与报告，不自动安装陌生 Skill，不覆盖用户配置。"
---

# nimo 安装与配置检测

职责：安装指导、能力检测、项目初始化、绑定问题排查。检测与排查请求只读，不修改任何文件；仅当用户明确请求安装、更新、卸载或初始化时才执行相应变更，且已有配置不覆盖。

## 安装、更新与卸载（Codex）

- 一律使用 nimo 仓库 `integrations/codex/` 下的脚本（Windows：`install.ps1`／`uninstall.ps1`；macOS／Linux：`install.sh`／`uninstall.sh`），不要手工复制文件。
- 脚本只写入 `<CODEX_HOME>/skills` 下的 nimo 自有文件并记录清单（manifest）；不触碰 `config.toml`、`auth.json`、其他 Skill 或用户任何无关配置。
- 更新时用户修改过的文件会保留并报告；卸载只删除本次安装拥有且未被用户修改的文件。
- 具体命令与隔离测试方法见仓库 `integrations/codex/README.md`；当前环境找不到仓库时，说明无法定位安装来源并请用户提供，不凭记忆执行安装。

## 能力检测

检测范围（默认 `~/.codex/skills`，或 `CODEX_HOME` 环境变量指向的目录）：

1. 列出 skills 目录下的 Skill 目录，区分 nimo 自有（`nimo`、`nimo-setup`，后续版本的 `verification-*`、`skill-evaluate`）与第三方 Skill。
2. 校验 `.nimo/project.yaml`（若存在）：每个 `provider: skill` 的条目检查对应 Skill 目录与 SKILL.md 是否存在；`provider` 值不认识时报告为无效绑定。
3. 输出报告：可用能力、缺失项、无效绑定及原因、使用的默认组合版本（nimo Skill 内 `references/defaults/capabilities.yaml` 的 `version`）。

规则：缺失或无效如实反馈；不静默回退到其他实现；不自动安装任何 Skill；用户明确限定实现时，报告该实现不可用而不是替换。

## 项目初始化

用户要求“初始化 nimo 项目配置”时：

- `.nimo/project.yaml` 不存在 → 创建最小模板（见下）。
- 已存在 → 只校验与报告，不覆盖、不重排用户内容。
- 不创建无关目录；`.nimo/tasks/`、`.nimo/verification/` 由相应能力按需创建，初始化时不预建。

模板：

```yaml
version: 0.1
# 能力覆盖：仅声明需要覆盖的项，未声明的使用团队默认（宿主原生能力）。
# capabilities:
#   implement:
#     provider: skill
#     skill: my-implement-skill
```

## 边界

- 不修改用户全局配置、凭据或其他 Skill 的文件。
- 检测结果仅描述当前环境事实；能力是否真的可用以实际调用为准，不以“目录存在”等同“能力可用”。
- 发现安装冲突（目标文件已存在且无法证明为 nimo 所有）时报告清单与处理建议，不强行覆盖。
