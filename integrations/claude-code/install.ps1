param([string]$Source, [string]$ClaudeConfigDir)
$ErrorActionPreference = 'Stop'
if (-not $Source) { $Source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')) }
if (-not $ClaudeConfigDir) { $ClaudeConfigDir = $env:CLAUDE_CONFIG_DIR }
if (-not $ClaudeConfigDir) { $ClaudeConfigDir = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.claude' }
$skillsTarget = [IO.Path]::GetFullPath((Join-Path $ClaudeConfigDir 'skills'))
$installer = Join-Path $Source 'skills/nimo-mode/scripts/install.mjs'
& node $installer install --source $Source --target $skillsTarget
exit $LASTEXITCODE