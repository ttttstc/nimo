# nimo Claude Code 安装黑盒测试入口。
# 测试数据始终创建在 os.tmpdir；宿主目录参数只为兼容旧调用保留，不会被写入。
param(
    [string]$Source = "",
    [string]$ClaudeConfigDir = "",
    [switch]$KeepFailed
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$testFiles = @(
    (Join-Path $repoRoot "tests\installation\install.test.mjs"),
    (Join-Path $repoRoot "tests\installation\host-wrapper.test.mjs")
)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 22+ is required to run installation tests"
}

$oldSource = $env:NIMO_TEST_SOURCE
$oldKeepFailed = $env:NIMO_KEEP_FAILED
try {
    if ($Source) { $env:NIMO_TEST_SOURCE = [System.IO.Path]::GetFullPath($Source) }
    if ($KeepFailed) { $env:NIMO_KEEP_FAILED = "1" }
    & node --test @testFiles
    exit $LASTEXITCODE
} finally {
    if ($null -eq $oldSource) { Remove-Item Env:NIMO_TEST_SOURCE -ErrorAction SilentlyContinue } else { $env:NIMO_TEST_SOURCE = $oldSource }
    if ($null -eq $oldKeepFailed) { Remove-Item Env:NIMO_KEEP_FAILED -ErrorAction SilentlyContinue } else { $env:NIMO_KEEP_FAILED = $oldKeepFailed }
}
