# 接续已有工作

标识：PB21。接续已有工作时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-make-operations-idempotent](../../nimo-principle-make-operations-idempotent/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)

## 步骤

恢复点归你所有：读前人的轨迹，不要重做它。适用于"接手这个""恢复这个会话""从 <轨迹路径> 继续""你来接手""从 X 停下的地方继续"、宿主（含云端 Agent）的任务交接 URL，或一条指定你继续的已推送分支。

接手是继承。前一个执行者已经付过读代码、跑复现、做设计选择的成本；重做既丢掉这份现成的偏差对照，又烧掉上下文。抵住重新推导的冲动；去读。

1. **定位前人轨迹。** 宿主为当前工作区记录的执行轨迹或会话记录（路径由宿主或系统提示给出）、宿主提供的任务交接 URL，或一条已推送的分支。不跨工作区搜索宿主的私有会话存储——那会越过工作区边界，读到无关项目的私人对话。先读元数据概览和最后几条消息，再回扫决策点。长轨迹交给宿主独立子 Agent 解析，压缩后的时间线留在主线程（[保留必要上下文](../../nimo-principle-guard-the-context-window/SKILL.md)原则）；宿主无独立子 Agent 时分段读取并记录降级。
2. **重建操作状态。** 分支与 worktree、已经落地了什么（`git log`、对 base 的 `git diff`）、未完成事项、已做的决定。前人轨迹是权威输入；抵住重新推导它的偏差。
3. **区分已完成与待完成。** 对照计划比较实际交付，说出恢复点在哪。不重跑前人的复现，不重做已完成的工作。"让我从头验证一遍"是危险信号：它说明你把本该权威的轨迹当成了不可信。
4. **路由剩余工作。** 路由到匹配的 Playbook 并选定结论类型：继续执行、交付一份已完成的建议、批准或推翻先前的结论、或对一次失败的运行做复盘。接手流程到此为止；被路由的 Playbook 接管余下的一切。
5. **验证继承来的声明。** 在真实产物上、针对原始目标验证它们（按 [nimo-verify](../../nimo-verify/SKILL.md) 选择实际操作面；[验证真实产物](../../nimo-principle-prove-it-works/SKILL.md)原则）。前人自报的通过不是证据。

## 必要条件与停止

不扫描其他项目的私人会话；不无理由重做已证实工作，也不盲信旧完成摘要。恢复时重新加载当前配置和宿主可用工具；原会话排除规则仅作历史，跨会话需由当前请求或宿主实际继承的指令重新确定。

只从当前任务资料、宿主为当前工作区提供的记录或当前项目 .nimo/tasks 选择；多个候选需消歧。恢复重新加载配置和工具；历史会话排除不自动生效。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

前一个执行者停在哪、继承与重做的对比（理想是零重做）、恢复点、结果；返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack session-pickup](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/session-pickup.md)。
