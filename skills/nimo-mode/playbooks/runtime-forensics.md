# 运行时取证

标识：PB08。运行时取证时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-fix-root-causes](../../nimo-principle-fix-root-causes/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)

## 步骤

你拥有诊断。给运行中的进程插桩取证，不从源码空想。用于"X 为什么在运行时泄漏／空转／变慢"、堆快照、闲着却忙的进程、间歇性毛刺。交付物是带引用的诊断，不是修复。

1. 在授权的实际运行环境中、匹配的操作面上（按 [nimo-verify](../../nimo-verify/SKILL.md) 的真实操作面规则，用宿主提供的控制与调试能力）采集活信号：空转的进程采 CPU profile，内存泄漏采堆快照，视觉毛刺采渲染或帧轨迹。要真实产物，不要猜测。
2. 把产物缩小到决定性信号（smoking gun）：热路径上的函数、从泄漏对象到 GC 根的保留链、没有输入却在持续触发的循环。大产物放在子 Agent 里解析（[nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)），缩小后的发现留在主线程；宿主无独立子 Agent 时主 Agent 分块解析并记录降级。
3. 相信一个机制之前，先证明它。在运行中的进程上注入临时插桩（经宿主的调试通道，如浏览器调试协议的 eval），或不重载地热补丁运行中的代码，廉价地确认假设。貌似合理但未确认的成因可能是错的，而真实成因就在隔壁一层。注入插桩和热补丁属于运行状态修改，须先取得用户相应授权；未获授权时不执行，输出假设及证据缺口。
4. 把发现映射回源码：文件、符号、发生分配或调度的那一行。
5. 吞吐量检查点保持一行：`吞吐量检查点：n/a，只读取证`。

交付时说明：采到的信号、缩小后的发现、机制是如何被证明的、源码位置、产物路径。未被要求不做修复；成因已知后交还用户，路由到 [缺陷修复](bug-fix.md) 或 [一次性能问题修复](perf-issue.md)。

## 必要条件与停止

交付物是带引用的诊断，不是修复；未被要求不做修复，成因已知后路由到缺陷修复或一次性能问题修复。不自动修改持久代码。貌似合理但未确认的机制不当作结论，先证明再相信。临时注入和热补丁属于运行状态变更，不因流程被称为"取证"就默认获得授权；未获用户相应授权时不执行，输出假设及证据缺口。推送、PR、评论、合并等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack runtime-forensics](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/runtime-forensics.md)。
