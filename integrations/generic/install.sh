#!/usr/bin/env bash
set -euo pipefail
source_dir="$(cd "$(dirname "$0")/../.." && pwd)"
target_dir=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) [[ $# -ge 2 ]] || exit 2; source_dir="$2"; shift 2 ;;
    --target) [[ $# -ge 2 ]] || exit 2; target_dir="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done
if [[ -z "$target_dir" ]]; then
  echo "Usage: install.sh --target <host-skills-dir> [--source <nimo-repo>]" >&2
  exit 2
fi
source_dir="$(cd "$source_dir" && pwd)"
exec node "$source_dir/skills/nimo-mode/scripts/install.mjs" install --source "$source_dir" --target "$target_dir"
