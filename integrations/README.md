# 宿主接入

核心只使用标准 SKILL.md、Markdown 和 Node.js 工具。模型、Agent、权限、会话、真实操作面及持续运行由当前宿主提供，不要求特定编程产品。

[Codex](codex/README.md) 与 [Claude Code](claude-code/README.md) 使用相同的 42 个 Skill。其他宿主可明确给出 Skill 根目录，通过包内安装器安装；不需要实现 provider 或调度框架。

安装示例（路径换成实际绝对路径）：

```text
node skills/nimo-mode/scripts/install.mjs install --source /absolute/nimo --target /absolute/host/skills
node skills/nimo-mode/scripts/install.mjs uninstall --target /absolute/host/skills
```

Node.js 22+，源码安装需要 npm。安装只在临时目录准备锁定依赖，预检成功才写目标；冲突不覆盖。卸载只删除仍匹配归属哈希的文件。项目知识、任务证据和用户配置不在卸载范围。

进入宿主后明确说“使用 nimo-mode”。能发现文件不等于能后台运行；[宿主合同](../skills/nimo-mode/references/host-contract.md) 给出降级和受阻边界。
