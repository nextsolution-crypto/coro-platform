#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

RELEASE_DIR="${CORO_RELEASE_DIR:-/opt/coro-ops/releases}"
STATE_ROOT="${CORO_RELEASE_STATE_ROOT:-$RELEASE_DIR/state}"
RUNTIME_DIR="${CORO_RELEASE_RUNTIME_DIR:-$RELEASE_DIR/runtime}"
STATE_SOURCE="${CORO_RELEASE_STATE_SOURCE:?release state source is required}"
RELEASE_SOURCE="${CORO_RELEASE_SCRIPT_SOURCE:?release script source is required}"
RECONCILE_SOURCE="${CORO_RELEASE_RECONCILE_SOURCE:?reconciliation source is required}"
POLL_SECONDS="${CORO_RELEASE_POLL_SECONDS:-5}"
WAIT_SECONDS="${CORO_RELEASE_WAIT_SECONDS:-3300}"
CONTROL_LOCK="${CORO_RELEASE_CONTROL_LOCK_FILE:-/run/lock/coro-release-control.lock}"

[[ "${RELEASE_COMMIT:-}" =~ ^[0-9a-f]{40}$ ]] || { echo 'RELEASE_CONTROL_FAILED code=RELEASE_COMMIT_INVALID' >&2; exit 1; }
[[ "${PRODUCTION_APPROVAL:-}" == DEPLOY_PRODUCTION ]] || { echo 'RELEASE_CONTROL_FAILED code=RELEASE_APPROVAL_MISSING' >&2; exit 1; }
[[ "${MIGRATION_COMPATIBILITY_APPROVAL:-}" == CONFIRMED_BACKWARD_COMPATIBLE ]] || { echo 'RELEASE_CONTROL_FAILED code=MIGRATION_COMPATIBILITY_APPROVAL_MISSING' >&2; exit 1; }
[[ "${RELEASE_OPERATOR:-}" =~ ^[A-Za-z0-9_.-]+$ ]] || { echo 'RELEASE_CONTROL_FAILED code=RELEASE_OPERATOR_INVALID' >&2; exit 1; }
[[ "$POLL_SECONDS" =~ ^[1-9][0-9]*$ && "$WAIT_SECONDS" =~ ^[1-9][0-9]*$ ]] || { echo 'RELEASE_CONTROL_FAILED code=POLL_CONFIGURATION_INVALID' >&2; exit 1; }
for variable in BACKEND_IMAGE FRONTEND_IMAGE CLIENT_PORTAL_IMAGE WEBSITE_IMAGE; do
  value="${!variable:-}"
  [[ "$value" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$ ]] || { echo "RELEASE_CONTROL_FAILED code=${variable}_INVALID" >&2; exit 1; }
done

release_id="production-${RELEASE_COMMIT}"
unit="coro-release-${RELEASE_COMMIT:0:16}"
mkdir -p "$STATE_ROOT" "$RUNTIME_DIR"
chmod 0700 "$STATE_ROOT" "$RUNTIME_DIR"
state_tool="$RUNTIME_DIR/${release_id}.state.mjs"
reconcile_tool="$RUNTIME_DIR/${release_id}.reconcile.sh"

exec 7>"$CONTROL_LOCK"
flock --nonblock 7 || { echo 'RELEASE_CONTROL_FAILED code=CONCURRENT_CONTROLLER' >&2; exit 1; }
shopt -s nullglob
for state_file in "$STATE_ROOT"/production-*.state.json; do
  other_release="$(basename "$state_file" .state.json)"
  [[ "$other_release" == "$release_id" ]] && continue
  other_state="$(node "$STATE_SOURCE" read --root "$STATE_ROOT" --release-id "$other_release" | node -e 'let data="";process.stdin.on("data",c=>data+=c).on("end",()=>process.stdout.write(JSON.parse(data).state))')" || {
    echo 'RELEASE_CONTROL_FAILED code=FOREIGN_RELEASE_STATE_INVALID' >&2
    exit 1
  }
  [[ ! "$other_state" =~ ^(PREPARED|RUNNING|UNKNOWN)$ ]] || {
    echo "RELEASE_CONTROL_FAILED code=FOREIGN_RELEASE_${other_state}" >&2
    exit 1
  }
done
shopt -u nullglob
install -m 0700 -T "$STATE_SOURCE" "$state_tool"
install -m 0700 -T "$RELEASE_SOURCE" "$RUNTIME_DIR/${release_id}.release.sh"
install -m 0700 -T "$RECONCILE_SOURCE" "$reconcile_tool"

input="$RUNTIME_DIR/${release_id}.input.json"
env_file="$RUNTIME_DIR/${release_id}.env"
worker="$RUNTIME_DIR/${release_id}.worker.sh"
node -e '
const fs=require("fs");
const images=[process.env.BACKEND_IMAGE,process.env.FRONTEND_IMAGE,process.env.CLIENT_PORTAL_IMAGE,process.env.WEBSITE_IMAGE];
fs.writeFileSync(process.argv[1],JSON.stringify({gitCommit:process.env.RELEASE_COMMIT,images,operator:process.env.RELEASE_OPERATOR},null,2)+"\n",{mode:0o600});
' "$input"
prepare="$(node "$state_tool" prepare --root "$STATE_ROOT" --input "$input")"
current="$(node -e 'const r=JSON.parse(process.argv[1]);process.stdout.write(r.state.state)' "$prepare")"

