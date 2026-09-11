# 核实后清理工作目录

标识：PB23。核实后清理工作目录时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-boundary-discipline](../../nimo-principle-boundary-discipline/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-build-the-lever](../../nimo-principle-build-the-lever/SKILL.md)
- [nimo-principle-encode-lessons-in-structure](../../nimo-principle-encode-lessons-in-structure/SKILL.md)
- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)
- [nimo-principle-never-block-on-the-human](../../nimo-principle-never-block-on-the-human/SKILL.md)

## 步骤

磁盘和安全门归你所有。清理已合并或被放弃的 git worktree，回收磁盘空间。删除不可逆，所以每一步都在防止删掉正在使用或持有未提交工作的目录。

1. **快照并审计。** 先记录磁盘占用快照（`df -h` 可用时用 `df -h`，否则用宿主可用的磁盘查询），再运行本地审计工具 [audit-worktrees.mjs](../scripts/audit-worktrees.mjs)（用法见 [工具用法](../references/tools.md)；[建立可重复的工具](../../nimo-principle-build-the-lever/SKILL.md)原则），传仓库绝对路径、已知 base 和已核实的 in-use 目录数组。路径从 `git worktree list` 枚举，绝不手输——手输的清单会漏掉宿主或工具放在常规位置之外的 worktree（[把重复错误变成约束](../../nimo-principle-encode-lessons-in-structure/SKILL.md)原则）。工具按链接路径、本地文件与修改、合并状态（对 base 验证）、使用状态、锁定等逐目录给出分类和理由；候选是建议，不是许可，工具只读、从不删除任何东西。
2. **分类是建议，不是许可。** pinned 和活跃的会话／任务才是真实产物（[验证真实产物](../../nimo-principle-prove-it-works/SKILL.md)原则）。从用户或宿主界面拿到这个集合，交叉核对每一个候选。审计工具可能把用户正钉着的目录标成可清理——使用中的集合获胜。
3. **删除前核实使用状态。** 对每一个审计标记待核实的目录，以及任何你存疑的目录，派宿主独立子 Agent 读当前工作区的会话记录，报告该会话是否活跃、触及哪些 worktree（[保留必要上下文](../../nimo-principle-guard-the-context-window/SKILL.md)原则——会话记录体积大、读取慢，交给子 Agent 或后台跑，不占主线程）；宿主无独立子 Agent 时逐项向用户核实并记录降级。一个活跃任务可能通过后台执行者在兄弟 worktree 里派生试验树和复现树——即使它们的名字从未出现在界面上，也在使用中。
4. **不可逆损失前暂停。** 已跟踪文件的未提交修改（upstream 的 `wip:N`）：先展示 diff，让用户决定——移除干净的 worktree 可以从分支恢复，未提交的工作删了就没了。未跟踪文件（upstream 的 `scratch:N`）不自动等于可丢弃数据：点名文件清单，经用户确认后才丢弃。干净、对 base 验证已合并且确认不在使用的项，在用户已授权清理的前提下按 [授权内自主推进](../../nimo-principle-never-block-on-the-human/SKILL.md)原则继续，不为可逆的删除阻塞等待；有未提交工作和 in-use 的项暂停。
5. **清理确认集。** 逐路径删除：先 `git worktree remove <path>`（不带 `--force`，让 Git 拒绝仍有未提交修改或未跟踪文件的目录）；仅在该目录内容已确认丢弃后才允许 `--force`。目录因被忽略的构建产物残留时，点名残留内容并在授权内用文件工具删除，然后 `git worktree prune`。分支 ref 保留，已提交的内容不会丢。最后用磁盘占用快照和重新列表确认回收量。
6. **其他用户状态不在默认范围。** 宿主会话存储、宿主数据库、模拟器、构建与包缓存等，只在用户明确点名时单独核实目标后处理，且只清理用户没有说要保留的缓存。

本流程是唯一在没有代码审查兜底的情况下删除用户状态的 Playbook——上面的每一道门就是那次审查。

## 必要条件与停止

无法确认是否正在使用时保留。未跟踪文件不自动等于可丢弃数据。普通工作目录清理不扩展到用户聊天、宿主数据库或缓存；模拟器清理仅在明确请求且平台工具可用时单独核实目标。删除路径必须先解析、检查边界，禁止直接照搬 `rm -rf` 或无条件 `--force`。

先用 audit-worktrees.mjs 只读审计，传 repo 绝对路径、已知 base 和核实的 inUse 目录数组。未知使用状态就省略 inUse，未知项全部保留。本工具不删除；核实后才在授权内使用 Git 清理。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

使用实际终端和文件工具；不虚构额外 Skill。

## 交付

清理前后的磁盘快照与回收空间、已清理的 worktree 清单、每个被保留项的一行原因（被哪个会话或任务占用，或有未提交工作）；返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack worktree-cleanup](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/worktree-cleanup.md)。
