#!/usr/bin/env bash
# nimo Codex 接入：卸载脚本（macOS/Linux）
# 用法:
#   ./uninstall.sh                            卸载默认 CODEX_HOME（或 ~/.codex）中的 nimo
#   ./uninstall.sh --codex-home <dir>         卸载隔离目录中的 nimo
# 行为:
#   - 只删除清单（.nimo-manifest）记录且未被用户修改的 nimo 文件
#   - 用户修改过的文件保留并报告；不触碰任何其他文件
set -euo pipefail

CODEX_HOME_DIR="${CODEX_HOME:-$HOME/.codex}"
while [ $# -gt 0 ]; do
  case "$1" in
    --codex-home) CODEX_HOME_DIR="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

SKILLS_DIR="$CODEX_HOME_DIR/skills"
MANIFEST="$SKILLS_DIR/.nimo-manifest"

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# 清单相对路径只能位于 nimo/ 或 nimo-setup/ 之下；拒绝绝对路径、反斜杠、.. 与空段
valid_rel() {
  local rel="$1" seg
  case "$rel" in
    /*|*\\*) return 1 ;;
    nimo/*|nimo-setup/*) ;;
    *) return 1 ;;
  esac
  local IFS='/'
  for seg in $rel; do
    [ "$seg" = ".." ] && return 1
    [ -z "$seg" ] && return 1
  done
  return 0
}

if [ ! -f "$MANIFEST" ]; then
  echo "未找到安装清单 $MANIFEST，无 nimo 安装记录，不做任何删除。"
  exit 0
fi

deleted=0
preserved_count=0
preserved=""
missing=""
invalid=""

# 阶段 1：校验清单，存在越界路径时不删除任何文件
while read -r sha managed rel; do
  case "$sha" in ''|'#'*) continue ;; esac
  if ! valid_rel "$rel"; then
    invalid="$invalid$rel\n"
  fi
done < "$MANIFEST"
if [ -n "$invalid" ]; then
  echo "安装清单包含越界或非法路径，已停止卸载（未删除任何文件，清单保留待人工检查）："
  printf '%b' "$invalid" | sed 's/^/    - /'
  exit 1
fi

# 阶段 2：删除自有且未被修改的文件
while read -r sha managed rel; do
  case "$sha" in ''|'#'*) continue ;; esac
  dst="$SKILLS_DIR/$rel"
  if [ ! -f "$dst" ]; then
    missing="$missing$rel\n"
    continue
  fi
  cur="$(hash_file "$dst")"
  if [ "$managed" = "1" ] && [ "$cur" = "$sha" ]; then
    rm "$dst"
    deleted=$((deleted + 1))
  else
    preserved="$preserved$rel\n"
    preserved_count=$((preserved_count + 1))
  fi
done < "$MANIFEST"

# 只清理 nimo 自有 Skill 目录下的空目录
for name in nimo nimo-setup; do
  dir="$SKILLS_DIR/$name"
  if [ -d "$dir" ]; then
    # 逐层尝试删除空目录（兼容 BSD find，不使用 -empty）
    find "$dir" -depth -type d 2>/dev/null | while read -r d; do rmdir "$d" 2>/dev/null || true; done
  fi
done
if [ "$preserved_count" -eq 0 ]; then
  rm -f "$MANIFEST"
  rmdir "$SKILLS_DIR" 2>/dev/null || true
fi

echo "nimo 卸载完成：删除 $deleted 个文件。"
if [ -n "$missing" ]; then
  echo "  清单中已不存在的文件（此前被人工移除）："
  printf '%b' "$missing" | sed 's/^/    - /'
fi
if [ "$preserved_count" -gt 0 ]; then
  echo "  以下文件已被用户修改或非本次安装写入，已保留（清单暂存）："
  printf '%b' "$preserved" | sed 's/^/    - /'
  exit 1
fi
exit 0
