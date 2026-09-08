---
name: nimo-technical-writing
description: "四层技术写作标准：Diátaxis 结构、面向读者的句法（Google 开发者风格）、单句负载（STE 规则）、Global English 歧义约束。撰写或评审文档、RFC、README、PR 描述或提交说明时使用。"
---

# 技术写作

目标是写出疲惫的工程师第一遍就能读懂的文字。四层，每层一个问题：这是什么类型的文档；句子怎样面向读者；每句话承载多少；有没有句子能读出两种意思。四层全部应用。

三条规则凌驾于四层之上：

- **删掉每一个不做功的词。** 句子去掉某个词仍然成立，这个词就走。"In order to" 就是 "to"；"It is important to note that" 什么都不是。
- **用短的、日常的词。** 用 "use"，不用 "utilize"；用 "help"，不用 "facilitate"；用 "do"，不用 "perform"。长词必须用精确度挣回它的长度。
- **当一条规则让句子变得更差时，换个方式修这句，或者放着别动。** 规则为读者服务。一句每条规则都遵守、但读起来像机器写的句子，是失败的句子。

代码库就是词表。写真实的符号、文件、标志或命令名，不写同义词，也不写对它的描述。

不发明行话。用开发者会大声说出口的词："move""delete""a budget that only decreases"，而不是 "evacuate""ratchet""endgame"。命名模式可以，前提是文档第一次提到它时说清它是什么。遇到新的惯犯词，连同替换词一起记入 nimo-unslop 的抽象隐喻规则。

## 变化节奏

四层决定文档说什么、每句话承载多少。一份文档可以四层全守，读起来仍然像机器写的：每句都剪得一样短，哪里都没有观点，什么都不具体。

- 有意混用句长。短句落地一个要点；从容的长句把一个事实连同它的条件或后果一起带上。
- 一句一个意思，不等于一句一个长度。承载两个意思的句子拆开；只承载一个意思的长句保留。
- 在模式允许的地方持有观点。解释要权衡取舍，所以说出你对取舍的判断，而不是罗列利弊。参考保持干燥。
- 具体胜过无菌。不写"schema 变更可能引发问题"，写"改列名会让构建失败"。

## 先定模式（Diátaxis）

一份文档，一个模式。两个问题选出它：内容服务行动（做）还是理解（想）？服务学习还是工作？

- 行动 + 学习：**教程（tutorial）**。
- 行动 + 工作：**操作指南（how-to）**。
- 理解 + 工作：**参考（reference）**。
- 理解 + 学习：**解释（explanation）**。

这个指南针可以用在整份文档上，也可以用在一个句子上。只要不确定自己在写什么，就用它。这里直觉经常是错的。

**教程：在做中学。** 你是老师，学习者的成功是你的责任，不是他的。开头说学习者将做出什么，而不是将"学到"什么。每一步都产出看得见的结果，越早越多。告诉他们应该看到什么：预期输出、提示符变化、日志行。解释压缩成一个从句加一个链接。教学式停顿会打断课程。保持具体。用"我们"的口吻写，写成指令："先做 x。现在做 y。"

**操作指南：通往一个目标的步骤。** 解决一个人真实有的问题，不是机器能执行的操作。假设读者有能力。跳过教学。只有行动：不跑题、不铺垫、不为完整而完整；这些内容改成链接。允许分叉和判断："如果你想要 x，就做 y。"指南按任务命名："如何校准雷达阵列"，不是"雷达阵列校准"。

**参考：供查阅的事实。** 描述，只描述。没有指令，没有说服，没有观点。干燥、完整、确定：陈述事实、选项、限制和错误，不对冲。结构镜像被描述事物的结构，代码和文档可以一起导航。材料放在读者预期它在的位置。能从代码生成就从代码生成，文档才不会失真。

**解释：理解与为什么。** 一个有边界的主题，脱离产品也能读懂。每个标题都应该容忍前面加一个隐含的"关于……"。锚定在一个真实的为什么问题上。给出背景：设计决策、历史、约束、备选方案。观点在这里允许，且只在这里允许。

不混合模式：教程里不放参考表格，参考里没有教程式手把手，操作指南里不辩论。拆开，然后链接。

来源：diataxis.fr，抓取于 2026-07-18。

## 句子面向读者（Google 开发者风格）

- 用"你"称呼读者，用现在时。"Will" 只用于确实发生在以后的事。
- 说清谁做什么："the compiler checks"，不是 "is checked"。只有在行为者未知或无关紧要时才用被动。
- 指令写成命令："Click Submit." 事实直接陈述，永远不写 "should be done"。
- 条件放在指令前面："To delete the document, click Delete." 读者跳过不适用的部分。
- 常见情况在前，例外在后。
- 听起来像一个懂行的朋友。没有流行词，没有比喻性语言，指令里没有 "please"，过程步骤中永远不出现 "simply""easy""quickly"。如果真简单，读者就不会在这里。
- 不预告（"we will soon support..."），连续的句子不用同一个短语开头。
- 别扭的句子大声读出来；还是别扭，就重写。
- 链接文字要说明链接去哪：页面标题或一句短描述，永远不写 "click here"。优先在页面内给一句上下文，而不是链出去。
- 标题承载观点，不只承载话题（"先定模式"，不是"模式"）。英文标题用 sentence case。任务标题是光杆动词短语（"Create an instance"），概念标题是名词短语。每页一个 h1，不跳级。
- 顺序步骤用编号列表，其余用列表点。用完整的句子引出列表，列表项保持平行。
- 代码用代码字体，UI 元素加粗。用序列逗号。删掉 "etc."，列表不完整就在开头说明。

