---
name: nimo-show-me-your-work
description: "长任务、多阶段或自主运行时使用。保存决定与证据。"
---

# 保存决定与证据

## 步骤

1. 为当前任务建立一个 decisions.tsv，每个重要决定记时间、阶段、动作、简短理由、证据和结果。
2. 用 nimo-mode/scripts/log.mjs --input 请求文件，字段 file、phase、decision、reason、evidence、result；time 默认当前时间。
3. 单元结束及时记录，失败和撤销也记录，不结束后补造。
4. 对照本任务实际轨迹与产物审计，轨迹不足明确限制；不跨项目读私聊。
5. 默认本地，不写内部推理全文。上传前筛除个人路径、凭据和无关数据。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。
