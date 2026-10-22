param(
  [ValidateSet('Start', 'Status', 'Stop')]
  [string]$Action = 'Status',
  [ValidatePattern('^[a-z0-9-]{3,24}$')]
  [string]$StackId = 'petra-qa',
  [ValidateRange(1024, 65535)][int]$DatabasePort = 55461,
  [ValidateRange(1024, 65535)][int]$BackendPort = 3166,
  [ValidateRange(1024, 65535)][int]$PortalPort = 3167,
  [ValidateRange(1024, 65535)][int]$ProviderPort = 34641,
  [string]$BackendImage = 'coro-p61-backend:local',
  [string]$PortalImage = 'coro-p61-portal:local',
  [switch]$NetworkFixtures
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$compose = Join-Path $PSScriptRoot 'docker-compose.qa.yml'
$qaRoot = "D:\CORO-QA\runs\$StackId"
$secretFile = 'D:\CORO-QA\secrets\identity-lab.json'
$project = "coro-$StackId"
$prefix = $project
$internalNetwork = "${project}_isolated"
$hostNetwork = "${project}_host-loopback"
$names = @(
  "$prefix-backend", "$prefix-api-proxy", "$prefix-api-publish",
  "$prefix-portal", "$prefix-portal-proxy", "$prefix-portal-publish"
)

function Invoke-Docker([string[]]$Arguments, [switch]$IgnoreFailure) {
  & docker @Arguments
  if (-not $IgnoreFailure -and $LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')"
  }
}

function Assert-LoopbackPortFree([int]$Port) {
  $probe = [System.Net.Sockets.TcpListener]::new(
    [System.Net.IPAddress]::Loopback,
    $Port
  )
  try {
    $probe.Start()
  } catch [System.Net.Sockets.SocketException] {
    throw "Loopback port $Port is already in use."
  } finally {
    $probe.Stop()
  }
}

function Wait-Http([string]$Url, [int]$Attempts = 60) {
  for ($attempt = 0; $attempt -lt $Attempts; $attempt += 1) {
    $code = & curl.exe -s -o NUL -w '%{http_code}' $Url
    if ($code -match '^(200|204|404)$') { return $code }
    Start-Sleep -Seconds 1
  }
  throw "Readiness timeout for $Url"
}

if ($Action -eq 'Status') {
  Invoke-Docker @('ps', '--filter', "name=$prefix", '--format', 'table {{.Names}}\t{{.Status}}\t{{.Ports}}')
  exit 0
}

if ($Action -eq 'Stop') {
  foreach ($name in $names) { Invoke-Docker @('rm', '-f', $name) -IgnoreFailure }
  $env:CORO_QA_DB_PASSWORD = 'cleanup-placeholder-not-used'
  $env:CORO_QA_POSTGRES_DATA = Join-Path $qaRoot 'pg'
  Invoke-Docker @('compose', '-p', $project, '-f', $compose, 'down') -IgnoreFailure
  Remove-Item Env:CORO_QA_DB_PASSWORD -ErrorAction SilentlyContinue
  Write-Output 'QA stack stopped; evidence and database directory preserved.'
  exit 0
}

foreach ($port in @($DatabasePort, $BackendPort, $PortalPort, $ProviderPort)) { Assert-LoopbackPortFree $port }
if (-not (Test-Path -LiteralPath $secretFile)) { throw 'QA Identity Lab secret store is missing.' }
$secrets = Get-Content -LiteralPath $secretFile -Raw | ConvertFrom-Json
if (-not $secrets.databasePassword -or -not $secrets.syntheticPassword) {
  throw 'QA Identity Lab secret store is incomplete.'
}
New-Item -ItemType Directory -Force -Path (Join-Path $qaRoot 'pg'), (Join-Path $qaRoot 'mfa') | Out-Null
$env:CORO_QA_DB_PASSWORD = $secrets.databasePassword
$env:CORO_QA_POSTGRES_DATA = Join-Path $qaRoot 'pg'
$env:CORO_QA_POSTGRES_PORT = "$DatabasePort"
$env:CORO_QA_PROVIDER_PORT = "$ProviderPort"
Invoke-Docker @('compose', '-p', $project, '-f', $compose, 'up', '-d', 'postgres', 'provider-fake', 'private-storage-qa')

for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
  $health = (& docker inspect --format '{{.State.Health.Status}}' "$project-postgres-1" 2>$null)
  if ($health -eq 'healthy') { break }
  Start-Sleep -Seconds 1
}
if ($health -ne 'healthy') { throw 'PostgreSQL readiness failed.' }

$encodedPassword = [uri]::EscapeDataString([string]$secrets.databasePassword)
$env:DATABASE_URL = "postgresql://coro_qa:$encodedPassword@127.0.0.1:$DatabasePort/coro_qa_global_e2e"
$env:CORO_QA_SYNTHETIC_PASSWORD = $secrets.syntheticPassword
$env:CORO_QA_NETWORK_ISOLATED = 'true'
$env:CORO_QA_PROVIDER_EGRESS_BLOCKED = 'true'
$env:CORO_QA_RUN_ROOT = $qaRoot
Push-Location (Join-Path $repo 'coro-backend')
try { & .\node_modules\.bin\prisma.cmd migrate deploy; if ($LASTEXITCODE -ne 0) { throw 'Migration deploy failed.' } }
finally { Pop-Location }
Push-Location $repo
try {
  & node qa/global-e2e/src/seed-foundation.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Identity seed failed.' }
  if ($NetworkFixtures) {
    & node qa/p61-e2e/seed-p61.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Network fixture seed failed.' }
  }
} finally { Pop-Location }

