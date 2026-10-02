#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT
passed=0; failed=0
pass(){ printf 'PASS %s\n' "$1"; passed=$((passed+1)); }
fail(){ printf 'FAIL %s: %s\n' "$1" "$2"; failed=$((failed+1)); }

make_wrapper_fixture(){
  local root="$1" local_mode="$2" remote_mode="$3"
  mkdir -p "$root/lib" "$root/data"
  cp "$ROOT/ops/backup/coro-db-backup-run.sh" "$root/"
  cp "$ROOT/ops/backup/lib/backup-health.js" "$root/lib/"
  cat >"$root/coro-db-backup.sh" <<MOCK
#!/usr/bin/env bash
set -e
[[ "$local_mode" == success ]] || exit 4
id='test-20261002T000000Z-abcdef123456'
printf '{}' >"$root/data/\${id}.manifest.json"
printf 'backupId=%s\nstatus=LOCAL_VERIFIED\nmanifestPath=%s\n' "\$id" "$root/data/\${id}.manifest.json"
MOCK
  cat >"$root/coro-db-upload.sh" <<MOCK
#!/usr/bin/env bash
[[ "$remote_mode" == success ]] || exit 5
printf 'backupId=test-20261002T000000Z-abcdef123456\nstatus=REMOTE_VERIFIED\n'
MOCK
  chmod 700 "$root"/*.sh
}

for spec in success:success:success local-failure:failure:success remote-failure:success:failure; do
  IFS=: read -r name local_mode remote_mode <<<"$spec"; root="$TEST_ROOT/$name"; make_wrapper_fixture "$root" "$local_mode" "$remote_mode"
  status=0
  CORO_BACKUP_DIR="$root/data" CORO_BACKUP_STATE_PATH="$root/data/backup-state.json" "$root/coro-db-backup-run.sh" >"$root/out" 2>"$root/err" || status=$?
  if [[ "$name" == success && "$status" -eq 0 ]] || [[ "$name" != success && "$status" -ne 0 ]]; then pass "wrapper-$name"; else fail "wrapper-$name" "exit=$status"; fi
done
if grep -q 'status=REMOTE_VERIFIED' "$TEST_ROOT/success/out"; then pass wrapper-remote-authority; else fail wrapper-remote-authority missing; fi
if [[ -f "$TEST_ROOT/local-failure/data/backup-state.json" ]]; then pass local-failure-state; else fail local-failure-state missing; fi
if ! grep -q 'REMOTE_VERIFIED' "$TEST_ROOT/remote-failure/out"; then pass no-local-only-success; else fail no-local-only-success false; fi

make_health_fixture(){
  local root="$1" age_hours="$2" failures="$3" restore_days="$4"
  mkdir -p "$root/backups" "$root/restores"
  node - "$root" "$age_hours" "$failures" "$restore_days" <<'NODE'
const fs=require('fs'),path=require('path'); const root=process.argv[2], age=+process.argv[3], failures=+process.argv[4], days=+process.argv[5];
const now=Date.parse('2026-10-02T12:00:00Z'), id='test-20261002T000000Z-abcdef123456', success=new Date(now-age*3600000).toISOString();
const state={stateVersion:1,lastAttemptAt:success,lastSuccessAt:success,lastBackupId:id,lastRemoteObject:'safe/object',lastSizeBytes:1,lastSha256:'a'.repeat(64),consecutiveFailures:failures,lastErrorCode:failures?'TEST_FAILURE':null};
fs.writeFileSync(path.join(root,'backups','backup-state.json'),JSON.stringify(state)); fs.writeFileSync(path.join(root,'backups',`${id}.remote.manifest.json`),JSON.stringify({backupId:id,status:'REMOTE_VERIFIED',sha256:'a'.repeat(64)}));
fs.writeFileSync(path.join(root,'restores','safe.restore-report.json'),JSON.stringify({status:'RESTORE_VERIFIED',completedAt:new Date(now-days*86400000).toISOString()}));
NODE
}
for spec in healthy:1:0:1:0 warning:7.5:0:1:1 critical-age:9:0:1:2 critical-failures:1:2:1:2 restore-warning:1:0:40:1 restore-critical:1:0:50:2; do
  IFS=: read -r name age failures days expected <<<"$spec"; root="$TEST_ROOT/health-$name"; make_health_fixture "$root" "$age" "$failures" "$days"; status=0
  CORO_BACKUP_DIR="$root/backups" CORO_BACKUP_STATE_PATH="$root/backups/backup-state.json" CORO_RESTORE_WORKSPACE="$root/restores" CORO_HEALTH_NOW=2026-10-02T12:00:00Z node "$ROOT/ops/backup/lib/backup-health.js" check >"$root/out" || status=$?
  if [[ "$status" -eq "$expected" ]]; then pass "health-$name"; else fail "health-$name" "exit=$status"; fi
done
root="$TEST_ROOT/health-malformed"; mkdir -p "$root/backups" "$root/restores"; printf '{' >"$root/backups/backup-state.json"; status=0
CORO_BACKUP_DIR="$root/backups" CORO_BACKUP_STATE_PATH="$root/backups/backup-state.json" CORO_RESTORE_WORKSPACE="$root/restores" node "$ROOT/ops/backup/lib/backup-health.js" check >/dev/null || status=$?
if [[ "$status" -eq 2 ]]; then pass health-malformed; else fail health-malformed "exit=$status"; fi
root="$TEST_ROOT/health-missing-evidence"; make_health_fixture "$root" 1 0 1; rm "$root/backups"/*.remote.manifest.json; status=0
CORO_BACKUP_DIR="$root/backups" CORO_BACKUP_STATE_PATH="$root/backups/backup-state.json" CORO_RESTORE_WORKSPACE="$root/restores" CORO_HEALTH_NOW=2026-10-02T12:00:00Z node "$ROOT/ops/backup/lib/backup-health.js" check >/dev/null || status=$?
if [[ "$status" -eq 2 ]]; then pass health-missing-evidence; else fail health-missing-evidence "exit=$status"; fi

if "$ROOT/ops/backup/install.sh" --dry-run >"$TEST_ROOT/install-out" && grep -q 'timersEnabled=false' "$TEST_ROOT/install-out"; then pass installer-dry-run; else fail installer-dry-run failed; fi
if grep -R 'Persistent=true' "$ROOT/ops/backup/systemd"/*.timer >/dev/null && grep -q '00/6:00:00' "$ROOT/ops/backup/systemd/coro-db-backup.timer"; then pass timer-contract; else fail timer-contract invalid; fi
if ! grep -R -E 'ACCESS_KEY=([^R]|R[^E])|SECRET_KEY=([^R]|R[^E])' "$ROOT/ops/backup/config" >/dev/null; then pass no-real-secrets; else fail no-real-secrets found; fi
printf 'RESULT passed=%s failed=%s\n' "$passed" "$failed"
((failed==0))
