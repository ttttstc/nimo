param([string]$Source, [string]$CursorHome)
$ErrorActionPreference = 'Stop'
if (-not $CursorHome) { $CursorHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.cursor' }
if (-not $Source) { $Source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')) }
$skillsTarget = [IO.Path]::GetFullPath((Join-Path $CursorHome 'skills'))
$installer = Join-Path $Source 'skills/nimo-mode/scripts/install.mjs'
& node $installer install --source $Source --target $skillsTarget
exit $LASTEXITCODE
