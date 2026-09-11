param([string]$Source, [string]$Target)
$ErrorActionPreference = 'Stop'
if (-not $Target) {
  [Console]::Error.WriteLine('Usage: install.ps1 -Target <host-skills-dir> [-Source <nimo-repo>]')
  exit 2
}
if (-not $Source) { $Source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')) }
$installer = Join-Path $Source 'skills/nimo-mode/scripts/install.mjs'
& node $installer install --source $Source --target $Target
exit $LASTEXITCODE
