#!/usr/bin/env bash
set -Eeuo pipefail

DRY_RUN=false
ENABLE=false
PACKAGE_DIR=""
for argument in "$@"; do
  case "$argument" in
    --dry-run) DRY_RUN=true ;;
    --enable) ENABLE=true ;;
    --package-dir=*) PACKAGE_DIR="${argument#*=}" ;;
    *) echo "Unknown argument: $argument" >&2; exit 64 ;;
  esac
done

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }
run() {
  if "$DRY_RUN"; then printf 'DRY-RUN '; printf '%q ' "$@"; printf '\n';
  else "$@"; fi
}
fail() { log "BLOCKED $1" >&2; exit 1; }

[[ -r /etc/os-release ]] || fail OS_RELEASE_UNAVAILABLE
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == ubuntu ]] || fail OS_UNSUPPORTED
[[ "${VERSION_ID:-}" == 24.04 ]] || fail OS_VERSION_UNSUPPORTED
[[ "$(uname -m)" == x86_64 ]] || fail ARCHITECTURE_UNSUPPORTED
[[ "${EUID}" -eq 0 ]] || fail ROOT_INSTALLER_REQUIRED
[[ -n "$PACKAGE_DIR" && -d "$PACKAGE_DIR" ]] || fail PACKAGE_DIR_REQUIRED
[[ -f "$PACKAGE_DIR/package.json" ]] || fail PACKAGE_MANIFEST_MISSING
[[ -f "$PACKAGE_DIR/dist/src/display-device/connected-player-main.js" ]] || fail PLAYER_BINARY_MISSING
command -v node >/dev/null || fail NODE_MISSING
command -v chromium >/dev/null || command -v chromium-browser >/dev/null || fail CHROMIUM_MISSING
command -v systemctl >/dev/null || fail SYSTEMD_MISSING
[[ "$(df -B1 --output=avail / | tail -n1 | tr -d ' ')" -ge 17179869184 ]] || fail DISK_INSUFFICIENT
[[ "$(awk '/MemTotal/ {print $2}' /proc/meminfo)" -ge 4194304 ]] || fail MEMORY_INSUFFICIENT

[[ -x /usr/local/libexec/coro-display-signer ]] || fail EXTERNAL_SIGNER_MISSING
[[ -r /etc/coro-display/player.env ]] || fail PLAYER_ENV_MISSING
[[ "$(stat -c %a /etc/coro-display/player.env)" =~ ^(400|440|600|640)$ ]] || fail PLAYER_ENV_PERMISSIONS_UNSAFE

run install -d -o root -g root -m 0755 /opt/coro-display
run cp -a "$PACKAGE_DIR/." /opt/coro-display/
run chown -R root:root /opt/coro-display
run find /opt/coro-display -type d -exec chmod 0755 '{}' +
run find /opt/coro-display -type f -exec chmod 0644 '{}' +
run install -d -o coro-display -g coro-display -m 0700 /var/lib/coro-display /var/log/coro-display
run install -o root -g root -m 0644 "$(dirname "$0")/systemd/coro-display-player.service" /etc/systemd/system/coro-display-player.service
run install -d -o root -g root -m 0755 /etc/chromium/policies/managed
run install -o root -g root -m 0644 "$(dirname "$0")/chromium/coro-display-policy.json" /etc/chromium/policies/managed/coro-display.json
run systemctl daemon-reload
run systemd-analyze verify /etc/systemd/system/coro-display-player.service
if "$ENABLE"; then
  run systemctl enable --now coro-display-player.service
else
  log 'Installed but not enabled; use --enable only after enrollment acceptance.'
fi
log 'INSTALLATION_COMPLETE'
