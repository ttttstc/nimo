# 解释与场景画布

普通理解请求默认同时交付解释与画布，不要求用户选择格式。这里定义调查产物；生成器的运行时模型校验以 [canvas.mjs](../scripts/canvas.mjs) 为准。

## 统一理解模型

新模型使用 `schemaVersion: 2`。生成器继续严格接受旧版 `schemaVersion: 1`，旧输入不必迁移；v2 增加下方语义字段，未知字段仍拒绝。

- `id`：本次问题范围的安全标识，用于保存与复用；不是业务运行 ID。
- `title`、`summary`：调查范围及当前机制的概述。
- `groups`：责任系统或组件分区，元素为 `id`、`title`。
- `nodes`：系统实体，元素为 `id`、`title`、`kind`、可选 `groupId`、`description`、`certainty` 和 `sources`。
- `edges`：连接，元素为 `id`、`source`、`target`、`label`、`kind`，可选 `certainty`。
- `categories`（可选）：场景分组，元素为 `id`、`title`；场景以 `categoryId` 引用，不重复维护场景 ID 清单。
- `overview`（可选）：`description` 与 `sections`；每节有 `title`、可选 `description`、`nodeIds`，按职责解释系统实体。项目总览可增加下方 L0 与 4+1 字段。
- `objectNodeIds`（可选）：核心对象的节点 ID。节点来源与说明只维护一份。
- `journeys`：业务场景，元素为 `id`、`title`、`description`、可选 `categoryId`、`status`、`preconditions`（字符串数组）、`completion`、可选 `reason` 和 `steps`。每一步有 `title`、`description`、`actor`、`input`、`output`、`nodeIds`、`edgeIds`。

v2 场景的 `status`、`preconditions`、`completion`，以及非空步骤的 `actor`、`input`、`output` 必填。角色按真实执行主体命名，不固定为某个项目的 UI、服务端或 Runner。前提说明什么时候这条链路适用；完成条件说明源码中的终点，不能将派发或状态更新当作真实业务成功。

| 场景状态 | 语义与约束 |
|---|---|
| `confirmed` | 调查者已核对源码链路；至少一个步骤，不代表运行验收通过 |
| `needs-validation` | 有可解释的链路，但终点、分支或恢复仍待核对；至少一个步骤，必须有非空 `reason` |
| `not-investigated` | 已识别但尚未调查；`steps: []`，必须有非空 `reason` |
| `out-of-scope` | 明确排除于本次范围；`steps: []`，必须有非空 `reason`，不得用于隐藏范围必需项 |

未调查和排除的条目可以使用空 `preconditions` 和空 `completion`，画布保留未知提示，不要求编造事实。v1 没有场景状态或步骤角色，查看器显示未标注信息，不能猜成已核对。

`kind` 节点类型为 `component`、`function`、`data`、`resource`、`decision`、`note`；连接类型为 `call`、`async`、`data`。类型与实体以项目事实决定，不套注册、支付、上传等固定场景。

`certainty` 为 `confirmed`、`inferred`、`unknown`。已核对节点至少有一条源码引用；推断和缺口直接说明原因。`sources` 使用项目相对正斜杠路径 `path`，可加正整数 `line` 和 `symbol`。只保留定位信息，不复制源码全文、会话记录、凭证或隐藏推理。

节点、连接、分区、目录和场景各自使用唯一 ID。所有引用必须存在，列表内不得重复；不同总览节和场景可复用同一实体。节点代表实体，步骤代表一次业务动作。单函数问题可以只有一个节点，没有连线、目录和场景；缺少事实不补画虚构路径。生成器限制模型、列表、源码大小与输出位置，具体上限以运行时代码为准。

`edges` 表示已调查的实体关系，`steps` 表示讲解中的动作顺序；两者不能互相推导。确认连接前读实际调用点、消息发送与接收端或对象读写位置，关系依据放入调用方／发送方节点的 `sources`，相关步骤显式引用 `edgeIds`。来源定位不证明机器已验证关系语义。项目级图只有实体而没有边时，保留关系调查缺口；单一局部实体可以没有关系，不补假箭头。

连线端点须与实体粒度一致。同一入口先调用 A、再调用 B，不等于 A 调用 B；保留入口分别连接 A 和 B。聚合多个函数时使用有明确职责的组件节点，注明边实际对应的函数，不能把聚合职责画成某个函数的直接调用。区分新建对象与复用已有对象，不从“再次派发”推断“再次创建”。

## L0 与 4+1 总览

以下字段可选，仍属于 v2，不要求旧模型迁移：

| `overview` 字段 | 内容与依据 |
|---|---|
| `components` | L0 运行组件数组；每项为 `id`、`title`、`description`、`nodeIds`。成员引用已有实体，每个实体最多归属一个组件；未归属实体保留覆盖缺口 |
| `flowJourneyIds` | 最多三条已有场景 ID，说明主要任务或数据交接；需要组件归属，不能另写一份流程步骤 |
| `development` | 源码组织的节数组；复用 `title`、可选 `description`、`nodeIds`，由成员来源定位模块或目录 |
| `physical` | 部署边界的节数组；字段同上，说明代码支持的进程、存储及外部依赖，区分默认和可选配置 |

`sections` 对应业务职责与核心对象；`components` 和所选流程对应运行协作；`development` 对应源码组织；`physical` 对应部署位置；已有场景章节承担 +1。视图各自回答一个问题，不复用密集实体总图或复制场景数据。没有调查某个切面时不填猜测，查看器显示缺口。

