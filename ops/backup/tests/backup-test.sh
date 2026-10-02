#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
SUBJECT="${ROOT}/ops/backup/coro-db-backup.sh"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT

passed=0
failed=0

record_pass() { printf 'PASS %s\n' "$1"; passed=$((passed + 1)); }
record_fail() { printf 'FAIL %s: %s\n' "$1" "$2"; failed=$((failed + 1)); }

make_shims() {
  local bin_dir="$1"
  local real_node real_sha256sum
  real_node="$(command -v node)"
  real_sha256sum="$(command -v sha256sum)"
  mkdir -p "$bin_dir"
  cat >"${bin_dir}/docker" <<'SHIM'
#!/usr/bin/env bash
set -u
case "${1:-}" in
  inspect)
    [[ "${MOCK_CONTAINER_AVAILABLE:-true}" == "true" ]] || exit 1
    printf '%s\n' "${MOCK_CONTAINER_RUNNING:-true}"
    ;;
  exec)
    shift
    [[ "${1:-}" == "--interactive" ]] && shift
    shift
    case "${1:-}" in
      psql)
        if [[ "$*" == *'SHOW server_version;'* ]]; then
          printf '16.15\n'
        elif [[ "${MOCK_MIGRATION_AVAILABLE:-true}" == "true" ]]; then
          printf '20261002010000_test\n'
        else
          exit 1
        fi
        ;;
      pg_dump)
        [[ "$*" == *'--version'* ]] && { printf 'pg_dump (PostgreSQL) 16.15\n'; exit 0; }
        [[ "${MOCK_DUMP_FAIL:-false}" == "true" ]] && exit 2
        [[ "${MOCK_DUMP_EMPTY:-false}" == "true" ]] && exit 0
        printf 'MOCK_CUSTOM_ARCHIVE\n'
        ;;
      pg_restore)
        [[ "${MOCK_RESTORE_FAIL:-false}" == "true" ]] && exit 3
        cat >/dev/null
        [[ "${MOCK_RESTORE_EMPTY:-false}" == "true" ]] || printf '1; 2615 2200 SCHEMA - public postgres\n'
        ;;
    esac
    ;;
  *) exit 1 ;;
esac
SHIM
  chmod 700 "${bin_dir}/docker"
  cat >"${bin_dir}/sha256sum" <<SHIM
#!/usr/bin/env bash
[[ "\${MOCK_CHECKSUM_FAIL:-false}" == "true" ]] && exit 4
exec "${real_sha256sum}" "\$@"
SHIM
  cat >"${bin_dir}/node" <<SHIM
#!/usr/bin/env bash
if [[ "\${MOCK_MANIFEST_FAIL:-false}" == "true" && "\$#" -eq 0 ]]; then
  exit 5
fi
exec "${real_node}" "\$@"
SHIM
  chmod 700 "${bin_dir}/sha256sum" "${bin_dir}/node"
}

run_case() {
  local name="$1"
  local expectation="$2"
  shift 2
  local case_root="${TEST_ROOT}/${name}"
  local backup_dir="${case_root}/backups"
  local bin_dir="${case_root}/bin"
  mkdir -p "$backup_dir"
  chmod 700 "$backup_dir"
  make_shims "$bin_dir"
  local output status=0
  output="$(env PATH="${bin_dir}:${PATH}" \
    CORO_BACKUP_ENVIRONMENT=test \
    CORO_BACKUP_DIR="$backup_dir" \
    CORO_BACKUP_DATABASE=coro_test_disposable \
    CORO_BACKUP_POSTGRES_CONTAINER=coro_test_postgres_disposable \
    CORO_BACKUP_POSTGRES_USER=coro_test_user \
    CORO_BACKUP_LOCK_PATH="${case_root}/backup.lock" \
    CORO_BACKUP_MIN_FREE_BYTES=1 \
    CORO_BACKUP_MIN_FREE_PERCENT=0 \
    CORO_BACKUP_LAST_DUMP_MARGIN_BYTES=0 \
    CORO_BACKUP_ID_OVERRIDE="test-${name}" \
    "$@" "$SUBJECT" 2>&1)" || status=$?
  if [[ "$expectation" == "success" && "$status" -eq 0 ]]; then
    record_pass "$name"
  elif [[ "$expectation" == "failure" && "$status" -ne 0 ]]; then
    record_pass "$name"
  else
    record_fail "$name" "unexpected exit ${status}: ${output}"
  fi
  printf '%s' "$output" >"${case_root}/output"
}

