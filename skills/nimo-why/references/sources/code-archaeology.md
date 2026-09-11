# 代码考古（git + 仓库内）

## 这个来源包含什么

- 提交历史（信息、日期、作者、diff）
- PR 描述、评审评论与讨论串（经 `gh`）
- 内联代码注释、TODO、FIXME、弃用说明
- ADR（架构决策记录），若仓库保有
- 测试。名称与断言经常编码促成某次变更的边界情况
- 同一批提交里连带修改的相关文件（共变信号）
- 仓库内的 CHANGELOG 条目、发布说明
- 提交信息与 PR 正文中提到的 issue/工单 ID

最可信的来源，直接绑定代码，也最完整。经过仓库的一切应当都在这里。

## 怎么搜

扩展种子提交列表：

```bash
# 文件穿透重命名的完整历史
git log --follow --oneline -- <file>

# Pickaxe：增删过这段确切文本的提交
git log -S '<code中的确切字符串>' -- <file>

# 或按模式：
git log -G '<regex>' -- <file>

# 每一行是谁、何时写的
git blame -L <start>,<end> <file>

# 某个提交的完整 diff
git show <hash>

# 两个点之间影响该文件的提交
git log <old>..<new> -p -- <file>
```

对每条实质性提交，拉 PR 上下文：

```bash
# 从合并提交或分支名找 PR 编号
git log -1 --format=%B <hash>

# 完整 PR 上下文：正文、评审评论、关联 issue
gh pr view <number> --json title,body,author,createdAt,mergedAt,labels,closingIssuesReferences,comments,reviews,files

# --json 的 reviews 和 comments 字段才是真正的信号所在
```

找仓库内的文档：

```bash
# ADR 常在 docs/adr/ 或类似位置
rg -l -i 'architecture.decision' --glob '*.md'

# 目标附近的 TODO 和 FIXME
rg -n -C2 '(TODO|FIXME|HACK|XXX|NOTE)' <target_file>

# 相关测试。名称经常编码"为什么"
rg -l '<symbol>' --glob '*test*'
```

## 这里的好证据长什么样

- 一段解释所解决问题（而不只是变更本身）的 PR 描述（"这修复了导致 X 的分页 bug"）
- 一场辩论过备选方案的长评审线
- 目标行附近解释某个非显然约束的内联注释
- 一个叫 `test_handles_edge_case_when_X` 的测试，揭示了促成代码的边界情况
- 一条引用工单或事故 ID 的提交信息
- 一条概括用户可见理由的 CHANGELOG 条目

## 常见坑

- **Squash 合并平原。** 仓库 squash PR 时，分支历史里的单个提交会丢失。退回 PR 正文和评论。
- **误导性提交信息。** "小重构"有时藏着有意的行为变更。看 diff，不看信息。
- **Cargo-cult 式照搬的模式。** 作者可能不理解原因就复制了一个模式。查这个模式是否在代码库里出现得更早，并调查*那*条提交。
- **机器人提交与自动合并。** Dependabot、Renovate 和自动回填通常不带动机。找意图时跳过它们。
- **把代码当作意图的证据。** 代码本身不是它为什么存在的证据。证据来自提交信息、PR、注释、测试、文档。不要把"函数名叫 X"引用为意图证据。

## 返回什么

每条与问题相关的提交/PR/评论，附：
- 确切文本（引用）
- 哈希 / PR 编号 / file:line
- 作者与日期
- 它是直接的（显式回答问题）还是旁证的
