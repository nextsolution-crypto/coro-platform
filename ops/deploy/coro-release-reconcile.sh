#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${CORO_RELEASE_REPO:-/opt/coro-platform}"
RELEASE_DIR="${CORO_RELEASE_DIR:-/opt/coro-ops/releases}"
STATE_ROOT="${CORO_RELEASE_STATE_ROOT:-$RELEASE_DIR/state}"
LOCK_FILE="${CORO_RELEASE_LOCK_FILE:-/run/lock/coro-production-deployment.lock}"
STATE_TOOL="${CORO_RELEASE_STATE_TOOL:-$RELEASE_DIR/runtime/release-state.mjs}"

[[ "${RELEASE_COMMIT:-}" =~ ^[0-9a-f]{40}$ ]] || { echo 'RECONCILIATION_FAILED code=RELEASE_COMMIT_INVALID' >&2; exit 1; }
release_id="production-${RELEASE_COMMIT}"
state_json="$(node "$STATE_TOOL" read --root "$STATE_ROOT" --release-id "$release_id")" || exit 1
state="$(node -e 'const s=JSON.parse(process.argv[1]);process.stdout.write(s.state)' "$state_json")"
[[ "$state" == SUCCEEDED ]] || { echo "RECONCILIATION_UNKNOWN code=STATE_${state}" >&2; exit 1; }

manifest="$(node -e 'const s=JSON.parse(process.argv[1]);if(!s.manifestPath)process.exit(1);process.stdout.write(s.manifestPath)' "$state_json")" || exit 1
expected_manifest_sha="$(node -e 'const s=JSON.parse(process.argv[1]);process.stdout.write(s.manifestSha256||"")' "$state_json")"
[[ -f "$manifest" && ! -L "$manifest" ]] || { echo 'RECONCILIATION_UNKNOWN code=MANIFEST_MISSING' >&2; exit 1; }
[[ "$(sha256sum "$manifest" | cut -d' ' -f1)" == "$expected_manifest_sha" ]] || { echo 'RECONCILIATION_UNKNOWN code=MANIFEST_CHECKSUM_MISMATCH' >&2; exit 1; }
[[ "$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.gitCommit||"")' "$manifest")" == "$RELEASE_COMMIT" ]] || { echo 'RECONCILIATION_UNKNOWN code=MANIFEST_COMMIT_MISMATCH' >&2; exit 1; }

containers=(coro_backend coro_frontend coro_client_portal coro_website)
manifest_keys=(backend frontend clientPortal website)
for index in "${!containers[@]}"; do
  container="${containers[$index]}"
  key="${manifest_keys[$index]}"
  [[ "$(docker inspect --format '{{.State.Running}}' "$container" 2>/dev/null)" == true ]] || { echo "RECONCILIATION_UNKNOWN code=${container}_NOT_RUNNING" >&2; exit 1; }
  [[ "$(docker inspect --format '{{.RestartCount}}' "$container" 2>/dev/null)" == 0 ]] || { echo "RECONCILIATION_UNKNOWN code=${container}_RESTARTED" >&2; exit 1; }
  image_id="$(docker inspect --format '{{.Image}}' "$container")"
  active_ref="$(docker image inspect --format '{{index .RepoDigests 0}}' "$image_id")"
  expected_ref="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.images[process.argv[2]]||"")' "$manifest" "$key")"
  [[ "$active_ref" == "$expected_ref" ]] || { echo "RECONCILIATION_UNKNOWN code=${container}_DIGEST_MISMATCH" >&2; exit 1; }
done

migration_head="$(docker compose -f "$REPO/docker-compose.yml" exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc '\''SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1'\''')"
expected_head="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.expectedMigrationHead||"")' "$manifest")"
[[ "$migration_head" == "$expected_head" ]] || { echo 'RECONCILIATION_UNKNOWN code=MIGRATION_HEAD_MISMATCH' >&2; exit 1; }
[[ "$(git -C "$REPO" rev-parse HEAD)" == "$RELEASE_COMMIT" ]] || { echo 'RECONCILIATION_UNKNOWN code=CHECKOUT_COMMIT_MISMATCH' >&2; exit 1; }
expected_outbox_key_id="$(node -e 'const m=require(process.argv[1]);if(m.outboxConfiguration?.status!=="PASS")process.exit(1);process.stdout.write(m.outboxConfiguration.keyId||"")' "$manifest")" || { echo 'RECONCILIATION_UNKNOWN code=OUTBOX_CONFIGURATION_EVIDENCE_MISSING' >&2; exit 1; }
docker exec -e EXPECTED_OUTBOX_KEY_ID="$expected_outbox_key_id" coro_backend node -e 'const v=process.env.CLIENT_INVITATION_OUTBOX_KEY_BASE64||"";const b=Buffer.from(v,"base64");if(!/^[A-Za-z0-9+/]+={0,2}$/.test(v)||b.length!==32||b.toString("base64")!==v||process.env.CLIENT_INVITATION_OUTBOX_KEY_ID!==process.env.EXPECTED_OUTBOX_KEY_ID)process.exit(1)' || { echo 'RECONCILIATION_UNKNOWN code=OUTBOX_CONFIGURATION_MISMATCH' >&2; exit 1; }

if node -e 'process.exit(require(process.argv[1]).knowledgeRuntime ? 0 : 1)' "$manifest"; then
  backend_ref="$(node -e 'process.stdout.write(require(process.argv[1]).images.backend)' "$manifest")"
  node "$REPO/ops/knowledge/runtime-policy.mjs" verify "$backend_ref" >/dev/null || { echo 'RECONCILIATION_UNKNOWN code=KNOWLEDGE_RUNTIME_MISMATCH' >&2; exit 1; }
fi

exec 8>"$LOCK_FILE"
flock --nonblock 8 || { echo 'RECONCILIATION_UNKNOWN code=DEPLOYMENT_LOCK_BUSY' >&2; exit 1; }

reconciled_marker="$STATE_ROOT/${release_id}.reconciled.json"
marker_tmp="$(mktemp "$STATE_ROOT/.${release_id}.reconciled.XXXXXX")"
trap 'rm -f -- "${marker_tmp:-}"' EXIT
node -e '
const fs=require("fs");
fs.writeFileSync(process.argv[1],JSON.stringify({
  schemaVersion:1,
  releaseId:process.argv[2],
  releaseCommit:process.argv[3],
  manifestPath:process.argv[4],
  manifestSha256:process.argv[5],
  reconciledAt:new Date().toISOString()
},null,2)+"\n",{mode:0o600});
' "$marker_tmp" "$release_id" "$RELEASE_COMMIT" "$manifest" "$expected_manifest_sha"
mv -T -- "$marker_tmp" "$reconciled_marker"

echo "RECONCILIATION_SUCCEEDED release_id=$release_id commit=$RELEASE_COMMIT"
