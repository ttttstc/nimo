# Claude Code 接入

nimo 以 Skill 包形式接入 Claude Code。安装脚本只写入 `<CLAUDE_CONFIG_DIR>/skills`（默认 `~/.claude/skills`）下的 nimo 自有文件，并以清单（`.nimo-manifest`）记录所有权；不触碰 `settings.json`、`.claude.json`、凭据、其他 Skill 或用户任何无关配置。

适用：Claude Code 2.x 及以上（依赖其 `~/.claude/skills` 个人级 Skill 目录约定；该目录下的变更可在当前会话内被实时检测，若安装前 skills 目录不存在则需重启 Claude Code）。

nimo 的 Skill 内容与 Codex 接入完全共用（同一套 `skills/nimo/`、`skills/nimo-setup/` 与 `defaults/capabilities.yaml`，遵循 Agent Skills 标准的 `SKILL.md` 格式），仅安装目标目录与配置目录解析不同。

## 安装

```powershell
# Windows（PowerShell）
.\integrations\claude-code\install.ps1
```

```bash
# macOS / Linux
./integrations/claude-code/install.sh
```

默认安装到 `CLAUDE_CONFIG_DIR` 环境变量指向的目录（未设置时为 `~/.claude`）。安装内容：

- `skills/nimo/`：统一入口 Skill

- `skills/nimo-setup/`：安装与配置检测 Skill

- `skills/nimo/references/defaults/capabilities.yaml`：默认能力组合的受控副本（权威副本在仓库 `defaults/capabilities.yaml`，不要手工维护安装副本）

## 隔离测试安装（不影响用户配置）

```powershell
$env:CLAUDE_CONFIG_DIR = "$env:TEMP\nimo-claude-test"
.\integrations\claude-code\install.ps1 -ClaudeConfigDir "$env:TEMP\nimo-claude-test"
```

```bash
export CLAUDE_CONFIG_DIR="$(mktemp -d)/claude"
./integrations/claude-code/install.sh
```

注意：隔离 `CLAUDE_CONFIG_DIR` 中没有认证凭据，`claude` 需要先登录或由用户自行决定凭据提供方式。nimo 脚本不会复制或修改任何凭据。

## 验证发现与调用

安装后在任意项目目录中调用 Claude Code 并点名 nimo：

```text
claude -p "使用 nimo skill：看看这个项目接下来应该怎么推进，先讨论，不要修改任何文件。"
```

也可在交互会话中以 `/nimo` 显式调用。预期行为：

- Claude Code 发现并读取 nimo Skill；

- “先讨论”阶段只读取和分析，不修改任务文件（可用 `git status` 核对）；

- 指导输出包含当前状态、主要缺口、优先动作和完成条件。

## 更新

重新运行安装脚本即可。规则：

- 文件未被用户修改 → 更新为新版本；

- 文件被用户修改过 → 保留现状并报告，不覆盖；

- 新版本中已删除的文件 → 未被修改时清理，被修改过时保留并报告；

- 目标位置存在无法证明为 nimo 所有的同名文件 → 跳过并报告冲突（退出码 1），不强行覆盖。

## 卸载

```powershell
.\integrations\claude-code\uninstall.ps1
```

```bash
./integrations/claude-code/uninstall.sh
```

只删除清单记录且未被用户修改的 nimo 文件；用户修改过的文件保留并报告（此时清单暂存，确认无需保留后可手工删除残留文件与清单）。

## 安装脚本行为测试

```powershell
.\integrations\claude-code\test-install.ps1
```

在隔离临时目录中验证 12 项行为：干净安装、幂等重装、用户修改不被覆盖、卸载只删自有文件、他人同名文件冲突保护、干净卸载无残留、过期用户修改文件保留清单记录、`-Source` 相对路径／尾分隔符／8.3 短路径规范化、清单越界路径（`..`／绝对路径）时卸载拒绝删除任何文件、安装跳过旧文件清理并自愈清单。全部通过时退出码 0，不影响用户配置。

## 已验证范围

见仓库根 README「验证状态」一节。Claude Code 内真实发现与调用的验证状态以该节为准，本 README 不单独声明。
