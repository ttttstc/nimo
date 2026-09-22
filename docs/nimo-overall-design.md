# nimo 总体设计

新版实现依据为 [Issue #13 完整方案](nimo-v1-issue-13-spec.md)。核心采用 Mode、Playbook 和直接 Skill 引用；旧 Capability、Provider 和 project.yaml 设计已移除，不提供迁移或兼容层。

历史 evidence 仅说明当时版本，不代表新版已经验证。宿主能力和验证范围按实际运行结果报告。

Issue #34 V1 的任务检查入口见 [Nimo 任务检查器](nimo-inspector-v1.md)。任务检查器读取任务记录、最终验证记录和可选审计记录，生成离线 HTML；它不重跑验证，不自动关联会话，也不改变验证或外部操作权限。
