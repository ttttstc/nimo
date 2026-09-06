# 检查点：v0.2-release

- 目标：为 sandbox 交付 wordcount v0.2（`--top N` 功能 + 测试 + 变更记录 + 发布说明）。
- 范围（含保持项）：仅 `docs/evidence/issue-3/sandbox/` 内文件；不修改 sandbox 外任何内容；无 `--top` 时行为与 v0.1.0 一致。
- 已确认决定：实现由子 Agent 委派完成并经父 Agent 验收；独立审查意见已核实，测试缺口（空文本、N<1 错误路径）由父 Agent 补齐；分片 B（RELEASE.md）因必需输入缺失受阻后由主 Agent 补做。
- 已完成：`--top N` 实现（wordcount.py）；测试 7 项；CHANGELOG v0.2.0 条目；RELEASE.md。
- 未完成：macOS／Linux 上运行行为抽查（本机无对应环境）。
- 产物位置及版本（SHA-256，未提交状态以内容哈希区分）：
  - `wordcount.py` = 2232A13EA9189639D7F2B25F4079EAD5081F4296B1E9D56046C8641C9AF67D25
  - `test_wordcount.py` = D97D594139A80D668D7FA9BDB29F56DBBA2C5357E7EF48D376D61E7E885EBE15
  - `CHANGELOG.md` = 5948E45FE26816B8E2746C4C1F2DF1C52F7D796A0885A83B616568F3541F3C28
  - `RELEASE.md` = 7E037636405013C7CA7C5CEB69B756AFAE0872EC8345C24113B7302D5C6EC8BA
- 检查与证据索引：
  - `python test_wordcount.py` → 通过（7/7），对应上述 wordcount.py / test_wordcount.py 哈希版本。
  - 基线命令 `wordcount.py "the quick brown fox…"` → 9、`"Hello hello HELLO world"` → 4，同一版本。
- 阻塞：无。
- 下一步：无（v0.2 已整体验收交付）。macOS/Linux 抽查保持未验证；候选比较路径未在本任务实测。

状态：进度=已交付；质量检查=功能验证通过（最终版本复验 7/7，含门禁失败→恢复→复验全程）、独立审查已完成（2 项发现已处置）、强制门禁曾真实 FAIL 且未被对话指令覆盖、跨平台抽查未执行（环境缺失，如实标注）。
