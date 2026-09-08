# 多阶段实施计划

标识：PB16。多阶段实施计划时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-foundational-thinking](../../nimo-principle-foundational-thinking/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)

## 步骤

1. 只产出计划，不实施。明确目标与边界。
2. 查明事实和依赖。
3. 能通过已授权小试验解决的未知项先验证。
4. 分成可独立验收的单元。
5. 列出文件、行为、检查、依赖、整合方式和停止点。
6. 运行计划结构检查。
7. 交付。

## 必要条件与停止

计划指定后续采用 feature、自主运行、autopilot 或 orchestrate，不把所有多阶段计划强制升级为大项目编排。每个单元列出自动检查、真实操作和性能验证的适用性；不适用项写原因，不使用固定十个 Agent 或固定模型。

使用计划模板，以 check-plan.mjs 检查。每单元写目标、文件、依赖、可见结果、自动检查、真实操作、性能验证和停止点。不适用写具体理由，不编造指标。交付后等待明确实施请求。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

使用 [计划模板](../references/plan-template.md)，替换所有示例内容后运行结构检查。

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-technical-writing](../../nimo-technical-writing/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack multi-phase-plan](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md)。
