#!/usr/bin/env bash

# Shared fail-safe helpers for CORO database backup operations.

backup_log() {
  printf '%s\n' "$*" >&2
}

backup_die() {
  local code="$1"
  shift
  backup_log "ERROR_CODE=${code}"
  backup_log "ERROR_MESSAGE=$*"
  exit 1
}

backup_require_command() {
  command -v "$1" >/dev/null 2>&1 || backup_die PRECHECK_FAILED "Required command is unavailable: $1"
}

backup_require_safe_identifier() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ ^[A-Za-z_][A-Za-z0-9_-]*$ ]] || \
    backup_die PRECHECK_FAILED "${label} is not a safe identifier"
}

backup_require_unsigned_integer() {
  local label="$1"
  local value="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || backup_die PRECHECK_FAILED "${label} must be an unsigned integer"
}

backup_max() {
  local maximum=0
  local candidate
  for candidate in "$@"; do
    (( candidate > maximum )) && maximum="$candidate"
  done
  printf '%s\n' "$maximum"
}
