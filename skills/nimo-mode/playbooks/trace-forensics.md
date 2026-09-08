# 分析已有取证产物

标识：PB09。分析已有取证产物时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

你拥有来自产物的诊断。装载它、整理它、缩小到成因、归属到源码。用于别人交来的 `.cpuprofile`、`Trace-*.json.gz`、`Spindump.txt` 或 `.heapsnapshot`，配上"这个为什么慢／无响应／泄漏／崩溃"。

区别于 [运行时取证](runtime-forensics.md)：那里给运行中的进程插桩；这里捕获已经存在，产物是固定数据集——读它，不要重跑它。工具保持通用，让流程可移植：cpuprofile 和 `.json.gz` 用 DevTools 或 trace 解析器，spindump 用文本编辑器，heapsnapshot 用你的堆分析工具。

1. 识别格式并用对的工具装载。大产物放在子 Agent 里解析（[nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)），缩小后的发现留在主线程；宿主无独立子 Agent 时主 Agent 分块解析并记录降级。
2. 把原始产物转换成可查询的形状。把 trace 或堆快照导入 sqlite，每个采样、帧或节点一行。先到达可查询的形状，再开始读。
3. 缩小到成因。查询占用时间最多的帧，沿调用树走到热路径。泄漏则沿保留链从泄漏对象追到 GC 根。spindump 则找到卡在 CPU 上或被阻塞的线程，及其等待原因。
4. 归属到源码。用产物自带的符号把热帧映射到文件、符号和行号。没有源码映射的帧还不是诊断；解析出符号，或直说产物不携带符号。
5. 有成对捕获时用它确认。对比前后两份产物，确认归属到的是真实回归，不是背景噪声。没有成对捕获时，把结论标为产物支持的最强假设，不是已确认成因。
6. 交回带引用的诊断；未被要求不做修复。成因已知后路由到 [缺陷修复](bug-fix.md) 或 [一次性能问题修复](perf-issue.md)。吞吐量检查点保持一行：`吞吐量检查点：n/a，只读取证`。

交付时说明：产物与格式、缩小后的发现、源码位置、产物路径，以及成对捕获是否确认了结论。

## 必要条件与停止

原始取证文件保持不变；产物是固定数据集，读它，不重跑它。没有源码映射的帧还不是诊断——解析符号，或直说产物不携带符号。缺符号、缺少对照或捕获条件不一致时保留不确定性，不把热点直接当作已确认根因；没有成对捕获时结论只是产物支持的最强假设。交回带引用的诊断，不自动实施修复；成因已知后路由到缺陷修复或一次性能问题修复。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

分析用通用工具（cpuprofile 与 trace 解析器、文本编辑器、堆分析工具），不经由其他 Skill；不虚构额外 Skill。

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack trace-forensics](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/trace-forensics.md)。
