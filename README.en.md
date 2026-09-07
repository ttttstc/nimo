[中文](./README.md) | English

# nimo

i maintain nimo. over the past year i've watched people hand more and more work to agents: writing faster, verifying less, shipping something closer to a lottery draw. i don't accept throughput as a substitute for quality. if you want to go fast, go deep first.

**nimo is my answer.** it runs no models and executes no tools — that's the host's job (Codex, Claude Code). nimo is the engineering discipline itself: principles, task playbooks, replaceable engineering capabilities, real verification, continuous improvement. the goal is not to maximize loc. it's the opposite: **nimo helps you write less, but every line comes with evidence.**

**nimo gives you auditable delivery.** every conclusion is anchored to artifacts and evidence: unverified is labeled unverified, missing conditions are reported as blockers, skipped checks are marked as skipped. a sub-agent saying "done" doesn't count; it counts when the main agent has verified it.

**swap anything, keep the standards.** swap the model, the host, or an engineering skill — task goals, engineering requirements, and delivery standards stay the same. swap a skill and only the capability layer changes; swap the host and only the runtime changes.

fork it. improve it. make it yours. PRs are welcome!

## install

prerequisite: Codex CLI 0.144+ or Claude Code 2.0.20+.

```powershell
# Windows (PowerShell)
git clone https://github.com/ttttstc/nimo.git
cd nimo
.\integrations\codex\install.ps1          # Codex
.\integrations\claude-code\install.ps1    # Claude Code
```

```bash
# macOS / Linux
git clone https://github.com/ttttstc/nimo.git
cd nimo
./integrations/codex/install.sh           # Codex
./integrations/claude-code/install.sh     # Claude Code
```

the installer writes only nimo-owned files, tracks ownership in a manifest, and never touches your other configuration. uninstall is clean, and isolated test installs can be re-run any time.

## get started

two steps:

1. install (done above).
2. in any project directory, say one thing:

```text
claude -p "Use the nimo skill: look at this project and advise how to proceed. Discuss only — do not modify any files."
```

that's it. expect current status, main gaps, the priority action, and the definition of done — and the "discuss first" phase modifies no files (`git status` stays clean). the other skills are situational; the entry skill uses them for you as needed.

## usage

use the unified entry at the start of a task. it reads your request, picks from a set of playbooks, and runs the other skills as the steps need them.

### just use `nimo`

```text
$nimo How should we push this requirement forward?

$nimo Fix the endless loading after login. Reproduce it and verify.

$nimo Implement project list filtering, keeping the existing API compatible.
```

when invoked it:

1. decides the intent: guidance or execution. when in doubt, treats it as guidance — no side effects.
2. matches a playbook and copies the steps in; recommended steps can be reordered for the task, but required checks cannot be silently skipped.
3. routes to the other skills as the steps fire; non-trivial implementation is delegated to sub-agents with full task contracts, accepted by the main agent.
4. delivers conclusions with evidence: pass, fail, and unverified, each stated plainly.

explicit wording always beats inference: "discuss first" / "don't modify" means read-only; "continue" picks up only the most recent concrete proposal, never expanding scope; "stop" means stop and preserve the scene. the full conventions live in [skills/nimo/SKILL.md](skills/nimo/SKILL.md).

### playbooks

| playbook                                               | for                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [bug](skills/nimo/references/playbooks/bug.md)         | reproduce a defect, keep the failure evidence, root-cause it, fix minimally, verify with before/after distinction. |
| [feature](skills/nimo/references/playbooks/feature.md) | new or changed behavior, built from explicit acceptance, delivered after behavioral verification.                  |

### skills

the entry skill runs most of these for you when a step needs them. the table below is for when you want one directly:

| skill                                                          | use it when                                                                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [nimo](skills/nimo/SKILL.md)                                   | the default entry point for any non-trivial task.                                                                           |
| [nimo-setup](skills/nimo-setup/SKILL.md)                       | install detection and configuration: install, update, uninstall, capability detection.                                      |
| [verification-create](skills/verification-create/SKILL.md)     | your project has no scripted way to prove app behavior. generates a project-local verify skill with a feature map.          |
| [verification-maintain](skills/verification-maintain/SKILL.md) | your feature map has drifted from the app. source check + one live pass, three-way triage.                                  |
| [skill-evaluate](skills/skill-evaluate/SKILL.md)               | you want to know whether a skill change actually made things better. isolated comparison, blind judging, regression checks. |

