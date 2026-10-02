#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
SUBJECT="${ROOT}/ops/backup/coro-db-retention.sh"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT
passed=0
failed=0

pass() { printf 'PASS %s\n' "$1"; passed=$((passed + 1)); }
fail() { printf 'FAIL %s: %s\n' "$1" "$2"; failed=$((failed + 1)); }

create_set() {
  local directory="$1"
  mkdir -p "$directory"
  chmod 700 "$directory"
  node - "$directory" <<'NODE'
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
function create(date, suffix, status = 'REMOTE_VERIFIED') {
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const id = `test-${stamp}-${suffix.toString(16).padStart(12, '0')}`;
  fs.writeFileSync(path.join(dir, `${id}.dump`), 'dump');
  fs.writeFileSync(path.join(dir, `${id}.manifest.json`), JSON.stringify({ backupId: id, status: 'LOCAL_VERIFIED', remoteVerification: 'NOT_ATTEMPTED' }));
  fs.writeFileSync(path.join(dir, `${id}.remote.manifest.json`), JSON.stringify({ backupId: id, status, remoteVerification: status === 'REMOTE_VERIFIED' ? 'PASSED' : 'FAILED' }));
  return id;
}
const now = Date.now();
for (let i = 0; i < 30; i += 1) create(new Date(now - i * 4 * 3600000), i + 1);
create(new Date(now - 20 * 86400000), 100);
const localId = `test-20260101T000000Z-eeeeeeeeeeee`;
fs.writeFileSync(path.join(dir, `${localId}.dump`), 'local');
fs.writeFileSync(path.join(dir, `${localId}.manifest.json`), JSON.stringify({ backupId: localId, status: 'LOCAL_VERIFIED', remoteVerification: 'NOT_ATTEMPTED' }));
const failedId = create(new Date(now - 30 * 86400000), 101, 'REMOTE_FAILED');
fs.writeFileSync(path.join(dir, 'coro_db_pre_phone01d_20261002T165237Z.sql.gz'), 'protected');
fs.writeFileSync(path.join(dir, 'unrelated.txt'), 'protected');
fs.symlinkSync(path.join(dir, `${failedId}.remote.manifest.json`), path.join(dir, 'test-20200101T000000Z-aaaaaaaaaaaa.remote.manifest.json'));
NODE
}

dry_dir="${TEST_ROOT}/dry"
create_set "$dry_dir"
before="$(find "$dry_dir" -maxdepth 1 -type f | wc -l)"
CORO_BACKUP_DIR="$dry_dir" CORO_BACKUP_RETENTION_DRY_RUN=true CORO_BACKUP_RETENTION_KEEP_DAYS=7 CORO_BACKUP_RETENTION_KEEP_COUNT=28 CORO_BACKUP_RETENTION_KEEP_NEWEST=2 "$SUBJECT" >"${TEST_ROOT}/dry-output"
after="$(find "$dry_dir" -maxdepth 1 -type f | wc -l)"
if [[ "$before" -eq "$after" ]]; then pass dry-run-no-delete; else fail dry-run-no-delete changed; fi
if grep -q 'WOULD_DELETE' "${TEST_ROOT}/dry-output"; then pass dry-run-candidates; else fail dry-run-candidates "$(tr '\n' ' ' <"${TEST_ROOT}/dry-output") sample=$(find "$dry_dir" -maxdepth 1 -name '*.remote.manifest.json' -type f | head -n 1)"; fi

apply_dir="${TEST_ROOT}/apply"
create_set "$apply_dir"
newest_two="$(find "$apply_dir" -maxdepth 1 -name '*.remote.manifest.json' -type f | sort -r | head -n 2)"
CORO_BACKUP_DIR="$apply_dir" CORO_BACKUP_RETENTION_DRY_RUN=false CORO_BACKUP_RETENTION_KEEP_DAYS=7 CORO_BACKUP_RETENTION_KEEP_COUNT=28 CORO_BACKUP_RETENTION_KEEP_NEWEST=2 "$SUBJECT" >"${TEST_ROOT}/apply-output"
if grep -q 'DELETE' "${TEST_ROOT}/apply-output"; then pass apply-deletes; else fail apply-deletes "$(tr '\n' ' ' <"${TEST_ROOT}/apply-output")"; fi
while IFS= read -r newest; do [[ -e "$newest" ]] || { fail newest-two-preserved missing; newest_two=''; break; }; done <<<"$newest_two"
[[ -n "$newest_two" ]] && pass newest-two-preserved
if [[ -e "${apply_dir}/test-20260101T000000Z-eeeeeeeeeeee.dump" ]]; then pass local-verified-preserved; else fail local-verified-preserved missing; fi
if [[ -e "${apply_dir}/coro_db_pre_phone01d_20261002T165237Z.sql.gz" ]]; then pass manual-checkpoint-preserved; else fail manual-checkpoint-preserved missing; fi
if [[ -e "${apply_dir}/unrelated.txt" ]]; then pass unrelated-preserved; else fail unrelated-preserved missing; fi
if find "$apply_dir" -maxdepth 1 -name '*000000000065.remote.manifest.json' -type f | grep -q .; then pass failed-preserved; else fail failed-preserved missing; fi

count_after_first="$(find "$apply_dir" -maxdepth 1 -type f | wc -l)"
CORO_BACKUP_DIR="$apply_dir" CORO_BACKUP_RETENTION_DRY_RUN=false CORO_BACKUP_RETENTION_KEEP_DAYS=7 CORO_BACKUP_RETENTION_KEEP_COUNT=28 CORO_BACKUP_RETENTION_KEEP_NEWEST=2 "$SUBJECT" >"${TEST_ROOT}/repeat-output"
count_after_second="$(find "$apply_dir" -maxdepth 1 -type f | wc -l)"
if [[ "$count_after_first" -eq "$count_after_second" ]]; then pass idempotent; else fail idempotent changed; fi

empty_dir="${TEST_ROOT}/empty"
mkdir -p "$empty_dir"; chmod 700 "$empty_dir"
if CORO_BACKUP_DIR="$empty_dir" CORO_BACKUP_RETENTION_DRY_RUN=false "$SUBJECT" | grep -q 'candidates=0'; then pass empty-directory; else fail empty-directory invalid; fi

symlink_dir="${TEST_ROOT}/directory-link"
ln -s "$empty_dir" "$symlink_dir"
status=0
CORO_BACKUP_DIR="$symlink_dir" CORO_BACKUP_RETENTION_DRY_RUN=false "$SUBJECT" >/dev/null 2>&1 || status=$?
if [[ "$status" -ne 0 ]]; then pass symlink-directory-refused; else fail symlink-directory-refused accepted; fi

printf 'RESULT passed=%s failed=%s\n' "$passed" "$failed"
(( failed == 0 ))