run_case success success env
success_dir="${TEST_ROOT}/success/backups"
success_dump="${success_dir}/test-success.dump"
success_manifest="${success_dir}/test-success.manifest.json"
if [[ -s "$success_dump" && -s "$success_manifest" ]]; then record_pass artifacts; else record_fail artifacts missing; fi
if node -e "const m=require(process.argv[1]); if(m.status!=='LOCAL_VERIFIED'||m.remoteVerification!=='NOT_ATTEMPTED'||m.format!=='postgres-custom'||m.migrationHead!=='20261002010000_test')process.exit(1)" "$success_manifest"; then record_pass manifest; else record_fail manifest invalid; fi
if [[ "$(stat -c '%a' "$success_dump")" == "600" && "$(stat -c '%a' "$success_manifest")" == "600" ]]; then record_pass permissions; else record_fail permissions incorrect; fi
if [[ ! -e "${success_dir}/test-success.dump.partial" && ! -e "${success_dir}/test-success.manifest.json.partial" ]]; then record_pass atomic-finalization; else record_fail atomic-finalization partial-remains; fi

run_case migration-unknown success env MOCK_MIGRATION_AVAILABLE=false
if node -e "if(require(process.argv[1]).migrationHead!=='UNKNOWN')process.exit(1)" "${TEST_ROOT}/migration-unknown/backups/test-migration-unknown.manifest.json"; then record_pass migration-unknown-manifest; else record_fail migration-unknown-manifest invalid; fi
run_case container-unavailable failure env MOCK_CONTAINER_AVAILABLE=false
run_case dump-failure failure env MOCK_DUMP_FAIL=true
run_case empty-dump failure env MOCK_DUMP_EMPTY=true
run_case corrupt-dump failure env MOCK_RESTORE_EMPTY=true
run_case restore-failure failure env MOCK_RESTORE_FAIL=true
run_case checksum-failure failure env MOCK_CHECKSUM_FAIL=true
run_case manifest-failure failure env MOCK_MANIFEST_FAIL=true
run_case low-disk failure env CORO_BACKUP_MIN_FREE_BYTES=999999999999999
run_case invalid-db failure env CORO_BACKUP_DATABASE='invalid db'

missing_command_root="${TEST_ROOT}/missing-command"
missing_command_bin="${missing_command_root}/bin"
missing_command_backup="${missing_command_root}/backups"
mkdir -p "$missing_command_bin" "$missing_command_backup"
chmod 700 "$missing_command_bin" "$missing_command_backup"
for available_command in bash flock df stat sha256sum mv wc grep node date awk find id chmod mkdir dirname rm; do
  ln -s "$(command -v "$available_command")" "${missing_command_bin}/${available_command}"
done
missing_command_status=0
env PATH="$missing_command_bin" \
  CORO_BACKUP_ENVIRONMENT=test \
  CORO_BACKUP_DIR="$missing_command_backup" \
  CORO_BACKUP_DATABASE=coro_test_disposable \
  CORO_BACKUP_POSTGRES_CONTAINER=coro_test_postgres_disposable \
  CORO_BACKUP_LOCK_PATH="${missing_command_root}/backup.lock" \
  "$SUBJECT" >"${missing_command_root}/output" 2>&1 || missing_command_status=$?
if [[ "$missing_command_status" -ne 0 ]] && grep -q 'ERROR_CODE=PRECHECK_FAILED' "${missing_command_root}/output"; then
  record_pass missing-command
else
  record_fail missing-command "required-command precheck did not fail"
fi

collision_root="${TEST_ROOT}/collision/backups"
mkdir -p "$collision_root"
chmod 700 "$collision_root"
printf 'existing\n' >"${collision_root}/test-collision.dump"
run_case collision failure env
if [[ "$(cat "${TEST_ROOT}/collision/backups/test-collision.dump")" == "existing" ]]; then record_pass collision-preserves-existing; else record_fail collision-preserves-existing changed; fi

lock_root="${TEST_ROOT}/lock-contention"
mkdir -p "$lock_root"
exec 8>"${lock_root}/backup.lock"
flock -n 8
run_case lock-contention failure env CORO_BACKUP_LOCK_PATH="${lock_root}/backup.lock"
flock -u 8

run_case unique-one success env
run_case unique-two success env
if [[ -e "${TEST_ROOT}/unique-one/backups/test-unique-one.dump" && -e "${TEST_ROOT}/unique-two/backups/test-unique-two.dump" ]]; then record_pass repeated-unique; else record_fail repeated-unique missing; fi

if grep -Eiq 'password|secret|database_url' "${TEST_ROOT}/success/output"; then
  record_fail no-secret-output leaked
else
  record_pass no-secret-output
fi

for failed_case in container-unavailable dump-failure empty-dump corrupt-dump restore-failure low-disk invalid-db collision lock-contention; do
  if find "${TEST_ROOT}/${failed_case}/backups" -maxdepth 1 -name '*.manifest.json' -o -name '*.dump' | grep -q .; then
    [[ "$failed_case" == "collision" ]] || record_fail "${failed_case}-no-final" finalized
  else
    record_pass "${failed_case}-no-final"
  fi
done

printf 'RESULT passed=%s failed=%s\n' "$passed" "$failed"
(( failed == 0 ))
