#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

REPO=/opt/coro-platform
BACKUP_ROOT=/opt/coro-ops/backup
BACKUP_DIR=/opt/coro-ops/backups/database
RELEASE_DIR=/opt/coro-ops/releases
LOCK_FILE=/run/lock/coro-production-deployment.lock
COMPOSE_OVERRIDE=''
KNOWLEDGE_OVERRIDE=''
AUTH_SMOKE_HEADERS=''
AUTH_SMOKE_BODY=''

fail() {
  code="$1"
  if [[ -n "${RELEASE_ID:-}" && -d "$RELEASE_DIR" ]]; then
    RELEASE_FAILURE_CODE="$code" node -e 'const fs=require("fs"),p=process.env,path=`/opt/coro-ops/releases/${p.RELEASE_ID}.failed.json`;try{fs.writeFileSync(path,JSON.stringify({releaseId:p.RELEASE_ID,gitCommit:p.RELEASE_COMMIT||null,timestampUtc:new Date().toISOString(),operator:p.RELEASE_OPERATOR||null,status:"FAILED",failureCode:p.RELEASE_FAILURE_CODE},null,2)+"\n",{flag:"wx",mode:0o600})}catch{}'
  fi
  printf 'RELEASE_FAILED code=%s\n' "$code" >&2
  exit 1
}
cleanup() {
  [[ -z "$COMPOSE_OVERRIDE" ]] || rm -f -- "$COMPOSE_OVERRIDE"
  [[ -z "$KNOWLEDGE_OVERRIDE" ]] || rm -f -- "$KNOWLEDGE_OVERRIDE"
  [[ -z "$AUTH_SMOKE_HEADERS" ]] || rm -f -- "$AUTH_SMOKE_HEADERS"
  [[ -z "$AUTH_SMOKE_BODY" ]] || rm -f -- "$AUTH_SMOKE_BODY"
}
trap cleanup EXIT

backup_aws_cli() {
  [[ -n "${CORO_BACKUP_SPACES_ACCESS_KEY:-}" && -n "${CORO_BACKUP_SPACES_SECRET_KEY:-}" ]] || {
    printf 'BACKUP_AWS_CREDENTIALS_MISSING\n' >&2
    return 1
  }
  env -u AWS_SESSION_TOKEN -u AWS_PROFILE -u AWS_DEFAULT_PROFILE \
    -u AWS_SHARED_CREDENTIALS_FILE -u AWS_CONFIG_FILE \
    AWS_ACCESS_KEY_ID="$CORO_BACKUP_SPACES_ACCESS_KEY" \
    AWS_SECRET_ACCESS_KEY="$CORO_BACKUP_SPACES_SECRET_KEY" \
    AWS_EC2_METADATA_DISABLED=true \
    aws "$@"
}

wait_for_application_ready() {
  local container="$1" url="$2" failure_prefix="$3"
  local timeout_seconds="${APPLICATION_READINESS_TIMEOUT_SECONDS:-120}"
  local interval_seconds="${APPLICATION_READINESS_INTERVAL_SECONDS:-3}"
  local started_at now curl_exit http_code restart_count

  [[ "$timeout_seconds" =~ ^[1-9][0-9]*$ ]] || fail APPLICATION_READINESS_CONFIGURATION_INVALID
  [[ "$interval_seconds" =~ ^[1-9][0-9]*$ ]] || fail APPLICATION_READINESS_CONFIGURATION_INVALID
  started_at="$(date +%s)"

  while true; do
    [[ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null)" == true ]] || fail "${failure_prefix}_CONTAINER_EXITED"
    restart_count="$(docker inspect --format '{{.RestartCount}}' "$container" 2>/dev/null)" || fail "${failure_prefix}_CONTAINER_UNAVAILABLE"
    [[ "$restart_count" == 0 ]] || fail "${failure_prefix}_RESTART_LOOP"

    set +e
    http_code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 "$url")"
    curl_exit=$?
    set -e
    if [[ "$curl_exit" -eq 0 && "$http_code" =~ ^[23][0-9][0-9]$ ]]; then
      return 0
    fi
    if [[ "$curl_exit" -eq 0 && ! "$http_code" =~ ^(500|502|503)$ ]]; then
      fail "${failure_prefix}_HTTP_${http_code}"
    fi

    now="$(date +%s)"
    (( now - started_at < timeout_seconds )) || fail "${failure_prefix}_READINESS_TIMEOUT"
    sleep "$interval_seconds"
  done
}

