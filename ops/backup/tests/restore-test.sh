#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
SUBJECT="${ROOT}/ops/backup/coro-db-restore-test.sh"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT
passed=0
failed=0

pass() { printf 'PASS %s\n' "$1"; passed=$((passed + 1)); }
fail() { printf 'FAIL %s: %s\n' "$1" "$2"; failed=$((failed + 1)); }

make_fixture() {
  local root="$1"
  mkdir -p "$root/source" "$root/workspace" "$root/bin" "$root/mock"
  chmod 700 "$root/source" "$root/workspace" "$root/bin" "$root/mock"
  printf 'synthetic custom archive fixture\n' >"$root/source/test-20261002T220000Z-abcdef123456.dump"
  node - "$root" <<'NODE'
const crypto=require('crypto'),fs=require('fs'),path=require('path');
const root=process.argv[2], id='test-20261002T220000Z-abcdef123456';
const data=fs.readFileSync(path.join(root,'source',`${id}.dump`));
const local={manifestVersion:1,backupId:id,createdAt:'2026-10-02T22:00:00Z',environment:'test',databaseLogicalName:'synthetic',postgresServerVersion:'16.15',pgDumpVersion:'pg_dump (PostgreSQL) 16.15',format:'postgres-custom',sizeBytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),migrationHead:'20261002010000_restore_fixture',structuralValidation:'PASSED',remoteVerification:'NOT_ATTEMPTED',status:'LOCAL_VERIFIED'};
fs.writeFileSync(path.join(root,'source',`${id}.manifest.json`),JSON.stringify(local));
const remote={...local,remoteVerification:'PASSED',status:'REMOTE_VERIFIED',remoteBucket:'mock-backup-bucket',remoteObjectKey:`database-backups/test/2026/10/02/${id}.dump`};
fs.writeFileSync(path.join(root,'source',`${id}.remote.manifest.json`),JSON.stringify(remote));
NODE
  make_docker_mock "$root/bin/docker"
  make_aws_mock "$root/bin/aws"
}

make_large_stream_fixture() {
  local root="$1"
  dd if=/dev/zero of="$root/source/test-20261002T220000Z-abcdef123456.dump" bs=1048576 count=16 status=none
  node - "$root" <<'NODE'
const crypto=require('crypto'),fs=require('fs'),path=require('path');
const root=process.argv[2], id='test-20261002T220000Z-abcdef123456';
const dump=path.join(root,'source',`${id}.dump`), data=fs.readFileSync(dump);
for (const suffix of ['manifest.json','remote.manifest.json']) {
  const file=path.join(root,'source',`${id}.${suffix}`), manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  manifest.sizeBytes=data.length;
  manifest.sha256=crypto.createHash('sha256').update(data).digest('hex');
  fs.writeFileSync(file,JSON.stringify(manifest));
}
NODE
}

make_docker_mock() {
  local target="$1"
  cat >"$target" <<'MOCK'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' "$*" >>"$MOCK_DOCKER_LOG"
operation="${1:-}"
shift || true
case "$operation" in
  inspect)
    if [[ "$*" == *'--format'* ]]; then
      [[ "${MOCK_SCENARIO:-success}" == cleanup-guard ]] && { printf 'false|wrong\n'; exit 0; }
      printf 'true|%s\n' "$(cat "$MOCK_STATE/restore-id")"
    elif [[ "${MOCK_SCENARIO:-success}" == existing-container ]]; then
      exit 0
    elif [[ -f "$MOCK_STATE/created" ]]; then
      exit 0
    else
      exit 1
    fi
    ;;
  run)
    [[ "${MOCK_SCENARIO:-success}" == startup-run-failure ]] && exit 2
    restore_id=''
    args=("$@")
    for ((i=0;i<${#args[@]};i++)); do
      [[ "${args[$i]}" == io.getcoro.restore-id=* ]] && restore_id="${args[$i]#*=}"
    done
    printf '%s' "$restore_id" >"$MOCK_STATE/restore-id"
    : >"$MOCK_STATE/created"
    printf 'mock-container-id\n'
    ;;
  exec)
    [[ "${1:-}" == '--interactive' ]] && shift
    shift
    command_name="${1:-}"; shift
    case "$command_name" in
      pg_isready)
        [[ "${MOCK_SCENARIO:-success}" == startup-failure ]] && exit 1
        printf 'accepting connections\n'
        ;;
      pg_restore)
        if [[ "${MOCK_SCENARIO:-success}" == epipe-list && "$*" == *'--list'* ]]; then
          : >"$MOCK_STATE/early-exit"
          exit 23
        fi
        if [[ "${MOCK_SCENARIO:-success}" == epipe-restore && "$*" != *'--list'* ]]; then
          : >"$MOCK_STATE/early-exit"
          exit 24
        fi
        cat >/dev/null
        if [[ "$*" == *'--list'* ]]; then
          [[ "${MOCK_SCENARIO:-success}" == invalid-dump ]] && exit 2
          printf '1; 2615 2200 SCHEMA - public postgres\n'
        elif [[ "${MOCK_SCENARIO:-success}" == restore-failure ]]; then exit 2
        fi
        ;;
      psql)
        sql=''; db=''
        args=("$@")
        for ((i=0;i<${#args[@]};i++)); do
          [[ "${args[$i]}" == '--command' ]] && sql="${args[$((i+1))]}"
          [[ "${args[$i]}" == '--dbname' ]] && db="${args[$((i+1))]}"
        done
        case "$sql" in
          'SHOW server_version;') printf '16.15\n' ;;
          *'FROM pg_database'*) printf '%s\n' "$db" ;;
          *information_schema.schemata*) printf 'public\n' ;;
          *to_regclass*)
            if [[ "${MOCK_SCENARIO:-success}" == missing-critical && "$sql" == *PopulationSubscriber* ]]; then
              printf 'f\n'
            elif [[ "${MOCK_SCENARIO:-success}" == missing-migrations && "$sql" == *_prisma_migrations* ]]; then
              printf 'f\n'
            else
              printf 't\n'
            fi
            ;;
          *'SELECT migration_name'*)
            if [[ "${MOCK_SCENARIO:-success}" == migration-mismatch ]]; then printf 'wrong_migration\n'; else printf '20261002010000_restore_fixture\n'; fi
            ;;
          *'SELECT count('* )
            [[ "${MOCK_SCENARIO:-success}" == smoke-failure ]] && { printf 'not-a-number\n'; exit 0; }
            if [[ "$sql" == *' LEFT JOIN '* || "$sql" == *phoneCanonical* ]]; then printf '0\n'; else printf '1\n'; fi
            ;;
          *) printf 'unexpected SQL\n' >&2; exit 2 ;;
        esac
        ;;
    esac
    ;;
  rm)
    : >"$MOCK_STATE/removed"
    rm -f "$MOCK_STATE/created"
    ;;
  *) exit 2 ;;
