# 跨会话项目协调

标识：PB18。跨会话项目协调时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 明确完成单元、依赖、预算与责任。
2. 初始化本地项目记录。
3. 一个单元先跑通“任务合同—执行—验证—整合”。
4. 按宿主实际容量保持滚动工作窗口。
5. 成批处理结果。
6. 持续整合已验证单元。
7. 核对全部子任务与最终目标。

## 必要条件与停止

协调者负责合同、判断和整合，不直接代写执行者的代码。复杂度不足时退回 autonomous-run。单一所有者维护每条 PR 链的拓扑；队列事件只记录结果指针，不在写入共享状态时临时启动长审查。不存在独立的 nimo 调度进程。

使用 state.mjs 初始化 program。每次派发和恢复传完整 standing-orders。先一个单元跑通再扩展滚动窗口；共享表仅协调者写，子任务只交报告。inbox 按批处理，每个派发最终有接受、失败、放弃或取消记录。旧任务停止未知时不得重派相同写入目标。恢复读当前记录、分支和平台状态，不从聊天时间推测存活。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-show-me-your-work](../../nimo-show-me-your-work/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack orchestrate](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/orchestrate.md)。
