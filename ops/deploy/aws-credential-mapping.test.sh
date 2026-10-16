#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE="$ROOT/ops/deploy/coro-production-release.sh"

# Exercise the exact helper implemented by the production release script
# without executing any other release step.
source <(awk '/^backup_aws_cli\(\)/,/^}/' "$RELEASE")

fail_test() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

assert_missing_rejected() {
  local label="$1"
  local output
  shift
  if output="$("$@" 2>&1)"; then
    fail_test "$label accepted"
  fi
  [[ "$output" == *BACKUP_AWS_CREDENTIALS_MISSING* ]] || fail_test "$label error missing"
  [[ "$output" != *synthetic-access* && "$output" != *synthetic-secret* ]] || fail_test "$label leaked credentials"
  [[ "$output" != *AWS_CALLED* ]] || fail_test "$label invoked AWS"
}

export AWS_ACCESS_KEY_ID=unexpected-ambient-access
export AWS_SECRET_ACCESS_KEY=unexpected-ambient-secret
export AWS_SESSION_TOKEN=unexpected-ambient-session
export AWS_PROFILE=unexpected-ambient-profile
export AWS_DEFAULT_PROFILE=unexpected-ambient-default-profile
export AWS_SHARED_CREDENTIALS_FILE=unexpected-ambient-credentials-file
export AWS_CONFIG_FILE=unexpected-ambient-config-file
export CORO_BACKUP_SPACES_ACCESS_KEY=synthetic-access
export CORO_BACKUP_SPACES_SECRET_KEY=synthetic-secret
export TEST_EXPECTED_ACCESS=synthetic-access
export TEST_EXPECTED_SECRET=synthetic-secret

tmp_root="$(mktemp -d)"
trap 'rm -rf -- "$tmp_root"' EXIT
cat >"$tmp_root/aws" <<'MOCK'
#!/usr/bin/env bash
[[ "${AWS_ACCESS_KEY_ID:-}" == "$TEST_EXPECTED_ACCESS" ]] || exit 91
[[ "${AWS_SECRET_ACCESS_KEY:-}" == "$TEST_EXPECTED_SECRET" ]] || exit 92
[[ -z "${AWS_SESSION_TOKEN:-}" && -z "${AWS_PROFILE:-}" && -z "${AWS_DEFAULT_PROFILE:-}" ]] || exit 94
[[ -z "${AWS_SHARED_CREDENTIALS_FILE:-}" && -z "${AWS_CONFIG_FILE:-}" ]] || exit 95
[[ "${AWS_EC2_METADATA_DISABLED:-}" == true ]] || exit 96
[[ "$*" == *'s3api head-object'* ]] || exit 93
printf '{"VersionId":"synthetic-version","Metadata":{"sha256":"%064d"}}\n' 0
MOCK
chmod 0700 "$tmp_root/aws"
export PATH="$tmp_root:$PATH"
before_files="$(find "$tmp_root" -type f -print)"
success_output="$(TMPDIR="$tmp_root" backup_aws_cli s3api head-object --bucket synthetic --key synthetic --output json 2>&1)" || fail_test mapping
after_files="$(find "$tmp_root" -type f -print)"

[[ "$success_output" == *synthetic-version* ]] || fail_test aws-output
[[ "$success_output" != *synthetic-access* && "$success_output" != *synthetic-secret* ]] || fail_test success-leak
[[ "$before_files" == "$after_files" ]] || fail_test temporary-files

unset CORO_BACKUP_SPACES_ACCESS_KEY
assert_missing_rejected missing-access backup_aws_cli s3api head-object
CORO_BACKUP_SPACES_ACCESS_KEY=''
assert_missing_rejected empty-access backup_aws_cli s3api head-object
export CORO_BACKUP_SPACES_ACCESS_KEY=synthetic-access

unset CORO_BACKUP_SPACES_SECRET_KEY
assert_missing_rejected missing-secret backup_aws_cli s3api head-object
CORO_BACKUP_SPACES_SECRET_KEY=''
assert_missing_rejected empty-secret backup_aws_cli s3api head-object

node --input-type=module - "$RELEASE" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';

const release = fs.readFileSync(process.argv[2], 'utf8');
assert.match(release, /backup_aws_cli --endpoint-url/);
assert.match(release, /VersionId/);
assert.match(release, /BACKUP_VERSION_ID_MISSING/);
assert.match(release, /BACKUP_SHA_MISMATCH/);
const remote = release.indexOf('remote_head="$(backup_aws_cli');
const restore = release.indexOf('coro-db-restore-run.sh');
const migration = release.indexOf('migrate deploy');
const rollout = release.indexOf('up -d --no-build');
assert.ok(remote > 0 && restore > remote && migration > restore && rollout > migration);
NODE

printf 'PASS aws-credential-mapping\n'
