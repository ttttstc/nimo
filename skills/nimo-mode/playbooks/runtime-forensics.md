# 运行时取证

标识：PB08。运行时取证时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-fix-root-causes](../../nimo-principle-fix-root-causes/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 在授权的实际运行环境采集 CPU、内存或其他信号。
2. 缩小到热点或保留链。
3. 使用必要且获准的临时观测验证机制。
4. 映射回源码。
5. 输出诊断。

## 必要条件与停止

不自动修改持久代码。临时注入和热补丁属于运行状态变更，不因流程被称为“取证”就默认获得授权；权限不足时输出假设及证据缺口。



公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack runtime-forensics](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/runtime-forensics.md)。
