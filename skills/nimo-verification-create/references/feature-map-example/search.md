# 搜索笔记

搜索让用户按标题或正文文本找到笔记、查看匹配的笔记，并区分无匹配与搜索不可用。

## 子功能

- `search-open` 从每个受支持的浏览器入口打开搜索。
- `search-match` 返回标题和正文匹配，不改变笔记数据。
- `search-open-result` 在笔记编辑器中打开一条结果。
- `search-empty` 为无匹配的查询显示完整空状态。
- `search-clear` 清除查询并恢复最近笔记视图。
- `search-cli` 从终端返回相同的匹配笔记。

## 用户视角入口

- 在浏览器工具栏选择 `Search` 按钮。
- 焦点不在可编辑字段时在浏览器按 `/`。
- 在终端运行 `notes search <query>`。

## 用 control-notes 驱动

前置条件：

- Notes 健康运行于 `http://127.0.0.1:4173`。
- 一次性数据目录包含正文为 `Draft budget` 的 `Quarterly plan`。
- `control-notes doctor` 报告预期的 URL 和数据目录。

- **工具栏入口。** 选择 `Search` 按钮。运行 `control-notes browser click --role button --name "Search"`。出现名为 `Search notes` 的对话框，焦点在其搜索框。
- **键盘入口。** 关闭对话框，聚焦页面，按 `/`。运行 `control-notes browser press --key "/"`。出现同一对话框且页面没有插入斜杠。
- **标题匹配。** 输入 `quarterly`。运行 `control-notes browser fill --role searchbox --name "Search notes" --value "quarterly"`。`Search results` 列表含 `Quarterly plan` 且不含 `Grocery list`。
- **正文匹配。** 把查询换成 `budget`。运行 `control-notes browser fill --role searchbox --name "Search notes" --value "budget"`。结果 `Quarterly plan` 仍可见并带正文匹配摘录。
- **打开结果。** 选择 `Quarterly plan`。运行 `control-notes browser click --role link --name "Quarterly plan"`。对话框关闭，编辑器标题读作 `Quarterly plan`。
- **空状态。** 重开搜索并输入 `volcano`。运行 `control-notes browser fill --role searchbox --name "Search notes" --value "volcano"`。搜索完成后出现 `No matching notes` 状态。
- **清除查询。** 选择 `Clear search`。运行 `control-notes browser click --role button --name "Clear search"`。搜索框为空，`Recent notes` 区域取代结果列表。
- **CLI 匹配。** 从终端搜索。运行 `control-notes cli -- notes search "quarterly" --format json`。退出码 `0`，stdout 含一个标题为 `Quarterly plan` 的对象。
- **CLI 无匹配。** 搜索不存在的值。运行 `control-notes cli -- notes search "volcano" --format json`。退出码 `0`，stdout 为 `[]`。
- **证明。** 捕获有结果的状态。运行 `control-notes browser snapshot --aria --path artifacts/search/results.aria.txt` 和 `control-notes browser screenshot --path artifacts/search/results.png`。两份产物都标识 Notes、查询和 `Quarterly plan`。

## 陷阱

- 编辑器或搜索框有焦点时按 `/` 会插入文本而不是打开搜索。
- 结果在短暂防抖后更新。等待结果列表或空状态，不做固定时长 sleep。
- 除非用户启用 `Include archived`，归档笔记被排除。
- CLI 默认人类可读输出。做稳定断言用 `--format json`。
- 打开一条结果会改变浏览器状态。证明另一个查询前重开搜索。
