#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode="${CAPACITY_CLEANUP_MODE:-DRY_RUN}"
[[ "$mode" == DRY_RUN || "$mode" == EXECUTE ]] || { echo 'CAPACITY_CLEANUP_FAILED code=MODE_INVALID'; exit 1; }
if [[ "$mode" == EXECUTE ]]; then
  [[ "${CAPACITY_CLEANUP_APPROVAL:-}" == EXECUTE_REVIEWED_RETENTION_POLICY ]] || { echo 'CAPACITY_CLEANUP_FAILED code=APPROVAL_MISSING'; exit 1; }
fi

repo="${CORO_REPO:-/opt/coro-platform}"
release_dir="${CORO_RELEASE_DIR:-/opt/coro-ops/releases}"
state_root="${CORO_RELEASE_STATE_ROOT:-$release_dir/state}"
policy_file="${CORO_RETENTION_POLICY_FILE:-$repo/ops/capacity/release-retention-policy.json}"
plan_tool="${CORO_RETENTION_PLAN_TOOL:-$repo/ops/capacity/release-retention-plan.mjs}"
temp_root="${CORO_CAPACITY_TEMP_ROOT:-/opt/coro-ops/tmp/release-cache}"
[[ -d "$repo/.git" && -d "$release_dir" && ! -L "$release_dir" && -f "$policy_file" && ! -L "$policy_file" && -f "$plan_tool" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=PATH_UNSAFE'; exit 1; }

exec 9>/run/lock/coro-production-deployment.lock
flock --nonblock 9 || { echo 'CAPACITY_CLEANUP_FAILED code=DEPLOYMENT_LOCK_BUSY'; exit 1; }

cache_age_hours="$(node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const v=p.minimumBuildCacheAgeHours;if(!Number.isInteger(v)||v<12||v>168)process.exit(1);process.stdout.write(String(v))' "$policy_file")" || { echo 'CAPACITY_CLEANUP_FAILED code=CACHE_AGE_INVALID'; exit 1; }
target_free_bytes="$(node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const v=p.warningFreeBytes;if(!Number.isSafeInteger(v)||v<1073741824)process.exit(1);process.stdout.write(String(v))' "$policy_file")" || { echo 'CAPACITY_CLEANUP_FAILED code=WARNING_THRESHOLD_INVALID'; exit 1; }

bootstrap_marker=""
marker="$(find "$state_root" -maxdepth 1 -type f -name 'production-*.reconciled.json' -printf '%T@ %p\n' | sort -rn | sed -n '1p' | cut -d' ' -f2-)"
if [[ -z "$marker" && "$mode" == DRY_RUN ]]; then
  # Liste lue en entier avant la boucle : un `break` dans un pipe ferait
  # échouer `cut` (SIGPIPE) sous pipefail dès que la liste dépasse 64 Ko.
  manifest_preview_candidates="$(find "$release_dir" -maxdepth 1 -type f -name 'production-*.json' -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)"
  manifest_preview="$(while read -r candidate; do node -e 'const fs=require("fs"),m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.exit(m.status==="SUCCESS"?0:1)' "$candidate" 2>/dev/null && { echo "$candidate"; break; } || true; done <<<"$manifest_preview_candidates")"
  [[ -n "$manifest_preview" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=RECONCILED_RELEASE_MISSING'; exit 1; }
  bootstrap_marker="$(mktemp)"
  node -e 'const fs=require("fs"),m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));fs.writeFileSync(process.argv[2],JSON.stringify({releaseId:m.releaseId,manifestPath:process.argv[1],manifestSha256:process.argv[3],reconciledAt:m.timestampUtc}));' "$manifest_preview" "$bootstrap_marker" "$(sha256sum "$manifest_preview" | cut -d' ' -f1)"
  marker="$bootstrap_marker"
  echo 'CAPACITY_CLEANUP_NOTICE code=BOOTSTRAP_RECONCILIATION_REQUIRED previewOnly=true'
fi
[[ -n "$marker" && -f "$marker" && ! -L "$marker" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=RECONCILED_RELEASE_MISSING'; exit 1; }
manifest="$(node -e 'const fs=require("fs"),m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(m.manifestPath||"")' "$marker")"
expected_sha="$(node -e 'const fs=require("fs"),m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(m.manifestSha256||"")' "$marker")"
[[ -f "$manifest" && ! -L "$manifest" && "$(sha256sum "$manifest" | cut -d' ' -f1)" == "$expected_sha" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=RECONCILED_EVIDENCE_INVALID'; exit 1; }

input="$(mktemp)"; plan="$(mktemp)"; docker_df="$(mktemp)"
trap 'rm -f -- "$input" "$plan" "$docker_df" "${bootstrap_marker:-}"' EXIT
node - "$manifest" "$marker" "$policy_file" "$input" "$state_root" <<'NODE'
const fs=require('fs');
const crypto=require('crypto');
const path=require('path');
const read=(file)=>JSON.parse(fs.readFileSync(file,'utf8'));
const policy=read(process.argv[4]);
const root=process.argv[6];
const releases=[];
for(const name of fs.readdirSync(root).filter((name)=>/^production-[0-9a-f]{40}(?:-[0-9]{8}T[0-9]{6}Z)?\.reconciled\.json$/.test(name))){
  const marker=read(path.join(root,name));
  const bytes=fs.readFileSync(marker.manifestPath);
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==marker.manifestSha256) throw new Error('RECONCILED_EVIDENCE_INVALID');
  const manifest=JSON.parse(bytes);
  releases.push({releaseId:marker.releaseId,status:manifest.status,reconciled:true,timestampUtc:marker.reconciledAt,images:manifest.images,previousImages:manifest.previousImages,rollbackImagesByService:manifest.rollbackImagesByService});
}
if(!releases.length){
  const manifest=read(process.argv[2]), marker=read(process.argv[3]);
  releases.push({releaseId:marker.releaseId,status:manifest.status,reconciled:true,timestampUtc:marker.reconciledAt,images:manifest.images,previousImages:manifest.previousImages,rollbackImagesByService:manifest.rollbackImagesByService});
}
fs.writeFileSync(process.argv[5],JSON.stringify({releases,explicitCandidates:policy.explicitCandidates||[],blockedRollbackImages:policy.blockedRollbackImages||[]},null,2));
NODE
node "$plan_tool" "$input" >"$plan" || { echo 'CAPACITY_CLEANUP_FAILED code=RETENTION_PLAN_INVALID'; exit 1; }
node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));for(const [service,v] of Object.entries(p.servicePlan))console.log(`CAPACITY_RETENTION_SERVICE service=${service} imageKey=${v.imageKey} active=${v.active} rollback=${v.rollback} unchanged=${v.unchangedAcrossLatestRelease}`)' "$plan"

declare -A protected=()
while read -r id; do [[ -n "$id" ]] && protected["$id"]=CONTAINER_REFERENCE; done < <(docker ps -aq | xargs -r docker inspect --format '{{.Image}}' | sort -u)
while read -r ref; do
  id="$(docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true)"
  [[ -n "$id" ]] && protected["$id"]=RELEASE_POLICY
done < <(node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));for(const r of p.protectedImages)console.log(r)' "$plan")

free_bytes() { echo $(( $(df -Pk -- "$release_dir" | awk 'NR==2 {print $4}') * 1024 )); }
before="$(free_bytes)"; previous="$before"; candidates=0; removed=0
docker system df
docker system df -v >"$docker_df" || { echo 'CAPACITY_CLEANUP_FAILED code=DOCKER_PHYSICAL_ACCOUNTING_UNAVAILABLE'; exit 1; }

unique_bytes_for_image() {
  node - "$docker_df" "$1" <<'NODE'
const fs=require('fs');
const [file,id]=process.argv.slice(2);
const parse=(value)=>{const m=String(value||'').match(/^([0-9]+(?:\.[0-9]+)?)\s*([kKmMgGtT]?B)$/);if(!m)return null;const units={B:1,kB:1e3,KB:1e3,MB:1e6,GB:1e9,TB:1e12};return Math.round(Number(m[1])*units[m[2]]);};
const full=id.replace(/^sha256:/,'');
const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);
// `docker system df -v` has a stable image table whose rightmost columns are
// SIZE, SHARED SIZE, UNIQUE SIZE and CONTAINERS. CREATED is variable-width, so
// parse from the right and identify the immutable image ID independently.
const values=[];
for(const line of lines){
  const parts=line.trim().split(/\s+/);
  if(parts.length<7)continue;
  const imageId=String(parts[2]||'').replace(/^sha256:/,'');
  if(!imageId||!full.startsWith(imageId))continue;
  const value=parse(parts.at(-2));
  if(Number.isSafeInteger(value)&&value>=0)values.push(value);
}
const unique=[...new Set(values)];
if(unique.length!==1)process.exit(2);process.stdout.write(String(unique[0]));
NODE
}

while read -r id; do
  [[ -n "$id" && -z "${protected[$id]:-}" ]] || continue
  size="$(docker image inspect --format '{{.Size}}' "$id")"
  unique_size="$(unique_bytes_for_image "$id")" || { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_PHYSICAL_SIZE_UNAVAILABLE id=$id"; exit 1; }
  # Règle du propriétaire (21 nov. 2026) : une image active et une image de
  # retour arrière par service, rien de plus. Toute autre image CORO
  # récupérable depuis GHCR est retirée à chaque passage, même quand le
  # disque a encore de la place ; la cible d'espace ne sert plus que de
  # rapport (targetReached).
  candidates=$((candidates + 1))
  mapfile -t remote_digests < <(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$id" | grep -E '^ghcr\.io/nextsolution-crypto/coro-[a-z0-9_.-]+@sha256:[0-9a-f]{64}$' | sort -u)
  recoverable_digest=""
  for digest in "${remote_digests[@]}"; do
    if docker manifest inspect "$digest" >/dev/null 2>&1; then recoverable_digest="$digest"; break; fi
  done
  if [[ -z "$recoverable_digest" ]]; then
    echo "CAPACITY_CLEANUP_SKIPPED category=image id=$id reason=GHCR_RECOVERY_NOT_VERIFIED"
    continue
  fi
  echo "CAPACITY_CLEANUP_CANDIDATE category=image id=$id logicalSizeBytes=$size physicallyRecoverableBytes=$unique_size remoteRecoverable=true reason=UNREFERENCED_UNPROTECTED_IMAGE"
  if [[ "$mode" == EXECUTE ]]; then
    # Recheck every reference immediately before the exact removal.
    docker ps -aq | xargs -r docker inspect --format '{{.Image}}' | grep -Fxq "$id" && { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_BECAME_REFERENCED id=$id"; exit 1; }
    [[ -z "${protected[$id]:-}" ]] || { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_BECAME_PROTECTED id=$id"; exit 1; }
    docker manifest inspect "$recoverable_digest" >/dev/null 2>&1 || { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_REMOTE_RECOVERY_CHANGED id=$id"; exit 1; }
    docker image rm "$id" >/dev/null || { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_REMOVE_FAILED id=$id"; exit 1; }
    removed=$((removed + 1))
  fi
done < <(docker image ls -q --no-trunc | sort -u)
after_images="$(free_bytes)"; echo "CAPACITY_CLEANUP_CATEGORY category=images physicallyRecoveredBytes=$((after_images-previous))"; previous="$after_images"

if [[ "$mode" == EXECUTE ]]; then
  docker builder prune -f --filter "until=${cache_age_hours}h" >/dev/null
fi
after_cache="$(free_bytes)"; echo "CAPACITY_CLEANUP_CATEGORY category=build-cache physicallyRecoveredBytes=$((after_cache-previous))"; previous="$after_cache"

while read -r container; do
  [[ -n "$container" ]] || continue
  echo "CAPACITY_CLEANUP_CANDIDATE category=container id=$container reason=EXPLICITLY_LABELED_DISPOSABLE_STOPPED_CONTAINER"
  if [[ "$mode" == EXECUTE ]]; then
    [[ "$(docker inspect --format '{{.State.Status}}' "$container")" == exited && "$(docker inspect --format '{{index .Config.Labels \"io.getcoro.disposable\"}}' "$container")" == true ]] || { echo "CAPACITY_CLEANUP_FAILED code=CONTAINER_RECHECK_FAILED id=$container"; exit 1; }
    docker container rm "$container" >/dev/null
  fi
done < <(docker ps -aq --filter status=exited --filter label=io.getcoro.disposable=true)
after_containers="$(free_bytes)"; echo "CAPACITY_CLEANUP_CATEGORY category=containers physicallyRecoveredBytes=$((after_containers-previous))"; previous="$after_containers"

if [[ -d "$temp_root" && ! -L "$temp_root" ]]; then
  while IFS= read -r -d '' file; do
    echo "CAPACITY_CLEANUP_CANDIDATE category=temporary path=$file reason=DEDICATED_RELEASE_CACHE_EXPIRED"
    [[ "$mode" == EXECUTE ]] && rm -f -- "$file"
  done < <(find "$temp_root" -xdev -type f -mtime +1 -print0)
fi
after="$(free_bytes)"
echo "CAPACITY_CLEANUP_CATEGORY category=temporaries physicallyRecoveredBytes=$((after-previous))"
echo "CAPACITY_CLEANUP_RESULT mode=$mode retentionBasis=SERVICE_ACTIVE_AND_PREVIOUS_ROLLBACK targetFreeBytes=$target_free_bytes candidates=$candidates removed=$removed physicallyRecoveredBytes=$((after-before)) beforeFreeBytes=$before afterFreeBytes=$after targetReached=$([[ $after -ge $target_free_bytes ]] && echo true || echo false) activeReleaseId=$(node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.activeReleaseId)' "$plan")"
