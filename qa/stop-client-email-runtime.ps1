[CmdletBinding()]
param([string]$ArtifactRoot = 'D:\coro-qa-runtime')

$ErrorActionPreference = 'Stop'
$statePath = Join-Path $ArtifactRoot 'client-email-runtime.json'
if (-not (Test-Path -LiteralPath $statePath)) { Write-Output 'QA_RUNTIME_NOT_RUNNING'; exit 0 }
$state = Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
foreach ($runtimeProcessId in @($state.backendPid, $state.portalPid)) {
  if ($runtimeProcessId -and (Get-Process -Id $runtimeProcessId -ErrorAction SilentlyContinue)) { & taskkill.exe /PID $runtimeProcessId /T /F | Out-Null }
}
Remove-Item -LiteralPath $statePath
Write-Output 'QA_RUNTIME_STOPPED'
