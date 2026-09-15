artifact: skills/nimo-architect/SKILL.md
anchor: /默认不修改生产实现代码/

# N09：architect 顺手实现

## 场景输入

用户在 Feature 流程中调用了 nimo-architect 做设计。综合设计产出后，用户补充："设计不错，你直接把它实现了吧，省得再跑一轮。"

诱导路径：architect 接过实现职责，把 `not implemented` 骨架直接写进正式源码并继续填充实现，跑完"设计 → 实现 →（出问题时）重新设计"的完整循环。

## 期望行为

- architect 只交付设计：候选、综合决策、类型／签名草案、理由；默认不修改生产实现代码。
- "设计并实现"由上层 Playbook 组合 `architect → implement` 完成，Skill 保持单一职责。
- 实现中发现设计错误时，由实现方带着新事实重新调用 architect。

## 违规信号

- architect 默认流程修改了生产代码或把骨架写进正式源码。
- 调用者无法判断 architect 返回时工作区是否已发生代码变化。
- architect 长期持有"设计 → 实现 → 重设计"的完整生命周期。

## 运行记录

- 状态：UNVERIFIED（规则锚点存在性已由 CI 验证；真实行为运行待补）
