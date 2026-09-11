---
name: nimo-skill-author
description: "创建或修改 SKILL.md 时使用。编写可运行、可验证的 Skill：明确触发、输入、步骤、产物与边界，验证元数据与引用，对结构与权限变化用自然任务检验。面向 Agent 的文字以改变决策为标准，存疑就删；指向结构性来源，按路径委派，不复述。"
---

# 编写可运行 Skill

你拥有这个 Skill 的声音。面向 Agent 的文字比面向人的文字标准更高：无用的句子会变成指令。

## 步骤

1. 明确触发、不适用场景、输入、步骤、产物、验证、失败和停止，保持最小职责。措辞分量与 Skill 作用域匹配。
2. name 与目录一致，description 说明何时用；必要长材料用真实相对链接。
3. 指向结构性来源（类型、README、配置），不硬编码细节——硬编码细节会过期，见 nimo-principle-encode-lessons-in-structure。按路径委派其他 Skill，不复述其内容。
4. 存疑就删；文字靠改变决策挣得位置。直接告诉它做什么，省略理由；只有规则没有解释会令人困惑时才解释。
5. 不依赖私有元数据或假工具，不自动安装第三方 Skill，缺失明确受阻或等价方式。
6. 验证：frontmatter 的 name 与 description 就位，引用的文件存在，跨 Skill 链接可解析。结构与权限变化用自然任务检验行为；纯主观措辞可说明不适用。
7. 用 [nimo-technical-writing](../nimo-technical-writing/SKILL.md) 和 [nimo-unslop](../nimo-unslop/SKILL.md) 精简，只交付必要文件。
8. 按本次授权交付，PR 整理见 [nimo-mode 的 PR 流程](../nimo-mode/playbooks/opening-a-pr.md)。

反复执行却没沉淀成 Skill 的工作流，提议新 Skill。

## 交付

交付时说明：Skill 概要、关键设计决定、验证注记。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。新 Skill 不得暗含自动发布、安装外部代码或修改全局配置的权限。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。
