# 宿主接入

核心只使用标准 SKILL.md、Markdown 和 Node.js 工具。模型、Agent、权限、会话、真实操作面及持续运行由当前宿主提供，不要求特定编程产品。

所有集成使用相同的 42 个 Skill：

| 宿主 | 目录 | 状态 |
|---|---|---|
| [Codex](codex/README.md) | `~/.codex/skills` | 已在真实宿主验证 |
| [Claude Code](claude-code/README.md) | `~/.claude/skills` | 已在真实宿主验证 |
| [OpenCode](opencode/README.md) | `~/.config/opencode/skills` | 已验证技能识别（`opencode debug skill` 42/42） |
| [Cursor](cursor/README.md) | `~/.cursor/skills` | 目录约定与脚本就绪 |
| [dsh（DeepSeek Harness）](dsh/README.md) | `~/.dsh/skills` | 目录约定与脚本就绪 |

OpenCode 和 dsh 也扫描 `~/.agents/skills/` 用户级共享目录，Cursor 只在单个项目生效时可改用通用接入装到 `.cursor/skills/`。

其他宿主按[通用接入](generic/README.md)安装，明确给出 Skill 根目录即可；不需要实现 provider 或调度框架。`~/.agents/skills/` 是多个宿主共享的用户级目录，装一次可覆盖多个宿主。

安装示例（路径换成实际绝对路径）：

```text
node skills/nimo-mode/scripts/install.mjs install --source /absolute/nimo --target /absolute/host/skills
node skills/nimo-mode/scripts/install.mjs uninstall --target /absolute/host/skills
```

Node.js 22+，源码安装需要 npm。安装只在临时目录准备锁定依赖，预检成功才写目标；冲突不覆盖。卸载只删除仍匹配归属哈希的文件。项目知识、任务证据和用户配置不在卸载范围。

进入宿主后明确说“使用 nimo-mode”。能发现文件不等于能后台运行；[宿主合同](../skills/nimo-mode/references/host-contract.md) 给出降级和受阻边界。
