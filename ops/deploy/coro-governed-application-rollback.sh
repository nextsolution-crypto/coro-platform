#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode="${ROLLBACK_MODE:-DRY_RUN}"
approval="${ROLLBACK_APPROVAL:-}"
repo="${CORO_RELEASE_REPO:-/opt/coro-platform}"
release_dir="${CORO_RELEASE_DIR:-/opt/coro-ops/releases}"
state_root="${CORO_RELEASE_STATE_ROOT:-$release_dir/state}"
evidence_dir="${CORO_ROLLBACK_EVIDENCE_DIR:-/opt/coro-ops/rollback}"
lock_file="${CORO_RELEASE_LOCK_FILE:-/run/lock/coro-production-deployment.lock}"
policy="${CORO_ROLLBACK_SECURITY_POLICY:-$repo/ops/capacity/rollback-security-policy.json}"
validator="${CORO_ROLLBACK_SECURITY_TOOL:-$repo/ops/capacity/rollback-security-policy.mjs}"

fail() { printf 'GOVERNED_ROLLBACK_FAILED code=%s\n' "$1" >&2; exit 1; }
[[ "$mode" == DRY_RUN || "$mode" == EXECUTE ]] || fail MODE_INVALID
if [[ "$mode" == EXECUTE ]]; then
  [[ "$approval" == ROLLBACK_APPLICATIONS ]] || fail APPROVAL_MISSING
  [[ "${CORO_GOVERNED_ROLLBACK_ENABLED:-false}" == true ]] || fail FEATURE_DISABLED
fi
[[ -d "$repo/.git" && -d "$release_dir" && ! -L "$release_dir" && -d "$state_root" && ! -L "$state_root" ]] || fail PATH_UNSAFE
[[ -f "$policy" && ! -L "$policy" && -f "$validator" && ! -L "$validator" ]] || fail SECURITY_AUTHORITY_MISSING

exec 9>"$lock_file"
flock --nonblock 9 || fail DEPLOYMENT_LOCK_BUSY

marker="$(find "$state_root" -maxdepth 1 -type f -name 'production-*.reconciled.json' -printf '%T@ %p\n' | sort -rn | head -n1 | cut -d' ' -f2-)"
[[ -n "$marker" && -f "$marker" && ! -L "$marker" ]] || fail RECONCILED_RELEASE_MISSING
manifest="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.manifestPath||"")' "$marker")"
manifest_sha="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.manifestSha256||"")' "$marker")"
[[ -f "$manifest" && ! -L "$manifest" && "$(sha256sum "$manifest" | cut -d' ' -f1)" == "$manifest_sha" ]] || fail RECONCILED_EVIDENCE_INVALID
[[ "$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.status||"")' "$manifest")" == SUCCESS ]] || fail ACTIVE_RELEASE_NOT_SUCCESS

current_head="$(docker compose -f "$repo/docker-compose.yml" exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1'\''')" || fail MIGRATION_HEAD_UNAVAILABLE
available_key_ids="$(docker exec coro_backend node -e 'const ids=new Set();if(process.env.CLIENT_INVITATION_OUTBOX_KEY_ID)ids.add(process.env.CLIENT_INVITATION_OUTBOX_KEY_ID);try{for(const k of Object.keys(JSON.parse(process.env.CLIENT_INVITATION_OUTBOX_PREVIOUS_KEYS_BASE64||"{}")))ids.add(k)}catch{process.exit(1)}process.stdout.write([...ids].sort().join(","))')" || fail KEY_IDS_UNAVAILABLE

security_input="$(mktemp)"
current_override="$(mktemp)"
rollback_override="$(mktemp)"
state_patch="$(mktemp)"
recovery_required=false
cleanup() { rm -f -- "$security_input" "$current_override" "$rollback_override" "$state_patch"; }
recover() {
  status=$?
  if [[ "$status" -ne 0 && "$recovery_required" == true ]]; then
    docker compose -f "$repo/docker-compose.yml" -f "$current_override" up -d --no-deps --no-build backend frontend client-portal website >/dev/null || true
  fi
  cleanup
  exit "$status"
}
trap recover EXIT

build_security_input() {
  local phase="$1" worker="$2"
  node - "$manifest" "$policy" "$security_input" "$phase" "$worker" "$current_head" "$available_key_ids" <<'NODE'
const fs=require('fs');
const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const policy=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
fs.writeFileSync(process.argv[4],JSON.stringify({manifest,policy,runtime:{phase:process.argv[5],workerState:process.argv[6],migrationHead:process.argv[7],availableKeyIds:process.argv[8].split(',').filter(Boolean)}}));
NODE
}

build_security_input PREFLIGHT RUNNING
node "$validator" "$security_input" >/dev/null || fail SECURITY_PREFLIGHT_REFUSED
if [[ "$mode" == DRY_RUN ]]; then
  echo "GOVERNED_ROLLBACK_RESULT mode=DRY_RUN decision=AUTHORIZED_BY_VERSIONED_POLICY activeRelease=$(node -e 'process.stdout.write(require(process.argv[1]).releaseId)' "$manifest")"
  exit 0
fi

