# Adaptation Ledger

nimo 相对 upstream pstack（固定 SHA `93b00b89ef425a9c1bac0d0b317dfc49c930ac99`，见 [upstream manifest](../upstream-manifest.md)）的每个有意义差异都登记在下列分册中。没有登记的语义删除视为缺陷。

登记规则：

- 只登记会改变 Agent 决策或执行行为的差异（删除、替换、收紧、放宽、降级）。
- 纯翻译、命名映射（pstack → nimo）、结构段约定不逐条登记，各分册开头以共性条目汇总。
- 每条记录六列：`artifact / upstream rule / nimo adaptation / reason / semantic impact / verification`。
- `semantic impact` 必须诚实标注：无损失、收紧（更安全）、放宽（行为变化）、降级（依赖宿主能力）。

## 分册

| 分册 | 覆盖范围 |
|---|---|
| [principles-a.md](principles-a.md) | 11 个 Principle（boundary-discipline 至 migrate-callers-then-delete-legacy-apis） |
| [principles-b.md](principles-b.md) | 10 个 Principle（minimize-reader-load 至 type-system-discipline） |
| [skill-why.md](skill-why.md) | nimo-why 及 references |
| [skill-how.md](skill-how.md) | nimo-how 及 references |
| [skill-architect-arena.md](skill-architect-arena.md) | nimo-architect、nimo-arena 及 references |
| [skill-fio-smyw.md](skill-fio-smyw.md) | nimo-figure-it-out、nimo-show-me-your-work |
| [skill-nc-interrogate.md](skill-nc-interrogate.md) | nimo-no-comments、nimo-interrogate 及 references |
| [skills-p1.md](skills-p1.md) | nimo-swarm、nimo-tdd、nimo-unslop、nimo-technical-writing |
| [skills-scan.md](skills-scan.md) | nimo-verification-create/maintain、nimo-skill-author/evaluate、nimo-deslop、nimo-verify（含来源判断） |
| [playbooks-p0-a.md](playbooks-p0-a.md) | PB01 feature、PB02 bug-fix、PB04 refactoring、PB06 perf-issue、PB07 hillclimb、PB12 eval |
| [playbooks-p0-b.md](playbooks-p0-b.md) | PB14 babysit、PB15 shipping、PB16 multi-phase-plan |
| [playbooks-p0-c.md](playbooks-p0-c.md) | PB17 autonomous-run、PB18 orchestrate |
| [playbooks-p0-d.md](playbooks-p0-d.md) | PB19 autopilot-full、PB20 autopilot-stack |
| [playbooks-p1-a.md](playbooks-p1-a.md) | PB03 investigation、PB05 prototype、PB08 runtime-forensics、PB09 trace-forensics、PB10 visual-parity |
| [playbooks-p1-b.md](playbooks-p1-b.md) | PB11 authoring-a-skill、PB13 opening-a-pr、PB21 session-pickup、PB22 pause-safely、PB23 worktree-cleanup |

## 共性差异（适用于全部 direct 派生 artifact）

以下差异在所有分册中重复出现，此处统一声明：

1. **语言**：upstream 英文正文忠实本地化为中文；不逐句直译，行为语义等价。
2. **命名**：pstack Skill 名映射为 nimo 名（how→nimo-how、principle-X→nimo-principle-X 等）。
3. **固定模型**：upstream 的默认模型名（grok、claude 系列等）一律替换为"用户配置的模型"。
4. **Cursor 私有接口**：Task 工具、/loop、/goal、cloud agent、transcript 目录改为宿主原生能力；不存在时诚实降级（仅当前会话运行 / 记录 UNVERIFIED），绝不伪装后台能力。
5. **Graphite/Origin**：gt 命令替换为当前 forge（GitHub 等）+ Git 原生能力。
6. **授权边界**：push、评论、合并、rebase、部署等外部动作受用户当前授权约束；PR draft/ready 按用户要求；暂停不自动授权 commit。
7. **`disable-model-invocation` frontmatter**：upstream 的该字段是 Cursor 私有机制，nimo 不移植；触发条件写入 description。
8. **nimo 增强结构**：Playbook 的"执行前读取 / 公共规则 / 交付 / 来源"段、Principle 的"适用 / 应用证据"段为 nimo 自有增强，叠加在 upstream 语义之上。
