#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

repo=/opt/coro-platform
backup_dir=/opt/coro-ops/backups/database
release_dir=/opt/coro-ops/releases
backup_env=/etc/coro-backup/backup.env
[[ -d "$repo/.git" && -d "$backup_dir" && ! -L "$backup_dir" && -d "$release_dir" && ! -L "$release_dir" ]] || { echo 'CAPACITY_AUDIT_FAILED code=PATH_UNSAFE'; exit 1; }
[[ -f "$backup_env" && ! -L "$backup_env" ]] || { echo 'CAPACITY_AUDIT_FAILED code=CONFIG_UNAVAILABLE'; exit 1; }

exec 9>/run/lock/coro-production-deployment.lock
flock --nonblock 9 || { echo 'CAPACITY_AUDIT_FAILED code=DEPLOYMENT_LOCK_BUSY'; exit 1; }

set -a; source "$backup_env"; set +a
min_bytes="${CORO_BACKUP_MIN_FREE_BYTES:-5368709120}"
min_percent="${CORO_BACKUP_MIN_FREE_PERCENT:-10}"
margin_bytes="${CORO_BACKUP_LAST_DUMP_MARGIN_BYTES:-1073741824}"
for value in "$min_bytes" "$min_percent" "$margin_bytes"; do [[ "$value" =~ ^[0-9]+$ ]] || exit 2; done

read -r total_kib free_kib used_percent < <(df -Pk -- "$backup_dir" | awk 'NR==2 {gsub(/%/,"",$5); print $2,$4,$5}')
read -r inode_total inode_free inode_used_percent < <(df -Pi -- "$backup_dir" | awk 'NR==2 {gsub(/%/,"",$5); print $2,$4,$5}')
total_bytes=$((total_kib * 1024)); free_bytes=$((free_kib * 1024))
largest_dump=0
while IFS= read -r -d '' f; do s="$(stat -c '%s' -- "$f")"; ((s > largest_dump)) && largest_dump="$s"; done < <(find "$backup_dir" -maxdepth 1 -type f -name '*.dump' -print0)
percent_required=$((total_bytes * min_percent / 100)); history_required=$((largest_dump * 2 + margin_bytes)); backup_required="$min_bytes"
((percent_required > backup_required)) && backup_required="$percent_required"
((history_required > backup_required)) && backup_required="$history_required"

active_manifest="$(find "$release_dir" -maxdepth 1 -type f -name 'production-*.json' -print0 | xargs -0 -r stat -c '%Y %n' | sort -rn | cut -d' ' -f2- | while read -r f; do node -e 'const m=require(process.argv[1]);if(m.status==="SUCCESS"){process.stdout.write(process.argv[1]);process.exit(0)}process.exit(1)' "$f" 2>/dev/null && break || true; done)"
[[ -n "$active_manifest" && -f "$active_manifest" ]] || { echo 'CAPACITY_AUDIT_FAILED code=ACTIVE_MANIFEST_MISSING'; exit 1; }

mapfile -t active_refs < <(node -e 'const m=require(process.argv[1]);for(const r of Object.values(m.images||{}))if(typeof r==="string")console.log(r)' "$active_manifest")
mapfile -t rollback_refs < <(node -e 'const m=require(process.argv[1]);for(const r of m.previousImages||[])if(typeof r==="string")console.log(r)' "$active_manifest")
declare -A protected=() reasons=() container_refs=()
while read -r id; do [[ -n "$id" ]] && protected["$id"]=1 && reasons["$id"]="CONTAINER_REFERENCE" && container_refs["$id"]=1; done < <(docker ps -aq | xargs -r docker inspect --format '{{.Image}}' | sort -u)
active_available=0; rollback_available=0
for ref in "${active_refs[@]}"; do id="$(docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true)"; if [[ -n "$id" ]]; then protected["$id"]=1; reasons["$id"]="ACTIVE_RELEASE"; active_available=$((active_available + 1)); fi; done
for ref in "${rollback_refs[@]}"; do id="$(docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || true)"; if [[ -n "$id" ]]; then protected["$id"]=1; reasons["$id"]="ROLLBACK_RELEASE"; rollback_available=$((rollback_available + 1)); fi; done

now="$(date +%s)"; image_set_bytes=0; candidates='[]'; images='[]'
for ref in "${active_refs[@]}"; do s="$(docker image inspect --format '{{.Size}}' "$ref")"; image_set_bytes=$((image_set_bytes + s)); done
while read -r id; do
  [[ -n "$id" ]] || continue
  inspect="$(docker image inspect "$id")"
  size="$(node -e 'const x=JSON.parse(process.argv[1])[0];process.stdout.write(String(x.Size||0))' "$inspect")"
  created="$(node -e 'const x=JSON.parse(process.argv[1])[0];process.stdout.write(x.Created||"")' "$inspect")"
  created_epoch="$(date -d "$created" +%s 2>/dev/null || echo "$now")"; age_hours=$(((now-created_epoch)/3600))
  reason="${reasons[$id]:-UNREFERENCED}"; eligible=false
  if [[ -z "${protected[$id]:-}" && "$age_hours" -ge 72 ]]; then eligible=true; fi
  item="$(node - "$id" "$size" "$created" "$age_hours" "$reason" "$eligible" <<'NODE'
const [id,size,created,ageHours,reason,eligible]=process.argv.slice(2);console.log(JSON.stringify({id,sizeBytes:Number(size),created,ageHours:Number(ageHours),protection:reason,cleanupEligible:eligible==='true'}));
NODE
)"
  images="$(node -e 'const a=JSON.parse(process.argv[1]);a.push(JSON.parse(process.argv[2]));process.stdout.write(JSON.stringify(a))' "$images" "$item")"
  [[ "$eligible" == true ]] && candidates="$(node -e 'const a=JSON.parse(process.argv[1]);a.push(JSON.parse(process.argv[2]));process.stdout.write(JSON.stringify(a))' "$candidates" "$item")"
