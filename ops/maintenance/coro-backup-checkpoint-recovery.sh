#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ "${BACKUP_RECOVERY_APPROVAL:-}" == RECOVER_BACKUP_CHECKPOINT ]] || { echo 'BACKUP_RECOVERY_FAILED code=APPROVAL_MISSING'; exit 1; }
lock_file=/run/lock/coro-production-deployment.lock
backup_dir=/opt/coro-ops/backups/database
env_file=/etc/coro-backup/backup.env
[[ -d "$backup_dir" && ! -L "$backup_dir" && -f "$env_file" && ! -L "$env_file" ]] || { echo 'BACKUP_RECOVERY_FAILED code=PATH_UNSAFE'; exit 1; }

exec 9>"$lock_file"
flock --nonblock 9 || { echo 'BACKUP_RECOVERY_FAILED code=DEPLOYMENT_LOCK_BUSY'; exit 1; }

set -a; source "$env_file"; set +a
min_bytes="${CORO_BACKUP_MIN_FREE_BYTES:-5368709120}"
[[ "$min_bytes" =~ ^[0-9]+$ ]] || exit 2
before=$(( $(df -Pk -- "$backup_dir" | awk 'NR==2 {print $4}') * 1024 ))

# Remove dangling layers only. Tagged current, rollback and historical images remain.
docker image prune --force >/dev/null
after=$(( $(df -Pk -- "$backup_dir" | awk 'NR==2 {print $4}') * 1024 ))

if (( after < min_bytes )); then
  current_commit="$(git -C /opt/coro-platform rev-parse HEAD)"
  release_manifest="/opt/coro-ops/releases/production-${current_commit}.json"
  [[ -f "$release_manifest" && ! -L "$release_manifest" ]] || { echo 'BACKUP_RECOVERY_FAILED code=ACTIVE_MANIFEST_MISSING'; exit 1; }
  mapfile -t protected_refs < <(node -e 'const m=require(process.argv[1]);for(const r of [...Object.values(m.images||{}),...(m.previousImages||[])])if(typeof r==="string")console.log(r)' "$release_manifest")
  declare -A protected_ids=()
  while IFS= read -r id; do [[ -n "$id" ]] && protected_ids["$id"]=1; done < <(docker ps -aq | xargs -r docker inspect --format '{{.Image}}')
  for ref in "${protected_refs[@]}"; do
    id="$(docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true)"
    [[ -n "$id" ]] && protected_ids["$id"]=1
  done
  mapfile -t all_ids < <(docker image ls -q --no-trunc | sort -u)
  removed=0
  for id in "${all_ids[@]}"; do
    [[ -z "${protected_ids[$id]:-}" ]] || continue
    docker image rm --force "$id" >/dev/null 2>&1 || continue
    removed=$((removed + 1))
    after=$(( $(df -Pk -- "$backup_dir" | awk 'NR==2 {print $4}') * 1024 ))
    (( after >= min_bytes )) && break
  done
  echo "BACKUP_RECOVERY_LOCAL_IMAGE_CACHE removed=$removed"
fi
(( after >= min_bytes )) || { echo "BACKUP_RECOVERY_FAILED code=SAFE_RECLAIM_INSUFFICIENT beforeBytes=$before afterBytes=$after requiredBytes=$min_bytes"; exit 1; }

systemctl reset-failed coro-db-backup.service
systemctl start coro-db-backup.service
[[ "$(systemctl show -p Result --value coro-db-backup.service)" == success ]] || { echo 'BACKUP_RECOVERY_FAILED code=BACKUP_SERVICE_FAILED'; exit 1; }

state="$backup_dir/backup-state.json"
backup_id="$(node -e 'const s=require(process.argv[1]);if(s.consecutiveFailures!==0||!s.lastBackupId||!s.lastRemoteVersionId)process.exit(1);process.stdout.write(s.lastBackupId)' "$state")" || { echo 'BACKUP_RECOVERY_FAILED code=REMOTE_STATE_INVALID'; exit 1; }
manifest="$backup_dir/$backup_id.remote.manifest.json"
node -e 'const m=require(process.argv[1]);if(m.status!=="REMOTE_VERIFIED"||m.remoteVerification!=="PASSED"||!m.remoteVersionId||!/^([a-f0-9]{64})$/.test(m.sha256))process.exit(1)' "$manifest" || { echo 'BACKUP_RECOVERY_FAILED code=REMOTE_MANIFEST_INVALID'; exit 1; }

systemctl reset-failed coro-db-restore-test.service
systemctl start coro-db-restore-test.service
[[ "$(systemctl show -p Result --value coro-db-restore-test.service)" == success ]] || { echo 'BACKUP_RECOVERY_FAILED code=RESTORE_VERIFICATION_FAILED'; exit 1; }

echo "BACKUP_RECOVERY_SUCCESS backupId=$backup_id beforeBytes=$before afterBytes=$after"
