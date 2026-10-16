#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE="$ROOT/ops/deploy/coro-production-release.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

awk '/^run_backend_auth_smoke\(\)/,/^}/' "$RELEASE" >"$tmp/function.sh"

run_case() {
  local name="$1" status="$2" curl_exit="$3" headers="$4" body="$5" expected_status="$6" expected_code="${7:-}"
  local case_dir="$tmp/$name"
  mkdir -p "$case_dir/bin"
  cat >"$case_dir/bin/curl" <<'SCRIPT'
#!/usr/bin/env bash
set -eu
headers=''
body=''
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dump-header) headers="$2"; shift 2 ;;
    --output) body="$2"; shift 2 ;;
    *) shift ;;
  esac
done
printf '%b' "$MOCK_HEADERS" >"$headers"
printf '%s' "$MOCK_BODY" >"$body"
printf '%s' "$MOCK_STATUS"
exit "$MOCK_CURL_EXIT"
SCRIPT
  chmod +x "$case_dir/bin/curl"

  set +e
  output="$(PATH="$case_dir/bin:$PATH" MOCK_STATUS="$status" MOCK_CURL_EXIT="$curl_exit" MOCK_HEADERS="$headers" MOCK_BODY="$body" bash -ceu '
    AUTH_SMOKE_HEADERS=""
    AUTH_SMOKE_BODY=""
    fail() { printf "FAIL:%s\n" "$1" >&2; exit 1; }
    source "$1"
    run_backend_auth_smoke http://synthetic.invalid/api/auth/login
  ' _ "$tmp/function.sh" 2>&1)"
  actual_status=$?
  set -e
  [[ "$actual_status" -eq "$expected_status" ]] || { printf 'FAIL %s status=%s output=%s\n' "$name" "$actual_status" "$output" >&2; exit 1; }
  if [[ -n "$expected_code" ]]; then
    grep -q "FAIL:$expected_code" <<<"$output" || { printf 'FAIL %s output=%s\n' "$name" "$output" >&2; exit 1; }
  fi
  printf 'PASS %s\n' "$name"
}

run_case rejected-401 401 0 $'content-type: application/json\r\n' '{"statusCode":401,"message":"Invalid credentials"}' 0
run_case rejected-400 400 0 $'content-type: application/json\r\n' '{"statusCode":400,"message":"Rejected"}' 0
run_case server-500 500 0 $'content-type: application/json\r\n' '{"statusCode":500}' 1 BACKEND_HEALTH_HTTP_500
run_case unexpected-200 200 0 $'content-type: application/json\r\n' '{"ok":true}' 1 BACKEND_HEALTH_HTTP_200
run_case malformed-response 401 0 $'content-type: application/json\r\n' 'not-json' 1 BACKEND_HEALTH_RESPONSE_INVALID
run_case network-error 000 7 '' '' 1 BACKEND_HEALTH_NETWORK_FAILED
run_case jwt-response 401 0 $'content-type: application/json\r\n' '{"accessToken":"forbidden"}' 1 BACKEND_HEALTH_RESPONSE_INVALID
run_case session-cookie 401 0 $'set-cookie: session=forbidden\r\ncontent-type: application/json\r\n' '{"statusCode":401}' 1 BACKEND_HEALTH_SESSION_CREATED

grep -q 'release-smoke-nonexistent@example.invalid' "$RELEASE"
grep -q 'InvalidReleaseSmoke!123' "$RELEASE"
! grep -q -- "-d '{}' http://127.0.0.1:3002/api/auth/login" "$RELEASE"
printf 'PASS synthetic-reserved-identity-and-nonempty-payload\n'

node - "$RELEASE" <<'NODE'
const fs=require('fs');
const source=fs.readFileSync(process.argv[2],'utf8');
const order=['coro-db-restore-run.sh','migrate deploy','up -d --no-build --remove-orphans','wait_for_application_ready coro_frontend','wait_for_backend_ready coro_backend','run_backend_auth_smoke'];
let previous=-1;
for(const marker of order){const current=source.indexOf(marker,previous+1);if(current<0)throw new Error(`ORDER_OR_GATE_MISSING:${marker}`);previous=current;}
for(const marker of ['previous_images','previous_compose','BACKUP_NOT_REMOTE_VERIFIED','RESTORE_VERIFICATION_FAILED'])if(!source.includes(marker))throw new Error(`SAFETY_GATE_MISSING:${marker}`);
console.log('PASS release-order-backup-restore-readiness-rollback');
NODE

grep -q 'rendement_guard_code=' "$RELEASE"
grep -q 'RENDEMENT_SMOKE_FAILED' "$RELEASE"
printf 'PASS booking-and-rendement-unauthenticated-guards\n'