wait_for_backend_ready() {
  local container="$1" url="$2"
  local timeout_seconds="${APPLICATION_READINESS_TIMEOUT_SECONDS:-120}"
  local interval_seconds="${APPLICATION_READINESS_INTERVAL_SECONDS:-3}"
  local started_at now curl_exit http_code restart_count

  [[ "$timeout_seconds" =~ ^[1-9][0-9]*$ ]] || fail APPLICATION_READINESS_CONFIGURATION_INVALID
  [[ "$interval_seconds" =~ ^[1-9][0-9]*$ ]] || fail APPLICATION_READINESS_CONFIGURATION_INVALID
  started_at="$(date +%s)"

  while true; do
    [[ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null)" == true ]] || fail BACKEND_CONTAINER_EXITED
    restart_count="$(docker inspect --format '{{.RestartCount}}' "$container" 2>/dev/null)" || fail BACKEND_CONTAINER_UNAVAILABLE
    [[ "$restart_count" == 0 ]] || fail BACKEND_RESTART_LOOP

    set +e
    http_code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 \
      -H 'content-type: application/json' \
      -d '{"email":"release-smoke-nonexistent@example.invalid","password":"InvalidReleaseSmoke!123"}' \
      "$url")"
    curl_exit=$?
    set -e
    if [[ "$curl_exit" -eq 0 && "$http_code" =~ ^(400|401)$ ]]; then
      return 0
    fi
    if [[ "$curl_exit" -eq 0 && ! "$http_code" =~ ^(500|502|503)$ ]]; then
      fail "BACKEND_READINESS_HTTP_${http_code}"
    fi

    now="$(date +%s)"
    (( now - started_at < timeout_seconds )) || fail BACKEND_READINESS_TIMEOUT
    sleep "$interval_seconds"
  done
}

run_backend_auth_smoke() {
  local url="$1" http_code curl_exit
  AUTH_SMOKE_HEADERS="$(mktemp /tmp/coro-auth-smoke-headers.XXXXXX)"
  AUTH_SMOKE_BODY="$(mktemp /tmp/coro-auth-smoke-body.XXXXXX)"

  set +e
  http_code="$(curl --silent --show-error --dump-header "$AUTH_SMOKE_HEADERS" --output "$AUTH_SMOKE_BODY" --write-out '%{http_code}' --max-time 15 \
    -H 'content-type: application/json' \
    -d '{"email":"release-smoke-nonexistent@example.invalid","password":"InvalidReleaseSmoke!123"}' \
    "$url")"
  curl_exit=$?
  set -e
  [[ "$curl_exit" -eq 0 ]] || fail BACKEND_HEALTH_NETWORK_FAILED
  [[ "$http_code" =~ ^(400|401)$ ]] || fail "BACKEND_HEALTH_HTTP_${http_code}"
  ! grep -Eqi '^set-cookie:' "$AUTH_SMOKE_HEADERS" || fail BACKEND_HEALTH_SESSION_CREATED
  node -e '
    const fs=require("fs");
    let body;
    try { body=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); } catch { process.exit(1); }
    if (!body || typeof body!=="object" || Array.isArray(body)) process.exit(1);
    const forbidden=/^(access_?token|refresh_?token|token|jwt|session)$/i;
    const stack=[body];
    while(stack.length){const value=stack.pop();for(const [key,child] of Object.entries(value)){if(forbidden.test(key))process.exit(1);if(child&&typeof child==="object")stack.push(child);}}
  ' "$AUTH_SMOKE_BODY" || fail BACKEND_HEALTH_RESPONSE_INVALID
}

