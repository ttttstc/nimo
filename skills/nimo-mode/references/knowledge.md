### 3.11 项目知识维护契约

#### 知识位置与权限

项目知识正文由用户决定放在哪里。唯一登记入口仍是 `.nimo/nimo.yaml` / `~/.nimo/nimo.yaml` 的 `knowledge` 路径；可以是仓库内外的文件或目录。nimo 不要求把知识复制到 `.nimo`，也不因为仓库中存在 Markdown 就自动取得写权限。

区分两个对象：

- **Knowledge Target**：`knowledge` 明确登记的文件或目录，是审计/维护的知识范围。
- **Evidence Source**：用于证明项目事实的代码、配置、接口、Schema、测试、流水线、运行说明和必要版本历史。可以读取，不因被引用就获得写权限。

目录型 Target 只定义范围，不等于目录内所有文件都由 nimo 管理。已有文档默认为 `user-managed`；`nimo-knowledge-maintain` 在登记目录中新建的知识文件记录为 `nimo-managed`。前者只定向改确认漂移的事实，后者可以持续整理，但两者都遵守最小修改。

#### Agent 可消费的三层知识

项目知识优先组织为渐进式上下文：

```text
Overview（高压缩项目概览）
    ↓
Index（全仓知识入口 + 一句话摘要 + 下一跳）
    ↓
Knowledge Pages（具体稳定事实 + 证据）
    ↓
Repository Evidence（代码 / 配置 / 测试 / 接口）
```

Overview 回答项目定位、核心领域、关键模块、主运行链路、重要约束和知识入口；Index 必须让不知道文件名的 Agent 根据问题选出少量相关页面。只有当知识仍不足时再读取原始项目资产。不能用只有文件名的目录冒充索引，也不能逐文件生成源码摘要填充知识库。

单文件 Target 不得未经配置创建兄弟文件；在一个文件内提供概览、索引和主题事实的等价结构。已有成熟文档可直接承担 Overview/Index/Page 角色，不为统一模板复制平行版本。

#### 项目事实

可以写入：系统结构、模块职责、调用/状态关系、公共接口、数据模型、配置契约、构建/测试/运行方式、外部依赖、已经落地且有项目证据的架构决定。

不能直接写入：未来计划、未实现需求、临时任务进度、Agent 主观评价、无证据设计意图、仅由聊天猜出的历史原因。

关键事实应能回溯到路径、符号、接口、配置、测试或运行证据。知识是对稳定事实的编译，不是原始仓库的全文镜像。

#### 维护状态

项目级维护元数据固定放在 `<projectRoot>/.nimo/state/knowledge.json`，由 `knowledge-state.mjs` 原子维护。它允许仓库内知识在不同机器之间复用增量基线，不保存知识正文、秘密或本机绝对路径。实际结构：

```json
{
  "formatVersion": 1,
  "revision": 3,
  "lastMaintainedRevision": "<project version>",
  "lastMaintainedAt": "<timestamp>",
  "targets": {
    "./docs/architecture.md": {
      "ownership": "user-managed | nimo-managed",
      "contentHash": "<sha256>",
      "verifiedRevision": "<project version>",
      "sources": ["src/runtime/**"]
    },
    "external:<opaque-hash>": {
      "ownership": "user-managed",
      "contentHash": "<sha256>",
      "verifiedRevision": "<project version>",
      "sources": ["external:configured-knowledge"]
    }
  }
}
```

状态按“实际知识文件”记录，不把目录本身当成已验证知识页。仓库内文件使用项目相对标识；仓库外文件使用不可逆 `external:<hash>` 标识，避免把用户本机路径写进可共享状态。`sources[]` 也不得保存绝对路径。

`knowledge-state.mjs update` 根据当前文件内容自行计算 `contentHash`，调用者不自报哈希；`expectedRevision` 防止并发覆盖。第一次 `init` 只建立空状态，不能被解释为知识已经维护。外部知识换机器后标识无法匹配时，诚实退化为重新核对，不猜测本机路径。

状态是缓存，不是事实真相。文件缺失、损坏或 `lastMaintainedRevision` 不可达时，维护/审计退化到更广核对；已有知识仍然可读。不得为了状态方便要求用户移动知识正文。

#### 知识飞轮

工程任务产生新的项目事实；普通任务结束前只做轻量 **Knowledge Impact** 判断，不主动运行知识审计。结果：

- `NOT_APPLICABLE`：只读任务或没有项目资产变化。
- `NONE`：有项目变化，但当前差异没有改变稳定项目事实。
- `REVIEW_RECOMMENDED`：可能改变稳定事实，记录原因和受影响知识领域，建议后续审计。

高信号影响包括：新增/删除核心模块，模块职责或主调用链变化，公共 API/协议/Schema/配置契约变化，构建/部署/测试/运行方式变化，安全权限模型变化，关键领域模型变化，大规模迁移，以及旧能力正式废弃或新能力正式落地。

Knowledge Impact 只利用当前任务已经掌握的 diff、设计决定和验证事实；不扫描全部知识、不证明发生漂移、不阻断交付。存在长期 program 时写入 `knowledgeImpact`；短任务至少在交付摘要中保留 `REVIEW_RECOMMENDED` 及影响领域。

`nimo-knowledge-audit` 第一版不被普通任务自动触发，只允许用户显式调用或定时/外部例程调用。Audit 发现 DRIFTED 后请求用户确认，才由 `nimo-knowledge-maintain` 执行写入；预先明确授权的自动维护任务由上层分别调用两者。

#### 维护与审计分工

- `nimo-knowledge-maintain`：写操作；基线生成、增量刷新、全量核对；持续编译 Overview → Index → Pages，并在成功后通过 `knowledge-state.mjs` 建立新的增量基线。
- `nimo-knowledge-audit`：严格只读；审事实漂移、覆盖漂移、Index/Overview 漂移和孤儿/断链；输出 CLEAN / DRIFTED / BLOCKED。
- `configure-nimo`：只负责知识路径在哪里，不承担事实刷新。
- `knowledge-state.mjs`：只做确定性维护状态记账，不理解知识语义，不判定漂移。

事实源发生变化只代表 `stale candidate`；重新核对后证明知识主张或导航已失真，才是 `DRIFTED`。
