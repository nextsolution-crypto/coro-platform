param(
  [Parameter(Mandatory = $true)]
  [string]$TestDatabaseUrl
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$backend = Join-Path $root 'coro-backend'
$portal = Join-Path $root 'coro-client-portal'

Push-Location $backend
try {
  $env:TEST_DATABASE_URL = $TestDatabaseUrl
  & .\node_modules\.bin\jest.cmd src/operational-reviews/operational-reviews.service.spec.ts src/operational-reviews/operational-review-content.service.spec.ts src/occupancy/corrective-actions.service.spec.ts src/occupancy/corrective-action-evidence.service.spec.ts --runInBand
  if ($LASTEXITCODE -ne 0) { throw 'REX unit acceptance failed' }
  & .\node_modules\.bin\jest.cmd --config .\test\jest-postgres.json --runInBand test/operational-reviews.postgres-spec.ts test/corrective-actions.postgres-spec.ts test/corrective-action-tracking.postgres-spec.ts
  if ($LASTEXITCODE -ne 0) { throw 'REX PostgreSQL acceptance failed' }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' }
} finally {
  Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
  Pop-Location
}

Push-Location $portal
try {
  npm run test:rex-corrective-actions
  if ($LASTEXITCODE -ne 0) { throw 'Portal REX acceptance failed' }
  & .\node_modules\.bin\tsc.cmd --noEmit
  if ($LASTEXITCODE -ne 0) { throw 'Portal TypeScript failed' }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Portal build failed' }
} finally {
  Pop-Location
}
