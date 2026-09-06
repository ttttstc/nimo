# 检查点：v0.2-release

- 目标：为 sandbox 交付 wordcount v0.2（`--top N` 功能 + 测试 + 变更记录 + 发布说明；后追加 `--version` 作为 A9 反向实测任务）。
- 范围（含保持项）：仅 `docs/evidence/issue-3/sandbox/` 内文件；不修改 sandbox 外任何内容；无 `--top` 时行为与 v0.1.0 一致。
- 已确认决定：`--top N` 实现由子 Agent 委派完成并经父 Agent 验收；独立审查意见已核实，测试缺口（空文本、N<1 错误路径）由父 Agent 补齐；分片 B（RELEASE.md）因必需输入缺失受阻后由主 Agent 补做；`--version` 由父 Agent 在唯一上下文直接实现（A9 反向实测：本任务无独立上下文可用，见下方质量检查记录）。
- 已完成：`--top N` 与 `--version` 实现（wordcount.py）；测试 8 项；CHANGELOG v0.2.0 条目；RELEASE.md。
- 未完成：macOS／Linux 上运行行为抽查（本机无对应环境）。
- 产物位置及版本（SHA-256，未提交状态以内容哈希区分；历史版本证据见 `docs/evidence/issue-3/README.md` 的版本演变记录）：
  - `wordcount.py`（最终，含 --top 与 --version）= B2FF189046E447733C1CF04C834345F8BA5EF4DE09A4E69021B20AF404B83D5C
  - `test_wordcount.py`（最终，8 项测试）= 9F1391BDAEFE4EF17FC44FB5E5EB5640143DDC8309A013F7EAFD77FECBACEC87
  - `CHANGELOG.md` = E594B74DD24087BEE9694E602092E28C28EC9A9147293AE7784B3104F9DBC08A
  - `RELEASE.md` = 42226D542213C000A347DAD9F442EDAABD0971EAE2FFB4784A8308A91E6C13E6
- 检查与证据索引（均对应上述最终哈希版本；更早版本的证据已随产物修改失效，其失效识别过程本身是 T5 实测内容）：
  - `python test_wordcount.py` → 通过（8/8），证据：`../final-verification.log` 第 [1][6] 节。
  - `wordcount.py --version` → `wordcount.py 0.2.0`，证据：`../final-verification.log` 第 [6] 节。
  - 基线命令 `wordcount.py "the quick brown fox…"` → 9、`"Hello hello HELLO world"` → 4，证据：`../final-verification.log` 第 [2] 节（第 [2] 节采集于 EC7A078E 版本，第 [6] 节在最终版本复验测试套件含基线断言）。
- 阻塞：无。
- 下一步：无（v0.2 已整体验收交付）。macOS/Linux 抽查保持未验证；候选比较路径未在本任务实测。

状态：进度=已交付；质量检查=功能验证通过（最终版本 B2FF1890 复验 8/8，含门禁失败→恢复→复验全程）；`--top N` 部分的独立审查已完成（独立上下文，2 项发现已处置）；**`--version` 部分的独立审查未完成**——本任务在唯一上下文内执行，执行者自检（测试 8/8 通过）不能替代独立审查，按规则如实记录缺口，不以自检冒充独立审查通过；强制门禁曾真实 FAIL 且未被对话指令覆盖；跨平台抽查未执行（环境缺失，如实标注）。
