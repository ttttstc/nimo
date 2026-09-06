# nimo 设计研究来源

日期：2026-09-06

本文件记录总体方案使用的研究资料，不作为行为规格。nimo 的行为以总体方案及后续版本化工程内容为准。以下链接在前序讨论中读取；上游 main 可继续变化，实际复用内容前需要固定版本并核对许可证。

## 用户讨论形成的设计基线

统一入口支持自然语言指导与执行；明确措辞优先。项目强制门禁不由普通对话覆盖。研发能力默认可用、支持替换；短任务少记录、长任务可恢复。交付与验证状态分开。核心内容跨宿主共用，Codex 优先验收。第一版包含功能地图与 Skill 评测维护，不自建运行时、工作流引擎或长期记忆系统。对外 README 不介绍或比较参考产品。

## 参考材料

- [pstack README](https://github.com/cursor/plugins/blob/main/pstack/README.md)：统一入口、任务路由、专业 Skill 组合和项目验证。
- [入口与原则索引](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md)：原则按需展开、推荐步骤和主 Agent 责任。
- [Feature Playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/feature.md)：设计、拆分、委派、验证和审查。
- [项目验证创建](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md)：运行方式、功能地图、证据与清理。
- [项目验证维护](https://github.com/cursor/plugins/blob/main/pstack/skills/maintain-verification-skill/SKILL.md)：源码与实际操作覆盖，区分文档、工具和产品问题。
- [Eval Playbook](https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/playbooks/eval.md)：自然任务、候选隔离、盲评、统一尺度及真实行为评价。
- [复盘机制](https://github.com/cursor/plugins/blob/main/pstack/skills/reflect/SKILL.md)：从工作中提取维护建议，评估确定性约束和团队规则变更。
- [模型配置](https://github.com/cursor/plugins/blob/main/pstack/skills/setup-pstack/SKILL.md)：角色默认与配置覆盖；其具体平台依赖不进入 nimo 核心。
- [课程文章整理](https://x.com/shao__meng/status/2096182656732168445)：关于验证、功能地图、Skill 评测和硬约束的课程转述；具体机制另与上述源码交叉核对。

## 复用边界

本轮采用设计思想复用，未复制上游 Skill 正文或脚本。nimo 增加明确的跨宿主降级、授权范围、产物版本和评测预算要求；这些属于本方案设计，不宣称是上游现有实现。
