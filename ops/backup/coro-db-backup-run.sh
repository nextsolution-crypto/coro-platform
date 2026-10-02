#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
STATE_PATH="${CORO_BACKUP_STATE_PATH:-${CORO_BACKUP_DIR:-/opt/coro-ops/backups/database}/backup-state.json}"
output_file="$(mktemp)"
trap 'rm -f -- "$output_file"' EXIT

record_local_failure() {
  node "${SCRIPT_DIR}/lib/backup-health.js" record-failure "$STATE_PATH" LOCAL_BACKUP_FAILED >/dev/null 2>&1 || true
}

if ! "${SCRIPT_DIR}/coro-db-backup.sh" >"$output_file" 2>&1; then
  record_local_failure
  printf 'ERROR_CODE=LOCAL_BACKUP_FAILED\n' >&2
  exit 1
fi

backup_id="$(sed -n 's/^backupId=//p' "$output_file")"
manifest_path="$(sed -n 's/^manifestPath=//p' "$output_file")"
status="$(sed -n 's/^status=//p' "$output_file")"
[[ "$status" == LOCAL_VERIFIED && "$backup_id" =~ ^[A-Za-z_][A-Za-z0-9_-]*-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}$ ]] || { record_local_failure; printf 'ERROR_CODE=LOCAL_RESULT_INVALID\n' >&2; exit 1; }
[[ "$manifest_path" == "${CORO_BACKUP_DIR%/}/${backup_id}.manifest.json" && -f "$manifest_path" && ! -L "$manifest_path" ]] || { record_local_failure; printf 'ERROR_CODE=LOCAL_RESULT_INVALID\n' >&2; exit 1; }

remote_output="$("${SCRIPT_DIR}/coro-db-upload.sh" "$manifest_path")" || exit $?
remote_status="$(sed -n 's/^status=//p' <<<"$remote_output")"
remote_id="$(sed -n 's/^backupId=//p' <<<"$remote_output")"
[[ "$remote_status" == REMOTE_VERIFIED && "$remote_id" == "$backup_id" ]] || { printf 'ERROR_CODE=REMOTE_RESULT_INVALID\n' >&2; exit 1; }

printf 'backupId=%s\nstatus=REMOTE_VERIFIED\n' "$backup_id"
