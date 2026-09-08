param([string]$Source, [string]$CodexHome)
$ErrorActionPreference = 'Stop'
if (-not $Source) { $Source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')) }
if (-not $CodexHome) { $CodexHome = $env:CODEX_HOME }
if (-not $CodexHome) { $CodexHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex' }
$skillsTarget = [IO.Path]::GetFullPath((Join-Path $CodexHome 'skills'))
$installer = Join-Path $Source 'skills/nimo-mode/scripts/install.mjs'
& node $installer install --source $Source --target $skillsTarget
exit $LASTEXITCODE