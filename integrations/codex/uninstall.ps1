# nimo Codex 接入：卸载脚本（Windows PowerShell）
# 用法:
#   .\uninstall.ps1                          卸载默认 CODEX_HOME（或 ~/.codex）中的 nimo
#   .\uninstall.ps1 -CodexHome <dir>         卸载隔离目录中的 nimo
# 行为:
#   - 只删除清单（.nimo-manifest）记录且未被用户修改的 nimo 文件
#   - 用户修改过的文件保留并报告；不触碰任何其他文件
param(
    [string]$CodexHome = ""
)
$ErrorActionPreference = "Stop"

if (-not $CodexHome) {
    if ($env:CODEX_HOME) { $CodexHome = $env:CODEX_HOME } else { $CodexHome = Join-Path $HOME ".codex" }
}
$SkillsDir = Join-Path $CodexHome "skills"
$ManifestPath = Join-Path $SkillsDir ".nimo-manifest"

if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Write-Host "未找到安装清单 $ManifestPath，无 nimo 安装记录，不做任何删除。"
    exit 0
}

function Get-Sha256([string]$Path) {
    (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

$deleted = 0
$preserved = @()
$missing = @()
$records = @()
foreach ($line in Get-Content -LiteralPath $ManifestPath) {
    if ($line -match '^#') { continue }
    $parts = $line -split '\s+', 3
    if ($parts.Count -eq 3) { $records += ,@($parts[0], $parts[1], $parts[2]) }
}

foreach ($r in $records) {
    $sha = $r[0]; $managed = $r[1]; $rel = $r[2]
    $dst = Join-Path $SkillsDir ($rel.Replace("/", "\"))
    if (-not (Test-Path -LiteralPath $dst)) { $missing += $rel; continue }
    $cur = Get-Sha256 $dst
    if ($managed -eq "1" -and $cur -eq $sha) {
        Remove-Item -LiteralPath $dst
        $deleted++
    } else {
        $preserved += $rel
    }
}

# 清理空目录（只清理 nimo 自有的 Skill 目录名，失败忽略）
foreach ($name in @("nimo", "nimo-setup")) {
    $dir = Join-Path $SkillsDir $name
    if (Test-Path -LiteralPath $dir) {
        $left = Get-ChildItem -LiteralPath $dir -Recurse -File
        if (-not $left) { Remove-Item -LiteralPath $dir -Force }
    }
}
if ($preserved.Count -eq 0) {
    # 所有自有文件均已删除，移除清单
    Remove-Item -LiteralPath $ManifestPath -Force
    $skillsLeft = Get-ChildItem -LiteralPath $SkillsDir -Force -ErrorAction SilentlyContinue
    if (-not $skillsLeft) { Remove-Item -LiteralPath $SkillsDir -Force -ErrorAction SilentlyContinue }
}

Write-Host "nimo 卸载完成：删除 $deleted 个文件。"
if ($missing.Count -gt 0) {
    Write-Host "  清单中已不存在的文件（此前被人工移除）："
    $missing | ForEach-Object { Write-Host "    - $_" }
}
if ($preserved.Count -gt 0) {
    Write-Host "  以下文件已被用户修改或非本次安装写入，已保留（清单暂存）："
    $preserved | ForEach-Object { Write-Host "    - $_" }
    exit 1
}
exit 0
