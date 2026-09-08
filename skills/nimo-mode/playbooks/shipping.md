# 验证后合入

标识：PB15。验证后合入时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-make-operations-idempotent](../../nimo-principle-make-operations-idempotent/SKILL.md)

## 步骤

1. 确认合并范围与权限。
2. 每个 PR 独立验证。
3. 只允许从最底部开始的连续已验证区间。
4. 复查当前 head、base 与证据。
5. 只准备当前最底部 PR。
6. 合入并确认结果。
7. 重算下一项。
8. 到验证边界停止。

## 必要条件与停止

CI 绿不等于独立验证通过；请求自动合并不等于已经合并。head 变化必须重新核对证据。稳定 patch-id 可辅助复用代码审查结论，但不能证明运行环境和基线行为没变；必要运行验证仍须针对当前整合结果。

每条验证保存 head/base、证据和独立执行者。patch-id 仅辅助静态审查复用，当前基线的运行验证仍须核对。每次只操作最底部项，合并后确认远端结果再核对下一项。auto-merge 请求不等于已合并。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-swarm](../../nimo-swarm/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack shipping](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/shipping.md)。
