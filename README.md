中文 | [English](README.en.md)

# nimo

**与编程宿主解耦的 AI 工程栈。** 使用 nimo 描述任务，它会选择做法、应用相关原则、组织实现与审查，并用实际产物验证结果。

完整适配 pstack 的 **23 个 Playbook、21 个工程原则**。加上入口、配置及任务方法，共 **42 个 Skill**。核心不绑定特定模型、私有 Agent API 或云环境。

## 安装

需要 Node.js 22+ 和 npm；GitHub PR 功能另需已认证的 gh。

```powershell
git clone https://github.com/ttttstc/nimo.git
cd nimo
.\integrations\codex\install.ps1
```

```bash
git clone https://github.com/ttttstc/nimo.git
cd nimo
bash integrations/codex/install.sh
```

Claude Code 使用 integrations/claude-code 下对应脚本。安装保留其他 Skill 和用户改动；配置、运行日志及私人知识不上传。详见 [宿主接入](integrations/README.md)。

## 使用

在支持 Skill 的宿主中明确调用 nimo-mode，或说：

```text
使用 nimo，看看这个项目接下来怎么推进，先讨论。
使用 nimo，修复登录一直加载的问题，复现并验证。
使用 nimo，给这个需求写完整方案，先不实现。
使用 nimo，把改动整理成 PR 链，我自己合并。
```

明确措辞优先。检查 PR 不自动持续跟进，持续跟进不自动合并。没有后台唤醒或独立验证能力时，nimo 明确报告限制，不假装已完成。

## 团队与个人知识

无需配置即可使用默认方法。需要外部资料时，直接说“把 ./docs 加到项目知识”或“把 ~/knowledge 加到我的个人知识”。

项目配置为 .nimo/nimo.yaml，个人配置为 ~/.nimo/nimo.yaml：

```yaml
principles:
  - skill: company-api-first
  - path: ./engineering/principles/reliability.md
knowledge:
  - ./docs
```

团队配置中的相对路径以项目根为准，个人配置以用户主目录为准。对话中相对路径先按当时工作目录定位，再转换保存。配置只保存引用，不复制原资料；知识按任务检索，不整库注入。“这次不用某来源”只影响当前会话。

## 工程流程

- 开发：功能、缺陷、调查、重构、原型。
- 诊断：性能问题、持续指标改善、运行时取证、跟踪文件分析。
- 质量：视觉一致、Skill 编写、行为评测。
- 交付：创建 PR、PR 跟进、验证合入、多阶段计划。
- 持续工作：单目标自主执行、项目协调、独立事项自动交付、PR 链交付。
- 现场：恢复、暂停、核实后清理工作目录。

全部流程见 [Playbook 目录](skills/nimo-mode/playbooks)。

## 实现与验证

- [完整方案](docs/nimo-v1-issue-13-spec.md)
- [本地工具契约](skills/nimo-mode/references/tools.md)
- [Agent 行为评测](evals/README.md)
- [许可与来源](THIRD_PARTY_NOTICES.md)

测试只保留可复跑代码和最小必要案例；运行产物在临时目录。静态包检查和程序测试不替代真实宿主／UI／PR 运行证据。

```text
npm --prefix skills/nimo-mode/scripts ci
npm --prefix skills/nimo-mode/scripts run check
npm --prefix skills/nimo-mode/scripts test
node tests/assets/check-package.mjs
```
