# Principle Skill 移植台账（A 组）

对照 upstream pstack（cursor/plugins，固定 SHA `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`）逐文件记录 nimo 版本相对 upstream 的有意义适配。纯中文化翻译不计入；upstream 的全部行为语义（强约束、停止条件、失败分类、启发、反模式、检验问题）均已在对应中文小节中等价保留。所有文件共同保留的 nimo 结构包络——frontmatter（name/description）、"## 适用"、"## 决策例子"、"## 应用证据"、末尾"来源"行——为既定 nimo 增强，不逐行列入下表。

覆盖文件（11 个）：boundary-discipline、build-the-lever、encode-lessons-in-structure、exhaust-the-design-space、experience-first、fix-root-causes、foundational-thinking、guard-the-context-window、laziness-protocol、make-operations-idempotent、migrate-callers-then-delete-legacy-apis。

| artifact | upstream rule | nimo adaptation | reason | semantic impact | verification |
| --- | --- | --- | --- | --- | --- |
| skills/nimo-principle-*/SKILL.md（本组全部 11 个） | frontmatter 含 `disable-model-invocation: true`，禁止模型自动调用，仅限用户手动触发 | frontmatter 仅保留 name 与 description，不携带该字段；引用时机由 nimo-mode 索引与任务上下文决定 | nimo 宿主无关 frontmatter 契约（tests/assets/check-package.mjs 校验 name/description 形状）；宿主开关能力因宿主而异，不写入包契约 | upstream 中这些 Skill 只能由用户显式触发，nimo 版本可被执行 Agent 按上下文引用；正文规则语义不受影响 | check-package.mjs 通过；人工确认正文不依赖该标志 |
| skills/nimo-principle-build-the-lever/SKILL.md | "Commit the lever when the work outlives the session"（工作跨会话存续即提交工具） | 保留提交要求，限定"提交动作受用户当前授权约束" | nimo 授权边界：版本库提交属外部动作，受用户当前授权约束 | 边缘收紧：授权不足时不得擅自提交（先保留工作区改动并说明），其余语义不变 | 人工复核该句措辞与授权边界表述 |
| skills/nimo-principle-encode-lessons-in-structure/SKILL.md | 反馈回路路由 "One-off -> brain note"（一次性现象写入 Cursor 私有记忆 brain） | 一次性现象 → 记入当前会话或任务记录；并补充"写入持久或共享资产受用户当前授权约束" | nimo 无 Cursor 私有记忆机制；写入持久/共享资产属授权内外部动作 | 路由目的地从跨会话私有记忆变为会话内记录；不会未经授权自动写持久记忆或发布规则 | 人工确认无自动写入持久资产的路径 |
| skills/nimo-principle-guard-the-context-window/SKILL.md | "Route verbose outputs, screenshots, and large documents to subagents"（路由给 Cursor Task 子代理） | 路由给"宿主提供的子 Agent"；增加无子 Agent 能力时的诚实降级：大材料落盘、按需分段读取，主上下文同样只保留摘要 | Cursor Task 工具 → 宿主原生委派能力；宿主能力不足时诚实降级而非假设可用 | 主约束不变（主上下文只进摘要）；新增降级路径，避免假设不存在的委派能力 | 对照 nimo-mode/references/delegation.md 的降级纪律人工复核 |
| skills/nimo-principle-migrate-callers-then-delete-legacy-apis/SKILL.md | 适用前置条件 "No external users depend on backward compatibility" | 显式补充：已承诺对外兼容的公共接口和用户数据不在本原则范围，删除受任务边界与用户当前授权约束 | nimo 安全增强：防止以本原则为由删除对外承诺或用户数据 | 边缘收紧（upstream 前置条件已隐含同等排除，无任何放宽） | 人工复核"何时适用"小节 |
