# 接续已有工作

标识：PB21。接续已有工作时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-make-operations-idempotent](../../nimo-principle-make-operations-idempotent/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)

## 步骤

1. 从用户指定资料、当前任务检查点或宿主授权提供的记录读取已有目标和决定。
2. 核对当前分支、差异、外部状态和证据版本。
3. 区分已完成与待完成。
4. 定位恢复点。
5. 路由剩余工作。

## 必要条件与停止

不扫描其他项目的私人会话；不无理由重做已证实工作，也不盲信旧完成摘要。恢复时重新加载当前配置和宿主可用工具；原会话排除规则仅作历史，跨会话需由当前请求或宿主实际继承的指令重新确定。

只从当前任务资料或当前项目 .nimo/tasks 选择。多个候选需消歧。恢复重新加载配置和工具；历史会话排除不自动生效。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack session-pickup](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/session-pickup.md)。
