#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
: "${CORO_RESTORE_MANIFEST:?Exact REMOTE_VERIFIED manifest is required}"
: "${CORO_RESTORE_REMOTE_VERSION_ID:?Exact remote VersionId is required}"
backup_dir="${CORO_BACKUP_DIR:-/opt/coro-ops/backups/database}"
[[ "$CORO_RESTORE_MANIFEST" == "${backup_dir%/}/"*.remote.manifest.json && -f "$CORO_RESTORE_MANIFEST" && ! -L "$CORO_RESTORE_MANIFEST" ]] || { printf 'ERROR_CODE=RESTORE_SELECTION_INVALID\n' >&2; exit 1; }
export CORO_RESTORE_SOURCE=remote CORO_RESTORE_CLEANUP=true CORO_RESTORE_PRESERVE_ON_FAILURE=false
exec "${SCRIPT_DIR}/coro-db-restore-test.sh" "$CORO_RESTORE_MANIFEST"
