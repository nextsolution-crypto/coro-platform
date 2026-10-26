function New-QaPostgresDatabaseUrl {
  [CmdletBinding()]
  param([Parameter(Mandatory)][string]$Password)

  $encodedPassword = [Uri]::EscapeDataString($Password)
  return "postgresql://coro_email_qa:${encodedPassword}@127.0.0.1:55471/coro_email_qa"
}

function Clear-QaSensitiveEnvironment {
  foreach ($name in @(
    'DATABASE_URL',
    'BREVO_API_KEY',
    'JWT_SECRET',
    'CORO_QA_JWT_SECRET',
    'PLATFORM_MFA_SECRET',
    'CLIENT_EMAIL_SCENARIO_AUTHORIZATION',
    'CLIENT_EMAIL_HUMAN_CONFIRMATION',
    'CLIENT_EMAIL_PREPARE_AUTHORIZATION',
    'CLIENT_EMAIL_HUMAN_EVIDENCE'
  )) {
    [Environment]::SetEnvironmentVariable($name, $null, 'Process')
  }
}

function Get-QaDatabasePassword {
  [CmdletBinding()]
  param()

  $containerEnvironment = docker inspect coro-v1-email-qa-postgres --format '{{range .Config.Env}}{{println .}}{{end}}'
  if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the isolated PostgreSQL QA container.' }
  $passwordEntry = $containerEnvironment | Where-Object { $_ -like 'POSTGRES_PASSWORD=*' } | Select-Object -First 1
  $containerEnvironment = $null
  if (-not $passwordEntry) { throw 'The QA database credential is unavailable.' }
  $password = $passwordEntry.Substring('POSTGRES_PASSWORD='.Length)
  $passwordEntry = $null
  return $password
}
