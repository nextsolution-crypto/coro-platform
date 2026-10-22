#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

REPO="${CORO_RELEASE_REPO:-/opt/coro-platform}"
RELEASE_DIR="${CORO_RELEASE_DIR:-/opt/coro-ops/releases}"
EVIDENCE_DIR="${CORO_MAINTENANCE_EVIDENCE_DIR:-/opt/coro-ops/maintenance}"
LOCK_FILE="${CORO_RELEASE_LOCK_FILE:-/run/lock/coro-production-deployment.lock}"
SERVICE="${SERVICE:-}"
TARGET_IMAGE="${TARGET_IMAGE:-}"
RELEASE_COMMIT="${RELEASE_COMMIT:-}"
MAINTENANCE_RUN_ID="${MAINTENANCE_RUN_ID:-}"
APPROVAL="${MAINTENANCE_APPROVAL:-}"
changed=false
rollback_ref=''
override=''

fail() { printf 'SINGLE_SERVICE_MAINTENANCE_FAILED code=%s\n' "$1" >&2; exit 1; }
cleanup() { [[ -z "$override" ]] || rm -f -- "$override"; }
rollback() {
  status=$?
  if [[ "$status" -ne 0 && "$changed" == true && "$rollback_ref" =~ @sha256:[0-9a-f]{64}$ ]]; then
    rollback_override="$(mktemp /tmp/coro-single-service-rollback.XXXXXX.yml)"
    printf 'services:\n  backend:\n    image: %s\n' "$rollback_ref" >"$rollback_override"
    docker compose -f "$REPO/docker-compose.yml" -f "$rollback_override" up -d --no-deps --no-build backend >/dev/null || true
    rm -f -- "$rollback_override"
  fi
  cleanup
  exit "$status"
}
trap rollback EXIT

[[ "$APPROVAL" == RECONCILE_SINGLE_SERVICE ]] || fail APPROVAL_INVALID
[[ "$SERVICE" == backend ]] || fail SERVICE_NOT_AUTHORIZED
[[ "$RELEASE_COMMIT" =~ ^[0-9a-f]{40}$ ]] || fail RELEASE_COMMIT_INVALID
[[ "$MAINTENANCE_RUN_ID" =~ ^[0-9]+$ ]] || fail RUN_ID_INVALID
[[ "$TARGET_IMAGE" =~ ^ghcr\.io/[a-z0-9_.-]+/coro-backend@sha256:[0-9a-f]{64}$ ]] || fail IMAGE_NOT_IMMUTABLE
[[ "$TARGET_IMAGE" != *':latest'* ]] || fail MUTABLE_TAG_REJECTED

exec 9>"$LOCK_FILE"
flock --nonblock 9 || fail DEPLOYMENT_LOCK_BUSY

manifest="$RELEASE_DIR/production-${RELEASE_COMMIT}.json"
[[ -f "$manifest" && ! -L "$manifest" ]] || fail RELEASE_MANIFEST_MISSING
[[ "$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.gitCommit||"")' "$manifest")" == "$RELEASE_COMMIT" ]] || fail RELEASE_MANIFEST_COMMIT_MISMATCH
[[ "$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.images?.backend||"")' "$manifest")" == "$TARGET_IMAGE" ]] || fail TARGET_NOT_IN_RELEASE_MANIFEST
[[ "$(git -C "$REPO" rev-parse HEAD)" == "$RELEASE_COMMIT" ]] || fail ACTIVE_RELEASE_SHA_MISMATCH

mkdir -p -m 0700 "$EVIDENCE_DIR"
evidence="$EVIDENCE_DIR/single-service-${MAINTENANCE_RUN_ID}.json"
[[ ! -e "$evidence" ]] || fail EVIDENCE_ALREADY_EXISTS

snapshot() {
  local phase="$1" output="$2"
  PHASE="$phase" RELEASE_MANIFEST="$manifest" node - "$output" <<'NODE'
const {execFileSync}=require('child_process'); const fs=require('fs'); const crypto=require('crypto');
const out=process.argv[2];
const inspect=(name)=>JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}))[0];
const imageRef=(c)=>JSON.parse(execFileSync('docker',['image','inspect',c.Image],{encoding:'utf8'}))[0].RepoDigests?.[0]||null;
const names=['coro_backend','coro_frontend','coro_client_portal','coro_website'];
const containers=Object.fromEntries(names.map(n=>{const c=inspect(n);return[n,{id:c.Id,image:imageRef(c),running:c.State.Running,restarts:c.RestartCount,networks:Object.keys(c.NetworkSettings.Networks||{}).sort()}]}));
const b=inspect('coro_backend'); const env=Object.fromEntries((b.Config.Env||[]).map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)]}));
const mount=(b.Mounts||[]).find(m=>m.Destination==='/var/lib/coro/sms-validation');
if(!env.BREVO_SMS_SENDER || !/^\+1\d{10}$/.test(env.BREVO_SMS_SENDER)) throw Error('SMS_SENDER_INVALID');
if(env.POPULATION_SMS_PRODUCTION_VALIDATED!=='false') throw Error('GLOBAL_SMS_GATE_OPEN');
if(!env.POPULATION_BREVO_SMS_WEBHOOK_SECRET) throw Error('SMS_WEBHOOK_SECRET_MISSING');
if(!mount || mount.Type!=='bind' || !mount.Source) throw Error('SMS_EVIDENCE_MOUNT_INVALID');
const files=fs.readdirSync(mount.Source,{withFileTypes:true}).filter(e=>e.isFile()&&e.name.endsWith('.json')).map(e=>e.name).sort();
const records=files.map(name=>{const p=`${mount.Source}/${name}`;const raw=fs.readFileSync(p);const j=JSON.parse(raw);if(j.maskedDestination && !j.maskedDestination.includes('*'))throw Error('EVIDENCE_DESTINATION_NOT_MASKED');return{name,sha256:crypto.createHash('sha256').update(raw).digest('hex'),mode:j.mode||null,outcome:j.outcome||null,providerMessageIdPresent:j.providerMessageIdPresent===true};});
if(!records.some(r=>r.mode==='DRY_RUN')) throw Error('DRY_RUN_EVIDENCE_MISSING');
if(!records.some(r=>r.mode==='LIVE'&&r.providerMessageIdPresent)) throw Error('LIVE_EVIDENCE_CORRELATION_MISSING');
const result={schemaVersion:1,phase:process.env.PHASE,releaseCommit:JSON.parse(fs.readFileSync(process.env.RELEASE_MANIFEST)).gitCommit,containers,sms:{senderApproved:true,globalGateClosed:true,webhookSecretPresent:true,evidenceMount:{type:mount.Type,destination:mount.Destination},environmentNames:Object.keys(env).filter(k=>/^(BREVO_SMS_SENDER|POPULATION_BREVO_SMS_WEBHOOK_SECRET|POPULATION_SMS_PRODUCTION_VALIDATED|POPULATION_SMS_LIVE_VALIDATION_EVIDENCE_DIR)$/.test(k)).sort(),evidence:records}};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
NODE
}

