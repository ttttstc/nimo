# nimo Codex 接入：安装/更新脚本（Windows PowerShell）
# 用法:
#   .\install.ps1                          安装到默认 CODEX_HOME（或 ~/.codex）
#   .\install.ps1 -CodexHome <dir>         安装到隔离目录（测试用）
#   .\install.ps1 -Source <repo-root>      指定 nimo 仓库位置（默认取脚本上级目录）
# 行为:
#   - 只写入 <CodexHome>\skills 下 nimo 自有文件，并记录清单（.nimo-manifest）
#   - 不触碰 config.toml、auth.json、其他 Skill 或用户任何无关文件
#   - 更新时：文件未被用户修改才覆盖；用户修改过的保留现状并报告
param(
    [string]$CodexHome = "",
    [string]$Source = ""
)
$ErrorActionPreference = "Stop"

if (-not $Source) { $Source = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path }
if (-not $CodexHome) {
    if ($env:CODEX_HOME) { $CodexHome = $env:CODEX_HOME } else { $CodexHome = Join-Path $HOME ".codex" }
}
$SkillsDir = Join-Path $CodexHome "skills"
$ManifestPath = Join-Path $SkillsDir ".nimo-manifest"

function Get-Sha256([string]$Path) {
    (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

# ---- 收集来源文件（相对 skills 目录的路径，一律用 / ）----
$SkillNames = @("nimo", "nimo-setup")
$entries = @()
foreach ($name in $SkillNames) {
    $dir = Join-Path $Source ("skills\" + $name)
    if (-not (Test-Path -LiteralPath (Join-Path $dir "SKILL.md"))) {
        Write-Error "来源缺少 skills/$name/SKILL.md（Source=$Source）"; exit 1
    }
    Get-ChildItem -LiteralPath $dir -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($dir.Length + 1).Replace("\", "/")
        $entries += [pscustomobject]@{ Src = $_.FullName; Rel = "$name/$rel" }
    }
}
$defaultsSrc = Join-Path $Source "defaults\capabilities.yaml"
if (-not (Test-Path -LiteralPath $defaultsSrc)) {
    Write-Error "来源缺少 defaults/capabilities.yaml"; exit 1
}
# 默认能力组合受控复制进 nimo Skill，保持单一权威副本在仓库 defaults/
$entries += [pscustomobject]@{ Src = $defaultsSrc; Rel = "nimo/references/defaults/capabilities.yaml" }

# ---- 读取旧清单: path -> @(sha256, managed) ----
$oldFiles = @{}
if (Test-Path -LiteralPath $ManifestPath) {
    foreach ($line in Get-Content -LiteralPath $ManifestPath) {
        if ($line -match '^#') { continue }
        $parts = $line -split '\s+', 3
        if ($parts.Count -eq 3) { $oldFiles[$parts[2]] = @($parts[0], $parts[1]) }
    }
}

# ---- 逐文件安装/更新 ----
$installed = 0; $updated = 0; $removed = 0
$skipped = @(); $keptStale = @()
$resultManaged = @{}   # Rel -> managed(1/0)，用于写新清单

foreach ($e in $entries) {
    $dst = Join-Path $SkillsDir ($e.Rel.Replace("/", "\"))
    $dstDir = Split-Path $dst -Parent
    if (-not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    if (Test-Path -LiteralPath $dst) {
        $cur = Get-Sha256 $dst
        $ownedUnmodified = $false
        if ($oldFiles.ContainsKey($e.Rel)) {
            $oldHash = $oldFiles[$e.Rel][0]; $oldManaged = $oldFiles[$e.Rel][1]
            if ($oldManaged -eq "1" -and $oldHash -eq $cur) { $ownedUnmodified = $true }
        }
        if ($ownedUnmodified) {
            Copy-Item -LiteralPath $e.Src -Destination $dst -Force
            $updated++
            $resultManaged[$e.Rel] = "1"
        } else {
            # 无法证明为本次安装所有（无清单记录），或已被用户修改：保留现状
            $skipped += $e.Rel
            $resultManaged[$e.Rel] = "0"
        }
    } else {
        Copy-Item -LiteralPath $e.Src -Destination $dst -Force
        $installed++
        $resultManaged[$e.Rel] = "1"
    }
}

# ---- 清理旧版本已删除的文件 ----
foreach ($p in @($oldFiles.Keys)) {
    if (-not ($entries | Where-Object { $_.Rel -eq $p })) {
        $dst = Join-Path $SkillsDir ($p.Replace("/", "\"))
        if (Test-Path -LiteralPath $dst) {
            if ($oldFiles[$p][1] -eq "1" -and (Get-Sha256 $dst) -eq $oldFiles[$p][0]) {
                Remove-Item -LiteralPath $dst
                $removed++
            } else {
                $keptStale += $p
            }
        }
    }
}

# ---- 写新清单 ----
$version = ""
$m = Select-String -LiteralPath $defaultsSrc -Pattern '^version:\s*(\S+)'
if ($m) { $version = $m.Matches[0].Groups[1].Value }
$commit = ""
try { $commit = (git -C $Source rev-parse HEAD 2>$null) } catch { }
if (-not $commit) { $commit = "unknown" }
$installedAt = (Get-Date).ToUniversalTime().ToString("o")
$lines = @(
    "# nimo install manifest",
    "# version: $version",
    "# source-commit: $commit",
    "# installed-at: $installedAt"
)
foreach ($e in $entries) {
    $dst = Join-Path $SkillsDir ($e.Rel.Replace("/", "\"))
    $lines += "$(Get-Sha256 $dst) $($resultManaged[$e.Rel]) $($e.Rel)"
}
New-Item -ItemType Directory -Path $SkillsDir -Force | Out-Null
Set-Content -LiteralPath $ManifestPath -Value $lines -Encoding UTF8

# ---- 报告 ----
Write-Host "nimo 安装到 $SkillsDir"
Write-Host "  新增 $installed 个文件；更新 $updated 个文件；清理 $removed 个旧文件"
if ($skipped.Count -gt 0) {
    Write-Host "  以下目标文件已存在且无法确认未被用户修改，已保留现状（不覆盖）："
    $skipped | ForEach-Object { Write-Host "    - $_" }
}
if ($keptStale.Count -gt 0) {
    Write-Host "  以下旧文件已被用户修改，未随本次更新删除："
    $keptStale | ForEach-Object { Write-Host "    - $_" }
}
if (($skipped.Count -gt 0) -or ($keptStale.Count -gt 0)) { exit 1 } else { exit 0 }