declare -A current_refs=()
for pair in 'backend coro_backend backend' 'frontend coro_frontend frontend' 'client-portal coro_client_portal clientPortal' 'website coro_website website'; do
  read -r service container key <<<"$pair"
  id="$(docker inspect --format '{{.Image}}' "$container")" || fail ACTIVE_CONTAINER_MISSING
  ref="$(docker image inspect --format '{{index .RepoDigests 0}}' "$id")" || fail ACTIVE_IMAGE_MISSING
  expected="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.images[process.argv[2]]||"")' "$manifest" "$key")"
  [[ "$ref" == "$expected" ]] || fail ACTIVE_IMAGE_DRIFT
  current_refs["$service"]="$ref"
done
mapfile -t previous_refs < <(node -e 'const m=require(process.argv[1]);for(const r of m.previousImages||[])if(r)console.log(r)' "$manifest")
[[ "${#previous_refs[@]}" -eq 4 ]] || fail ROLLBACK_SET_INVALID
printf 'services:\n  backend:\n    image: %s\n  frontend:\n    image: %s\n  client-portal:\n    image: %s\n  website:\n    image: %s\n' "${current_refs[backend]}" "${current_refs[frontend]}" "${current_refs[client-portal]}" "${current_refs[website]}" >"$current_override"
printf 'services:\n  backend:\n    image: %s\n  frontend:\n    image: %s\n  client-portal:\n    image: %s\n  website:\n    image: %s\n' "${previous_refs[0]}" "${previous_refs[1]}" "${previous_refs[2]}" "${previous_refs[3]}" >"$rollback_override"
docker compose -f "$repo/docker-compose.yml" -f "$current_override" config --quiet || fail CURRENT_COMPOSE_INVALID
docker compose -f "$repo/docker-compose.yml" -f "$rollback_override" config --quiet || fail ROLLBACK_COMPOSE_INVALID

before_outbox="$(docker compose -f "$repo/docker-compose.yml" exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT (SELECT count(*) FROM "ClientInvitationEvent") || ':'\'' || (SELECT count(*) FROM "OrganizationUserInvitationEvent")'\''')" || fail OUTBOX_SNAPSHOT_FAILED
docker compose -f "$repo/docker-compose.yml" stop frontend client-portal website backend >/dev/null || fail QUIESCE_FAILED
recovery_required=true
build_security_input EXECUTION QUIESCED
node "$validator" "$security_input" >/dev/null || fail SECURITY_EXECUTION_REFUSED
docker compose -f "$repo/docker-compose.yml" -f "$rollback_override" up -d --no-deps --no-build backend frontend client-portal website >/dev/null || fail ROLLBACK_SWITCH_FAILED

for endpoint in 'http://127.0.0.1:3002/api/health' 'http://127.0.0.1:3000' 'http://127.0.0.1:3003' 'http://127.0.0.1:3001'; do
  ready=false
  for _ in $(seq 1 40); do code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$endpoint" || true)"; [[ "$code" =~ ^[23][0-9][0-9]$ ]] && { ready=true; break; }; sleep 3; done
  [[ "$ready" == true ]] || fail HEALTH_CHECK_FAILED
done
[[ "$(docker compose -f "$repo/docker-compose.yml" exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1'\''')" == "$current_head" ]] || fail DATABASE_HEAD_CHANGED
after_outbox="$(docker compose -f "$repo/docker-compose.yml" exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT (SELECT count(*) FROM "ClientInvitationEvent") || ':'\'' || (SELECT count(*) FROM "OrganizationUserInvitationEvent")'\''')" || fail OUTBOX_POSTCHECK_FAILED
[[ "$after_outbox" == "$before_outbox" ]] || fail OUTBOX_EVENT_COUNT_CHANGED

mkdir -p -m 0700 "$evidence_dir"
evidence="$evidence_dir/rollback-$(date -u +%Y%m%dT%H%M%SZ).json"
node - "$manifest" "$evidence" "$current_head" "$before_outbox" <<'NODE'
const fs=require('fs'),crypto=require('crypto');const m=JSON.parse(fs.readFileSync(process.argv[2]));fs.writeFileSync(process.argv[3],JSON.stringify({schemaVersion:1,status:'SUCCESS',completedAt:new Date().toISOString(),rolledBackReleaseId:m.releaseId,activeCommit:m.previousCommit,images:m.previousImages,migrationHead:process.argv[4],outboxCountFingerprint:crypto.createHash('sha256').update(process.argv[5]).digest('hex')},null,2)+'\n',{mode:0o600,flag:'wx'});
NODE
release_id="$(node -e 'process.stdout.write(require(process.argv[1]).releaseId)' "$manifest")"
printf '{"rollbackAuthorization":"ROLLBACK_APPLICATIONS","rollbackEvidence":"%s"}\n' "$evidence" >"$state_patch"
node "$release_dir/runtime/release-state.mjs" transition --root "$state_root" --release-id "$release_id" --to ROLLED_BACK --patch "$state_patch" >/dev/null || fail RELEASE_STATE_UPDATE_FAILED
recovery_required=false
echo "GOVERNED_ROLLBACK_RESULT mode=EXECUTE status=SUCCESS releaseId=$release_id evidence=$evidence"

