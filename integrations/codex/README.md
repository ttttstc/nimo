# codex 接入

使用相同的 42 个 Skill 和 Node.js 工具。安装前需要 Node.js 22+ 和 npm，PR 操作另需 gh；宿主自身必须支持读取 Skill。

目标为 CODEX_HOME/skills，环境变量未设置时为 ~/.codex/skills。安装不修改宿主模型、权限或凭据。

```powershell
.\integrations\codex\install.ps1
.\integrations\codex\install.ps1 -Source 'D:\work\nimo' -CodexHome 'D:\temp\isolated-host'
.\integrations\codex\uninstall.ps1 -CodexHome 'D:\temp\isolated-host'
```

macOS/Linux 使用同目录 Bash 脚本，参数为 --source 和 --codex-home。绝对路径中包含空格时加引号。

安装器先在临时目录准备锁定的生产依赖，再完整预检目标。无归属或已修改的同名文件会阻止更新，不混装。卸载只删除清单哈希仍匹配的内容，保留项目知识、验证地图、证据和用户自定义文件。

安装后重新加载宿主的 Skill 发现，再明确调用 nimo-mode；是否需要重启由宿主决定。以实际调用确认可用，不只检查文件存在。

隔离安装测试入口是 test-install.ps1，全部生成数据位于系统临时目录。程序测试、真实宿主调用和真实平台验证分别报告。
