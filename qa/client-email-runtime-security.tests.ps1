$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'client-email-runtime-security.ps1')

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

$password = 'p@ss:/?#[]!$&''()*+,;=% value'
$url = New-QaPostgresDatabaseUrl -Password $password
Assert-True ($url -match '^postgresql://coro_email_qa:(.+)@127\.0\.0\.1:55471/coro_email_qa$') 'QA database URL coordinates changed.'
$encodedPassword = $Matches[1]
Assert-True ([Uri]::UnescapeDataString($encodedPassword) -eq $password) 'Reserved password characters do not round-trip.'
Assert-True (-not $url.Contains($password)) 'Raw password leaked into DATABASE_URL.'

$env:DATABASE_URL = $url
$env:BREVO_API_KEY = 'synthetic-brevo-secret-never-log'
$env:JWT_SECRET = 'synthetic-jwt-secret-never-log'
Clear-QaSensitiveEnvironment
Assert-True (-not $env:DATABASE_URL) 'DATABASE_URL was not cleared.'
Assert-True (-not $env:BREVO_API_KEY) 'BREVO_API_KEY was not cleared.'
Assert-True (-not $env:JWT_SECRET) 'JWT_SECRET was not cleared.'

$sources = @(
  (Get-Content -Raw (Join-Path $PSScriptRoot 'start-client-email-runtime.ps1')),
  (Get-Content -Raw (Join-Path $PSScriptRoot 'run-client-email-acceptance.ps1'))
) -join "`n"
Assert-True ($sources -notmatch 'Write-(Output|Host).*\$(databasePassword|databaseUrl|brevoKey|jwtSecret|mfaSecret)') 'A script writes a sensitive variable.'
Assert-True ($sources -notmatch 'ArgumentList.*\$(databasePassword|databaseUrl|brevoKey|jwtSecret|mfaSecret)') 'A secret is passed as a process argument.'
Write-Output 'QA_RUNTIME_SECURITY_TESTS_PASS'
