#!/usr/bin/env bash
# nimo Codex 接入：安装/更新脚本（macOS/Linux）
# 用法:
#   ./install.sh                              安装到默认 CODEX_HOME（或 ~/.codex）
#   ./install.sh --codex-home <dir>           安装到隔离目录（测试用）
#   ./install.sh --source <repo-root>         指定 nimo 仓库位置（默认取脚本上级目录）
# 行为:
#   - 只写入 <codex-home>/skills 下 nimo 自有文件，并记录清单（.nimo-manifest）
#   - 不触碰 config.toml、auth.json、其他 Skill 或用户任何无关文件
#   - 更新时：文件未被用户修改才覆盖；用户修改过的保留现状并报告
set -euo pipefail

CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
SOURCE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --codex-home) CODEX_HOME_DIR="$2"; shift 2 ;;
    --source) SOURCE_DIR="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

# 规范化 SOURCE_DIR 为绝对路径（相对路径、尾分隔符统一），保证后续前缀截取一致
if ! SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"; then
  echo "无效 --source: $SOURCE_DIR" >&2
  exit 1
fi

SKILLS_DIR="$CODEX_HOME_DIR/skills"
MANIFEST="$SKILLS_DIR/.nimo-manifest"

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

SKILLS="nimo nimo-setup verification-create verification-maintain skill-evaluate"

# 清单相对路径只能位于 nimo 自有 Skill 目录之下；拒绝绝对路径、反斜杠、.. 与空段
valid_rel() {
  local rel="$1" seg name ok=1
  case "$rel" in
    /*|*\\*) return 1 ;;
  esac
  for name in $SKILLS; do
    case "$rel" in
      "$name"/*) ok=0 ;;
    esac
  done
  [ "$ok" -eq 0 ] || return 1
  local IFS='/'
  for seg in $rel; do
    [ "$seg" = ".." ] && return 1
    [ -z "$seg" ] && return 1
  done
  return 0
}

# 输出旧清单中某路径的 "sha managed"，无记录时输出空
old_lookup() {
  [ -f "$MANIFEST" ] || return 0
  awk -v p="$1" '!/^#/ && NF==3 && $3==p {print $1, $2; exit}' "$MANIFEST"
}

for name in $SKILLS; do
  [ -f "$SOURCE_DIR/skills/$name/SKILL.md" ] || { echo "来源缺少 skills/$name/SKILL.md（--source=$SOURCE_DIR）" >&2; exit 1; }
done
DEFAULTS_SRC="$SOURCE_DIR/defaults/capabilities.yaml"
[ -f "$DEFAULTS_SRC" ] || { echo "来源缺少 defaults/capabilities.yaml" >&2; exit 1; }

installed=0; updated=0; removed=0
skipped=""; kept_stale=""; invalid_old=""
managed_tmp="$(mktemp)"

handle() { # $1=源文件 $2=相对 skills 目录的路径
  local src="$1" rel="$2"
  local dst="$SKILLS_DIR/$rel"
  mkdir -p "$(dirname "$dst")"
  if [ -f "$dst" ]; then
    local cur old oldsha oldmanaged
    cur="$(hash_file "$dst")"
    old="$(old_lookup "$rel")"
    if [ -n "$old" ]; then
      oldsha="$(echo "$old" | cut -d' ' -f1)"
      oldmanaged="$(echo "$old" | cut -d' ' -f2)"
      if [ "$oldmanaged" = "1" ] && [ "$oldsha" = "$cur" ]; then
        cp "$src" "$dst"
        updated=$((updated + 1))
        echo "$rel 1" >> "$managed_tmp"
        return
      fi
    fi
    skipped="$skipped$rel\n"
    echo "$rel 0" >> "$managed_tmp"
  else
    cp "$src" "$dst"
    installed=$((installed + 1))
    echo "$rel 1" >> "$managed_tmp"
  fi
}

for name in $SKILLS; do
  dir="$SOURCE_DIR/skills/$name"
  while IFS= read -r -d '' f; do
    rel="${f#"$SOURCE_DIR/skills/"}"
    handle "$f" "$rel"
  done < <(find "$dir" -type f -print0)
done
# 默认能力组合受控复制进 nimo Skill，保持单一权威副本在仓库 defaults/
handle "$DEFAULTS_SRC" "nimo/references/defaults/capabilities.yaml"

# 清理旧版本已删除的文件（清单含越界路径时整体跳过清理，不删除任何旧文件）
if [ -f "$MANIFEST" ]; then
  while read -r sha managed rel; do
    case "$sha" in ''|'#'*) continue ;; esac
    if ! valid_rel "$rel"; then
      invalid_old="$invalid_old$rel\n"
    fi
  done < "$MANIFEST"
  if [ -z "$invalid_old" ]; then
    while read -r sha managed rel; do
      case "$sha" in ''|'#'*) continue ;; esac
      if ! awk -v p="$rel" '$1==p {found=1} END {exit found?0:1}' "$managed_tmp"; then
        dst="$SKILLS_DIR/$rel"
        if [ -f "$dst" ]; then
          cur="$(hash_file "$dst")"
          if [ "$managed" = "1" ] && [ "$cur" = "$sha" ]; then
            rm "$dst"
            removed=$((removed + 1))
          else
            kept_stale="$kept_stale$rel\n"
            # 保留的过期文件继续记录在清单中（managed=0），卸载时可如实报告
            echo "$rel 0" >> "$managed_tmp"
          fi
        fi
      fi
    done < "$MANIFEST"
  fi
fi

# 写新清单
version="$(grep -E '^version:' "$DEFAULTS_SRC" | head -n1 | sed 's/^version:[[:space:]]*//' || true)"
commit="$(git -C "$SOURCE_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
{
  echo "# nimo install manifest"
  echo "# version: ${version:-unknown}"
  echo "# source-commit: $commit"
  echo "# installed-at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  while read -r rel managed; do
    [ -n "$rel" ] || continue
    echo "$(hash_file "$SKILLS_DIR/$rel") $managed $rel"
  done < "$managed_tmp"
} > "$MANIFEST"
rm -f "$managed_tmp"

echo "nimo 安装到 $SKILLS_DIR"
echo "  新增 $installed 个文件；更新 $updated 个文件；清理 $removed 个旧文件"
if [ -n "$skipped" ]; then
  echo "  以下目标文件已存在且无法确认未被用户修改，已保留现状（不覆盖）："
  printf '%b' "$skipped" | sed 's/^/    - /'
fi
if [ -n "$kept_stale" ]; then
  echo "  以下旧文件已被用户修改，未随本次更新删除（已在清单中标记为非托管）："
  printf '%b' "$kept_stale" | sed 's/^/    - /'
fi
if [ -n "$invalid_old" ]; then
  echo "  旧清单包含越界或非法路径，已跳过全部旧文件清理（未删除任何旧文件）："
  printf '%b' "$invalid_old" | sed 's/^/    - /'
fi
if [ -n "$skipped" ] || [ -n "$kept_stale" ] || [ -n "$invalid_old" ]; then exit 1; fi
exit 0
