param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^postgresql://')]
  [string]$TestDatabaseUrl
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backend = Join-Path $repo 'coro-backend'
$env:TEST_DATABASE_URL = $TestDatabaseUrl
$env:DATABASE_URL = $TestDatabaseUrl

Push-Location $backend
try {
  & .\node_modules\.bin\prisma.cmd migrate status
  if ($LASTEXITCODE -ne 0) { throw 'Prisma migration status failed.' }

  & .\node_modules\.bin\jest.cmd --runInBand --runTestsByPath src/auth/plan-security.spec.ts
  if ($LASTEXITCODE -ne 0) { throw 'Plan security unit regression failed.' }

  & .\node_modules\.bin\jest.cmd --runInBand --runTestsByPath src/auth/auth-security.spec.ts src/auth/organization-status.guard.spec.ts
  if ($LASTEXITCODE -ne 0) { throw 'Authentication and organization status regression failed.' }

  & .\node_modules\.bin\jest.cmd --config test/jest-postgres.json --runInBand --runTestsByPath test/plan-security.postgres-spec.ts test/plan-http-security.postgres-spec.ts
  if ($LASTEXITCODE -ne 0) { throw 'Plan PostgreSQL/HTTP security regression failed.' }
} finally {
  Pop-Location
}

Push-Location $backend
try {
  & .\node_modules\.bin\jest.cmd --config ..\qa\organization-document-generation\jest.config.cjs --runInBand
  if ($LASTEXITCODE -ne 0) { throw 'Document generation governance regression failed.' }
} finally {
  Pop-Location
  Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
