# 计划：原语化 grilling 对齐阶段与配套能力

## 背景与已定决策

- 本地 `~/.claude/skills/` 里一批外部工程技能是旧快照。
- 融合路线：吸收 `grill-with-docs`，原语化为 **`nimo-grilling`**（叶子 skill，可被 playbook 调用，把一件事讨论清楚）。
- 触发：中等，按信号触发（设计空间开放 / 跨边界 / 未定义术语 / architect 需用户拍板）。
- 术语表：进 knowledge 词汇页。
- 边界：grilling 只走非结构分支；结构交给 nimo-architect。
- 产物分流：术语→knowledge 词汇页；决议/未决→Task Contract；架构决策→落地后写 knowledge+ADR。

## 任务清单

### 阶段 1：nimo-grilling（核心）✅

- [x] 新建 `skills/nimo-grilling/SKILL.md`
- [x] 接入 `feature.md`（第 1 步 how 之后、architect 之前）
- [x] 接入 `refactoring.md` / `hillclimb.md`（第 1 步）
- [x] 接入 `bug-fix.md`（复现优先的例外）
- [x] 接入 `multi-phase-plan.md`（第 2 步）与 `nimo-figure-it-out`（阶段 A）
- [x] `knowledge.md` 增补"词汇页"页型
- [x] 更新 `README.md` / `README.en.md` 技能表与自动调用说明

### 阶段 2：深模块设计词汇 ✅

- [x] `nimo-architect/references/design-red-flags.md` 增补删除检验、接缝与适配器
- [x] `nimo-arena/SKILL.md` 选择准则加入删除检验

### 阶段 3：代码库健康巡检 ✅

- [x] 新建 `skills/nimo-mode/playbooks/codebase-health.md`
- [x] `nimo-mode/SKILL.md` 路由表加入该 playbook
- [x] `README.md` / `README.en.md` playbook 表加入该行

### 阶段 4：收口（待授权）

- [x] 本地 `~/.claude/skills/` 里既有的一批外部工程技能：**保留，不动**（用户决定）
- [ ] 是否把 `nimo-grilling` 安装到 `~/.claude/skills/`：待定（不装则仅存于仓库，当前会话调不到）
- [x] 引用与 frontmatter 校验：所改文件的所有相对链接可解析、name 与目录一致（脚本核过）
- [x] 登记进包校验清单：`tests/assets/check-package.mjs`（TASK_SKILLS / PLAYBOOKS 清单与计数 48/24）、`skills/nimo-mode/scripts/install.mjs`（48）、`tests/installation/install.test.mjs` 与 `host-wrapper.test.mjs`（48）

## 评审

- `nimo-grilling` 与 `nimo-architect` 零重叠：grilling 只走非结构分支，结构归 architect；两者共享 `nimo-how` 这一个事实来源。
- 与 `nimo-interrogate` 正交：一个问用户，一个让其它模型对抗评审。
- 产物分流规避了 knowledge 契约"不得写未实现需求"的冲突：决议进 Task Contract，术语进 knowledge，ADR 落地后才写。
- 未跑 deslop/no-comments：本次改动为中文文档与 skill 定义，无代码注释。
- 测试：`node tests/run.mjs` 通过 146 项，`check-package.mjs` PASS（48 Skills / 24 Playbooks）。3 项失败均为既有或环境问题，与本改动无关：Bash wrapper 测试因本机 bash PATH 缺 node（`exec: node: not found`）；knowledge-state 的 2 项已在 `git stash` 的干净树上复现同样失败。

## 开放问题

- `nimo-grilling` 不进 `nimo-mode` 必要依赖，只由各 playbook 的"所需 Skill"引用（按需阶段）。
- 词汇页默认落点：由用户 `knowledge` 配置决定，建议指向已登记的概览/索引文件加一节词汇表。