esac
MOCK
  chmod 700 "$target"
}

make_aws_mock() {
  local target="$1"
  cat >"$target" <<'MOCK'
#!/usr/bin/env bash
set -Eeuo pipefail
scenario="${MOCK_REMOTE_SCENARIO:-success}"
case "$scenario" in network) printf 'connection reset\n' >&2; exit 2;; timeout) printf 'timed out\n' >&2; exit 2;; denied) printf '403 AccessDenied\n' >&2; exit 2;; missing) printf '404 Not Found\n' >&2; exit 2;; esac
args=("$@")
destination="${args[$((${#args[@]}-3))]}"
cp "$MOCK_REMOTE_SOURCE" "$destination"
[[ "$scenario" == partial ]] && truncate -s 1 "$destination"
sha="$(sha256sum "$MOCK_REMOTE_SOURCE" | awk '{print $1}')"
size="$(stat -c '%s' "$MOCK_REMOTE_SOURCE")"
[[ "$scenario" == wrong-size ]] && size=$((size+1))
[[ "$scenario" == wrong-checksum ]] && sha='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
version='mock-version-1'
[[ "$scenario" == wrong-version ]] && version='wrong-version'
printf '{"ContentLength":%s,"Metadata":{"sha256":"%s","backup-id":"test-20261002T220000Z-abcdef123456"},"VersionId":"%s"}\n' "$size" "$sha" "$version"
MOCK
  chmod 700 "$target"
}

