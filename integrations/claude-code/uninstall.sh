#!/usr/bin/env bash
set -euo pipefail
source_dir="$(cd "$(dirname "$0")/../.." && pwd)"
host_home="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) [[ $# -ge 2 ]] || exit 2; source_dir="$2"; shift 2 ;;
    --claude-config-dir) [[ $# -ge 2 ]] || exit 2; host_home="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
source_dir="$(cd "$source_dir" && pwd)"
exec node "$source_dir/skills/nimo-mode/scripts/install.mjs" uninstall --source "$source_dir" --target "$host_home/skills"