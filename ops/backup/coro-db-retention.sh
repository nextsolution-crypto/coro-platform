#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/backup/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
trap 'backup_die RETENTION_FAILED "Local retention failed unexpectedly"' ERR

readonly BACKUP_DIR="${CORO_BACKUP_DIR:-/opt/coro-ops/backups/database}"
readonly DRY_RUN="${CORO_BACKUP_RETENTION_DRY_RUN:-true}"
readonly KEEP_DAYS="${CORO_BACKUP_RETENTION_KEEP_DAYS:-7}"
readonly KEEP_COUNT="${CORO_BACKUP_RETENTION_KEEP_COUNT:-28}"
readonly KEEP_NEWEST="${CORO_BACKUP_RETENTION_KEEP_NEWEST:-2}"

backup_require_command node
[[ "$DRY_RUN" == "true" || "$DRY_RUN" == "false" ]] || backup_die RETENTION_PRECHECK_FAILED "Dry-run must be true or false"
backup_require_unsigned_integer CORO_BACKUP_RETENTION_KEEP_DAYS "$KEEP_DAYS"
backup_require_unsigned_integer CORO_BACKUP_RETENTION_KEEP_COUNT "$KEEP_COUNT"
backup_require_unsigned_integer CORO_BACKUP_RETENTION_KEEP_NEWEST "$KEEP_NEWEST"
[[ -d "$BACKUP_DIR" && ! -L "$BACKUP_DIR" ]] || backup_die RETENTION_PRECHECK_FAILED "Backup directory is unavailable or unsafe"

exec node "${SCRIPT_DIR}/lib/retention.js" "$BACKUP_DIR" "$DRY_RUN" "$KEEP_DAYS" "$KEEP_COUNT" "$KEEP_NEWEST"