## where it sits

nimo is the "engineering method layer" of the AI development stack:

| layer                        | provided by                  | owns                                                                               |
| ---------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| model layer                  | LLM                          | reasoning                                                                          |
| agent runtime layer          | Codex / Claude Code / Cursor | model calls, tools, permissions, sessions, sub-agents                              |
| **engineering method layer** | **nimo**                     | principles, playbooks, capability contracts, quality gates, evaluation maintenance |
| project asset layer          | your project (`.nimo/`)      | feature map, verification scripts, checkpoints                                     |
| enforcement layer            | your CI & repo protection    | merge and release gates                                                            |

nimo defines "what counts as done right and done at all," the host executes, and your CI provides the backstop. your CI is always the last gate — nimo does not replace it.

## principles

ten engineering principles, one each. the entry skill reads the index at task start and expands only what's relevant, not reciting principle names.

| principle                                      | rule                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| P1 understand facts and domain structure first | read the relevant code, specs, and run behavior; know the structure before touching it. |
| P2 smallest change that fully solves it        | minimal change, no abstractions the current task doesn't need.                          |
| P3 verify the real artifact                    | conclusions match evidence; "the code looks right" is not verification.                 |
| P4 reproduce and root-cause bugs first         | get a repeatable failure before fixing; never mask the symptom.                         |
| P5 sequence verifiable units                   | split long tasks so implementation order follows "verifiable," not the file list.       |
| P6 own the state explicitly                    | every piece of state has one owner and one writer; prefer single-writer designs.        |
| P7 check side effects before retrying          | check idempotency; after a timeout, query the result before resending.                  |
| P8 carry only the necessary context            | hand over summaries and file references, not the entire session history.                |
| P9 turn deterministic errors into constraints  | recurring errors become types, lint, scripts, or CI — not prompt reminders.             |
| P10 proceed autonomously within authorization  | act within your mandate; hand real product trade-offs back to the user.                 |

full rules, applicability, and exceptions live in [references/principles.md](skills/nimo/references/principles.md).

## not shipped here

- no self-built agent runtime, workflow engine, task platform, long-term memory, or plugin SDK. if the host has it, use the host's; if not, degrade honestly.

- no replacement for your CI and repo protection. completion checks are engineering requirements, not enforced gates — and prompts are not a security sandbox.

- no multi-project orchestration or automated merge/release queues. performance work and dedicated refactoring may come later; not in v1.

- no auto-installing unfamiliar skills, no pulling unreviewed scripts. only capabilities visible in the environment or registered by the project.

- when the host lacks a capability (no parallelism, no isolated contexts, no product-driving tools), nimo reports the blockage instead of reporting aspirations as results.

## verified status

some run evidence is archived in this repo; the rest is retained locally per task. a few things that are actually true:

- ran live inside Claude Code 2.1.23: session attribution proves the skill was loaded, `git status` stayed clean after "discuss only," and the guidance output contained all four elements ([issue-8](docs/evidence/issue-8/real-invocation.log)).

- a feature-map maintenance patrol on a sample project genuinely caught documentation drift, a tooling gap, and a real product defect — the first two were fixed and re-run, the defect was reported as-is, and no expectation was rewritten to flatter it.

- sub-agent collaboration discipline: 10 live tests passing ([issue-3](docs/evidence/issue-3/README.md)); installer scripts: 12 behavioral tests passing ([issue-2](docs/evidence/issue-2/install-scripts-test.log)).

not yet verified: real invocation inside Codex, behavior on the official Anthropic endpoint, native macOS/Linux, end-to-end bug playbook, candidate comparison. unverified means not usable.

## learn more

- [nimo overall design](docs/nimo-overall-design.md): architecture, user paths, feature maps, evaluation maintenance, and acceptance requirements.

- [Codex integration](integrations/codex/README.md) / [Claude Code integration](integrations/claude-code/README.md): install, isolated testing, update, and uninstall.

- [skill-evaluate](skills/skill-evaluate/SKILL.md): case organization, isolated execution, and scoring.