[[ "${PRODUCTION_APPROVAL:-}" == DEPLOY_PRODUCTION ]] || fail RELEASE_APPROVAL_MISSING
[[ "${MIGRATION_COMPATIBILITY_APPROVAL:-}" == CONFIRMED_BACKWARD_COMPATIBLE ]] || fail MIGRATION_COMPATIBILITY_APPROVAL_MISSING
[[ "${RELEASE_COMMIT:-}" =~ ^[0-9a-f]{40}$ ]] || fail RELEASE_COMMIT_INVALID
[[ "${RELEASE_OPERATOR:-}" =~ ^[A-Za-z0-9_.-]+$ ]] || fail RELEASE_OPERATOR_INVALID
export RELEASE_ID="${RELEASE_ID:-production-${RELEASE_COMMIT}-$(date -u +%Y%m%dT%H%M%SZ)}"
[[ "$RELEASE_ID" =~ ^production-[0-9a-f]{40}(-[0-9]{8}T[0-9]{6}Z)?$ ]] || fail RELEASE_ID_INVALID
mkdir -p "$RELEASE_DIR"
chmod 0700 "$RELEASE_DIR"
for variable in BACKEND_IMAGE FRONTEND_IMAGE CLIENT_PORTAL_IMAGE WEBSITE_IMAGE; do
  value="${!variable:-}"
  [[ "$value" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+@sha256:[0-9a-f]{64}$ ]] || fail "${variable}_INVALID"
done

exec 9>"$LOCK_FILE"
flock --nonblock 9 || fail CONCURRENT_RELEASE

cd "$REPO"
[[ "$(git branch --show-current)" == main ]] || fail PRODUCTION_BRANCH_INVALID
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail PRODUCTION_WORKTREE_DIRTY
git fetch --quiet origin main
[[ "$(git rev-parse origin/main)" == "$RELEASE_COMMIT" ]] || fail REMOTE_COMMIT_MISMATCH

previous_commit="$(git rev-parse HEAD)"
previous_migration_head="$(docker compose exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1'\''')" || fail PREVIOUS_MIGRATION_HEAD_UNAVAILABLE
previous_images=''
for container in coro_backend coro_frontend coro_client_portal coro_website; do
  image_id="$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null)" || fail ROLLBACK_METADATA_MISSING
  immutable_ref="$(docker image inspect --format '{{index .RepoDigests 0}}' "$image_id" 2>/dev/null)" || fail ROLLBACK_METADATA_MISSING
  [[ "$immutable_ref" =~ @sha256:[0-9a-f]{64}$ ]] || fail ROLLBACK_METADATA_MISSING
  previous_images+="${immutable_ref}"$'\n'
done
[[ "$(printf '%s\n' "$previous_images" | sed '/^$/d' | wc -l)" -eq 4 ]] || fail ROLLBACK_METADATA_MISSING

# Fail before backup, pulls, migration or rollout unless the host can stage a
# backup, a conservatively expanded image set, database growth and an
# operational reserve. This augments and never weakens the backup's own gate.
set -a
# shellcheck disable=SC1091
source /etc/coro-backup/backup.env
set +a
backup_min_bytes="${CORO_BACKUP_MIN_FREE_BYTES:-5368709120}"
backup_min_percent="${CORO_BACKUP_MIN_FREE_PERCENT:-10}"
for value in "$backup_min_bytes" "$backup_min_percent"; do [[ "$value" =~ ^[0-9]+$ ]] || fail CAPACITY_POLICY_INVALID; done
read -r capacity_total_kib capacity_free_kib < <(df -Pk -- "$BACKUP_DIR" | awk 'NR==2 {print $2,$4}')
capacity_total=$((capacity_total_kib * 1024)); capacity_free=$((capacity_free_kib * 1024))
backup_percent=$((capacity_total * backup_min_percent / 100)); backup_required="$backup_min_bytes"
(( backup_percent > backup_required )) && backup_required="$backup_percent"
active_image_bytes=0
while read -r ref; do [[ -n "$ref" ]] || continue; size="$(docker image inspect --format '{{.Size}}' "$ref")" || fail CAPACITY_IMAGE_SIZE_UNAVAILABLE; active_image_bytes=$((active_image_bytes + size)); done <<<"$previous_images"
image_stage_required=$((active_image_bytes * 125 / 100))
database_bytes="$(docker compose exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT pg_database_size(current_database())"')" || fail CAPACITY_DATABASE_SIZE_UNAVAILABLE
[[ "$database_bytes" =~ ^[0-9]+$ ]] || fail CAPACITY_DATABASE_SIZE_INVALID
database_growth=$((database_bytes / 5)); (( database_growth < 2147483648 )) && database_growth=2147483648
operational_reserve=$((capacity_total / 10)); (( operational_reserve < 5368709120 )) && operational_reserve=5368709120
release_capacity_required=$((backup_required + image_stage_required + database_growth + operational_reserve))
(( capacity_free >= release_capacity_required )) || fail RELEASE_CAPACITY_INSUFFICIENT
previous_compose="$RELEASE_DIR/${RELEASE_ID}.previous-compose.yml"
[[ ! -e "$previous_compose" ]] || fail RELEASE_ARTIFACT_EXISTS
install -m 0600 -T docker-compose.yml "$previous_compose"

