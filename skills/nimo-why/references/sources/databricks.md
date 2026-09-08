# Databricks 分析与系统表

## 这个来源包含什么

Databricks 是产品分析、数据管道与数仓遥测层。它与 Datadog 互补：Datadog 是*基础设施/运行时*视角，Databricks 是*产品/数据*视角（用户做了什么、跑了哪些实验、功能使用如何演化、某个阈值常数从哪来）。

- **产品分析事件。** `your_warehouse.events.analytics_track_event`（原始）与 `<your_analytics_db>.<schema>.<table>` 中按事件去重、有类型的 dbt 模型。用户行为：功能调用、点击、接受/拒绝、提交、客户端上报的错误。
- **用量与计费事件。** `your_warehouse.events.usage_event` / `<your_analytics_db>.<schema>.stg_usage_events`；`your_warehouse.events.raw_model_event` / `<your_analytics_db>.<schema>.stg_raw_model_events`。用于成本或容量驱动的决策。
- **实验 / 特性开关数据。** 曝光与结果表。**schema 因公司而异。**先 `SHOW TABLES` 探测，不要假设表名。
- **系统表。** `system.query.history`、`system.compute.warehouses`、`system.billing.*`、`system.access.audit`。回答"这条查询贵吗？""这东西多久被人跑一次？""数仓负载何时尖峰？"
- **dbt 血缘。** `<your_analytics_db>.<schema>` 里的模型揭示哪些管道依赖某张表/字段；上游变更经常驱动下游消费代码的变更。
- **Databricks notebook。** 工程师在改代码前写的探索性分析。**SQL 连接器查不到。**若怀疑动机藏在 notebook 里，把它记为缺口。

## 怎么搜

使用 Databricks SQL 连接器（工具名以 Databricks SQL MCP 为例）。主要工具：`execute_sql_read_only`。若返回 `statement_id`，用 `poll_sql_result` 轮询，不要重跑。

**先定向再查询。** schema 因公司而异；先探测再信表名：

```sql
SHOW TABLES IN <your_analytics_db>.<schema> LIKE '*<keyword>*';
DESCRIBE TABLE <your_analytics_db>.<schema>.stg_<event>;
```

**每条查询都限定时间。** 这些表巨大，无约束扫描会超时。按 `_timestamp`（事件）或 `start_time`（`system.query.history`）过滤，窗口夹住上线日期——通常前后各约 30 天，除非有强理由才放宽。

**优先用有类型的 dbt 模型而非原始表。** `<your_analytics_db>.<schema>.<table>` 去重、有类型、liquid-clustered；`your_warehouse.events.analytics_track_event` 有重复且 `properties_json` 无类型。模型名模式：`stg_<source>_<event_name_with_underscores>`，其中 `<source>` 是 `app`、`backend`、`website` 或 `cli`；仅凭模式解析不出来时，用 `SHOW TABLES` 确认确切的模型名。只在还没有 dbt 模型、或需要 dbt 刷新延迟内的近期事件时，才降级用原始表。

**有类型 dbt 模型的列惯例**（知道这些可以省一次 `DESCRIBE` 往返）：

- `_timestamp`、`_id`、`_auth_id`、`_request_id`、`event_name`。每个模型的标准列
- `properties_<name>`。有类型、下划线风格的事件属性（`properties_entrypoint`、`properties_size_bytes`……）
- `context_team_id`、`context_client_version`、`context_country`、`context_client_os`。预提取的客户端上下文

### 常常奏效的调查模式

按目标挑选 表+列 的组合：

1. **事件使用轨迹。** PR 合并前后约 ±30 天窗口内，相关 `stg_*` 模型的每日计数。合并后一两天内从零阶跃到稳定量，是该 PR 发布了此功能的有力旁证。衰减到零暗示弃用或删除。
2. **护栏 / 防御检查的来源。** PR *之前* 14 天内相关 `properties_<name>` 列的分布（中位数 / p99 / max）。p99 与目标的阈值常数吻合，暗示这个数是从数据里选的。
3. **实验 / 特性开关查证。** `SHOW TABLES ... LIKE '*experiment*'` 找到曝光表，然后在 PR 日期附近按 variant 拉相关 flag key 的曝光计数。
4. **迁移、回填或性能重写的查询历史证据。** `system.query.history` 按 `statement_text ILIKE '%<table_or_symbol>%'` 加紧凑的 `start_time` 窗口过滤，浮出可能驱动了这次变更的昂贵查询（按 `total_duration_ms` 排序，或聚合 `SUM(read_bytes)`、`COUNT(*)`）。
5. **dbt 血缘。** 若目标读写某个 `<your_analytics_db>.<schema>` 模型，该模型自己的 git 历史（在本仓库里）经常带着动机。把这条线索交回给 git 调查者，不要自己追。

## 这里的好证据长什么样

除上述模式形态外：

- 某个错误分类事件的计数在防御性代码 PR 后几天掉到近零。暗示该 PR 解决了这一错误类别
- 曝光表里一行以目标的功能开关 key 命名，且在 PR 上线日期前后带 "shipped" / "concluded" 决策

## 常见坑

- **有埋点不等于有因果。** 一个事件的存在只说明有人在意到要记录它，不代表目标代码*因为*它而存在。宣称因果前，先配对 git 调查者的 PR/提交引用。
- **静默的埋点变更。** 事件量的阶跃可能意味着新事件开始被记录，而非用户行为变了。把阶跃读作功能上线信号前，先查同窗口内的埋点 PR。
- **schema 漂移。** 事件属性会演化；今天有类型 dbt 模型上的一列，在目标写就时可能不存在。更老的数据可能只在原始 `properties_json` 里带该属性。
- **dbt 刷新延迟。** `<your_analytics_db>.<schema>.*` 按计划重建（常为每小时/每天）。要最近几小时的事件，退回 `your_warehouse.events.*` 并按 `_id` 去重。
- **公司特有的表。** 实验、功能开关、计费、用量表各公司不同。报告一个你从未确认过其存在的表上的结果，是经典失败模式。先 `SHOW TABLES` / `DESCRIBE TABLE` 探测。
- **保留期断崖。** 相关窗口早于表的保留期或 dbt 模型的创建日期时，那是*缺口*，不是空结果。显式点名，免得汇总者把"无结果"读成"无活动"。
- **notebook 查不到。** SQL 连接器看不见 Databricks notebook。怀疑动机藏在 notebook 里，就返回缺口。

## 返回什么

每条相关发现：
- 类型（产品事件 / 实验曝光 / 用量或计费事件 / 系统表行 / dbt 模型）
- 完全限定表名与你跑的确切查询
- 查询的时间窗口
- 紧凑的数值摘要（计数、分位数、first/last-seen 时间戳）。**不要倾倒原始行。**
- 与目标上线日期的时间相关性（如"首行 2024-08-15；PR #49074 合并于 2024-08-14"）
- 相关性与强度：直接 / 旁证 / 弱
