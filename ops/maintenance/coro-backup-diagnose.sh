#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

backup_dir=/opt/coro-ops/backups/database
env_file=/etc/coro-backup/backup.env

[[ -d "$backup_dir" && ! -L "$backup_dir" ]] || { echo 'BACKUP_DIAGNOSIS_FAILED code=BACKUP_DIR_UNSAFE'; exit 1; }
[[ -f "$env_file" && ! -L "$env_file" ]] || { echo 'BACKUP_DIAGNOSIS_FAILED code=CONFIG_UNAVAILABLE'; exit 1; }

# Numeric capacity policy only. Never emit the environment file or secret values.
set -a
source "$env_file"
set +a
min_bytes="${CORO_BACKUP_MIN_FREE_BYTES:-5368709120}"
min_percent="${CORO_BACKUP_MIN_FREE_PERCENT:-10}"
margin_bytes="${CORO_BACKUP_LAST_DUMP_MARGIN_BYTES:-1073741824}"
for value in "$min_bytes" "$min_percent" "$margin_bytes"; do [[ "$value" =~ ^[0-9]+$ ]] || exit 2; done

read -r total_kib available_kib available_percent < <(df -Pk -- "$backup_dir" | awk 'NR==2 {gsub(/%/,"",$5); print $2, $4, 100-$5}')
read -r inode_total inode_available inode_percent < <(df -Pi -- "$backup_dir" | awk 'NR==2 {gsub(/%/,"",$5); print $2, $4, 100-$5}')
largest_dump=0
while IFS= read -r -d '' item; do
  size="$(stat -c '%s' -- "$item")"
  (( size > largest_dump )) && largest_dump="$size"
done < <(find "$backup_dir" -maxdepth 1 -type f -name '*.dump' -print0)

available_bytes=$((available_kib * 1024))
percent_required=$((total_kib * 1024 * min_percent / 100))
history_required=$((largest_dump * 2 + margin_bytes))
required_bytes="$min_bytes"
(( percent_required > required_bytes )) && required_bytes="$percent_required"
(( history_required > required_bytes )) && required_bytes="$history_required"

service_result="$(systemctl show -p Result --value coro-db-backup.service)"
timer_state="$(systemctl show -p ActiveState --value coro-db-backup.timer)"
lock_busy=false
exec 9>"$backup_dir/.coro-db-backup.lock"
flock -n 9 || lock_busy=true

failure_code=NOT_DETERMINED
if (( available_bytes < required_bytes )); then failure_code=LOW_DISK; fi
if [[ "$lock_busy" == true ]]; then failure_code=LOCK_UNAVAILABLE; fi

node - "$service_result" "$timer_state" "$available_bytes" "$required_bytes" "$inode_total" "$inode_available" "$inode_percent" "$largest_dump" "$lock_busy" "$failure_code" <<'NODE'
const [serviceResult,timerState,availableBytes,requiredBytes,inodeTotal,inodeAvailable,inodeFreePercent,largestDumpBytes,lockBusy,failureCode]=process.argv.slice(2);
console.log(JSON.stringify({schemaVersion:1,serviceResult,timerState,capacity:{availableBytes:Number(availableBytes),requiredBytes:Number(requiredBytes),largestDumpBytes:Number(largestDumpBytes)},inodes:{total:Number(inodeTotal),available:Number(inodeAvailable),freePercent:Number(inodeFreePercent)},lockBusy:lockBusy==='true',failureCode},null,2));
NODE

journalctl -u coro-db-backup.service -n 30 --no-pager -o cat \
  | grep -Eo 'ERROR_CODE=[A-Z0-9_]+|BACKUP_[A-Z0-9_]+|LOCAL_BACKUP_FAILED|REMOTE_[A-Z0-9_]+' \
  | sort -u || true