$internalDatabaseUrl = "postgresql://coro_qa:$encodedPassword@$project-postgres-1`:5432/coro_qa_global_e2e"
$jwt = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$mfa = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
Invoke-Docker @('run', '-d', '--name', "$prefix-backend", '--network', $internalNetwork,
  '--network-alias', 'backend', '-e', 'NODE_ENV=test', '-e', "DATABASE_URL=$internalDatabaseUrl",
  '-e', "JWT_SECRET=$jwt", '-e', "PLATFORM_MFA_SECRET=$mfa",
  '-e', "FRONTEND_URL=http://127.0.0.1:$PortalPort", '-e', 'MFA_QA_CAPTURE_ENABLED=true',
  '-e', 'MFA_QA_CAPTURE_DIR=/tmp/coro-mfa', '-e', 'MFA_QA_ALLOWED_RECIPIENT_SUFFIXES=global-e2e.test',
  '-e', 'MFA_QA_NETWORK_ISOLATED=true',
  '-e', 'PRIVATE_STORAGE_QA_MODE=true', '-e', 'PRIVATE_STORAGE_QA_ENDPOINT=http://private-storage-qa:34642',
  '-e', 'PRIVATE_STORAGE_QA_ACCESS_KEY=qa-storage-access', '-e', 'PRIVATE_STORAGE_QA_SECRET_KEY=qa-storage-secret',
  '-e', 'PRIVATE_STORAGE_QA_BUCKET=coro-private-qa',
  '-v', "$(Join-Path $qaRoot 'mfa'):/tmp/coro-mfa", $BackendImage)

$storageProbeArgs = @(
  'run', '--rm', '--network', $internalNetwork,
  '-e', 'PRIVATE_STORAGE_QA_ENDPOINT=http://private-storage-qa:34642',
  '-e', 'PRIVATE_STORAGE_QA_ACCESS_KEY=qa-storage-access',
  '-e', 'PRIVATE_STORAGE_QA_BUCKET=coro-private-qa',
  '-v', "$(Join-Path $PSScriptRoot 'src'):/qa:ro",
  'node:22-alpine', 'node', '/qa/private-storage-readiness.mjs'
)
$storageProbe = & docker @storageProbeArgs 2>&1
if ($LASTEXITCODE -ne 0 -or ($storageProbe -join "`n") -notmatch '"status":"PASS"') {
  throw 'Private storage readiness failed closed.'
}
Invoke-Docker @('run', '-d', '--name', "$prefix-api-proxy", '--network', $internalNetwork,
  'alpine/socat', 'TCP-LISTEN:3002,fork,reuseaddr', 'TCP:backend:3002')
Invoke-Docker @('network', 'connect', $hostNetwork, "$prefix-api-proxy")
Invoke-Docker @('run', '-d', '--name', "$prefix-api-publish", '--network', $hostNetwork,
  '-p', "127.0.0.1:$BackendPort`:3002", 'alpine/socat', 'TCP-LISTEN:3002,fork,reuseaddr', "TCP:$prefix-api-proxy`:3002")
Invoke-Docker @('run', '-d', '--name', "$prefix-portal", '--network', $internalNetwork,
  '--network-alias', 'portal', $PortalImage)
Invoke-Docker @('run', '-d', '--name', "$prefix-portal-proxy", '--network', $internalNetwork,
  'alpine/socat', 'TCP-LISTEN:3003,fork,reuseaddr', 'TCP:portal:3003')
Invoke-Docker @('network', 'connect', $hostNetwork, "$prefix-portal-proxy")
Invoke-Docker @('run', '-d', '--name', "$prefix-portal-publish", '--network', $hostNetwork,
  '-p', "127.0.0.1:$PortalPort`:3003", 'alpine/socat', 'TCP-LISTEN:3003,fork,reuseaddr', "TCP:$prefix-portal-proxy`:3003")

$backendStatus = Wait-Http "http://127.0.0.1:$BackendPort/api/health"
$portalStatus = Wait-Http "http://127.0.0.1:$PortalPort"
$manifest = [ordered]@{
  stackId = $StackId; startedAt = (Get-Date).ToUniversalTime().ToString('o')
  databasePort = $DatabasePort; backendPort = $BackendPort; portalPort = $PortalPort
  providerPort = $ProviderPort
  backendStatus = $backendStatus; portalStatus = $portalStatus
  privateStorageStatus = 'PASS'; network = 'internal-deny-by-default'; secretsPersisted = $false
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $qaRoot 'stack-manifest.json') -Encoding UTF8
Write-Output "QA stack $StackId ready on loopback ports $DatabasePort/$BackendPort/$PortalPort."
