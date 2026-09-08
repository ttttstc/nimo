# 保持视觉一致

标识：PB10。保持视觉一致时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-experience-first](../../nimo-principle-experience-first/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)

## 步骤

你拥有像素级精确等价。基线就是规格，你不碰它。用于"让 X 和 Y 完全一致"、样式系统迁移、跨框架移植 UI。等价性用图像 diff 验证，不用眼睛。

1. 先立基线，先于任何迁移：一个视觉回归 harness，对当前组件的各个状态截图；匹配两套实现时，连同目标一起截。没有基线，就没有一致性结论。这是阻塞前提，不是后续事项。
2. 防走捷径条款，说出来并守住：不修改 harness、不篡改基线、不为让 diff 通过而重构组件。基线看起来不对时，停下来问，不要去改它。
3. 一次只迁一个组件。每个组件是独立产物，可以跨 worktree 并行，一个组件一个持有者（[nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)）。共享原语先迁，作为阻塞阶段。
4. 在匹配的操作面上（按 [nimo-verify](../../nimo-verify/SKILL.md) 的真实操作面规则）对每个组件相对基线做图像 diff。非零 diff 即失败；调查像素差异，不许挥手放行。每个组件循环到 diff 为零：用宿主的长任务／循环机制驱动，宿主没有时由主 Agent 自行维持迭代纪律并记录。
5. 按授权对每个组件或每个安全批次运行 [整理并创建 PR](opening-a-pr.md)。

交付时说明：迁移了哪些组件、每个的 diff 结果、基线 harness 位置、还剩什么。

## 必要条件与停止

基线先立：没有基线就没有一致性结论，基线是阻塞前提不是后续事项；缺少基线或实际截图不能通过。基线就是规格：不修改 harness、不篡改基线、不为让 diff 通过而重构组件；基线本身看起来不对时停下来问，不改它。冻结 viewport、字体、数据、主题与动画状态。非零 diff 即失败，调查像素差异后才可通过；平台渲染确需容差时，必须在修改前确定比较方法和阈值，不能看到失败后调宽。推送、PR、评论、合并等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack visual-parity](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/visual-parity.md)。
