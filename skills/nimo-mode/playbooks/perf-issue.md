# 一次性能问题修复

标识：PB06。一次性能问题修复时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-fix-root-causes](../../nimo-principle-fix-root-causes/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)

## 步骤

你拥有测量叙事。规划、审查、验证数字。把每个修复绑到一个测量上；不用读源码代替测量。

1. 在匹配的操作面上（按 [nimo-verify](../../nimo-verify/SKILL.md) 的真实操作面规则）采集基线 trace。
2. 用 [nimo-how](../../nimo-how/SKILL.md) 给假设打地基；没有实际运行过，不宣称性能天花板。
   大多数修复来自八个策略族。把它们当假设生成器，不是 checklist。一个族只有 trace 显示它点名的信号时才赢得一次尝试；对主导成本做聚焦修复，胜过八族全上。
   - **消除。** 最便宜的工作是不运行的工作。优化热路径之前，先问它是否需要存在：没人消费的计算、对该用户永远关闭的功能开关、冗余镜像状态的同步、"以防万一"保留的遗留路径。trace 显示什么慢，永远不显示它可删除，所以这一族需要 nimo-how 调查，不是 profiler。适用时，删除工作胜过其他所有族。
   - **分治。** 主导成本随输入规模缩放。拆分工作，让每块接触更少（分块、分片、修剪搜索空间），或让独立部分并行。
   - **缓存。** 同一计算或获取在相同输入上重复。存储并复用结果；宣称胜利之前，先点名什么使它失效。
   - **间接层。** 热路径做着昂贵的工作，更便宜的中间层可以吸收：索引代替扫描、把工作移出交互线程的队列、让更便宜实现可以换入的句柄。只有这一跳从关键路径移除的比它增加的更多时才加它；坐在热路径上却不移除工作的层是纯成本。
   - **批处理。** 许多小操作各付一次固定开销（RPC、查询、系统调用、绘制调用）。合并成批，每批只付一次开销。
   - **冗余。** 等待挂在一个慢实例或慢尝试上。复制工作（副本、对冲请求、投机执行），取最快结果。这用额外负载换更低尾延迟，所以 trace 必须显示等待占主导、系统有余量；没有这个权衡的复制只增加负载。
   - **惰性求值。** 成本落在永不用或还不需要的结果上（启动路径上的急切初始化、渲染屏外条目）。推迟到首次使用。
   - **调度。** 工作必须发生，但不在交互时刻。移到没人在等的地方：空闲回调、启动后的后台预热、用户到达前的预计算、帧提交后的清理。区别于惰性（需要时更晚才做）：调度往往在热时刻更早、或在其阴影中运行工作。收益是感知延迟，所以测交互路径，不是完成的总工作量。
3. 从 trace 规划修复。跨函数边界时先跑 [nimo-architect](../../nimo-architect/SKILL.md)。把实现委派给子 Agent（用户配置的性能问题模型）；亲自审阅它的 diff。宿主没有独立子 Agent 时，主 Agent 顺序扮演实现者并记录降级，降级下的自审不称独立审查。采集修复后 trace。
   运用 [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)：每次尝试验证通过后，再试下一个。
4. 解析并比较产物（JSON 转 sqlite、diff）。"无法判定"或操作面错误不算通过；标记出来。
5. 在 PR 里引用测量。
6. 按授权运行 [整理并创建 PR](opening-a-pr.md)。

对指标做持续改进而不是一次性修复时，使用 [持续改善一个指标](hillclimb.md)。

交付时说明：基线数字、修复后数字、差值、产物路径。

## 必要条件与停止

优化手段由观测信号触发选择，不逐项套用缓存、并行和延迟加载；八个策略族是假设生成器，不是 checklist。没有同条件的基线与修复后数据、噪声未排除或操作面不匹配时，不能宣称性能提升；"无法判定"或操作面错误不算通过。不用读源码代替测量，不在未实际运行前宣称性能天花板。推送、PR、评论、合并等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack perf-issue](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/perf-issue.md)。
