#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
dry_run=false
enable=false
for arg in "$@"; do case "$arg" in --dry-run) dry_run=true;; --enable) enable=true;; *) printf 'Unknown option: %s\n' "$arg" >&2; exit 2;; esac; done
if [[ "$dry_run" != true && "$(id -u)" -ne 0 ]]; then printf 'Root is required\n' >&2; exit 1; fi
run() { if [[ "$dry_run" == true ]]; then printf 'DRY_RUN'; printf ' %q' "$@"; printf '\n'; else "$@"; fi; }
run install -d -o root -g root -m 0700 /opt/coro-ops/backup /opt/coro-ops/backups/database /opt/coro-ops/restore-drills /etc/coro-backup
while IFS= read -r -d '' file; do relative="${file#"${SCRIPT_DIR}"/}"; run install -D -o root -g root -m 0700 "$file" "/opt/coro-ops/backup/$relative"; done < <(find "$SCRIPT_DIR" -type f \( -name '*.sh' -o -name '*.js' \) -print0)
while IFS= read -r -d '' unit; do run install -o root -g root -m 0644 "$unit" "/etc/systemd/system/$(basename "$unit")"; done < <(find "$SCRIPT_DIR/systemd" -type f \( -name '*.service' -o -name '*.timer' \) -print0)
run systemctl daemon-reload
if [[ "$enable" == true ]]; then
  [[ -f /etc/coro-backup/backup.env && -f /etc/coro-backup/spaces.env ]] || { printf 'Configuration files are required before enable\n' >&2; exit 1; }
  run systemctl enable --now coro-db-backup.timer coro-db-backup-health.timer
fi
printf 'INSTALL_COMPLETE timersEnabled=%s credentialsOverwritten=false\n' "$enable"
