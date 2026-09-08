# 原则 Skill 移植账本（B 组：10 个 Principle Skill）

上游固定版本：pstack/skills/principle-* @ 93b00b89ef425a9c1bac0d0b317dfc49c930ac99。本表记录 B 组 10 个 nimo-principle-* 相对 upstream 的每个有意义适配；纯语言翻译不算差异，不记录。semantic impact 说明适配后行为等价、增强还是降级；verification 说明核对方式。本组文件均按 nimo 包契约保留 frontmatter 与"## 适用""## 决策例子""## 应用证据"段落及来源行（包契约要求的既有增强结构，不逐文件重复记录）。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
|---|---|---|---|---|---|
| 全部 10 个 SKILL.md（frontmatter） | 含 `disable-model-invocation: true`，禁止模型自动调用该 Skill | 仅保留 `name` 与 `description`，不声明宿主私有元数据 | 宿主解耦契约：基础元数据只依赖 name/description | Cursor 上"仅手动触发"由包内强制；nimo 的触发与发现交由宿主机制，触发语义由 description 全量承载 | check-package 元数据校验通过 |
| minimize-reader-load、prove-it-works、sequence-verifiable-units、type-system-discipline（交叉引用） | 引用 principle-guard-the-context-window、show-me-your-work、principle-prove-it-works、principle-build-the-lever、principle-boundary-discipline、principle-encode-lessons-in-structure | 对应改为 nimo-principle-guard-the-context-window、nimo-show-me-your-work、nimo-principle-prove-it-works、nimo-principle-build-the-lever、nimo-principle-boundary-discipline、nimo-principle-encode-lessons-in-structure，并带相对链接 | 命名适配（pstack → nimo 命名空间） | 无 | check-package 名称白名单与相对链接校验通过 |
| never-block-on-the-human（Boundaries 小节） | 边界三条：不可逆动作需确认、可逆动作直接推进、产品方向来自人类而执行不阻塞 | 新增第四条边界：外部动作（发送消息、修改共享基础设施、动他人环境）还受用户当前授权约束，授权未覆盖时按宿主规定请求而非默认推进 | nimo 授权边界增强（外部动作受用户当前授权约束） | 增强：相比 upstream 收窄自主推进范围，授权缺口从"默认推进"变为"按宿主规定请求"，其余边界语义不变 | 人工对照本文"边界"小节与授权契约 |
| type-system-discipline（开头段） | "Skills like `typescript-best-practices` ground it in specific syntax"（点名 pstack 专属 Skill） | 改为"宿主或项目提供的语言最佳实践 Skill 可以把它落到具体语法"，不点名具体 Skill | nimo 无对应 Skill，避免悬空引用 | 去除对具体 Skill 的依赖；原则本体与语言惯用例清单完整保留，无行为损失 | 文本审查 |
