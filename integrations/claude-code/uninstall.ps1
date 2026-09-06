# nimo Claude Code 接入：卸载脚本（Windows PowerShell）
# 用法:
#   .\uninstall.ps1                             卸载默认 CLAUDE_CONFIG_DIR（或 ~/.claude）中的 nimo
#   .\uninstall.ps1 -ClaudeConfigDir <dir>      卸载隔离目录中的 nimo
# 行为:
#   - 只删除清单（.nimo-manifest）记录且未被用户修改的 nimo 文件
#   - 用户修改过的文件保留并报告；不触碰任何其他文件
param(
    [string]$ClaudeConfigDir = ""
)
$ErrorActionPreference = "Stop"

if (-not $ClaudeConfigDir) {
    if ($env:CLAUDE_CONFIG_DIR) { $ClaudeConfigDir = $env:CLAUDE_CONFIG_DIR } else { $ClaudeConfigDir = Join-Path $HOME ".claude" }
}
$SkillsDir = Join-Path $ClaudeConfigDir "skills"
$ManifestPath = Join-Path $SkillsDir ".nimo-manifest"

if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Write-Host "未找到安装清单 $ManifestPath，无 nimo 安装记录，不做任何删除。"
    exit 0
}

function Get-Sha256([string]$Path) {
    (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Test-ManagedRelPath([string]$Rel) {
    # 清单相对路径只能位于 nimo/ 或 nimo-setup/ 之下；拒绝绝对路径、.. 与空段
    if ([string]::IsNullOrWhiteSpace($Rel)) { return $false }
    if ($Rel -match '^[a-zA-Z]:') { return $false }
    if ($Rel -match '^[\\/]') { return $false }
    $parts = @($Rel.Replace('\', '/') -split '/' | Where-Object { $_ -ne '' })
    if ($parts.Count -lt 2) { return $false }
    if ($parts[0] -ne 'nimo' -and $parts[0] -ne 'nimo-setup') { return $false }
    if ($parts -contains '..') { return $false }
    return $true
}

# ---- 阶段 1：解析并校验清单，存在越界路径时不删除任何文件 ----
$records = @()
$invalid = @()
foreach ($line in Get-Content -LiteralPath $ManifestPath) {
    if ($line -match '^#') { continue }
    $parts = $line -split '\s+', 3
    if ($parts.Count -ne 3) { continue }
    if (-not (Test-ManagedRelPath $parts[2])) { $invalid += $parts[2]; continue }
    $records += ,@($parts[0], $parts[1], $parts[2])
}
if ($invalid.Count -gt 0) {
    Write-Host "安装清单包含越界或非法路径，已停止卸载（未删除任何文件，清单保留待人工检查）："
    $invalid | ForEach-Object { Write-Host "    - $_" }
    exit 1
}

# ---- 阶段 2：删除自有且未被修改的文件 ----
$deleted = 0
$preserved = @()
$missing = @()
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

# 清理空目录（只清理 nimo 自有的 Skill 目录名；自底向上删除，避免交互确认）
foreach ($name in @("nimo", "nimo-setup")) {
    $dir = Join-Path $SkillsDir $name
    if (Test-Path -LiteralPath $dir) {
        $left = Get-ChildItem -LiteralPath $dir -Recurse -File -Force
        if (-not $left) {
            Get-ChildItem -LiteralPath $dir -Recurse -Directory -Force |
                Sort-Object FullName -Descending |
                ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
            Remove-Item -LiteralPath $dir -Force
        }
    }
}
if ($preserved.Count -eq 0) {
    # 所有自有文件均已删除，移除清单
    Remove-Item -LiteralPath $ManifestPath -Force
    $skillsLeft = Get-ChildItem -LiteralPath $SkillsDir -Force -ErrorAction SilentlyContinue
    if (-not $skillsLeft) {
        try { Remove-Item -LiteralPath $SkillsDir -Force -ErrorAction Stop } catch { }
    }
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
