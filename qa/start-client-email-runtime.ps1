[CmdletBinding()]
param([string]$ArtifactRoot = 'D:\coro-qa-runtime')

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'client-email-runtime-security.ps1')
$worktree = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $worktree 'coro-backend'
$portal = Join-Path $worktree 'coro-client-portal'
$statePath = Join-Path $ArtifactRoot 'client-email-runtime.json'

if (-not [IO.Path]::IsPathRooted($ArtifactRoot) -or -not $ArtifactRoot.StartsWith('D:\', [StringComparison]::OrdinalIgnoreCase)) { throw 'ArtifactRoot must be an absolute dedicated path on D:.' }
if ($ArtifactRoot.StartsWith('D:\prepacivile-platform', [StringComparison]::OrdinalIgnoreCase)) { throw 'ArtifactRoot must not be inside another repository.' }
if (Test-Path -LiteralPath $statePath) { throw "Runtime state already exists at $statePath. Stop it first." }
foreach ($port in 3102, 3103) {
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "Port $port is already in use." }
}

$containerState = docker inspect coro-v1-email-qa-postgres --format '{{.State.Running}}'
if ($LASTEXITCODE -ne 0 -or $containerState -ne 'true') { throw 'The isolated PostgreSQL QA container is not running.' }
New-Item -ItemType Directory -Path $ArtifactRoot -Force | Out-Null
$env:NEXT_PUBLIC_API_URL = 'http://127.0.0.1:3102/api'
Push-Location $backend
try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' } } finally { Pop-Location }
Push-Location $portal
try { npm run qa:build; if ($LASTEXITCODE -ne 0) { throw 'Portal QA build failed.' } } finally { Pop-Location }
New-Item -ItemType Directory -Path (Join-Path $portal '.next\standalone\.next\static') -Force | Out-Null
Copy-Item -Path (Join-Path $portal '.next\static\*') -Destination (Join-Path $portal '.next\standalone\.next\static') -Recurse -Force
if (Test-Path -LiteralPath (Join-Path $portal 'public')) {
  New-Item -ItemType Directory -Path (Join-Path $portal '.next\standalone\public') -Force | Out-Null
  Copy-Item -Path (Join-Path $portal 'public\*') -Destination (Join-Path $portal '.next\standalone\public') -Recurse -Force
}

$secretEntries = @(Get-Content -LiteralPath (Join-Path $backend '.env.local') | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') })
if ($secretEntries.Count -ne 1 -or $secretEntries[0] -notmatch '^BREVO_API_KEY=(.+)$') { throw 'The dedicated QA secret file must contain only BREVO_API_KEY.' }
$brevoKey = $Matches[1]
$secretEntries = $null

$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$jwtBytes = New-Object byte[] 48
$mfaBytes = New-Object byte[] 48
$random.GetBytes($jwtBytes)
$random.GetBytes($mfaBytes)
$random.Dispose()
$jwtSecret = [Convert]::ToBase64String($jwtBytes)
$mfaSecret = [Convert]::ToBase64String($mfaBytes)
$databasePassword = Get-QaDatabasePassword
$databaseUrl = New-QaPostgresDatabaseUrl -Password $databasePassword
$databasePassword = $null

try {
  $env:CORO_QA_RUNTIME = 'CLIENT_EMAIL_E2E'
  $env:HOST = '127.0.0.1'
  $env:PORT = '3102'
  $env:DATABASE_URL = $databaseUrl
  $env:CLIENT_PORTAL_PUBLIC_URL = 'http://127.0.0.1:3103'
  $env:CORS_ALLOWED_ORIGINS = 'http://127.0.0.1:3103'
  $env:FRONTEND_URL = $null
  $env:JWT_SECRET = $jwtSecret
  $env:CORO_QA_JWT_SECRET = $jwtSecret
  $env:PLATFORM_MFA_SECRET = $mfaSecret
  $env:BREVO_API_KEY = $brevoKey
  $env:CLIENT_EMAIL_RECIPIENT_ALLOWLIST = 'info@getcoro.io'
  $backendProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'qa:runtime') -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput (Join-Path $ArtifactRoot 'backend.out.log') -RedirectStandardError (Join-Path $ArtifactRoot 'backend.err.log') -PassThru
} finally {
  Clear-QaSensitiveEnvironment
  $databaseUrl = $null
  $brevoKey = $null
  $jwtSecret = $null
  $mfaSecret = $null
  [Array]::Clear($jwtBytes, 0, $jwtBytes.Length)
  [Array]::Clear($mfaBytes, 0, $mfaBytes.Length)
}

$env:PORT = '3103'
$env:HOSTNAME = '127.0.0.1'
$portalProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'qa:runtime') -WorkingDirectory $portal -WindowStyle Hidden -RedirectStandardOutput (Join-Path $ArtifactRoot 'portal.out.log') -RedirectStandardError (Join-Path $ArtifactRoot 'portal.err.log') -PassThru
$env:PORT = $null
$env:HOSTNAME = $null
$env:NEXT_PUBLIC_API_URL = $null
$env:CORO_QA_RUNTIME = $null
$env:HOST = $null
$env:CLIENT_PORTAL_PUBLIC_URL = $null
$env:CORS_ALLOWED_ORIGINS = $null
$env:FRONTEND_URL = $null
$env:CLIENT_EMAIL_RECIPIENT_ALLOWLIST = $null

@{ schemaVersion = 1; startedAt = [DateTime]::UtcNow.ToString('o'); worktree = $worktree; backendPid = $backendProcess.Id; portalPid = $portalProcess.Id; backendUrl = 'http://127.0.0.1:3102/api'; portalUrl = 'http://127.0.0.1:3103'; database = 'coro_email_qa@127.0.0.1:55471' } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8
for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
  try {
    $backendResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3102/api' -TimeoutSec 2
    $portalResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3103/login' -TimeoutSec 2
    if ($backendResponse.StatusCode -eq 200 -and $portalResponse.StatusCode -eq 200) { Write-Output 'QA_RUNTIME_READY backend=127.0.0.1:3102 portal=127.0.0.1:3103 database=127.0.0.1:55471'; exit 0 }
  } catch { Start-Sleep -Milliseconds 500 }
}
throw "QA runtime did not become healthy. Inspect logs under $ArtifactRoot."
