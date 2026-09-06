# nimo Codex 接入：安装脚本行为测试（隔离目录，不影响用户配置）
# 用法: .\test-install.ps1 [-KeepFailed]
# 覆盖 Issue #2 验收项：干净安装、重复安装不覆盖用户修改、卸载只删自有文件、
# 他人同名文件冲突保护。全部通过时退出码 0。
param([switch]$KeepFailed)
$ErrorActionPreference = "Continue"
$Here = $PSScriptRoot
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("nimo-install-test-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
$results = @()

function Check([string]$Name, [bool]$Ok, [string]$Detail) {
    $script:results += [pscustomobject]@{ Test = $Name; Result = $(if ($Ok) { "PASS" } else { "FAIL" }); Detail = $Detail }
}

try {
    # T1 干净隔离目录首次安装
    $t1 = Join-Path $TempRoot "t1"
    $p = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$Here\install.ps1", "-CodexHome", $t1 -Wait -PassThru -WindowStyle Hidden
    $files = @()
    if (Test-Path "$t1\skills") { $files = Get-ChildItem "$t1\skills" -Recurse -File | ForEach-Object { $_.FullName.Substring("$t1\skills\".Length) } }
    $t1ok = ($p.ExitCode -eq 0) -and (Test-Path "$t1\skills\nimo\SKILL.md") -and (Test-Path "$t1\skills\nimo-setup\SKILL.md") -and (Test-Path "$t1\skills\nimo\references\defaults\capabilities.yaml") -and (Test-Path "$t1\skills\.nimo-manifest") -and ($files.Count -eq 6)
    Check "T1 干净安装" $t1ok "exit=$($p.ExitCode), files=$($files.Count) (期望 6)"

    # T2 未修改重装（幂等更新）
    $p = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$Here\install.ps1", "-CodexHome", $t1 -Wait -PassThru -WindowStyle Hidden
    Check "T2 幂等重装" ($p.ExitCode -eq 0) "exit=$($p.ExitCode) (期望 0)"

    # T3 用户修改后重装：不覆盖用户修改，退出码 1
    Add-Content "$t1\skills\nimo\references\principles.md" "`n# 用户自定义补充"
    $p = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$Here\install.ps1", "-CodexHome", $t1 -Wait -PassThru -WindowStyle Hidden
    $kept = (Select-String -Path "$t1\skills\nimo\references\principles.md" -Pattern "用户自定义补充").Count
    Check "T3 用户修改不被覆盖" ($p.ExitCode -eq 1 -and $kept -eq 1) "exit=$($p.ExitCode) (期望 1), 用户内容保留=$kept (期望 1)"

    # T4 卸载：只删自有未修改文件；用户修改文件与清单保留
    $p = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$Here\uninstall.ps1", "-CodexHome", $t1 -Wait -PassThru -WindowStyle Hidden
    $remain = @()
    if (Test-Path $t1) { $remain = Get-ChildItem $t1 -Recurse -File -Force | ForEach-Object { $_.FullName.Substring($t1.Length + 1) } }
    $t4ok = ($p.ExitCode -eq 1) -and ($remain.Count -eq 2) -and ($remain -contains "skills\.nimo-manifest") -and ($remain -contains "skills\nimo\references\principles.md")
    Check "T4 卸载只删自有文件" $t4ok "exit=$($p.ExitCode) (期望 1), 残留=$($remain.Count) 个 (期望 2: 用户修改文件+清单)"

    # T5 他人已有同名文件：冲突保护，不覆盖
    $t5 = Join-Path $TempRoot "t5"
    New-Item -ItemType Directory -Path "$t5\skills\nimo" -Force | Out-Null
    Set-Content "$t5\skills\nimo\SKILL.md" "someone else's skill"
    $p = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "$Here\install.ps1", "-CodexHome", $t5 -Wait -PassThru -WindowStyle Hidden
    $content = (Get-Content "$t5\skills\nimo\SKILL.md" -Raw).Trim()
    Check "T5 他人文件冲突保护" ($p.ExitCode -eq 1 -and $content -eq "someone else's skill") "exit=$($p.ExitCode) (期望 1), 他人内容保留=$($content -eq 'someone else''s skill')"
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
