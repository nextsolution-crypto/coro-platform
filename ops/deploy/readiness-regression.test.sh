#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE="$ROOT/ops/deploy/coro-production-release.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

awk '/^wait_for_application_ready\(\)/,/^}/' "$RELEASE" >"$tmp/function.sh"
awk '/^wait_for_backend_ready\(\)/,/^}/' "$RELEASE" >"$tmp/backend-function.sh"

run_case() {
  local name="$1" curl_sequence="$2" running_sequence="$3" restart_sequence="$4" expected_status="$5" expected_code="${6:-}"
  local case_dir="$tmp/$name"
  mkdir -p "$case_dir/bin"
  printf '%s\n' "$curl_sequence" >"$case_dir/curl.sequence"
  printf '%s\n' "$running_sequence" >"$case_dir/running.sequence"
  printf '%s\n' "$restart_sequence" >"$case_dir/restart.sequence"
  printf '0\n' >"$case_dir/time"

  cat >"$case_dir/bin/docker" <<'SCRIPT'
#!/usr/bin/env bash
set -eu
case "$*" in
  *State.Running*) file="$CASE_DIR/running.sequence" ;;
  *RestartCount*) file="$CASE_DIR/restart.sequence" ;;
  *) exit 2 ;;
esac
value="$(head -n 1 "$file")"
tail -n +2 "$file" >"$file.next"
if [[ -s "$file.next" ]]; then mv "$file.next" "$file"; else rm -f "$file.next"; fi
printf '%s\n' "$value"
SCRIPT
  cat >"$case_dir/bin/curl" <<'SCRIPT'
#!/usr/bin/env bash
set -eu
file="$CASE_DIR/curl.sequence"
value="$(head -n 1 "$file")"
tail -n +2 "$file" >"$file.next"
if [[ -s "$file.next" ]]; then mv "$file.next" "$file"; else rm -f "$file.next"; fi
code="${value%%:*}"
status="${value##*:}"
printf '%s' "$code"
exit "$status"
SCRIPT
  cat >"$case_dir/bin/date" <<'SCRIPT'
#!/usr/bin/env bash
set -eu
value="$(cat "$CASE_DIR/time")"
printf '%s\n' "$value"
SCRIPT
  cat >"$case_dir/bin/sleep" <<'SCRIPT'
#!/usr/bin/env bash
set -eu
value="$(cat "$CASE_DIR/time")"
printf '%s\n' "$((value + 1))" >"$CASE_DIR/time"
SCRIPT
  chmod +x "$case_dir/bin/"*

  set +e
  output="$(CASE_DIR="$case_dir" PATH="$case_dir/bin:$PATH" APPLICATION_READINESS_TIMEOUT_SECONDS=2 APPLICATION_READINESS_INTERVAL_SECONDS=1 bash -ceu '
    fail() { printf "FAIL:%s\n" "$1" >&2; exit 1; }
    source "$1"
    wait_for_application_ready synthetic http://synthetic.invalid/ TEST
  ' _ "$tmp/function.sh" 2>&1)"
  status=$?
  set -e
  [[ "$status" -eq "$expected_status" ]] || { printf 'FAIL %s status=%s output=%s\n' "$name" "$status" "$output" >&2; exit 1; }
  if [[ -n "$expected_code" ]]; then
    grep -q "FAIL:$expected_code" <<<"$output" || { printf 'FAIL %s output=%s\n' "$name" "$output" >&2; exit 1; }
  fi
  printf 'PASS %s\n' "$name"
}

run_case immediate-200 '200:0' 'true' '0' 0
run_case refused-then-200 $'000:7\n200:0' $'true\ntrue' $'0\n0' 0
run_case reset-then-200 $'000:56\n200:0' $'true\ntrue' $'0\n0' 0
run_case 502-then-200 $'502:0\n200:0' $'true\ntrue' $'0\n0' 0
run_case 503-then-200 $'503:0\n200:0' $'true\ntrue' $'0\n0' 0
run_case persistent-500 $'500:0\n500:0\n500:0' $'true\ntrue\ntrue' $'0\n0\n0' 1 TEST_READINESS_TIMEOUT
run_case persistent-reset $'000:56\n000:56\n000:56' $'true\ntrue\ntrue' $'0\n0\n0' 1 TEST_READINESS_TIMEOUT
run_case persistent-refused $'000:7\n000:7\n000:7' $'true\ntrue\ntrue' $'0\n0\n0' 1 TEST_READINESS_TIMEOUT
run_case container-exit '000:7' 'false' '0' 1 TEST_CONTAINER_EXITED
run_case restart-loop '000:7' 'true' '1' 1 TEST_RESTART_LOOP
run_case client-error '404:0' 'true' '0' 1 TEST_HTTP_404

