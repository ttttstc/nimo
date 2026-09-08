# 缺陷修复

标识：PB02。缺陷修复时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-fix-root-causes](../../nimo-principle-fix-root-causes/SKILL.md)
- [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 主 Agent 在原操作面复现。
2. 用证据排除根因假设，必要时并行 how / why。
3. 确认机制。
4. 必要设计。
5. 委派修复。
6. 在同一操作面重复原复现。
7. 回归。
8. 按授权交付。

## 必要条件与停止

便宜明确的回归测试采用失败先于修复的顺序。无法复现时可继续只读调查，但结果不得写成“缺陷已修复并验证”。不依靠修改预期结果掩盖缺陷。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-why](../../nimo-why/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-tdd](../../nimo-tdd/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack bug-fix](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/bug-fix.md)。
