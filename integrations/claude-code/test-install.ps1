# nimo Claude Code 接入：安装脚本行为测试（隔离目录，不影响用户配置）
# 用法: .\test-install.ps1 [-KeepFailed]
# 覆盖 Issue #8 验收项（与 Codex 接入同等行为测试）：
#   T1 干净安装 / T2 幂等重装 / T3 用户修改不被覆盖 / T4 卸载只删自有文件
#   T5 他人文件冲突保护
#   T6 干净安装后完全卸载（空目录自底向上清理，非交互成功）
#   T7 源已删除但用户修改过的旧文件保留在清单（managed=0），卸载时如实报告
#   T8 -Source 相对路径/尾分隔符/短路径规范化，入口位于标准位置
#   T9 清单越界路径：卸载拒绝删除任何文件
#   T10 清单越界路径：安装跳过旧文件清理
# 全部通过时退出码 0。
param([switch]$KeepFailed)
$ErrorActionPreference = "Continue"
$Here = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $Here "..\..")).Path
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("nimo-claude-test-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$results = @()

function Check([string]$Name, [bool]$Ok, [string]$Detail) {
    $script:results += [pscustomobject]@{ Test = $Name; Result = $(if ($Ok) { "PASS" } else { "FAIL" }); Detail = $Detail }
}
function Run-Script([string]$Script, [string[]]$ExtraArgs, [string]$TargetDir, [string]$WorkingDir = $RepoRoot) {
    $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $Here $Script), "-ClaudeConfigDir", $TargetDir) + $ExtraArgs
    Start-Process powershell -ArgumentList $argList -WorkingDirectory $WorkingDir -Wait -PassThru -WindowStyle Hidden
}
function Get-Sha([string]$Path) {
    (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}
function Test-EntriesAt([string]$Dir) {
    # 两个入口 Skill 位于标准位置（skills\nimo 与 skills\nimo-setup）
    (Test-Path (Join-Path $Dir "skills\nimo\SKILL.md")) -and (Test-Path (Join-Path $Dir "skills\nimo-setup\SKILL.md"))
}

try {
    # T1 干净隔离目录首次安装
    $t1 = Join-Path $TempRoot "t1"
    $p = Run-Script "install.ps1" @() $t1
    $files = @()
    if (Test-Path "$t1\skills") { $files = Get-ChildItem "$t1\skills" -Recurse -File | ForEach-Object { $_.FullName.Substring("$t1\skills\".Length) } }
    $t1ok = ($p.ExitCode -eq 0) -and (Test-Path "$t1\skills\nimo\SKILL.md") -and (Test-Path "$t1\skills\nimo-setup\SKILL.md") -and (Test-Path "$t1\skills\nimo\references\defaults\capabilities.yaml") -and (Test-Path "$t1\skills\.nimo-manifest") -and ($files.Count -eq 6)
    Check "T1 干净安装" $t1ok "exit=$($p.ExitCode), files=$($files.Count) (期望 6)"

    # T2 未修改重装（幂等更新）
    $p = Run-Script "install.ps1" @() $t1
    Check "T2 幂等重装" ($p.ExitCode -eq 0) "exit=$($p.ExitCode) (期望 0)"

    # T3 用户修改后重装：不覆盖用户修改，退出码 1
    Add-Content "$t1\skills\nimo\references\principles.md" "`n# 用户自定义补充"
    $p = Run-Script "install.ps1" @() $t1
    $kept = (Select-String -Path "$t1\skills\nimo\references\principles.md" -Pattern "用户自定义补充").Count
    Check "T3 用户修改不被覆盖" ($p.ExitCode -eq 1 -and $kept -eq 1) "exit=$($p.ExitCode) (期望 1), 用户内容保留=$kept (期望 1)"

    # T4 卸载：只删自有未修改文件；用户修改文件与清单保留
    $p = Run-Script "uninstall.ps1" @() $t1
    $remain = @()
    if (Test-Path $t1) { $remain = Get-ChildItem $t1 -Recurse -File -Force | ForEach-Object { $_.FullName.Substring($t1.Length + 1) } }
    $t4ok = ($p.ExitCode -eq 1) -and ($remain.Count -eq 2) -and ($remain -contains "skills\.nimo-manifest") -and ($remain -contains "skills\nimo\references\principles.md")
    Check "T4 卸载只删自有文件" $t4ok "exit=$($p.ExitCode) (期望 1), 残留=$($remain.Count) 个 (期望 2: 用户修改文件+清单)"

    # T5 他人已有同名文件：冲突保护，不覆盖
    $t5 = Join-Path $TempRoot "t5"
    New-Item -ItemType Directory -Path "$t5\skills\nimo" -Force | Out-Null
    Set-Content "$t5\skills\nimo\SKILL.md" "someone else's skill"
    $p = Run-Script "install.ps1" @() $t5
    $content = (Get-Content "$t5\skills\nimo\SKILL.md" -Raw).Trim()
    $foreignKept = ($content -eq "someone else's skill")
    Check "T5 他人文件冲突保护" ($p.ExitCode -eq 1 -and $foreignKept) "exit=$($p.ExitCode) (期望 1), 他人内容保留=$foreignKept"

    # T6 干净安装后完全卸载：非交互成功，全部清除（含嵌套空目录与清单）
    $t6 = Join-Path $TempRoot "t6"
    $p = Run-Script "install.ps1" @() $t6
    $p = Run-Script "uninstall.ps1" @() $t6
    $leftFiles = @()
    if (Test-Path $t6) { $leftFiles = Get-ChildItem $t6 -Recurse -File -Force }
    $skillsGone = -not (Test-Path "$t6\skills")
    $t6ok = ($p.ExitCode -eq 0) -and ($leftFiles.Count -eq 0) -and $skillsGone
    Check "T6 干净卸载无残留" $t6ok "exit=$($p.ExitCode) (期望 0), 残留文件=$($leftFiles.Count) (期望 0), skills 目录已删=$skillsGone"

    # T7 源已删除但用户修改过的旧文件：升级保留并留在清单（managed=0），卸载如实报告
    $t7 = Join-Path $TempRoot "t7"
    $p = Run-Script "install.ps1" @() $t7
    Set-Content "$t7\skills\nimo\obsolete.md" "original"
    $shaA = Get-Sha "$t7\skills\nimo\obsolete.md"
    Add-Content "$t7\skills\.nimo-manifest" "$shaA 1 nimo/obsolete.md"
    Set-Content "$t7\skills\nimo\obsolete.md" "user changed"
    $shaB = Get-Sha "$t7\skills\nimo\obsolete.md"
    $p = Run-Script "install.ps1" @() $t7
    $manifest7 = Get-Content "$t7\skills\.nimo-manifest"
    $carried = ($manifest7 -match "^$shaB 0 nimo/obsolete\.md$").Count
    $contentOk = ((Get-Content "$t7\skills\nimo\obsolete.md" -Raw).Trim() -eq "user changed")
    $p2 = Run-Script "uninstall.ps1" @() $t7
    $obsoleteKept = Test-Path "$t7\skills\nimo\obsolete.md"
    $t7ok = ($p.ExitCode -eq 1) -and ($carried -eq 1) -and $contentOk -and ($p2.ExitCode -eq 1) -and $obsoleteKept
    Check "T7 过期用户文件保留清单" $t7ok "升级exit=$($p.ExitCode) (期望1), 清单保留managed=0=$(($carried -eq 1)), 卸载exit=$($p2.ExitCode) (期望1), 文件保留=$obsoleteKept"

    # T8 -Source 规范化：相对路径、尾分隔符、短路径，入口须位于标准位置
    $t8 = Join-Path $TempRoot "t8"
    $p = Run-Script "install.ps1" @("-Source", ".") $t8   # 工作目录为仓库根
    $entryA = Test-EntriesAt $t8
    $noWrongDir = -not (Test-Path "$t8\nimo")
    $t8a = ($p.ExitCode -eq 0) -and $entryA -and $noWrongDir
    Check "T8a Source 相对路径" $t8a "exit=$($p.ExitCode) (期望 0), 入口在标准位置=$entryA, 无错误嵌套目录=$noWrongDir"

    $t8b = Join-Path $TempRoot "t8b"
    $p = Run-Script "install.ps1" @("-Source", "$RepoRoot\") $t8b
    $entryB = Test-EntriesAt $t8b
    Check "T8b Source 尾分隔符" (($p.ExitCode -eq 0) -and $entryB) "exit=$($p.ExitCode) (期望 0), 入口在标准位置=$entryB"

    $shortRoot = (& cmd /c "for %A in (`"$RepoRoot`") do @echo %~sA" | Select-Object -First 1)
    if ($shortRoot -and ($shortRoot.Trim() -ne $RepoRoot)) {
        $t8c = Join-Path $TempRoot "t8c"
        $p = Run-Script "install.ps1" @("-Source", $shortRoot.Trim()) $t8c
        $entryC = Test-EntriesAt $t8c
        Check "T8c Source 短路径" (($p.ExitCode -eq 0) -and $entryC) "short=$shortRoot, exit=$($p.ExitCode) (期望 0), 入口在标准位置=$entryC"
    } else {
        Check "T8c Source 短路径" $true "本机 8.3 短路径不可用（%~sA 与长路径相同），跳过动态用例"
    }

    # T9 清单越界路径：卸载拒绝删除任何文件
    $t9 = Join-Path $TempRoot "t9"
    $p = Run-Script "install.ps1" @() $t9
    Set-Content "$t9\sentinel.txt" "sentinel"
    $shaS = Get-Sha "$t9\sentinel.txt"
    Add-Content "$t9\skills\.nimo-manifest" "$shaS 1 ../sentinel.txt"
    $p = Run-Script "uninstall.ps1" @() $t9
    $sentinelKept = Test-Path "$t9\sentinel.txt"
    $nimoKept = Test-Path "$t9\skills\nimo\SKILL.md"
    $manifestKept = Test-Path "$t9\skills\.nimo-manifest"
    $t9ok = ($p.ExitCode -eq 1) -and $sentinelKept -and $nimoKept -and $manifestKept
    Check "T9 越界清单卸载拒绝" $t9ok "exit=$($p.ExitCode) (期望 1), 哨兵保留=$sentinelKept, nimo 文件未删=$nimoKept, 清单保留=$manifestKept"

    # T10 清单越界路径：安装跳过旧文件清理，新清单自愈
    $t10 = Join-Path $TempRoot "t10"
    $p = Run-Script "install.ps1" @() $t10
    Set-Content "$t10\sentinel2.txt" "sentinel2"
    $shaS2 = Get-Sha "$t10\sentinel2.txt"
    Add-Content "$t10\skills\.nimo-manifest" "$shaS2 1 ../sentinel2.txt"
    $p = Run-Script "install.ps1" @() $t10
    $manifest10 = Get-Content "$t10\skills\.nimo-manifest"
    $entries10 = @($manifest10 | Where-Object { $_ -notmatch '^#' })
    $sentinel2Kept = Test-Path "$t10\sentinel2.txt"
    $noEscape = -not ($manifest10 -match 'sentinel')
    $t10ok = ($p.ExitCode -eq 1) -and $sentinel2Kept -and (Test-Path "$t10\skills\nimo\SKILL.md") -and ($entries10.Count -eq 5) -and $noEscape
    Check "T10 越界清单跳过清理" $t10ok "exit=$($p.ExitCode) (期望 1), 哨兵保留=$sentinel2Kept, 新清单条目=$($entries10.Count) (期望 5, 不含越界项=$noEscape)"
}
finally {
    if (-not ($KeepFailed -and ($results | Where-Object { $_.Result -eq "FAIL" }))) {
        if (Test-Path $TempRoot) { Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue }
    }
}

$results | Format-Table -AutoSize | Out-String -Width 200
$failed = @($results | Where-Object { $_.Result -eq "FAIL" }).Count
Write-Host ("总计 {0} 项，通过 {1} 项，失败 {2} 项" -f $results.Count, ($results.Count - $failed), $failed)
exit $(if ($failed -eq 0) { 0 } else { 1 })
