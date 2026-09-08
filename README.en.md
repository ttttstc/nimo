[中文](README.md) | English

# nimo

A host-independent AI engineering skill package. Describe an engineering task; nimo selects a playbook, applies relevant principles, separates implementation from review, and verifies real artifacts.

The package adapts all 23 pstack playbooks and 21 principles. It contains 42 skills, including configuration and task methods. It does not require a particular model, private agent API, or cloud runtime.

## Install

Node.js 22+ and npm are required for installation from source. GitHub PR workflows additionally need authenticated gh.

```powershell
git clone https://github.com/ttttstc/nimo.git
cd nimo
.\integrations\codex\install.ps1
```

On macOS/Linux, run bash integrations/codex/install.sh. Claude Code uses the equivalent integrations/claude-code scripts. See [host integration](integrations/README.md).

Installation stages pinned dependencies before updating owned files. Conflicting user changes stop the update. Uninstallation preserves modified and unrelated files.

## Use

Explicitly invoke nimo-mode, or ask your host to use nimo for investigation, design, implementation, verification, or PR work. A request for a plan does not start implementation. Checking a PR does not start monitoring or authorize merging.

Optional project references live in .nimo/nimo.yaml; personal references live in ~/.nimo/nimo.yaml:

```yaml
principles:
  - skill: company-api-first
  - path: ./engineering/principles/reliability.md
knowledge:
  - ./docs
```

Project-relative paths use the project root; personal-relative paths use the home directory. Conversational paths are resolved from the current working directory before storage. References are additive and deduplicated. Knowledge is searched on demand and never copied wholesale.

The host supplies agents, model selection, permissions, UI tools, and background wakeups. Missing facilities are reported rather than simulated.

See the [implementation specification](docs/nimo-v1-issue-13-spec.md), [playbooks](skills/nimo-mode/playbooks), [source mapping](docs/upstream/pstack-coverage.md), [behavior evaluation](evals/README.md), and [third-party notices](THIRD_PARTY_NOTICES.md).