done < <(docker image ls -q --no-trunc | sort -u)

db_bytes="$(docker compose -f "$repo/docker-compose.yml" exec -T postgres sh -ceu 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT pg_database_size(current_database())"' 2>/dev/null || echo 0)"
[[ "$db_bytes" =~ ^[0-9]+$ ]] || db_bytes=0
db_growth=$((db_bytes / 5)); ((db_growth < 2147483648)) && db_growth=2147483648

dir_size() { [[ -e "$1" ]] && du -sbx -- "$1" 2>/dev/null | awk '{print $1}' || echo 0; }
docker_root="$(docker info --format '{{.DockerRootDir}}')"
docker_bytes="$(dir_size "$docker_root")"; backup_bytes="$(dir_size "$backup_dir")"; release_bytes="$(dir_size "$release_dir")"
log_bytes="$(dir_size /var/log)"; tmp_bytes="$(dir_size /tmp)"; repo_bytes="$(dir_size "$repo")"; sms_bytes="$(dir_size /var/lib/coro/sms-validation)"
journal_bytes="$(journalctl --disk-usage 2>/dev/null | grep -Eo '[0-9.]+[KMGT]?B' | tail -n 1 || true)"
container_layers="$(docker ps -as --format '{{json .}}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=s.trim()?s.trim().split(/\n/).map(JSON.parse):[];console.log(JSON.stringify(a.map(x=>({name:x.Names,size:x.Size,status:x.Status}))))})')"
volumes="$(docker system df -v --format '{{json .}}' 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=s.trim()?s.trim().split(/\n/).map(JSON.parse):[];console.log(JSON.stringify(a.filter(x=>x.Type==="Local Volumes"||x.Type==="Build Cache")))})' || echo '[]')"

input="$(mktemp)"; trap 'rm -f -- "$input"' EXIT
node - "$input" "$total_bytes" "$free_bytes" "$backup_required" "$image_set_bytes" "$db_growth" <<'NODE'
const fs=require('fs');const [p,total,free,backup,images,database]=process.argv.slice(2);fs.writeFileSync(p,JSON.stringify({filesystem:{totalBytes:Number(total),freeBytes:Number(free)},requirements:{backupBytes:Number(backup),nextImageSetBytes:Number(images),databaseGrowthBytes:Number(database)}}));
NODE
policy_path="${CORO_CAPACITY_POLICY_PATH:-$repo/ops/capacity/capacity-policy.mjs}"
[[ -f "$policy_path" && ! -L "$policy_path" ]] || { echo 'CAPACITY_AUDIT_FAILED code=POLICY_UNAVAILABLE'; exit 1; }
gates="$(node "$policy_path" "$input")"

node - "$total_bytes" "$free_bytes" "$used_percent" "$inode_total" "$inode_free" "$inode_used_percent" "$backup_required" "$image_set_bytes" "$db_bytes" "$db_growth" "$docker_bytes" "$backup_bytes" "$release_bytes" "$log_bytes" "$tmp_bytes" "$repo_bytes" "$sms_bytes" "$journal_bytes" "$images" "$candidates" "$container_layers" "$volumes" "$gates" "$active_available" "$rollback_available" "${#active_refs[@]}" "${#rollback_refs[@]}" <<'NODE'
const [total,free,usedPct,inodeTotal,inodeFree,inodeUsedPct,backupRequired,imageSet,db,dbGrowth,docker,backups,releases,logs,tmp,repo,sms,journal,images,candidates,layers,volumes,gates,activeAvailable,rollbackAvailable,activeExpected,rollbackExpected]=process.argv.slice(2);
const out={schemaVersion:1,generatedAt:new Date().toISOString(),filesystem:{totalBytes:Number(total),freeBytes:Number(free),usedPercent:Number(usedPct),inodes:{total:Number(inodeTotal),free:Number(inodeFree),usedPercent:Number(inodeUsedPct)}},requirements:{backupBytes:Number(backupRequired),nextImageSetBytes:Number(imageSet),databaseBytes:Number(db),databaseGrowthBytes:Number(dbGrowth)},consumers:{dockerBytes:Number(docker),backupStagingBytes:Number(backups),releaseEvidenceBytes:Number(releases),applicationLogBytes:Number(logs),temporaryBytes:Number(tmp),repositoryBytes:Number(repo),smsEvidenceBytes:Number(sms),journalUsage:journal,containerWritableLayers:JSON.parse(layers),dockerAccounting:JSON.parse(volumes)},imageProtection:{activeExpected:Number(activeExpected),activeAvailable:Number(activeAvailable),rollbackExpected:Number(rollbackExpected),rollbackAvailable:Number(rollbackAvailable),rollbackReady:Number(rollbackExpected)===4&&Number(rollbackAvailable)===4},images:JSON.parse(images),cleanupCandidates:JSON.parse(candidates),gates:JSON.parse(gates),protectedPolicy:["ACTIVE_CONTAINER_IMAGES","ACTIVE_RELEASE_IMAGES","FOUR_ROLLBACK_IMAGES","DATABASE_VOLUMES","BACKUP_HISTORY","REMOTE_MANIFESTS","SMS_EVIDENCE","AUDIT_LOGS","CUSTOMER_DOCUMENTS","SECRETS_AND_CONFIG_BACKUPS","ACTIVE_REPOSITORY"]};
console.log(JSON.stringify(out,null,2));
NODE
