# 通用宿主接入

面向没有单独集成的宿主。宿主只需能读取 Markdown 和执行本地命令；模型、Agent、权限、会话和持续运行由宿主自身提供，本包不要求 provider 或调度框架。

安装前需要 Node.js 22+ 和 npm。`--target` 必填，指向宿主读取 Skill 的目录，没有默认值；路径含空格时加引号。

```powershell
.\integrations\generic\install.ps1 -Target 'D:\work\host\skills'
.\integrations\generic\install.ps1 -Target 'D:\work\host\skills' -Source 'D:\work\nimo'
.\integrations\generic\uninstall.ps1 -Target 'D:\work\host\skills'
```

macOS/Linux 使用同目录 Bash 脚本，参数为 `--target` 和 `--source`。

安装器先在临时目录准备锁定的生产依赖，再完整预检目标。无归属或已修改的同名文件会阻止更新，不混装。卸载只删除清单哈希仍匹配的内容，保留项目知识、验证地图、证据和用户自定义文件。安装不修改宿主模型、权限或凭据。

安装后重新加载宿主的 Skill 发现（是否需要重启由宿主决定），再明确调用 nimo-mode，以实际调用确认可用，不只检查文件存在。宿主自动触发机制不足是预期情况：能发现文件不等于能自动启用 Mode。

宿主缺少子 Agent、后台唤醒或停止 API 时的降级与受阻边界，见 `skills/nimo-mode/references/host-contract.md`。接入前建议按该合同逐项核对宿主能力，能力不足的功能按受阻处理，不伪造结果。
