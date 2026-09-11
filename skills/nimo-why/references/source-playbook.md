# 来源手册

nimo-why 为每个可用证据类别派出一个调查者，每个调查者读一份来源专属手册。这些手册以常见连接器为具体示例；同类别的其他连接器按此改编。

| 类别 | 手册 | 所示例的连接器 |
|---|---|---|
| 源码历史 | [`code-archaeology.md`](./sources/code-archaeology.md) | git、`gh` |
| 工单 / issue 跟踪 | [`linear.md`](./sources/linear.md) | Linear（可改编用于 Jira、GitHub Issues、Plane、Shortcut） |
| 长文档 | [`notion.md`](./sources/notion.md) | Notion（可改编用于 Confluence、Google Docs、Coda） |
| 团队即时沟通 | [`slack.md`](./sources/slack.md) | Slack（可改编用于 Discord、Microsoft Teams、Mattermost） |
| 基础设施可观测性 | [`datadog.md`](./sources/datadog.md) | Datadog（可改编用于 New Relic、Honeycomb、Grafana、Splunk） |
| 错误 / 异常追踪 | [`sentry.md`](./sources/sentry.md) | Sentry（可改编用于 Rollbar、Bugsnag、Airbrake） |
| 产品分析数仓 | [`databricks.md`](./sources/databricks.md) | Databricks SQL（可改编用于 Snowflake、BigQuery、ClickHouse、dbt） |

跨领域：

- [`incident-postmortem.md`](./sources/incident-postmortem.md)。目标代码看起来是防御性的时候附加（空值检查、重试、超时、限流、特性开关、出口防护、OOM 处理器）。
