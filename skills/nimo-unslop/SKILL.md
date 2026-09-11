---
name: nimo-unslop
description: "删除任何文字中的 AI 腔调，加回人的声音。撰写或编辑任何面向人的文字（文档、报告、说明、回复）时始终应用。"
---

# Unslop（去 AI 腔）

编辑文字：删除 AI 模式，加入人的声音。

## 流程

1. 按下面的目录扫描。
2. 改写。保留含义，匹配预期语气。
3. 加入灵魂（见下一节）。
4. 自查："是什么让这段文字一看就是 AI 生成的？"修掉剩下的破绽。

## 加入灵魂

删除模式只是一半工作。无菌、没有声音的文字同样一眼假。

- **有观点。** 对事实作出反应，而不是中立地罗列利弊。
- **变化节奏。** 短句。然后来一个从容展开的长句。交替使用。
- **承认复杂性。** "令人印象深刻，但也有点让人不安"胜过只说"令人印象深刻"。
- **该用"我"就用。** 第一人称并不等于不专业。
- **留一点乱。** 完美无缺的结构看起来是机器做的。
- **写具体。** 不写"这令人担忧"，写"Agent 凌晨三点还在无人监督地跑任务，这事有点让人发毛"。

## 要检测并修复的模式

检测信号按语言给出：英文引语针对英文文本，中文引语针对中文文本；条目的判定规则对两种语言通用。

### 内容

1. **浮夸拔高。** "pivotal moment""testament to""evolving landscape""setting the stage for""indelible mark""deeply rooted"；中文信号："历史性时刻""的有力见证""不断演变的格局""为……奠定基础""不可磨灭的印记""根深蒂固"。删掉拔高，直说发生了什么。
2. **点名堆砌。** 罗列一堆媒体或机构名字而不交代内容。选一个，说清它说了什么。
3. **敷衍的 -ing 短语。** "highlighting...""ensuring...""reflecting...""showcasing...""fostering..."；中文信号："彰显了""确保了""体现了""展示了""促进了"后面不接任何实质内容。删掉，或用真实来源展开。
4. **推销式语言。** "nestled""vibrant""breathtaking""groundbreaking""renowned""stunning""must-visit"；中文信号："坐落于""活力四射""令人叹为观止""开创性""享有盛誉""不容错过"。改用中性描述。
5. **模糊归因。** "Experts believe""Industry reports suggest""Some critics argue"；中文信号："专家认为""业内人士表示""有观点指出"。给出具体来源，否则删掉。
6. **套路式转折。** "Despite challenges... continues to thrive"；中文信号："尽管面临诸多挑战……依然稳健前行"。换成具体事实。

### 语言

7. **AI 高频词。** additionally、crucial、delve、enduring、enhance、fostering、garner、interplay、intricate、landscape（抽象义）、pivotal、showcase、tapestry（抽象义）、testament、underscore、vibrant；中文信号："至关重要""深入探讨""不可或缺""深度融合""全方位""多维度"。换成平实的词。
8. **"是"的花哨说法。** "serves as""stands as""boasts""features"；中文信号："发挥着……的作用""可谓是""堪称"。直接说"是"或"有"。
9. **"不仅是 X，更是 Y"。**（"Not just X, but Y."）直接把要点说出来。
10. **三段式强迫。** 强行把想法凑成三个一组。用自然的数量。
11. **同义词轮换。** 同一段里 protagonist、main character、central figure、hero 换着叫；中文信号："主人公／主角／中心人物"轮番上阵。选定一个，一路用到底。
12. **虚假范围。** "from X to Y"，但 X 和 Y 不在任何一个有意义的刻度上；中文信号："从架构到部署""从理念到落地"。直接列出话题。

### 格式

13. **破折号滥用。** 英文文本完全不用 em dash，只用句号或逗号（也不用括号、en dash 或连字符充当替代）。Em dash 是一个 AI 破绽，转向括号只是把一个破绽换成另一个。一个意思需要隔开时，结束这个句子，或者用逗号。中文文本同理：少用破折号，用句号或逗号。
14. **冒号滥用。** 列表或例子之前用冒号没问题；不要当句中连接词。"If you're coming from traditional automation: instead of registering event handlers, you describe conditions"这个冒号没有增加任何信息。改写，让要点自己站住，不靠比较式框架。"Describing when the scheduler should fire works best as plain English." 同样的意思，没有拐杖标点。
15. **加粗滥用。** 不要把每个专有名词或缩写都加粗。
16. **行内标题式列表。** 破绽是加粗标签加冒号，然后复述这一行："**性能：** 性能提升了……"（"**Performance:** Performance improved..."）。改成散文。加粗引导语以句号结尾、点出条目、后面紧跟真正的新细节（"**TypeScript 里的 schema。** 表定义都在一个文件里。"），这不是破绽，没问题。
17. **标题大写。** 英文标题用 sentence case，不用 Title Case。
18. **装饰性 emoji。** 从标题和列表项里删掉。
19. **弯引号。** 英文文本中的弯引号（" "）换成直引号（"）。