before="$(mktemp /tmp/coro-maintenance-before.XXXXXX.json)"
after="$(mktemp /tmp/coro-maintenance-after.XXXXXX.json)"
snapshot BEFORE "$before" || fail SANITIZED_PREFLIGHT_FAILED

for pair in 'coro_frontend frontend' 'coro_client_portal clientPortal' 'coro_website website'; do
  read -r container key <<<"$pair"
  active="$(node -e 'const{execFileSync}=require("child_process");const c=JSON.parse(execFileSync("docker",["inspect",process.argv[1]]))[0];const i=JSON.parse(execFileSync("docker",["image","inspect",c.Image]))[0];process.stdout.write(i.RepoDigests?.[0]||"")' "$container")"
  expected="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.images[process.argv[2]]||"")' "$manifest" "$key")"
  [[ "$active" == "$expected" ]] || fail UNRELATED_SERVICE_IMAGE_MISMATCH
done

docker pull --platform linux/amd64 "$TARGET_IMAGE" >/dev/null || fail TARGET_IMAGE_UNAVAILABLE
[[ "$(docker image inspect "$TARGET_IMAGE" --format '{{.Architecture}}')" == amd64 ]] || fail TARGET_ARCHITECTURE_MISMATCH
rollback_id="$(docker inspect --format '{{.Image}}' coro_backend)"
rollback_ref="$(docker image inspect --format '{{index .RepoDigests 0}}' "$rollback_id")"
[[ "$rollback_ref" =~ @sha256:[0-9a-f]{64}$ ]] || fail ROLLBACK_IMAGE_INVALID

override="$(mktemp /tmp/coro-single-service.XXXXXX.yml)"
printf 'services:\n  backend:\n    image: %s\n' "$TARGET_IMAGE" >"$override"
docker compose -f "$REPO/docker-compose.yml" -f "$override" config --quiet || fail COMPOSE_CONFIGURATION_INVALID
docker compose -f "$REPO/docker-compose.yml" -f "$override" up -d --no-deps --no-build backend >/dev/null || fail BACKEND_RECONCILIATION_FAILED
changed=true

for _ in $(seq 1 40); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 -H 'content-type: application/json' -d '{"email":"maintenance-smoke@example.invalid","password":"invalid"}' http://127.0.0.1:3002/api/auth/login || true)"
  [[ "$code" =~ ^(400|401)$ ]] && break
  sleep 3
done
[[ "$code" =~ ^(400|401)$ ]] || fail BACKEND_HEALTH_FAILED
[[ "$(docker inspect --format '{{.RestartCount}}' coro_backend)" == 0 ]] || fail BACKEND_RESTARTED

head="$(docker compose -f "$REPO/docker-compose.yml" exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1'\''')"
[[ "$head" == 20261103010000_network_typed_customer_actor_provenance ]] || fail MIGRATION_HEAD_CHANGED
snapshot AFTER "$after" || fail SANITIZED_POSTCHECK_FAILED
node - "$before" "$after" <<'NODE'
const fs=require('fs');const a=JSON.parse(fs.readFileSync(process.argv[2])),b=JSON.parse(fs.readFileSync(process.argv[3]));
for(const n of ['coro_frontend','coro_client_portal','coro_website'])if(JSON.stringify(a.containers[n])!==JSON.stringify(b.containers[n]))throw Error(`UNRELATED_SERVICE_CHANGED:${n}`);
if(JSON.stringify(a.sms)!==JSON.stringify(b.sms))throw Error('SMS_CONFIGURATION_OR_EVIDENCE_CHANGED');
NODE
node - "$before" "$after" "$evidence" <<'NODE'
const fs=require('fs');const before=JSON.parse(fs.readFileSync(process.argv[2])),after=JSON.parse(fs.readFileSync(process.argv[3]));fs.writeFileSync(process.argv[4],JSON.stringify({schemaVersion:1,status:'SUCCESS',completedAt:new Date().toISOString(),before,after},null,2)+'\n',{mode:0o600,flag:'wx'});
NODE
rm -f -- "$before" "$after"
changed=false
printf 'SINGLE_SERVICE_MAINTENANCE_SUCCESS service=backend commit=%s evidence=%s\n' "$RELEASE_COMMIT" "$evidence"
