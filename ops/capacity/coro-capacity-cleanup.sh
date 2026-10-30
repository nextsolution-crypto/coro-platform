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

minimum_age_hours="$(node -e 'const p=require(process.argv[1]);const v=p.minimumImageAgeHours;if(!Number.isInteger(v)||v<12||v>168)process.exit(1);process.stdout.write(String(v))' "$policy_file")" || { echo 'CAPACITY_CLEANUP_FAILED code=MINIMUM_AGE_INVALID'; exit 1; }
cache_age_hours="$(node -e 'const p=require(process.argv[1]);const v=p.minimumBuildCacheAgeHours;if(!Number.isInteger(v)||v<12||v>168)process.exit(1);process.stdout.write(String(v))' "$policy_file")" || { echo 'CAPACITY_CLEANUP_FAILED code=CACHE_AGE_INVALID'; exit 1; }

bootstrap_marker=""
marker="$(find "$state_root" -maxdepth 1 -type f -name 'production-*.reconciled.json' -printf '%T@ %p\n' | sort -rn | head -n1 | cut -d' ' -f2-)"
if [[ -z "$marker" && "$mode" == DRY_RUN ]]; then
  manifest_preview="$(find "$release_dir" -maxdepth 1 -type f -name 'production-*.json' -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2- | while read -r candidate; do node -e 'process.exit(require(process.argv[1]).status==="SUCCESS"?0:1)' "$candidate" 2>/dev/null && { echo "$candidate"; break; } || true; done)"
  [[ -n "$manifest_preview" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=RECONCILED_RELEASE_MISSING'; exit 1; }
  bootstrap_marker="$(mktemp)"
  node -e 'const fs=require("fs"),m=require(process.argv[1]);fs.writeFileSync(process.argv[2],JSON.stringify({releaseId:m.releaseId,manifestPath:process.argv[1],manifestSha256:process.argv[3],reconciledAt:m.timestampUtc}));' "$manifest_preview" "$bootstrap_marker" "$(sha256sum "$manifest_preview" | cut -d' ' -f1)"
  marker="$bootstrap_marker"
  echo 'CAPACITY_CLEANUP_NOTICE code=BOOTSTRAP_RECONCILIATION_REQUIRED previewOnly=true'
fi
[[ -n "$marker" && -f "$marker" && ! -L "$marker" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=RECONCILED_RELEASE_MISSING'; exit 1; }
manifest="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.manifestPath||"")' "$marker")"
expected_sha="$(node -e 'const m=require(process.argv[1]);process.stdout.write(m.manifestSha256||"")' "$marker")"
[[ -f "$manifest" && ! -L "$manifest" && "$(sha256sum "$manifest" | cut -d' ' -f1)" == "$expected_sha" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=RECONCILED_EVIDENCE_INVALID'; exit 1; }

input="$(mktemp)"; plan="$(mktemp)"
trap 'rm -f -- "$input" "$plan" "${bootstrap_marker:-}"' EXIT
node - "$manifest" "$marker" "$policy_file" "$input" <<'NODE'
const fs=require('fs');
const manifest=require(process.argv[2]), marker=require(process.argv[3]), policy=require(process.argv[4]);
const release={releaseId:marker.releaseId,status:manifest.status,reconciled:true,timestampUtc:marker.reconciledAt,images:manifest.images,previousImages:manifest.previousImages};
fs.writeFileSync(process.argv[5],JSON.stringify({releases:[release],explicitCandidates:policy.explicitCandidates||[],blockedRollbackImages:policy.blockedRollbackImages||[]},null,2));
NODE
node "$plan_tool" "$input" >"$plan" || { echo 'CAPACITY_CLEANUP_FAILED code=RETENTION_PLAN_INVALID'; exit 1; }

declare -A protected=()
while read -r id; do [[ -n "$id" ]] && protected["$id"]=CONTAINER_REFERENCE; done < <(docker ps -aq | xargs -r docker inspect --format '{{.Image}}' | sort -u)
while read -r ref; do
  id="$(docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true)"
  [[ -n "$id" ]] && protected["$id"]=RELEASE_POLICY
done < <(node -e 'for(const r of require(process.argv[1]).protectedImages)console.log(r)' "$plan")

free_bytes() { echo $(( $(df -Pk -- "$release_dir" | awk 'NR==2 {print $4}') * 1024 )); }
before="$(free_bytes)"; previous="$before"; now="$(date +%s)"; candidates=0; removed=0
docker system df

while read -r id; do
  [[ -n "$id" && -z "${protected[$id]:-}" ]] || continue
  created="$(docker image inspect --format '{{.Created}}' "$id")"
  size="$(docker image inspect --format '{{.Size}}' "$id")"
  epoch="$(date -d "$created" +%s 2>/dev/null || echo "$now")"; age_hours=$(((now-epoch)/3600))
  (( age_hours >= minimum_age_hours )) || continue
  candidates=$((candidates + 1))
  echo "CAPACITY_CLEANUP_CANDIDATE category=image id=$id logicalSizeBytes=$size ageHours=$age_hours reason=UNREFERENCED_EXPIRED_IMAGE"
  if [[ "$mode" == EXECUTE ]]; then
    # Recheck every reference immediately before the exact removal.
    docker ps -aq | xargs -r docker inspect --format '{{.Image}}' | grep -Fxq "$id" && { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_BECAME_REFERENCED id=$id"; exit 1; }
    [[ -z "${protected[$id]:-}" ]] || { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_BECAME_PROTECTED id=$id"; exit 1; }
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
echo "CAPACITY_CLEANUP_RESULT mode=$mode minimumAgeHours=$minimum_age_hours candidates=$candidates removed=$removed physicallyRecoveredBytes=$((after-before)) beforeFreeBytes=$before afterFreeBytes=$after activeReleaseId=$(node -e 'process.stdout.write(require(process.argv[1]).activeReleaseId)' "$plan")"
