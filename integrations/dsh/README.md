# dsh（DeepSeek Harness）接入

使用相同的 42 个 Skill 和 Node.js 工具。安装前需要 Node.js 22+ 和 npm；dsh 自身要求 Node ^22.19 或 >=24。

目标为 `~/.dsh/skills`，`DSH_HOME` 环境变量已设置时为 `$DSH_HOME/skills`。dsh 也扫描 `~/.agents/skills/`（用户级共享）和项目级 `.dsh/skills/`、`.agents/skills/`。安装不修改宿主模型、权限或凭据。

```powershell
.\integrations\dsh\install.ps1
.\integrations\dsh\install.ps1 -Source 'D:\work\nimo' -DshHome 'D:\temp\isolated-dsh'
.\integrations\dsh\uninstall.ps1 -DshHome 'D:\temp\isolated-dsh'
```

macOS/Linux 使用同目录 Bash 脚本，参数为 `--source` 和 `--dsh-home`。绝对路径中包含空格时加引号。

安装器先在临时目录准备锁定的生产依赖，再完整预检目标。无归属或已修改的同名文件会阻止更新，不混装。卸载只删除清单哈希仍匹配的内容，保留项目知识、验证地图、证据和用户自定义文件。

dsh 的 skill 子系统在 standard 等预设下由 dsh-skill-filesystem 扫描目录，minimal 预设没有 skills 能力。技能文件改动热更新，无需重启会话；模型按 description 匹配自动调用 skill 工具，也可用 `/技能名` 手动触发。以实际调用确认可用，不只检查文件存在。

dsh 处于 rc 阶段，官方声明可能存在破坏性变更；目录约定变化时以宿主文档为准。能力不足时的降级与受阻边界见 `skills/nimo-mode/references/host-contract.md`。