systemctl start coro-db-backup-health.service || fail BACKUP_HEALTH_UNAVAILABLE
[[ "$(systemctl show -p Result --value coro-db-backup-health.service)" == success ]] || fail BACKUP_HEALTH_UNAVAILABLE
systemctl start coro-db-backup.service || fail BACKUP_CHECKPOINT_FAILED
[[ "$(systemctl show -p Result --value coro-db-backup.service)" == success ]] || fail BACKUP_CHECKPOINT_FAILED

state="$BACKUP_DIR/backup-state.json"
[[ -f "$state" && ! -L "$state" ]] || fail BACKUP_STATE_MISSING
backup_id="$(node -e 'const s=require(process.argv[1]);if(!s.lastBackupId||!s.lastSuccessAt||s.consecutiveFailures!==0)process.exit(1);process.stdout.write(s.lastBackupId)' "$state")" || fail BACKUP_NOT_REMOTE_VERIFIED
manifest="$BACKUP_DIR/$backup_id.remote.manifest.json"
[[ -f "$manifest" && ! -L "$manifest" ]] || fail BACKUP_MANIFEST_MISSING
backup_sha="$(node -e 'const m=require(process.argv[1]);if(m.status!=="REMOTE_VERIFIED"||m.remoteVerification!=="PASSED"||!/^([a-f0-9]{64})$/.test(m.sha256))process.exit(1);process.stdout.write(m.sha256)' "$manifest")" || fail BACKUP_SHA_INVALID
remote_bucket="$(node -e 'const m=require(process.argv[1]);if(!m.remoteBucket)process.exit(1);process.stdout.write(m.remoteBucket)' "$manifest")" || fail BACKUP_REMOTE_IDENTITY_MISSING
remote_object="$(node -e 'const m=require(process.argv[1]);if(!m.remoteObjectKey)process.exit(1);process.stdout.write(m.remoteObjectKey)' "$manifest")" || fail BACKUP_REMOTE_IDENTITY_MISSING

set -a
# shellcheck disable=SC1091
source /etc/coro-backup/spaces.env
set +a
remote_head="$(backup_aws_cli --endpoint-url "$CORO_BACKUP_SPACES_ENDPOINT" --region "$CORO_BACKUP_SPACES_REGION" s3api head-object --bucket "$remote_bucket" --key "$remote_object" --output json)" || fail BACKUP_REMOTE_UNAVAILABLE
backup_version_id="$(node -e 'const h=JSON.parse(process.argv[1]);if(!h.VersionId||h.VersionId==="null")process.exit(1);process.stdout.write(h.VersionId)' "$remote_head")" || fail BACKUP_VERSION_ID_MISSING
node -e 'const h=JSON.parse(process.argv[1]);const expected=process.argv[2];const actual=(h.Metadata?.sha256||"").toLowerCase();if(actual!==expected)process.exit(1)' "$remote_head" "$backup_sha" || fail BACKUP_SHA_MISMATCH

restore_output="$(CORO_RESTORE_MANIFEST="$manifest" CORO_RESTORE_REMOTE_VERSION_ID="$backup_version_id" "$BACKUP_ROOT/coro-db-restore-run.sh")" || fail RESTORE_VERIFICATION_FAILED
grep -qx 'status=RESTORE_VERIFIED' <<<"$restore_output" || fail RESTORE_VERIFICATION_MISSING
restore_report="$(sed -n 's/^reportPath=//p' <<<"$restore_output")"
[[ -f "$restore_report" ]] || fail RESTORE_REPORT_MISSING

git merge --ff-only origin/main || fail RELEASE_CHECKOUT_FAILED
[[ "$(git rev-parse HEAD)" == "$RELEASE_COMMIT" ]] || fail RELEASE_CHECKOUT_FAILED
expected_migration_head="$(find coro-backend/prisma/migrations -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | tail -n 1)"
[[ -n "$expected_migration_head" ]] || fail EXPECTED_MIGRATION_HEAD_MISSING

