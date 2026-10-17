#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

apply=false
[[ "$#" -le 1 ]] || { echo 'usage: install.sh [--apply]' >&2; exit 64; }
if [[ "${1:-}" == '--apply' ]]; then apply=true; elif [[ "$#" -eq 1 ]]; then echo 'usage: install.sh [--apply]' >&2; exit 64; fi

cat <<'PLAN'
PRODUCTION PROVISIONING PLAN
1. Require a pre-existing dedicated PostgreSQL read-only login and root-owned /etc/coro-inspection/inspection.env (0600).
2. Create locked OS user coro-inspector with no password, a forced-command-capable shell, and no Docker group membership.
3. Install root-owned entrypoint, collector and report builder.
4. Install sudoers rule allowing only /usr/local/sbin/coro-production-inspect with NOSETENV.
5. Require an authorized_keys forced command with restrict and the dedicated public key.
6. Verify arbitrary SSH commands, PTY, forwarding, SQL writes, and generic sudo/docker access are rejected.
PLAN

$apply || { echo 'DRY_RUN_ONLY'; exit 0; }
[[ "$(id -u)" -eq 0 ]] || { echo 'ROOT_REQUIRED' >&2; exit 1; }
[[ -f /etc/coro-inspection/inspection.env && ! -L /etc/coro-inspection/inspection.env ]] || { echo 'REVIEWED_ENV_REQUIRED' >&2; exit 1; }
[[ "$(stat -c '%u:%a' /etc/coro-inspection/inspection.env)" == '0:600' ]] || { echo 'REVIEWED_ENV_PERMISSIONS_INVALID' >&2; exit 1; }

id coro-inspector >/dev/null 2>&1 || useradd --system --create-home --shell /bin/sh coro-inspector
passwd --lock coro-inspector >/dev/null
install -o root -g root -m 0755 coro-production-inspection-entrypoint /usr/local/bin/coro-production-inspection-entrypoint
install -o root -g root -m 0755 coro-production-inspect /usr/local/sbin/coro-production-inspect
install -d -o root -g root -m 0755 /usr/local/libexec/coro
install -o root -g root -m 0644 inspection-report.mjs /usr/local/libexec/coro/inspection-report.mjs
printf 'coro-inspector ALL=(root) NOPASSWD:NOSETENV: /usr/local/sbin/coro-production-inspect --forced\n' >/etc/sudoers.d/coro-production-inspection
chmod 0440 /etc/sudoers.d/coro-production-inspection
visudo -cf /etc/sudoers.d/coro-production-inspection
echo 'BASE_PROVISIONED_AUTHORIZED_KEYS_AND_DATABASE_ROLE_STILL_REQUIRE_SEPARATE_REVIEW'