run_case() {
  local name="$1" scenario="$2" expectation="$3" source_mode="${4:-local}" remote_scenario="${5:-success}"
  local root="${TEST_ROOT}/${name}"
  make_fixture "$root"
  if [[ "$scenario" == epipe-list || "$scenario" == epipe-restore ]]; then make_large_stream_fixture "$root"; fi
  local manifest="${root}/source/test-20261002T220000Z-abcdef123456.manifest.json"
  [[ "$source_mode" == remote ]] && manifest="${root}/source/test-20261002T220000Z-abcdef123456.remote.manifest.json"
  local status=0
  env PATH="${root}/bin:${PATH}" MOCK_STATE="${root}/mock" MOCK_DOCKER_LOG="${root}/docker.log" MOCK_SCENARIO="$scenario" MOCK_REMOTE_SCENARIO="$remote_scenario" MOCK_REMOTE_SOURCE="${root}/source/test-20261002T220000Z-abcdef123456.dump" \
    CORO_RESTORE_SOURCE="$source_mode" CORO_RESTORE_WORKSPACE="${root}/workspace" CORO_RESTORE_CLEANUP=true CORO_RESTORE_STARTUP_ATTEMPTS=2 CORO_RESTORE_STARTUP_DELAY_MS=0 \
    CORO_BACKUP_SPACES_ENDPOINT=https://mock.invalid CORO_BACKUP_SPACES_REGION=tor1 CORO_BACKUP_SPACES_ACCESS_KEY=RESTORE_ACCESS_SECRET CORO_BACKUP_SPACES_SECRET_KEY=RESTORE_SECRET_MARKER \
    CORO_RESTORE_REMOTE_VERSION_ID=mock-version-1 "$SUBJECT" "$manifest" >"${root}/stdout" 2>"${root}/stderr" || status=$?
  if [[ "$expectation" == success && "$status" -eq 0 ]]; then pass "$name"; elif [[ "$expectation" == failure && "$status" -ne 0 ]]; then pass "$name"; else fail "$name" "exit=${status}"; fi
  if grep -Eq 'RESTORE_ACCESS_SECRET|RESTORE_SECRET_MARKER' "${root}/stdout" "${root}/stderr" "${root}"/workspace/*.json 2>/dev/null; then fail "${name}-no-secret" leaked; else pass "${name}-no-secret"; fi
  if [[ "$expectation" == failure ]] && grep -q '"status": "RESTORE_VERIFIED"' "${root}"/workspace/*.json 2>/dev/null; then fail "${name}-no-false-success" false-success; else pass "${name}-no-false-success"; fi
}

run_case success success success
report="$(find "${TEST_ROOT}/success/workspace" -name '*.restore-report.json' -type f | head -n 1)"
if node -e "const r=require(process.argv[1]);if(r.status!=='RESTORE_VERIFIED'||r.aggregateCounts.Organization!==1||r.consistencyChecks.orphanUsers!==0||!r.restoreDatabase.startsWith('coro_restore_test_')||!r.restoreContainer.endsWith('_disposable'))process.exit(1)" "$report"; then pass report-contract; else fail report-contract invalid; fi
if [[ -f "${TEST_ROOT}/success/mock/removed" ]]; then pass cleanup-success; else fail cleanup-success missing; fi

run_case invalid-dump invalid-dump failure
run_case existing-container existing-container failure
run_case startup-run-failure startup-run-failure failure
run_case startup-failure startup-failure failure
run_case restore-failure restore-failure failure
run_case epipe-list epipe-list failure
run_case epipe-restore epipe-restore failure
for epipe_case in epipe-list epipe-restore; do
  epipe_root="${TEST_ROOT}/${epipe_case}"
  expected_code=RESTORE_ARCHIVE_INVALID
  [[ "$epipe_case" == epipe-restore ]] && expected_code=PG_RESTORE_FAILED
  if grep -q "\"errorCode\": \"${expected_code}\"" "$epipe_root"/workspace/*.restore-report.json; then pass "${epipe_case}-stage-code"; else fail "${epipe_case}-stage-code" wrong; fi
  if [[ -f "$epipe_root/mock/early-exit" && -f "$epipe_root/mock/removed" ]]; then pass "${epipe_case}-cleanup"; else fail "${epipe_case}-cleanup" missing; fi
  if grep -Eq "Unhandled 'error' event|Error: write EPIPE|Emitted 'error' event" "$epipe_root/stderr"; then fail "${epipe_case}-handled" crashed; else pass "${epipe_case}-handled"; fi
done
run_case missing-migrations missing-migrations failure
run_case missing-critical missing-critical failure
run_case migration-mismatch migration-mismatch failure
run_case smoke-failure smoke-failure failure
run_case cleanup-guard cleanup-guard failure

for remote_scenario in network timeout missing denied wrong-version wrong-size wrong-checksum partial; do
  run_case "remote-${remote_scenario}" success failure remote "$remote_scenario"
done
run_case remote-success success success remote success
if grep -q '"source": "REMOTE_FRESH_DOWNLOAD"' "${TEST_ROOT}/remote-success/workspace"/*.restore-report.json; then pass remote-provenance; else fail remote-provenance missing; fi
if ! find "${TEST_ROOT}/remote-success/workspace" -maxdepth 1 -name '*.download.dump' -type f | grep -q .; then pass remote-download-cleanup; else fail remote-download-cleanup retained; fi

missing_root="${TEST_ROOT}/missing-manifest"; mkdir -p "$missing_root/workspace"; chmod 700 "$missing_root/workspace"
status=0
CORO_RESTORE_WORKSPACE="$missing_root/workspace" "$SUBJECT" "$missing_root/missing.manifest.json" >/dev/null 2>&1 || status=$?
if [[ "$status" -ne 0 ]]; then pass missing-manifest; else fail missing-manifest accepted; fi

checksum_root="${TEST_ROOT}/wrong-local-checksum"; make_fixture "$checksum_root"; printf 'changed' >>"$checksum_root/source/test-20261002T220000Z-abcdef123456.dump"
status=0
PATH="${checksum_root}/bin:${PATH}" MOCK_STATE="${checksum_root}/mock" MOCK_DOCKER_LOG="${checksum_root}/docker.log" CORO_RESTORE_WORKSPACE="${checksum_root}/workspace" "$SUBJECT" "$checksum_root/source/test-20261002T220000Z-abcdef123456.manifest.json" >/dev/null 2>&1 || status=$?
if [[ "$status" -ne 0 ]]; then pass wrong-local-checksum; else fail wrong-local-checksum accepted; fi

if grep -En 'CORO_RESTORE_(DATABASE|CONTAINER)|force-production|coro_postgres' "$ROOT/ops/backup/coro-db-restore-test.sh" "$ROOT/ops/backup/lib/restore-test.js" | grep -v "restoreContainer !== 'coro_postgres'" >/dev/null; then fail no-target-override found; else pass no-target-override; fi

printf 'RESULT passed=%s failed=%s\n' "$passed" "$failed"
(( failed == 0 ))