for image in "$BACKEND_IMAGE" "$FRONTEND_IMAGE" "$CLIENT_PORTAL_IMAGE" "$WEBSITE_IMAGE"; do
  docker pull --platform linux/amd64 "$image" >/dev/null || fail IMAGE_UNAVAILABLE
  docker image inspect "$image" --format '{{.Architecture}}' | grep -qx amd64 || fail IMAGE_PLATFORM_MISMATCH
done

COMPOSE_OVERRIDE="$(mktemp /tmp/coro-release-compose.XXXXXX.yml)"
cat >"$COMPOSE_OVERRIDE" <<YAML
services:
  backend:
    image: $BACKEND_IMAGE
  frontend:
    image: $FRONTEND_IMAGE
  client-portal:
    image: $CLIENT_PORTAL_IMAGE
  website:
    image: $WEBSITE_IMAGE
YAML
KNOWLEDGE_OVERRIDE="$(mktemp /tmp/coro-knowledge-runtime.XXXXXX.json)"
rm -f -- "$KNOWLEDGE_OVERRIDE"
node ops/knowledge/runtime-policy.mjs overlay "$BACKEND_IMAGE" "$KNOWLEDGE_OVERRIDE" || fail KNOWLEDGE_RUNTIME_POLICY_INVALID
compose=(docker compose -f docker-compose.yml -f "$COMPOSE_OVERRIDE" -f "$KNOWLEDGE_OVERRIDE")
"${compose[@]}" config --quiet || fail COMPOSE_CONFIGURATION_INVALID

# Migrations execute in the approved backend image before any running service is replaced.
"${compose[@]}" run --rm --no-deps backend node -e "const{execSync}=require('child_process');execSync('npx prisma@6.19.3 migrate deploy --schema=/app/prisma/schema.prisma',{stdio:'inherit',env:{...process.env,npm_config_yes:'true'}})" || fail MIGRATION_FAILED
current_migration_head="$(docker compose exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1'\''')" || fail MIGRATION_STATUS_UNAVAILABLE
[[ "$current_migration_head" == "$expected_migration_head" ]] || fail MIGRATION_HEAD_MISMATCH

"${compose[@]}" up -d --no-build --remove-orphans || fail APPLICATION_ROLLOUT_FAILED
docker compose exec -T postgres sh -ceu 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null || fail DATABASE_HEALTH_FAILED
wait_for_application_ready coro_frontend http://127.0.0.1:3000/ FRONTEND
wait_for_application_ready coro_client_portal http://127.0.0.1:3003/ CLIENT_PORTAL
wait_for_application_ready coro_website http://127.0.0.1:3001/ WEBSITE
wait_for_backend_ready coro_backend http://127.0.0.1:3002/api/auth/login
run_backend_auth_smoke http://127.0.0.1:3002/api/auth/login
client_auth_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 15 -H 'content-type: application/json' -d '{}' http://127.0.0.1:3002/api/client-auth/login)" || fail CLIENT_AUTH_SMOKE_FAILED
booking_guard_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 15 http://127.0.0.1:3002/api/planning/my-assignments)" || fail BOOKING_SMOKE_FAILED
rendement_guard_code="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 15 http://127.0.0.1:3002/api/rendement/financial)" || fail RENDEMENT_SMOKE_FAILED
[[ "$client_auth_code" =~ ^(400|401)$ ]] || fail CLIENT_AUTH_SMOKE_FAILED
[[ "$booking_guard_code" == 401 ]] || fail BOOKING_SMOKE_FAILED
[[ "$rendement_guard_code" == 401 ]] || fail RENDEMENT_SMOKE_FAILED

for container in coro_backend coro_frontend coro_client_portal coro_website; do
  [[ "$(docker inspect --format '{{.State.Running}}' "$container")" == true ]] || fail CONTAINER_HEALTH_FAILED
  [[ "$(docker inspect --format '{{.RestartCount}}' "$container")" == 0 ]] || fail RESTART_COUNT_NONZERO
done
for container in coro_backend coro_frontend coro_client_portal coro_website; do
  if docker logs --since 5m "$container" 2>&1 | grep -Eqi 'missing table|missing enum|PrismaClientKnownRequestError|uncaught exception|fatal error'; then fail CRITICAL_LOGS_FOUND; fi
