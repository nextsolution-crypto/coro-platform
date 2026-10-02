#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
SUBJECT="${ROOT}/ops/backup/coro-db-upload.sh"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT
REAL_NODE="$(command -v node)"
passed=0
failed=0

pass() { printf 'PASS %s\n' "$1"; passed=$((passed + 1)); }
fail() { printf 'FAIL %s: %s\n' "$1" "$2"; failed=$((failed + 1)); }

make_mock_aws() {
  local bin="$1"
  mkdir -p "$bin"
  cat >"${bin}/aws" <<'MOCK'
#!/usr/bin/env bash
set -Eeuo pipefail
printf 'call\n' >>"$MOCK_CALL_LOG"
args=("$@")
operation=''
for ((i=0;i<${#args[@]};i++)); do
  [[ "${args[$i]}" == 's3api' ]] && operation="${args[$((i+1))]}"
done
value_after() {
  local wanted="$1"
  for ((j=0;j<${#args[@]};j++)); do
    [[ "${args[$j]}" == "$wanted" ]] && { printf '%s' "${args[$((j+1))]}"; return; }
  done
}
key="$(value_after --key)"
safe_key="${key//\//_}"
object="${MOCK_REMOTE_DIR}/${safe_key}"
metadata_file="${object}.metadata"
scenario="${MOCK_SCENARIO:-success}"
case "$scenario" in
  network) printf 'connection reset\n' >&2; exit 2 ;;
  timeout) printf 'timed out\n' >&2; exit 2 ;;
  http400) printf '400 Bad Request\n' >&2; exit 2 ;;
  http401) printf '401 InvalidAccessKey\n' >&2; exit 2 ;;
  http403) printf '403 AccessDenied\n' >&2; exit 2 ;;
  http429) printf '429 SlowDown\n' >&2; exit 2 ;;
  http500) printf '500 InternalError\n' >&2; exit 2 ;;
  http503) printf '503 Service Unavailable\n' >&2; exit 2 ;;
esac
case "$operation" in
  head-object)
    if [[ "$scenario" == 'missing-after-upload' && "$key" == *.dump ]]; then printf '404 Not Found\n' >&2; exit 2; fi
    [[ -f "$object" ]] || { printf '404 Not Found\n' >&2; exit 2; }
    size="$(stat -c '%s' "$object")"
    [[ "$scenario" == 'size-mismatch' && "$key" == *.dump ]] && size=$((size + 1))
    IFS='|' read -r sha backup_id <"$metadata_file"
    printf '{"ContentLength":%s,"Metadata":{"sha256":"%s","backup-id":"%s"}}\n' "$size" "$sha" "$backup_id"
    ;;
  put-object)
    body="$(value_after --body)"
    metadata="$(value_after --metadata)"
    if [[ "$scenario" == 'manifest-upload-failure' && "$key" == *.manifest.json ]]; then printf '500 manifest failure\n' >&2; exit 2; fi
    if [[ "$scenario" != 'missing-after-upload' ]]; then
      cp "$body" "$object"
      sha="${metadata#sha256=}"; sha="${sha%%,*}"
      backup_id="${metadata##*backup-id=}"
      printf '%s|%s\n' "$sha" "$backup_id" >"$metadata_file"
      [[ "$scenario" == 'partial-upload' && "$key" == *.dump ]] && truncate -s 1 "$object"
    fi
    printf '{}\n'
    ;;
  get-object)
    destination="${args[$((${#args[@]}-3))]}"
    [[ -f "$object" ]] || { printf '404 Not Found\n' >&2; exit 2; }
    [[ "$scenario" == 'verification-failure' ]] && { printf '500 verification failed\n' >&2; exit 2; }
    cp "$object" "$destination"
    [[ "$scenario" == 'checksum-mismatch' && "$key" == *.dump ]] && printf 'corrupt' >>"$destination"
    printf '{}\n'
    ;;
  *) printf 'unsupported mock operation\n' >&2; exit 2 ;;
esac
MOCK
  chmod 700 "${bin}/aws"
}

