# 分析已有取证产物

标识：PB09。分析已有取证产物时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-guard-the-context-window](../../nimo-principle-guard-the-context-window/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 识别文件格式。
2. 转成可查询结构。
3. 分析时间、调用或内存保留路径。
4. 解析符号并定位源码。
5. 有成对采样时比较。
6. 输出证据支持的诊断。

## 必要条件与停止

原始取证文件保持不变。缺符号、缺少对照或捕获条件不一致时保留不确定性，不把热点直接当作已确认根因。不自动实施修复。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack trace-forensics](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/trace-forensics.md)。
