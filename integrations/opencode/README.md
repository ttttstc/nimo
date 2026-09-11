# opencode 接入

使用相同的 42 个 Skill 和 Node.js 工具。安装前需要 Node.js 22+ 和 npm；宿主自身必须支持读取 Skill。

目标为 `~/.config/opencode/skills`，`XDG_CONFIG_HOME` 已设置时为 `$XDG_CONFIG_HOME/opencode/skills`。OpenCode 也会读取 `~/.claude/skills/` 和 `~/.agents/skills/`：已通过 Claude Code 集成安装过的用户无需重装。安装不修改宿主模型、权限或凭据。

```powershell
.\integrations\opencode\install.ps1
.\integrations\opencode\install.ps1 -Source 'D:\work\nimo' -ConfigDir 'D:\temp\isolated-opencode'
.\integrations\opencode\uninstall.ps1 -ConfigDir 'D:\temp\isolated-opencode'
```

macOS/Linux 使用同目录 Bash 脚本，参数为 `--source` 和 `--config-dir`。绝对路径中包含空格时加引号。

安装器先在临时目录准备锁定的生产依赖，再完整预检目标。无归属或已修改的同名文件会阻止更新，不混装。卸载只删除清单哈希仍匹配的内容，保留项目知识、验证地图、证据和用户自定义文件。

OpenCode 通过 skill 工具按需加载技能，可用 `opencode.json` 的 permission.skill 规则控制访问；被 deny 的技能对 Agent 不可见。安装后新开会话，明确调用 nimo-mode，以实际调用确认可用，不只检查文件存在。能力不足时的降级与受阻边界见 `skills/nimo-mode/references/host-contract.md`。