make_fixture() {
  local case_root="$1"
  mkdir -p "${case_root}/backup" "${case_root}/remote" "${case_root}/bin"
  chmod 700 "${case_root}/backup" "${case_root}/remote" "${case_root}/bin"
  make_mock_aws "${case_root}/bin"
  printf 'custom archive fixture for remote verification\n' >"${case_root}/backup/test-20261002T180000Z-abcdef123456.dump"
  "$REAL_NODE" - "$case_root" <<'NODE'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const id = 'test-20261002T180000Z-abcdef123456';
const dump = path.join(root, 'backup', `${id}.dump`);
const data = fs.readFileSync(dump);
const manifest = {
  manifestVersion: 1, backupId: id, createdAt: '2026-10-02T18:00:00Z', environment: 'test',
  databaseLogicalName: 'coro_backup01b_disposable', postgresServerVersion: '16.15',
  pgDumpVersion: 'pg_dump (PostgreSQL) 16.15', format: 'postgres-custom', sizeBytes: data.length,
  sha256: crypto.createHash('sha256').update(data).digest('hex'), migrationHead: 'test_migration',
  structuralValidation: 'PASSED', remoteVerification: 'NOT_ATTEMPTED', status: 'LOCAL_VERIFIED'
};
fs.writeFileSync(path.join(root, 'backup', `${id}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
NODE
}

run_case() {
  local name="$1" scenario="$2" expectation="$3"
  local case_root="${TEST_ROOT}/${name}"
  make_fixture "$case_root"
  local status=0
  env PATH="${case_root}/bin:${PATH}" MOCK_SCENARIO="$scenario" MOCK_REMOTE_DIR="${case_root}/remote" MOCK_CALL_LOG="${case_root}/calls" \
    CORO_BACKUP_REMOTE_ENABLED=true CORO_BACKUP_SPACES_ENDPOINT=https://mock.invalid CORO_BACKUP_SPACES_REGION=tor1 \
    CORO_BACKUP_SPACES_BUCKET=coro-backup-test CORO_BACKUP_SPACES_PREFIX=database-backups/test/ \
    CORO_BACKUP_SPACES_ACCESS_KEY=TEST_ACCESS_SECRET_MARKER CORO_BACKUP_SPACES_SECRET_KEY=TEST_SECRET_MARKER \
    CORO_BACKUP_REMOTE_MAX_ATTEMPTS=3 CORO_BACKUP_RETRY_BASE_MS=0 CORO_BACKUP_REMOTE_COMMAND_TIMEOUT_MS=10000 \
    CORO_BACKUP_STATE_PATH="${case_root}/backup/state.json" \
    "$SUBJECT" "${case_root}/backup/test-20261002T180000Z-abcdef123456.manifest.json" >"${case_root}/stdout" 2>"${case_root}/stderr" || status=$?
  if [[ "$expectation" == success && "$status" -eq 0 ]]; then pass "$name"; elif [[ "$expectation" == failure && "$status" -ne 0 ]]; then pass "$name"; else fail "$name" "exit=${status}"; fi
  if [[ -f "${case_root}/backup/test-20261002T180000Z-abcdef123456.dump" ]]; then pass "${name}-local-preserved"; else fail "${name}-local-preserved" missing; fi
  if grep -Eq 'TEST_ACCESS_SECRET_MARKER|TEST_SECRET_MARKER' "${case_root}/stdout" "${case_root}/stderr"; then fail "${name}-no-secret" leaked; else pass "${name}-no-secret"; fi
  if [[ "$expectation" == failure && -e "${case_root}/backup/test-20261002T180000Z-abcdef123456.remote.manifest.json" ]]; then fail "${name}-no-false-verified" finalized; else pass "${name}-no-false-verified"; fi
}

run_case success success success
success_root="${TEST_ROOT}/success/backup"
if node -e "const m=require(process.argv[1]);if(m.status!=='REMOTE_VERIFIED'||m.remoteVerification!=='PASSED')process.exit(1)" "${success_root}/test-20261002T180000Z-abcdef123456.remote.manifest.json"; then pass remote-manifest; else fail remote-manifest invalid; fi
if node -e "const s=require(process.argv[1]);if(s.consecutiveFailures!==0||!s.lastRemoteObject)process.exit(1)" "${success_root}/state.json"; then pass success-state; else fail success-state invalid; fi

for scenario in network timeout http400 http401 http403 missing-after-upload http429 http500 http503 partial-upload size-mismatch checksum-mismatch manifest-upload-failure verification-failure; do
  run_case "$scenario" "$scenario" failure
done

http400_calls="$(wc -l <"${TEST_ROOT}/http400/calls")"
http500_calls="$(wc -l <"${TEST_ROOT}/http500/calls")"
if [[ "$http400_calls" -eq 1 ]]; then pass nonretryable-once; else fail nonretryable-once "$http400_calls calls"; fi
if [[ "$http500_calls" -eq 3 ]]; then pass retryable-three; else fail retryable-three "$http500_calls calls"; fi

printf 'RESULT passed=%s failed=%s\n' "$passed" "$failed"
(( failed == 0 ))