来源：developers.google.com/style，抓取于 2026-07-18。

## 一次只承载一个陈述（STE 规则）

- 一句话一条指令；其他地方一句话一个意思。
- 指令超过约 20 词、其他句子超过约 25 词就拆分。
- 警告或条件放在它守护的步骤前面："If hot oil touches your skin, injuries can occur."
- 保留 "the" 和 "a"："Remove backup file" 有两种读法，"Remove the backup file" 只有一种。
- 给每个词一个意思、一个职责，然后守住它："check" 如果表示 inspect，就不要再用来表示 restrain。
- 每个动作选定一个词，一路用到底：这里 "start"、那里 "initiate" 是错的。
- 过程写成直接命令，永远不写成叙述，永远不用被动："Install the component"，不是 "the component must be installed"。
- 能避开的 "-ing" 词就避开。它们承担的语法角色太多，滋生误读。

来源：asd-ste100.org（Issue 9，2025），抓取于 2026-07-18。编号规则和词典在规范 PDF 里，以上是可迁移的核心原则。

## 不给句子留下两种读法（Global English）

- "only" 和 "not" 紧贴被修饰的词："only fails on growth" 和 "fails only on growth" 意思不同。
- 拆开长名词串："the proto import budget check script" 改成 "the script that checks the proto-import budget"。
- 每个代词指向唯一明确的东西，有疑问就重复名词。永远不用 "this" 或 "which" 指代整个从句。
- 不丢动词："Phase 1 moves the converters and Phase 2 the runtime" 让 Phase 2 没了动词，补上。
- 保留显示结构的小词。"Ensure that the switch is off" 保留 "that"，因为它让句子只有一种解析。永远不用清晰换字数。
- 并列可能误读时重复冠词：两个东西时写 "the client and the host"，不写 "the client and host"。
- 句子可能有两种分组时，说清 "and" 或 "or" 连接哪些部分。"Both...and""either...or""if...then" 是免费的消歧器。
- 用句号，不用分号；em dash 换成新句子。
- 括号内容必须是完整的语法单元或独立成句。永远不用 "(s)" 构造复数。
- 不用斜杠：写 "a, b, or both"，不写 "a/b" 或 "and/or"。
- 每样东西在所有地方只有一个名字。一份文档对同一个东西说 "the gate""the ratchet""the budget check"，就教了读者三样东西。编辑之间重写没有变化的句子同样付出这个代价：别翻动没变的东西。
- 跳过习语、口语、拉丁缩写和比喻。非母语读者、翻译器和 Agent 都最擅长解析平直的结构。

来源：Kohl, The Global English Style Guide（SAS Press）。指南文本抓取自 Internet Archive 与 SAS 样章，2026-07-18。

## 声音与仓库细节

- 对本 Skill 触及的每份文档应用 nimo-unslop。那个 Skill 拥有 slop 模式目录：AI 词汇、填充、对冲、格式破绽。
- PR 描述和提交说明也是写作，除 Diátaxis 外的每一层都适用于它们。
- 产品 UI 文案不是文档，用你的产品的文案规范处理它们。
- 代码片段用 tab 缩进。写真实路径和真实符号。每个计数或目录树断言在落地的那个提交上必须为真，并附上重新生成它的命令。

## 改写示例

改前：

> Configuration of the proto import ratchet budget script parameters is performed via budget.json. Note that it's important to remember that running with --write, which updates the committed budget to reflect the current count, should only be done when lowering it. If exceeded, CI fails.

改后：

> `budget.mjs` reads the committed budget from `budget.json` and counts the files that import protos. If the count exceeds the budget, CI fails. Run `budget.mjs --write` only to lower the budget.

按层拆解修复："configuration is performed" 改成 "`budget.mjs` reads"，有人在做这件事了（Google）。"ratchet" 消失。脚本的真实文件名完成了命名（行话规则）。五个名词的连串拆成平实从句（Global English）。对冲 "note that it's important to remember" 删除（删掉不做功的词）。失败条件移到它解释的步骤前面（STE）。被埋起来的 "should only be done when lowering" 变成 "only" 紧贴动词的命令（STE）。"If exceeded" 得到主语：the count（Global English）。

## 评审清单

应用于本 Skill 覆盖的任何文字。第 1 条只适用于文档集：

1. 每个文件是否单一 Diátaxis 模式，模式交界处是否有链接？
2. 每条指令是否写成命令，条件在前面？
3. 有没有句子承载两条指令或两个意思？拆开。
4. 有没有词删掉不损失含义？删掉。
5. "only" 是否紧贴它修饰的词？每个代词是否指向唯一的东西？每个从句是否保住了动词？
6. 每样东西在全部文档里是否恰好一个名字？
7. 开发者会不会大声说出这些词？把发明的隐喻和花哨同义词换成平实的词或真实符号名。
8. 所有符号、路径和计数在当前提交是否为真，是否附有重新生成计数的命令？

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。

依赖：[nimo-unslop](../nimo-unslop/SKILL.md)。

来源：[pstack technical-writing](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/technical-writing/SKILL.md)。

