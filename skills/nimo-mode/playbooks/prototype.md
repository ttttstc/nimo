# 用廉价试验回答设计问题

标识：PB05。用廉价试验回答设计问题时使用；先遵守 [Mode](../SKILL.md)。

## 执行前读取

进入本流程先完整读取下列原则正文，不能用 Mode 索引摘要替代；读取后将相关约束写入实际计划与验证决定。已经在本任务读过同一版本正文时不重复读。用户明确排除的普通原则记录排除理由，强制门禁不可排除。

- [nimo-principle-exhaust-the-design-space](../../nimo-principle-exhaust-the-design-space/SKILL.md)
- [nimo-principle-experience-first](../../nimo-principle-experience-first/SKILL.md)
- [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md)

## 步骤

你拥有设计决定，不拥有代码。原型是用后即弃的决策工具；真正的构建走 [新增或改变行为](feature.md)。用于"做个原型""mock 一下""画个草图""试试这个布局"，或在承诺之前探索一个 UI、交互或布局；也用于靠实际运行观察来裁决一个经验分叉（哪种行为、哪种时序、哪种做法）——本要问用户、而一个快速草图就能替你回答的问题，自己试出来，不问。

这是唯一一个把 [nimo-principle-laziness-protocol](../../nimo-principle-laziness-protocol/SKILL.md) 的"最小改动"和验证标准反过来用的流程：速度优先于打磨，代码质量不重要，不做规划。严格性花在廉价地挑对设计上。大胆些：提出用户没要过的变体；把一个做法整个扔掉，换另一个再试。

1. 圈定原型存在的目的是裁决哪个决定：哪种布局、哪种交互、哪种信息密度；经验分叉则是哪种行为、哪种时序、哪种做法。没有要裁决的决定就没有原型；路由到 [新增或改变行为](feature.md)。
2. 设计空间开放时先收集参考：搜索先例，汇总主题、配色、布局的 moodboard，让用户先挑方向再动手。方向已定时跳过。
3. 在隔离的 scratch 目录里搭用后即弃的产物，与生产源码分开。视觉决定用原生 HTML/CSS/JS，或能把想法渲染出来的最轻技术栈、CDN 依赖、带热重载的开发服务器。行为或时序决定用能跑通该问题的最小脚本。不上生产框架、不写测试、不做抽象。
4. 比较备选时，把它们建在同一个切换器后面（按钮或按键切换），每个变体带标签，让用户叫得出名字。这是 [nimo-principle-exhaust-the-design-space](../../nimo-principle-exhaust-the-design-space/SKILL.md) 的廉价化。
5. 在匹配的操作面上验证（按 [nimo-verify](../../nimo-verify/SKILL.md) 的真实操作面规则）。视觉决定：给每个变体截图并驱动交互，眼睛就是测试。行为或时序决定：记录时间、打印输出或观察渲染，直接观察你正在裁决的东西。这里的测试是观察本身，不是断言。
6. 呈现备选、取舍和推荐。产出是决定加上用后即弃的产物，不是可发布代码。把选定方向交给 [新增或改变行为](feature.md) 做真正的构建（形状先经 [nimo-architect](../../nimo-architect/SKILL.md)）。

交付时说明：探索过的变体、证据（视觉决定的截图，行为或时序决定观察到的输出或时序）、取舍、推荐、scratch 路径。明确说出原型是用后即弃的。

## 必要条件与停止

产物标注为原型、用后即弃：不进入生产代码，不自动发布或转成正式功能；产出是决定加原型产物，不是可发布代码。没有要裁决的设计或经验分叉就没有原型，路由到新增或改变行为。原型的验证是对应问题的实际观察（视觉决定看截图，行为或时序决定看观察到的输出或时序），不强加完整产品测试；测试是观察本身，不是断言。用户限制只读时不得以"原型"为由写文件或改运行环境。

公共规则见 [宿主合同](../references/host-contract.md)、[工具用法](../references/tools.md) 和 [检查点](../references/checkpoints.md)。

## 所需 Skill

- [nimo-verify](../../nimo-verify/SKILL.md)
- [nimo-architect](../../nimo-architect/SKILL.md)

## 交付

返回结果、当前产物版本、实际验证和证据、未完成项及跳过原因。流程不自动授予提交、推送、评论、合并或发布权限。

来源：[pstack prototype](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/poteto-mode/playbooks/prototype.md)。
