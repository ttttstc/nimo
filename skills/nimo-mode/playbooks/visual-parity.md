# 保持视觉一致

标识：PB10。保持视觉一致时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-experience-first](../../nimo-principle-experience-first/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 固定环境、状态和截图基线。
2. 禁止篡改基线与比较工具。
3. 共享依赖先处理。
4. 隔离实现各组件。
5. 在同条件实际截图比较。
6. 逐个通过后交付。

## 必要条件与停止

精确视觉一致默认要求差异为零；平台渲染确需容差时必须在修改前确定比较方法和阈值，不能看到失败后调宽。缺少基线或实际截图不能通过。

冻结 viewport、字体、数据、主题与动画状态。精确一致默认零差，获准容差必须在改动前确定，不可失败后改宽。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack visual-parity](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/visual-parity.md)。
