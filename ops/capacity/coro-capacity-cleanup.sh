#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode="${CAPACITY_CLEANUP_MODE:-DRY_RUN}"
[[ "$mode" == DRY_RUN || "$mode" == EXECUTE ]] || { echo 'CAPACITY_CLEANUP_FAILED code=MODE_INVALID'; exit 1; }
if [[ "$mode" == EXECUTE ]]; then
  [[ "${CAPACITY_CLEANUP_APPROVAL:-}" == REMOVE_LISTED_UNREFERENCED_IMAGE_CACHE ]] || { echo 'CAPACITY_CLEANUP_FAILED code=APPROVAL_MISSING'; exit 1; }
fi

repo=/opt/coro-platform
release_dir=/opt/coro-ops/releases
[[ -d "$repo/.git" && -d "$release_dir" && ! -L "$release_dir" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=PATH_UNSAFE'; exit 1; }
exec 9>/run/lock/coro-production-deployment.lock
flock --nonblock 9 || { echo 'CAPACITY_CLEANUP_FAILED code=DEPLOYMENT_LOCK_BUSY'; exit 1; }

active_manifest="$(find "$release_dir" -maxdepth 1 -type f -name 'production-*.json' -print0 | xargs -0 -r stat -c '%Y %n' | sort -rn | cut -d' ' -f2- | while read -r f; do node -e 'const m=require(process.argv[1]);if(m.status==="SUCCESS"){process.stdout.write(process.argv[1]);process.exit(0)}process.exit(1)' "$f" 2>/dev/null && break || true; done)"
[[ -n "$active_manifest" && -f "$active_manifest" ]] || { echo 'CAPACITY_CLEANUP_FAILED code=ACTIVE_MANIFEST_MISSING'; exit 1; }
mapfile -t protected_refs < <(node -e 'const m=require(process.argv[1]);for(const r of [...Object.values(m.images||{}),...(m.previousImages||[])])if(typeof r==="string")console.log(r)' "$active_manifest")
declare -A protected=()
while read -r id; do [[ -n "$id" ]] && protected["$id"]=1; done < <(docker ps -aq | xargs -r docker inspect --format '{{.Image}}' | sort -u)
for ref in "${protected_refs[@]}"; do id="$(docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true)"; [[ -n "$id" ]] && protected["$id"]=1; done

before=$(( $(df -Pk -- "$release_dir" | awk 'NR==2 {print $4}') * 1024 ))
now="$(date +%s)"; candidates=0; removed=0; reclaimed=0
while read -r id; do
  [[ -n "$id" && -z "${protected[$id]:-}" ]] || continue
  created="$(docker image inspect --format '{{.Created}}' "$id")"
  size="$(docker image inspect --format '{{.Size}}' "$id")"
  epoch="$(date -d "$created" +%s 2>/dev/null || echo "$now")"; age_hours=$(((now-epoch)/3600))
  (( age_hours >= 72 )) || continue
  candidates=$((candidates + 1))
  echo "CAPACITY_CLEANUP_CANDIDATE id=$id sizeBytes=$size ageHours=$age_hours reason=UNREFERENCED_STALE_IMAGE_CACHE"
  if [[ "$mode" == EXECUTE ]]; then
    docker image rm "$id" >/dev/null || { echo "CAPACITY_CLEANUP_FAILED code=IMAGE_REMOVE_FAILED id=$id"; exit 1; }
    removed=$((removed + 1)); reclaimed=$((reclaimed + size))
  fi
done < <(docker image ls -q --no-trunc | sort -u)
after=$(( $(df -Pk -- "$release_dir" | awk 'NR==2 {print $4}') * 1024 ))
echo "CAPACITY_CLEANUP_RESULT mode=$mode candidates=$candidates removed=$removed estimatedReclaimedBytes=$reclaimed beforeBytes=$before afterBytes=$after"
