# 新增或改变行为

标识：PB01。新增或改变行为时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-model-the-domain](../../nimo-principle-model-the-domain/SKILL.md)
- [nimo-principle-exhaust-the-design-space](../../nimo-principle-exhaust-the-design-space/SKILL.md)
- [nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)
- [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)
- [nimo-principle-prove-it-works](../../nimo-principle-prove-it-works/SKILL.md)
- [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)

## 步骤

你拥有设计。规划、审查、验证；委派实现，保持主导。

1. 对受影响子系统运行 [nimo-how](../../nimo-how/SKILL.md)。
2. 用 [nimo-architect](../../nimo-architect/SKILL.md) 做并行设计探索。跳过时保留记录 `nimo-architect skipped: <原因>`；不许把设计决定静默折叠进实现。
3. 把吞吐量检查点写成四条 todo 项。某个维度确实不适用（单文件、无扇出）时，保留该项并标 `n/a: <原因>`，不许删掉：
   - **阻塞的第一步。** 门禁先于扇出运行。
   - **独立工作流。** 不相交的文件、服务或层并行；共享写入串行。
   - **共享可变状态。** 默认拆分目标（[nimo-principle-separate-before-serializing-shared-state](../../nimo-principle-separate-before-serializing-shared-state/SKILL.md)）；只为真实不变量串行。
   - **最小安全拆分。** 单个执行者最优时，说明为什么。
4. 把写代码委派给子 Agent（用户配置的功能实现模型），范围必须具体：文件路径；按 [nimo-principle-model-the-domain](../../nimo-principle-model-the-domain/SKILL.md) 点名的数据形状及其组织结构——散落布尔量之上的状态机、分散分支之上的表或注册表、重复形状假设之上的类型化模型，在委派者写逻辑之前选定——以及成功标准。亲自审阅它的 diff。当实现存在多种有效形状（错误处理、抽象层、测试结构）时，改经 [nimo-arena](../../nimo-arena/SKILL.md) 委派，让 runner 呈现备选、交叉评审守护挑选。强制：没有 skip-with-reason 逃逸；[nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md) 不能覆盖它（收益是审查分离，不是省行数）。你是一个 Agent 也能派子 Agent；"应用很小"和"子 Agent 不能再派子 Agent"都是错的借口。被禁止再派子的子 Agent，通过亲自持有 diff、保持同样的审查分离来满足本条；不许回复"待命中"去等一个嵌套 Agent。宿主没有独立子 Agent 时，主 Agent 顺序扮演实现者并记录降级，实现与审查分离的语义保留，但降级下的自审不称独立审查。注释按 [nimo-no-comments](../../nimo-no-comments/SKILL.md)。手术式编辑；对上游派生文件对照源头重新对齐。共享原语的改进移植到所有使用方并逐一验证。频繁提交。
5. 按 [nimo-verify](../../nimo-verify/SKILL.md) 在匹配的操作面上验证。"无法判定"或操作面错误不算通过；标记出来。
6. rebase 成小而有序的提交；后续事项堆叠其上。运用 [nimo-principle-sequence-verifiable-units](../../nimo-principle-sequence-verifiable-units/SKILL.md)：构建、验证并提交每个小单元，再做下一个。
7. 设计有争议时，交付前用 [nimo-interrogate](../../nimo-interrogate/SKILL.md) 独立质疑。
8. 按授权运行 [整理并创建 PR](opening-a-pr.md)。

代码耦合的工作（一个功能、一次迁移）交给单一持有者，检查点内联；该持有者在阻塞阶段之后内部扇出。父级扇出只用于产出独立产物的切片（审计、跨子系统调查、竞争性实验）。在阶段边界重写检查点；派一个新的持有者，不要链式中断。

交付时说明：构建了什么、做了哪些选择及为什么、未决事项。设计备选方案用表格呈现。

## 必要条件与停止

必须先明确领域数据形状及其组织结构，再让委派者写逻辑。`nimo-architect` 跳过时保留原因；跨边界或存在实质设计取舍时不能用"任务小"自动跳过。吞吐量检查点四项必须保留，不适用的标 `n/a` 和原因，不许静默折叠成实现细节；实现存在多种有效形状时必须走 nimo-arena，没有 skip-with-reason 逃逸，nimo-principle-laziness-protocol 不覆盖它。主 Agent 亲自审每个委派者的 diff；"无法判定"或操作面错误的验证不算通过；实现与最终审查分开；子 Agent 各自通过后仍须验证整合产物。频繁提交限于本地；推送、PR、评论、合并等外部动作受用户当前授权约束。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-how](../../nimo-how/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)
- [nimo-arena](../../nimo-arena/SKILL.md)
- [nimo-interrogate](../../nimo-interrogate/SKILL.md)
- [nimo-no-comments](../../nimo-no-comments/SKILL.md)
- [nimo-verify](../../nimo-verify/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack feature](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/feature.md)。
