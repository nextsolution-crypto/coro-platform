#!/usr/bin/env bash

set -Eeuo pipefail
umask 077
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
exec node "${SCRIPT_DIR}/lib/backup-health.js" check
