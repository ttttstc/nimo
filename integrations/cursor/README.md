# cursor 接入

使用相同的 42 个 Skill 和 Node.js 工具。安装前需要 Node.js 22+ 和 npm；宿主自身必须支持读取 Skill。

目标为 `~/.cursor/skills`（用户级，较新版本支持）。只在单个项目生效时，改用[通用接入](../generic/README.md)安装到该项目的 `.cursor/skills/`。安装不修改宿主模型、权限或凭据。

```powershell
.\integrations\cursor\install.ps1
.\integrations\cursor\install.ps1 -Source 'D:\work\nimo' -CursorHome 'D:\temp\isolated-cursor'
.\integrations\cursor\uninstall.ps1 -CursorHome 'D:\temp\isolated-cursor'
```

macOS/Linux 使用同目录 Bash 脚本，参数为 `--source` 和 `--cursor-home`。绝对路径中包含空格时加引号。

安装器先在临时目录准备锁定的生产依赖，再完整预检目标。无归属或已修改的同名文件会阻止更新，不混装。卸载只删除清单哈希仍匹配的内容，保留项目知识、验证地图、证据和用户自定义文件。

安装后重新加载 Cursor 窗口（Reload Window），Cursor 按 SKILL.md 的 description 自动匹配触发，也可用 `/` 命令手动调用。以实际调用确认可用，不只检查文件存在。能力不足时的降级与受阻边界见 `skills/nimo-mode/references/host-contract.md`。