if [[ "$current" == PREPARED ]]; then
  if ! systemctl is-active --quiet "$unit.service"; then
    printf '%q\n' \
      "RELEASE_ID=$release_id" \
      "RELEASE_COMMIT=$RELEASE_COMMIT" \
      "PRODUCTION_APPROVAL=$PRODUCTION_APPROVAL" \
      "MIGRATION_COMPATIBILITY_APPROVAL=$MIGRATION_COMPATIBILITY_APPROVAL" \
      "RELEASE_OPERATOR=$RELEASE_OPERATOR" \
      "BACKEND_IMAGE=$BACKEND_IMAGE" \
      "FRONTEND_IMAGE=$FRONTEND_IMAGE" \
      "CLIENT_PORTAL_IMAGE=$CLIENT_PORTAL_IMAGE" \
      "WEBSITE_IMAGE=$WEBSITE_IMAGE" >"$env_file"
    chmod 0600 "$env_file"
    cat >"$worker" <<'WORKER'
#!/usr/bin/env bash
set -uo pipefail
runtime_dir="${CORO_RELEASE_RUNTIME_DIR:-/opt/coro-ops/releases/runtime}"
state_root="${CORO_RELEASE_STATE_ROOT:-/opt/coro-ops/releases/state}"
release_id="${RELEASE_ID:?}"
set -a
source "$runtime_dir/${release_id}.env"
set +a
patch="${runtime_dir}/${release_id}.transition.json"
state_tool="$runtime_dir/${release_id}.state.mjs"
node "$state_tool" transition --root "$state_root" --release-id "$release_id" --to RUNNING
set +e
"$runtime_dir/${release_id}.release.sh"
exit_code=$?
set -e
if [[ "$exit_code" -eq 0 ]]; then
  manifest="/opt/coro-ops/releases/${release_id}.json"
  manifest_sha="$(sha256sum "$manifest" | cut -d' ' -f1)"
  node -e 'const fs=require("fs"),m=require(process.argv[1]);fs.writeFileSync(process.argv[2],JSON.stringify({stage:"COMPLETED",manifestPath:process.argv[1],manifestSha256:process.argv[3],backupCheckpointId:m.backupCheckpointId,restoreEvidence:m.restoreEvidence?.status,migrationHead:m.expectedMigrationHead,healthChecks:m.healthChecks},null,2)+"\n",{mode:0o600})' "$manifest" "$patch" "$manifest_sha"
  node "$state_tool" transition --root "$state_root" --release-id "$release_id" --to SUCCEEDED --patch "$patch"
else
  node -e 'require("fs").writeFileSync(process.argv[1],JSON.stringify({stage:"REMOTE_RELEASE",failureCode:`REMOTE_EXIT_${process.argv[2]}`},null,2)+"\n",{mode:0o600})' "$patch" "$exit_code"
  node "$state_tool" transition --root "$state_root" --release-id "$release_id" --to FAILED --patch "$patch" || true
fi
exit "$exit_code"
WORKER
    chmod 0700 "$worker"
    systemd-run --unit "$unit" --collect --quiet \
      --setenv="RELEASE_ID=$release_id" \
      --setenv="CORO_RELEASE_RUNTIME_DIR=$RUNTIME_DIR" \
      --setenv="CORO_RELEASE_STATE_ROOT=$STATE_ROOT" \
      "$worker"
    echo "RELEASE_DETACHED release_id=$release_id unit=$unit"
  fi
fi
flock -u 7
exec 7>&-

deadline=$(( $(date +%s) + WAIT_SECONDS ))
while true; do
  state_json="$(node "$state_tool" read --root "$STATE_ROOT" --release-id "$release_id")"
  current="$(node -e 'const s=JSON.parse(process.argv[1]);process.stdout.write(s.state)' "$state_json")"
  case "$current" in
    SUCCEEDED)
      RELEASE_COMMIT="$RELEASE_COMMIT" \
      CORO_RELEASE_STATE_ROOT="$STATE_ROOT" \
      CORO_RELEASE_STATE_TOOL="$state_tool" \
      "$reconcile_tool"
      exit 0
      ;;
    FAILED|UNKNOWN|ROLLED_BACK)
      echo "RELEASE_CONTROL_FAILED code=STATE_${current}" >&2
      exit 1
      ;;
    PREPARED|RUNNING) ;;
    *) echo 'RELEASE_CONTROL_FAILED code=STATE_INVALID' >&2; exit 1 ;;
  esac
  if (( $(date +%s) >= deadline )); then
    if ! systemctl is-active --quiet "$unit.service"; then
      timeout_patch="$RUNTIME_DIR/${release_id}.observer-timeout.json"
      node -e 'require("fs").writeFileSync(process.argv[1],JSON.stringify({stage:"OBSERVER_TIMEOUT",githubTransport:"UNKNOWN"},null,2)+"\n",{mode:0o600})' "$timeout_patch"
      node "$state_tool" transition --root "$STATE_ROOT" --release-id "$release_id" --to UNKNOWN --patch "$timeout_patch" || true
    fi
    echo "RELEASE_OUTCOME_UNKNOWN release_id=$release_id state=$current" >&2
    exit 2
  fi
  sleep "$POLL_SECONDS"
done
