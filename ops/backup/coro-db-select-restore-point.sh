#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
[[ "$#" -eq 1 ]] || { printf 'ERROR_CODE=RESTORE_SELECTION_INVALID\n' >&2; exit 1; }
exec node "${SCRIPT_DIR}/lib/select-restore-point.js" "$1"
