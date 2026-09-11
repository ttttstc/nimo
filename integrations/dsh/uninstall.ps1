param([string]$Source, [string]$DshHome)
$ErrorActionPreference = 'Stop'
if (-not $DshHome) { $DshHome = $env:DSH_HOME }
if (-not $DshHome) { $DshHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.dsh' }
if (-not $Source) { $Source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')) }
$skillsTarget = [IO.Path]::GetFullPath((Join-Path $DshHome 'skills'))
$installer = Join-Path $Source 'skills/nimo-mode/scripts/install.mjs'
& node $installer uninstall --source $Source --target $skillsTarget
exit $LASTEXITCODE
