#!/usr/bin/env bash
set -Eeuo pipefail
PURGE_DATA=false
[[ "${1:-}" == --purge-data ]] && PURGE_DATA=true
[[ "${EUID}" -eq 0 ]] || { echo ROOT_REQUIRED >&2; exit 1; }
systemctl disable --now coro-display-player.service 2>/dev/null || true
rm -f /etc/systemd/system/coro-display-player.service
rm -f /etc/chromium/policies/managed/coro-display.json
rm -rf /opt/coro-display
systemctl daemon-reload
if "$PURGE_DATA"; then
  printf 'Refusing automatic data purge. Revoke the device, preserve audit, then remove explicit paths manually.\n' >&2
  exit 2
fi
printf 'Player removed; identity, cache, audit and configuration preserved.\n'
