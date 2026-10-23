#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

mode="${ROLLBACK_IMAGE_RESTORE_MODE:-DRY_RUN}"
[[ "$mode" == DRY_RUN || "$mode" == EXECUTE ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=MODE_INVALID'; exit 1; }
if [[ "$mode" == EXECUTE ]]; then
  [[ "${ROLLBACK_IMAGE_RESTORE_APPROVAL:-}" == RESTORE_EXACT_MANIFEST_ROLLBACK_IMAGES ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=APPROVAL_MISSING'; exit 1; }
fi

repo=/opt/coro-platform
release_dir=/opt/coro-ops/releases
[[ -d "$repo/.git" && -d "$release_dir" && ! -L "$release_dir" ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=PATH_UNSAFE'; exit 1; }
exec 9>/run/lock/coro-production-deployment.lock
flock --nonblock 9 || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=DEPLOYMENT_LOCK_BUSY'; exit 1; }

active_manifest="$(find "$release_dir" -maxdepth 1 -type f -name 'production-*.json' -print0 | xargs -0 -r stat -c '%Y %n' | sort -rn | cut -d' ' -f2- | while read -r f; do node -e 'const m=require(process.argv[1]);if(m.status==="SUCCESS"){process.stdout.write(process.argv[1]);process.exit(0)}process.exit(1)' "$f" 2>/dev/null && break || true; done)"
[[ -n "$active_manifest" && -f "$active_manifest" ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=ACTIVE_MANIFEST_MISSING'; exit 1; }
mapfile -t rollback_refs < <(node -e 'const m=require(process.argv[1]);for(const r of m.previousImages||[])if(typeof r==="string")console.log(r)' "$active_manifest")
[[ "${#rollback_refs[@]}" -eq 4 ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=ROLLBACK_SET_INVALID'; exit 1; }

declare -A unique=()
for ref in "${rollback_refs[@]}"; do
  [[ "$ref" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$ ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=ROLLBACK_REF_INVALID'; exit 1; }
  [[ -z "${unique[$ref]:-}" ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=ROLLBACK_REF_DUPLICATE'; exit 1; }
  unique["$ref"]=1
done

container_state() {
  docker ps -q | sort | while read -r id; do
    docker inspect --format '{{.Id}} {{.Image}} {{.RestartCount}} {{.State.StartedAt}}' "$id"
  done
}

before_state="$(container_state)"
available=0
restored=0
for ref in "${rollback_refs[@]}"; do
  if docker image inspect "$ref" >/dev/null 2>&1; then
    available=$((available + 1))
    echo "ROLLBACK_IMAGE_STATUS ref=$ref state=AVAILABLE"
    continue
  fi
  echo "ROLLBACK_IMAGE_STATUS ref=$ref state=MISSING"
  if [[ "$mode" == EXECUTE ]]; then
    docker pull --platform linux/amd64 "$ref" >/dev/null
    docker image inspect "$ref" >/dev/null
    restored=$((restored + 1))
  fi
done

after_state="$(container_state)"
[[ "$before_state" == "$after_state" ]] || { echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=ACTIVE_CONTAINER_STATE_CHANGED'; exit 1; }

final_available=0
for ref in "${rollback_refs[@]}"; do
  docker image inspect "$ref" >/dev/null 2>&1 && final_available=$((final_available + 1))
done
if [[ "$mode" == EXECUTE && "$final_available" -ne 4 ]]; then
  echo 'ROLLBACK_IMAGE_RESTORE_FAILED code=ROLLBACK_SET_INCOMPLETE'
  exit 1
fi

free_bytes=$(( $(df -Pk -- "$release_dir" | awk 'NR==2 {print $4}') * 1024 ))
echo "ROLLBACK_IMAGE_RESTORE_RESULT mode=$mode expected=4 initiallyAvailable=$available restored=$restored finalAvailable=$final_available activeContainersUnchanged=true freeBytes=$free_bytes"
