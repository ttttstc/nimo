# 安全暂停

标识：PB22。安全暂停时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)

## 步骤

干净的停止归你所有：留下一个冷启动的 Agent 也能接手的检查点。适用于"安全暂停""我要下线了""重启宿主""赶飞机"，以及上下文即将被压缩或摘要时。只响应明确请求：听到"继续""我去睡了，继续做""别停"时不暂停——那些话的意思是继续，而 [持续完成一个目标](autonomous-run.md) 本来就每轮迭代写检查点。

1. **停在安全边界。** 完成当前原子步骤，或从中退出来；绝不停在已知破坏状态的半编辑上。不开任何新工作，取消所有嵌套子 Agent；宿主无停止接口时按 [宿主合同](../references/host-contract.md) 停止派发并报告仍可能运行的任务，不谎称已全部停止。
2. **不为暂停跨过不可逆线。** 不 push、不开 PR，除非此前已获授权且已有进行中的。
3. **让工作可持久。** 把未提交的编辑在当前分支上做成一个清晰的 `wip:` 提交，保证不丢失——仅在用户当前授权允许提交时执行；无提交授权时保留未提交现场，并在恢复记录中写明。工作区是坏的，就在提交正文里用一行说明。
4. **把恢复记录写到上下文之外。** 字段：意图、正在做什么、进度与已验证的部分、当前状态、下一步、关键文件、坑。上下文即将压缩时把它写进文件（如系统临时目录或任务目录下的 `<slug>-resume.md`），因为留在上下文里的计划活不过摘要。存在 [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md) 轨迹时，指向它而不是复制它。

## 必要条件与停止

"暂停"不自动授权提交、推送或撤销其他人的修改；"停止所有写入"时只能报告现有状态，不再为保存检查点写文件。记录和代码一致比强行制造干净工作区更重要。

停止所有写入时不再保存新检查点。只有允许保留现场时才写本地记录，不自动提交 WIP。报告所有无法确认停止的执行者和外部动作。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)

## 交付

回复你在循环中的位置、磁盘上与仍在脑中的内容（给路径，不倒 diff）、本次做的提交与工作区是否干净、恢复后的第一个动作。这是暂停，不是最终报告；恢复入口是 [接续已有工作](session-pickup.md) 读这份记录。附返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack pause-safely](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/pause-safely.md)。
