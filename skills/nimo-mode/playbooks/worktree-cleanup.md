# 核实后清理工作目录

标识：PB23。核实后清理工作目录时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-boundary-discipline](../../nimo-principle-boundary-discipline/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 从 `git worktree list --porcelain` 枚举真实路径。
2. 检查分支、提交、未跟踪／忽略文件、PR 和使用状态。
3. 输出候选及保护原因。
4. 在授权内删除确定可清理项。
5. 重列并报告结果。

## 必要条件与停止

无法确认是否正在使用时保留。未跟踪文件不自动等于可丢弃数据。普通工作目录清理不扩展到用户聊天、宿主数据库或缓存；模拟器清理仅在明确请求且平台工具可用时单独核实目标。删除路径必须先解析、检查边界，禁止直接照搬 `rm -rf` 或无条件 `--force`。

先用 audit-worktrees.mjs 只读审计，传 repo 绝对路径、已知 base 和核实的 inUse 目录数组。未知使用状态就省略 inUse，未知项全部保留。本工具不删除；核实后才在授权内使用 Git 清理。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

使用实际终端和文件工具；不虚构额外 Skill。

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack worktree-cleanup](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md)。
