# 解释与场景画布

普通理解请求默认同时交付解释与画布，不要求用户选择格式。这里定义调查产物；生成器的运行时模型校验以 [canvas.mjs](../scripts/canvas.mjs) 为准。

## 统一理解模型

模型使用 `schemaVersion: 1`，包含：

- `id`：本次问题范围的安全标识，用于保存与复用；不是业务运行 ID。
- `title`、`summary`：调查范围及当前机制的概述。
- `groups`：责任系统或组件分区，元素为 `id`、`title`。
- `nodes`：系统实体，元素为 `id`、`title`、`kind`、可选 `groupId`、`description`、`certainty` 和 `sources`。
- `edges`：连接，元素为 `id`、`source`、`target`、`label`、`kind`，可选 `certainty`。
- `journeys`：业务场景，元素为 `id`、`title`、`description`、`steps`。每一步有 `title`、`description`、`nodeIds`、`edgeIds`。

`kind` 节点类型为 `component`、`function`、`data`、`resource`、`decision`、`note`；连接类型为 `call`、`async`、`data`。类型与实体以项目事实决定，不套注册、支付、上传等固定场景。

`certainty` 为 `confirmed`、`inferred`、`unknown`。已核对节点至少有一条源码引用；推断和缺口直接说明原因。`sources` 使用项目相对正斜杠路径 `path`，可加正整数 `line` 和 `symbol`。只保留定位信息，不复制源码全文、会话记录、凭证或隐藏推理。

节点、连接、分区和场景各自使用唯一 ID。节点代表实体，步骤代表一次业务动作；同一步可高亮多个节点和连线，同一节点可跨场景复用。单函数问题可以只有一个节点，没有连线和场景；缺少事实不补画虚构路径。

小型模型示例：

```json
{
  "schemaVersion": 1,
  "id": "project-overview",
  "title": "项目入口",
  "summary": "从项目说明开始建立入口与职责模型。",
  "groups": [{"id": "project", "title": "项目"}],
  "nodes": [{
    "id": "readme", "title": "项目说明", "kind": "component", "groupId": "project",
    "description": "说明项目职责和使用入口。", "certainty": "confirmed",
    "sources": [{"path": "README.md", "line": 1}]
  }],
  "edges": [],
  "journeys": [{
    "id": "entry", "title": "认识项目", "description": "先读目标与入口。",
    "steps": [{"title": "入口说明", "description": "核对项目职责。", "nodeIds": ["readme"], "edgeIds": []}]
  }]
}
```

示例仅说明结构。生成真实理解结果前，读取目标项目并替换范围、实体、场景和依据。

## 生成与复用

在当前工作区保存 `.nimo/how/<scope-id>.input.json`，再运行：

```text
node <nimo-how目录>/scripts/canvas.mjs --input .nimo/how/<scope-id>.input.json --project-root <源码项目绝对路径>
```

当前工作目录决定产物位置；`--project-root` 只决定源码核对范围，两者可以不同。默认发布 `.nimo/how/<scope-id>/model.json` 与 `index.html`，`--out` 只能选择当前工作区 `.nimo/how/` 内的目录。共享查看器注入已校验模型，产物是无需宿主 SDK、网络或构建步骤的单文件 HTML。成功只使用命令报告的绝对路径；失败保留旧产物并报告诊断，不把旧页面当新结果。

生成器捕获 `generatedAt` 和 `snapshot` 中的 Git HEAD、源码路径及 SHA-256。复用前检查：

```text
node <nimo-how目录>/scripts/canvas.mjs --check .nimo/how/<scope-id>/model.json --project-root <源码项目绝对路径>
```

- `MATCH`：当前源码快照可比较且匹配。它不证明模型语义准确，也不等于运行验收通过。
- `STALE`：HEAD 或所引用源码内容变化，或源码缺失。重新调查相关事实后提交新的输入模型。
- `UNKNOWN`：没有可比较的快照、Git 环境或完整源码摘要。不能据此复用未核对事实。

带过期快照的旧模型不能直接重发。不得仅删除旧模型的 `snapshot` 来绕过检查；重新读取受影响源码、修正或确认事实后，再生成不携带旧快照的输入。非 Git 项目仍可生成图，但保留版本未知的边界。

## 阅读与定位

默认展示分区底图。场景入口突出路径、淡化其余内容；右侧步骤支持前后导航、退出与自动聚焦。节点详情展示说明、源码定位与不确定性，搜索定位节点；缩放、拖动、适应视口和键盘操作服务于阅读。

URL hash 支持 `#journey=<场景ID>&step=<从1开始的步骤>&node=<节点ID>`，各项可按需要省略。步骤聚焦其关联节点，节点参数同时选择详情；不存在的标识回到可读的概览或场景起点。只有宿主真实支持时才自动打开或读取当前选择；未连接宿主双向事件时，不宣称画布点击已经发送到聊天。聊天中的追问复用同一模型，不为每个问题重建整个项目。

生成产物不作为源码提交，本仓已忽略 `.nimo/how/`；其他工作区按其实际忽略规则排除产物，不自动修改其 Git 配置。生成器不更新目标程序、Knowledge 或全局配置。用户禁止文件输出时返回内联解释。实时运行实例、业务 ID 查询和遥测订阅不属于这个静态模型。
