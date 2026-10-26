[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet('INSPECT', 'PREPARE', 'INVITATION', 'PASSWORD_RESET', 'MAGIC_LINK', 'VERIFY', 'REPORT')]
  [string]$Mode,
  [string]$RunId,
  [string]$PrepareConfirmation,
  [string]$ScenarioAuthorization,
  [string]$HumanConfirmation,
  [ValidateSet('INVITATION', 'PASSWORD_RESET', 'MAGIC_LINK')]
  [string]$VerifyScenario,
  [string]$HumanEvidence,
  [string]$EvidenceRoot = 'D:\coro-qa-runtime\email-evidence'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'client-email-runtime-security.ps1')
$worktree = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $worktree 'coro-backend'
$requiredEvidenceRoot = 'D:\coro-qa-runtime\email-evidence'
$Mode = $Mode.ToUpperInvariant()

if ([IO.Path]::GetFullPath($EvidenceRoot).TrimEnd('\') -ne $requiredEvidenceRoot) { throw 'EvidenceRoot must be D:\coro-qa-runtime\email-evidence.' }
if (-not (Test-Path -LiteralPath $requiredEvidenceRoot -PathType Container)) { throw 'The protected QA evidence directory does not exist.' }
if ($Mode -ne 'INSPECT' -and $RunId -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]{7,63}$') { throw 'An explicit safe RunId is required for this mode.' }
if ($Mode -eq 'PREPARE' -and $PrepareConfirmation -ne "PREPARE:$RunId") { throw "PREPARE requires the exact confirmation PREPARE:$RunId." }
if ($Mode -in @('INVITATION', 'PASSWORD_RESET', 'MAGIC_LINK')) {
  $expected = "${Mode}:${RunId}:info@getcoro.io"
  if ($ScenarioAuthorization -ne $expected -or $HumanConfirmation -ne $expected) { throw "The scenario requires two distinct parameters with the exact value $expected." }
}
if ($Mode -eq 'VERIFY' -and -not $VerifyScenario) { throw 'VERIFY requires VerifyScenario.' }
if ($Mode -ne 'VERIFY' -and ($VerifyScenario -or $HumanEvidence)) { throw 'VerifyScenario and HumanEvidence are allowed only with VERIFY.' }

$containerState = docker inspect coro-v1-email-qa-postgres --format '{{.State.Running}}'
if ($LASTEXITCODE -ne 0 -or $containerState -ne 'true') { throw 'The isolated PostgreSQL QA container is not running.' }
$databasePassword = Get-QaDatabasePassword
$databaseUrl = New-QaPostgresDatabaseUrl -Password $databasePassword
$databasePassword = $null

try {
  $env:DATABASE_URL = $databaseUrl
  $env:CLIENT_PORTAL_PUBLIC_URL = 'http://127.0.0.1:3103'
  $env:CLIENT_EMAIL_RECIPIENT_ALLOWLIST = 'info@getcoro.io'
  $env:CLIENT_EMAIL_EVIDENCE_ROOT = $requiredEvidenceRoot
  $env:CLIENT_EMAIL_ACCEPTANCE_MODE = $Mode
  $env:CLIENT_EMAIL_QA_SECRET_FILE = Join-Path $backend '.env.local'
  $env:CORO_SOURCE_COMMIT = (git -C $worktree rev-parse HEAD).Trim()
  if ($RunId) { $env:CLIENT_EMAIL_RUN_ID = $RunId }
  if ($PrepareConfirmation) { $env:CLIENT_EMAIL_PREPARE_AUTHORIZATION = $PrepareConfirmation }
  if ($ScenarioAuthorization) { $env:CLIENT_EMAIL_SCENARIO_AUTHORIZATION = $ScenarioAuthorization }
  if ($HumanConfirmation) { $env:CLIENT_EMAIL_HUMAN_CONFIRMATION = $HumanConfirmation }
  if ($VerifyScenario) { $env:CLIENT_EMAIL_VERIFY_SCENARIO = $VerifyScenario }
  if ($HumanEvidence) { $env:CLIENT_EMAIL_HUMAN_EVIDENCE = $HumanEvidence }
  Push-Location $backend
  try {
    & npm.cmd run qa:client-email-live
    if ($LASTEXITCODE -ne 0) { throw "Runner failed in $Mode mode." }
  } finally { Pop-Location }
} finally {
  Clear-QaSensitiveEnvironment
  foreach ($name in @('CLIENT_PORTAL_PUBLIC_URL', 'CLIENT_EMAIL_RECIPIENT_ALLOWLIST', 'CLIENT_EMAIL_EVIDENCE_ROOT', 'CLIENT_EMAIL_ACCEPTANCE_MODE', 'CLIENT_EMAIL_QA_SECRET_FILE', 'CORO_SOURCE_COMMIT', 'CLIENT_EMAIL_RUN_ID', 'CLIENT_EMAIL_VERIFY_SCENARIO')) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
  $databaseUrl = $null
}