L0 是运行协作层，不代表每个框一定部署在独立进程或机器上。嵌入式数据库、同进程后台线程、子进程和外部服务应在描述中分清。`groups` 是详细图的职责分区，不能由它推导执行环境；`components.nodeIds` 是作者根据源码填写的显式归属。

L0 图只聚合已有的跨组件实体边，保持方向、`call`／`async`／`data` 类型及不确定性，并保留原始边 ID 供追溯。组件内部关系由场景章节展示。主流程只选取对应步骤的真实 `edgeIds`；编号仍是讲解顺序，不能在相邻组件或步骤之间补画箭头。点击组件或关系可进入实际涉及它的场景。部分归属、没有跨组件边、所选步骤没有关系依据时保留提示。

`data` 表达模型中的实体读写关系，不能一律解释成网络请求、响应或字节流。聚合中含有不同读写动作时，只用“数据关系”及数量作摘要，原始标签在明细保留。主流程用执行者、输入、输出与真实调用／交接说明流向。

视图区分参考 [Kruchten 的 4+1 架构视图](https://www.cs.ubc.ca/~gregor/teaching/papers/4%2B1view-architecture.pdf)。总览先回答各切面的问题，场景再说明一次操作怎样经过这些部分。

小型模型示例：

```json
{
  "schemaVersion": 2,
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
  "categories": [{"id": "onboarding", "title": "认识工程"}],
  "overview": {"description": "项目入口职责。", "sections": [{"title": "入口", "nodeIds": ["readme"]}]},
  "objectNodeIds": ["readme"],
  "journeys": [{
    "id": "entry", "title": "认识项目", "description": "先读目标与入口。",
    "categoryId": "onboarding", "status": "confirmed",
    "preconditions": ["源码可读取"], "completion": "明确项目职责和入口。",
    "steps": [{"title": "入口说明", "description": "核对项目职责。", "actor": "开发者", "input": "项目说明", "output": "入口与职责", "nodeIds": ["readme"], "edgeIds": []}]
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

画布有总览、核心对象和场景三种阅读入口。项目总览先展示系统的一句职责、L0 组件关系和主流程，4+1 各切面分开阅读。缺少 L0 元数据时按已有职责讲解并说明缺口，不展开全实体总图。场景目录分组并可搜索。场景先展示完整编号步骤卡片和当前步交接，职责实体图在实现详情中展开。核心对象提供作用说明和上下游。选择步骤高亮 `nodeIds`、`edgeIds`，同时说明角色、输入输出、前后步骤、前提和完成条件。无关系数据与未关联连接直接提示，不能将讲解顺序画成实体调用。来源可展开查看，未知状态和未调查原因可见；无场景的局部模型仍可阅读实体与源码。

讲解使用现有 v2 字段，不增加旁路稿件：`summary` 给核心答案，`overview.sections` 每节回答一个职责问题，`journey.title` 写用户目标，`description` 给简短机制，步骤字段说明执行者、动作与结果。中文角色名保持一致，函数和路径由 `sources` 定位。每句只说一件事，描述尽量不超过 45 字；未知关系不因文字简化变成已确认。编号卡片表示阅读顺序，简图中的方向仅来自显式 `edgeIds`；人工动作、后续请求和等待条件留在正文。旧模型缺少总览节时按已有职责与实体显示，不编写不存在的系统概述。

主画布以实体作用、执行者和方向为主，具体步骤列出实际“来源实体 → 目标实体”及调用／任务交接／数据读写内容。来源信息在详情展开，已记录来源不重复成为卡片标签；推断、未知和链路缺口保留可见提示。`actor` 指明执行这一步的处理器、服务或人工操作，输入输出写实际数据与状态；人工审核、后续 HTTP 请求和等待条件写在步骤说明中，不能因下一步编号推断自动触发。

前后步骤、画布平移、指针锚定缩放、Fit、手动定位与键盘操作用于阅读。点击步骤只更新高亮，不自动放大单个节点；实体位置在该场景内保持稳定。Fit 保持文字可读；手动继续缩小可看整体结构，阅读字段时再放大或查看实体详情。窄屏当前讲解与导览保持可访问，避免选中步骤后找不到说明。

URL hash 支持 `#view=overview|objects|scenes&scene=<场景ID>&step=<从1开始的步骤>`，以及旧的 `journey` 场景别名；`node=<节点ID>` 可定位实体。各项按需要省略，不存在的标识回到可读视图或场景起点。只有宿主真实支持时才自动打开或读取当前选择；未连接宿主双向事件时，不宣称画布点击已经发送到聊天。聊天中的追问复用同一模型，不为每个问题重建整个项目。

总览可用 `perspective=runtime|logical|development|physical` 指定切面，默认 `runtime`；`flow=<场景ID>` 只接受 `flowJourneyIds` 中的主流程。`view=scenes` 继续阅读 +1 章节，`node` 仍引用规范实体，不是 L0 聚合节点或内部边 ID。无效总览参数回到现有切面与有效主流程。

生成产物不作为源码提交，本仓已忽略 `.nimo/how/`；其他工作区按其实际忽略规则排除产物，不自动修改其 Git 配置。生成器不更新目标程序、Knowledge 或全局配置。用户禁止文件输出时返回内联解释。实时运行实例、业务 ID 查询和遥测订阅不属于这个静态模型。
