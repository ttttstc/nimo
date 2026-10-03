# Knowledge 状态身份验收配方

绑定当前 HEAD 与差异。运行证据放入当前任务 `.nimo/tasks/<task-id>/`，保留修复前失败与修复后读回，不更新用户真实知识页。

| 场景 | 驱动与预期 | 证据 |
|---|---|---|
| 初始化与内部目标 | `node --test tests/state/knowledge-state.blackbox.test.mjs`；init 可建立新状态，项目内文件使用 `./` 相对身份，维护与 status 返回正确 ownership/hash/revision，不保存项目绝对路径 | 原始两项失败、修复后断言、落盘状态 |
| 根目录别名 | 使用真实目录及其可用别名运行公开 update/check；目标的物理身份一致，不因短路径或链接根目录被当作外部目标；删除文件仍返回 MISSING | 根目录与目标路径对照、CLI 结果、独立 JSON 读回 |
| 手工修改刷新 | 接受已核实的文件修改，只推进维护版本和内容摘要，知识文件字节不变，后续 check 为 UNCHANGED | 维护前后字节摘要与状态读回 |
| 影响边界 | 外部目标仍使用路径 SHA-256，过期版本、hash 漂移和 revision 冲突仍拒绝；类型检查和全量测试覆盖合理回归 | 目标测试、类型与全量日志；平台能力跳过保持事实 |

真实 CLI 使用 `skills/nimo-mode/scripts/knowledge-state.mjs --input <request.json>`；`projectRoot` 是本次创建的隔离 fixture。不要靠修改预期相对键或判空避开原始失败。缺少目录别名能力时保留未执行事实，以宿主原生短路径复现与其他可执行检查补充证据。