run_backend_case() {
  local name="$1" curl_sequence="$2" running_sequence="$3" restart_sequence="$4" expected_status="$5" expected_code="${6:-}"
  local case_dir="$tmp/backend-$name"
  mkdir -p "$case_dir/bin"
  printf '%s\n' "$curl_sequence" >"$case_dir/curl.sequence"
  printf '%s\n' "$running_sequence" >"$case_dir/running.sequence"
  printf '%s\n' "$restart_sequence" >"$case_dir/restart.sequence"
  printf '0\n' >"$case_dir/time"
  cp "$tmp/immediate-200/bin/"* "$case_dir/bin/"

  set +e
  output="$(CASE_DIR="$case_dir" PATH="$case_dir/bin:$PATH" APPLICATION_READINESS_TIMEOUT_SECONDS=2 APPLICATION_READINESS_INTERVAL_SECONDS=1 bash -ceu '
    fail() { printf "FAIL:%s\n" "$1" >&2; exit 1; }
    source "$1"
    wait_for_backend_ready synthetic http://synthetic.invalid/api/auth/login
  ' _ "$tmp/backend-function.sh" 2>&1)"
  status=$?
  set -e
  [[ "$status" -eq "$expected_status" ]] || { printf 'FAIL backend-%s status=%s output=%s\n' "$name" "$status" "$output" >&2; exit 1; }
  if [[ -n "$expected_code" ]]; then
    grep -q "FAIL:$expected_code" <<<"$output" || { printf 'FAIL backend-%s output=%s\n' "$name" "$output" >&2; exit 1; }
  fi
  printf 'PASS backend-%s\n' "$name"
}

run_backend_case delayed-startup $'000:7\n500:0\n401:0' $'true\ntrue\ntrue' $'0\n0\n0' 0
run_backend_case refused-then-ready $'000:7\n400:0' $'true\ntrue' $'0\n0' 0
run_backend_case reset-then-ready $'000:56\n401:0' $'true\ntrue' $'0\n0' 0
run_backend_case persistent-500 $'500:0\n500:0\n500:0' $'true\ntrue\ntrue' $'0\n0\n0' 1 BACKEND_READINESS_TIMEOUT
run_backend_case persistent-network $'000:7\n000:7\n000:7' $'true\ntrue\ntrue' $'0\n0\n0' 1 BACKEND_READINESS_TIMEOUT
run_backend_case container-exit '000:7' 'false' '0' 1 BACKEND_CONTAINER_EXITED
run_backend_case restart-loop '000:7' 'true' '1' 1 BACKEND_RESTART_LOOP
run_backend_case unexpected-200 '200:0' 'true' '0' 1 BACKEND_READINESS_HTTP_200

real_dir="$tmp/backend-real-http"
mkdir -p "$real_dir/bin"
cat >"$real_dir/bin/docker" <<'SCRIPT'
#!/usr/bin/env bash
set -eu
case "$*" in
  *State.Running*) printf 'true\n' ;;
  *RestartCount*) printf '0\n' ;;
  *) exit 2 ;;
esac
SCRIPT
chmod +x "$real_dir/bin/docker"
node -e 'const server=require("http").createServer((request,response)=>{let body="";request.on("data",chunk=>body+=chunk);request.on("end",()=>{const parsed=JSON.parse(body);if(parsed.email!=="release-smoke-nonexistent@example.invalid")process.exit(2);response.writeHead(401,{"content-type":"application/json"});response.end(JSON.stringify({statusCode:401,message:"Invalid credentials"}));});});setTimeout(()=>server.listen(39281,"127.0.0.1"),1000)' &
real_server=$!
set +e
PATH="$real_dir/bin:$PATH" APPLICATION_READINESS_TIMEOUT_SECONDS=10 APPLICATION_READINESS_INTERVAL_SECONDS=1 bash -ceu '
  fail() { printf "FAIL:%s\n" "$1" >&2; exit 1; }
  source "$1"
  wait_for_backend_ready synthetic http://127.0.0.1:39281/api/auth/login
' _ "$tmp/backend-function.sh"
real_status=$?
set -e
kill "$real_server" 2>/dev/null || true
wait "$real_server" 2>/dev/null || true
[[ "$real_status" -eq 0 ]] || { printf 'FAIL backend-real-http-delayed-startup\n' >&2; exit 1; }
printf 'PASS backend-real-http-delayed-startup\n'

node - "$RELEASE" <<'NODE'
const fs = require('fs');
const source = fs.readFileSync(process.argv[2], 'utf8');
const order = [
  'coro-db-backup-health.service',
  'coro-db-backup.service',
  'coro-db-restore-run.sh',
  'migrate deploy',
  'up -d --no-build --remove-orphans',
  'wait_for_application_ready coro_frontend',
  'wait_for_backend_ready coro_backend',
  'run_backend_auth_smoke http://127.0.0.1:3002/api/auth/login',
];
let previous = -1;
for (const marker of order) {
  const current = source.indexOf(marker);
  if (current <= previous) throw new Error(`ORDER_OR_GATE_MISSING:${marker}`);
  previous = current;
}
if (/prisma migrate reset|dropdb|pg_restore.*coro_db/.test(source)) throw new Error('DESTRUCTIVE_DATABASE_ACTION');
if (!source.includes('previous_images') || !source.includes('previous_compose')) throw new Error('ROLLBACK_METADATA_MISSING');
console.log('PASS safety-gate-order-and-rollback');
NODE
