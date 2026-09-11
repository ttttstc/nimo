param([string]$Source, [string]$ConfigDir)
$ErrorActionPreference = 'Stop'
if (-not $ConfigDir) {
  $xdg = $env:XDG_CONFIG_HOME
  if (-not $xdg) { $xdg = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.config' }
  $ConfigDir = Join-Path $xdg 'opencode'
}
if (-not $Source) { $Source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')) }
$skillsTarget = [IO.Path]::GetFullPath((Join-Path $ConfigDir 'skills'))
$installer = Join-Path $Source 'skills/nimo-mode/scripts/install.mjs'
& node $installer uninstall --source $Source --target $skillsTarget
exit $LASTEXITCODE
