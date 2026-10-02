#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/backup/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
trap 'backup_die RESTORE_UNEXPECTED_FAILURE "Restore drill failed unexpectedly"' ERR

[[ "$#" -eq 1 ]] || backup_die RESTORE_PRECHECK_FAILED "Exactly one verified manifest path is required"
for command_name in node docker; do backup_require_command "$command_name"; done

readonly SOURCE_MODE="${CORO_RESTORE_SOURCE:-local}"
[[ "$SOURCE_MODE" == local || "$SOURCE_MODE" == remote ]] || backup_die RESTORE_PRECHECK_FAILED "Restore source must be local or remote"

if [[ "$SOURCE_MODE" == remote ]]; then
  [[ -n "${CORO_BACKUP_SPACES_ACCESS_KEY:-}" && -n "${CORO_BACKUP_SPACES_SECRET_KEY:-}" ]] || backup_die REMOTE_DOWNLOAD_PRECHECK_FAILED "Remote credentials are missing"
  backup_require_command aws
  export AWS_ACCESS_KEY_ID="$CORO_BACKUP_SPACES_ACCESS_KEY"
  export AWS_SECRET_ACCESS_KEY="$CORO_BACKUP_SPACES_SECRET_KEY"
  export AWS_DEFAULT_REGION="${CORO_BACKUP_SPACES_REGION:-tor1}"
  export AWS_EC2_METADATA_DISABLED=true AWS_PAGER='' AWS_RETRY_MODE=standard AWS_MAX_ATTEMPTS=1
fi

exec node "${SCRIPT_DIR}/lib/restore-test.js" "$1"
