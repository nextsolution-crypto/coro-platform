#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/backup/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
trap 'backup_die UNEXPECTED_FAILURE "Remote backup command failed unexpectedly"' ERR

[[ "${CORO_BACKUP_REMOTE_ENABLED:-false}" == "true" ]] || backup_die REMOTE_PRECHECK_FAILED "Remote backup is not explicitly enabled"
[[ "$#" -eq 1 ]] || backup_die REMOTE_PRECHECK_FAILED "Exactly one LOCAL_VERIFIED manifest path is required"

for command_name in node aws; do
  backup_require_command "$command_name"
done

for variable_name in CORO_BACKUP_SPACES_ENDPOINT CORO_BACKUP_SPACES_REGION CORO_BACKUP_SPACES_BUCKET CORO_BACKUP_SPACES_PREFIX CORO_BACKUP_SPACES_ACCESS_KEY CORO_BACKUP_SPACES_SECRET_KEY; do
  [[ -n "${!variable_name:-}" ]] || backup_die REMOTE_PRECHECK_FAILED "Required remote configuration is missing: ${variable_name}"
done

export AWS_ACCESS_KEY_ID="$CORO_BACKUP_SPACES_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$CORO_BACKUP_SPACES_SECRET_KEY"
export AWS_DEFAULT_REGION="$CORO_BACKUP_SPACES_REGION"
export AWS_EC2_METADATA_DISABLED=true
export AWS_PAGER=''
export AWS_RETRY_MODE=standard
export AWS_MAX_ATTEMPTS=1

exec node "${SCRIPT_DIR}/lib/remote-upload.js" "$1"