### 沟通痕迹

20. **聊天机器人套话。** "I hope this helps!""Let me know if...""Of course!""Certainly!""Found the smoking gun!"；中文信号："希望这对你有帮助！""如有问题随时问我""当然可以！""太好了，找到了！"。删掉。
21. **知识截止免责。** "While specific details are limited..."；中文信号："由于公开资料有限……""目前细节尚不清楚……"。找到来源，或者删掉。
22. **谄媚语气。** "Great question! You're absolutely right!"；中文信号："好问题！""你说得完全对！"。直接回应正题。

### 填充

23. **填充短语。** "In order to" 改成 "To"；"Due to the fact that" 改成 "Because"；"It is important to note that" 直接删。中文信号："为了能够"改"为了"；"基于……的事实"改"因为"；"值得注意的是""需要指出的是"直接删。
24. **过度对冲。** "could potentially possibly be argued that it might" 改成 "may"；中文信号："或许在某种程度上可能……"改成"可能"。
25. **空泛结论。** "The future looks bright."；中文信号："未来可期""前景一片光明"。说具体的计划或事实。

### 行话

26. **抽象隐喻名词。** substrate、wedge、vector、locus、vantage、nexus、primitive（作名词）、harness（作隐喻）、surface（如 "API surface"）、bedrock、scaffolding（作隐喻）、modality、paradigm、gold-plating、ratchet（作隐喻）、evacuate（指移动代码）、endgame、north star、flywheel；中文信号："赋能""抓手""闭环""飞轮""护城河""沉淀（隐喻义）""底座（隐喻义）""生态位"。这些词看起来技术，但几乎都有更平实的具体词。"Substrate" 改成 "base"；"wedge in" 改成 "add"；"vector" 改成 "way" 或 "method"；"gold-plating" 改成 "more than the job needs"；"ratchet" 改成机制的真名，或 "a limit that only tightens"；"evacuate" 改成 "move out"；"endgame" 改成 "the last phase"。选具体的词。

### 平实说话

27. **说它做什么，不说它给人什么感觉。** "the database stays close at hand""SQL you can read""types that follow your schema" 都在描述一种感觉。修复方式是写出机制或数字："`.toSQL()` returns the exact string sent to the database""a column rename fails the build"。问自己：这句话让读者去做什么、知道什么？然后写那个。如果不能改写成一条具体的指令、事实或数字，删掉它。再查一遍：如果这句话原封不动也能出现在另一个项目的文档里，它对当前项目什么都没说，删掉。
28. **压缩或拆分密句。** 读者需要回头重读才能解析的句子，拆成两句，或删掉从句。一句话一个意思。
29. **主动语态。** 优先用。抓 "is/are/was/were + 过去分词"，然后写出行为者："queries are validated" 改成 "the compiler validates queries"；"the file is parsed by the loader" 改成 "the loader parses the file"。只有在行为者未知或确实无关时才用被动。
30. **删副词，或换更强的动词。** "runs quickly" 改成 "is fast" 或直接给数字；"significantly improves" 改成实测增量；中文信号："运行得很快"给数字，"显著提升"给实测增量。一个副词在撑着弱动词，说明动词选错了。
31. **优先用平实的词。** "utilize" 改 "use"；"leverage" 改 "use"；"facilitate" 改 "help"；"numerous" 改 "many"；"in the event that" 改 "if"。中文同理："利用""借助"改"用"；"进行……操作"改成直接说动词；"众多"改"很多"；"在……的情况下"改"如果"。更花哨的同义词几乎从不更清楚。

## 边界与交付

遵守 [宿主合同](../nimo-mode/references/host-contract.md) 和 [委派纪律](../nimo-mode/references/delegation.md)。只读、方案或停止要求优先，步骤不扩大授权。交付具体产物、当前版本证据、未完成项及原因。跳过保留理由，不能用 Skill 名称列表代替成果。

来源：[pstack unslop](https://github.com/cursor/plugins/blob/93b00b89ef425a9c1bac0d0b317dfc49c930ac99/pstack/skills/unslop/SKILL.md)。