done
[[ "$(docker compose exec -T backend sh -c 'printf %s "${MFA_QA_CAPTURE_ENABLED:-false}"')" != true ]] || fail MFA_QA_CAPTURE_ENABLED

# A persistent, root-owned policy preserves the existing application's access
# across releases. Provider failure restores a healthy, credential-free backend
# and fails the release rather than reporting a silently degraded success.
if ! docker exec coro_backend node dist/scripts/knowledge-provider-smoke.js >"$RELEASE_DIR/${RELEASE_ID}.knowledge-smoke.json"; then
  docker compose -f docker-compose.yml -f "$COMPOSE_OVERRIDE" up -d --no-deps --no-build backend || fail KNOWLEDGE_DEGRADATION_FAILED
  wait_for_backend_ready coro_backend http://127.0.0.1:3002/api/auth/login
  fail KNOWLEDGE_PROVIDER_SMOKE_FAILED
fi
node ops/knowledge/runtime-policy.mjs verify "$BACKEND_IMAGE" >"$RELEASE_DIR/${RELEASE_ID}.knowledge-runtime.json" || fail KNOWLEDGE_RUNTIME_MISMATCH

export RELEASE_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export PREVIOUS_COMMIT="$previous_commit" PREVIOUS_IMAGES="$previous_images" PREVIOUS_MIGRATION_HEAD="$previous_migration_head"
export PREVIOUS_COMPOSE="$previous_compose" EXPECTED_MIGRATION_HEAD="$expected_migration_head" BACKUP_ID="$backup_id" BACKUP_SHA="$backup_sha" BACKUP_REMOTE_OBJECT="$remote_object" BACKUP_VERSION_ID="$backup_version_id" RESTORE_REPORT="$restore_report"
export COMPOSE_IDENTITY="$(sha256sum docker-compose.yml "$COMPOSE_OVERRIDE" "$KNOWLEDGE_OVERRIDE" | sha256sum | cut -d' ' -f1)"
node <<'NODE'
const fs=require('fs'); const p=process.env;
const knowledgeRuntime=JSON.parse(fs.readFileSync(`/opt/coro-ops/releases/${p.RELEASE_ID}.knowledge-runtime.json`,'utf8'));
const knowledgeSmoke=JSON.parse(fs.readFileSync(`/opt/coro-ops/releases/${p.RELEASE_ID}.knowledge-smoke.json`,'utf8'));
const manifest={releaseId:p.RELEASE_ID,gitCommit:p.RELEASE_COMMIT,timestampUtc:p.RELEASE_TIMESTAMP,operator:p.RELEASE_OPERATOR,status:'SUCCESS',images:{backend:p.BACKEND_IMAGE,frontend:p.FRONTEND_IMAGE,clientPortal:p.CLIENT_PORTAL_IMAGE,website:p.WEBSITE_IMAGE},composeIdentity:p.COMPOSE_IDENTITY,expectedMigrationHead:p.EXPECTED_MIGRATION_HEAD,previousCommit:p.PREVIOUS_COMMIT,previousImages:p.PREVIOUS_IMAGES.split('\n'),previousCompose:p.PREVIOUS_COMPOSE,previousMigrationHead:p.PREVIOUS_MIGRATION_HEAD,backupCheckpointId:p.BACKUP_ID,backupSha256:p.BACKUP_SHA,backupRemoteObject:p.BACKUP_REMOTE_OBJECT,backupVersionId:p.BACKUP_VERSION_ID,restoreEvidence:{status:'RESTORE_VERIFIED',report:p.RESTORE_REPORT},healthChecks:{database:'PASS',backend:'PASS',frontend:'PASS',clientPortal:'PASS',website:'PASS',internalAuthReachable:'PASS',clientAuthReachable:'PASS',unauthenticatedBookingDenied:'PASS',authenticatedBooking:'NOT_VERIFIED_REQUIRES_APPROVED_SYNTHETIC_IDENTITY',containers:'PASS',restartCount:'PASS',criticalLogs:'PASS',mfaQaCaptureDisabled:'PASS'}};
manifest.knowledgeRuntime={...knowledgeRuntime,smoke:knowledgeSmoke};
const path=`/opt/coro-ops/releases/${p.RELEASE_ID}.json`; fs.writeFileSync(path,JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
NODE

printf 'RELEASE_SUCCESS id=%s commit=%s\n' "$RELEASE_ID" "$RELEASE_COMMIT"
