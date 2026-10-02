#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=ops/backup/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
trap 'backup_die UNEXPECTED_FAILURE "Backup command failed unexpectedly"' ERR

readonly BACKUP_ENVIRONMENT="${CORO_BACKUP_ENVIRONMENT:-production}"
readonly BACKUP_DIR="${CORO_BACKUP_DIR:-/opt/coro-ops/backups/database}"
readonly DATABASE_NAME="${CORO_BACKUP_DATABASE:-coro_db}"
readonly POSTGRES_CONTAINER="${CORO_BACKUP_POSTGRES_CONTAINER:-coro_postgres}"
readonly POSTGRES_USER="${CORO_BACKUP_POSTGRES_USER:-coro_user}"
readonly LOCK_PATH="${CORO_BACKUP_LOCK_PATH:-/opt/coro-ops/backups/database/.coro-db-backup.lock}"
readonly CREATE_DIR="${CORO_BACKUP_CREATE_DIR:-false}"
readonly MIN_FREE_BYTES="${CORO_BACKUP_MIN_FREE_BYTES:-5368709120}"
readonly MIN_FREE_PERCENT="${CORO_BACKUP_MIN_FREE_PERCENT:-10}"
readonly LAST_DUMP_MARGIN_BYTES="${CORO_BACKUP_LAST_DUMP_MARGIN_BYTES:-1073741824}"

backup_require_safe_identifier "CORO_BACKUP_ENVIRONMENT" "$BACKUP_ENVIRONMENT"
backup_require_safe_identifier "CORO_BACKUP_DATABASE" "$DATABASE_NAME"
backup_require_safe_identifier "CORO_BACKUP_POSTGRES_CONTAINER" "$POSTGRES_CONTAINER"
backup_require_safe_identifier "CORO_BACKUP_POSTGRES_USER" "$POSTGRES_USER"
backup_require_unsigned_integer "CORO_BACKUP_MIN_FREE_BYTES" "$MIN_FREE_BYTES"
backup_require_unsigned_integer "CORO_BACKUP_MIN_FREE_PERCENT" "$MIN_FREE_PERCENT"
backup_require_unsigned_integer "CORO_BACKUP_LAST_DUMP_MARGIN_BYTES" "$LAST_DUMP_MARGIN_BYTES"
(( MIN_FREE_PERCENT <= 100 )) || backup_die PRECHECK_FAILED "CORO_BACKUP_MIN_FREE_PERCENT must be between 0 and 100"
[[ "$CREATE_DIR" == "true" || "$CREATE_DIR" == "false" ]] || \
  backup_die PRECHECK_FAILED "CORO_BACKUP_CREATE_DIR must be true or false"

for required_command in docker flock df stat sha256sum mv wc grep node date awk find id chmod mkdir dirname rm; do
  backup_require_command "$required_command"
done

if [[ -L "$BACKUP_DIR" ]]; then
  backup_die PRECHECK_FAILED "Backup directory must not be a symbolic link"
fi
if [[ ! -d "$BACKUP_DIR" ]]; then
  [[ "$CREATE_DIR" == "true" ]] || backup_die PRECHECK_FAILED "Backup directory does not exist"
  mkdir -p -- "$BACKUP_DIR" || backup_die PRECHECK_FAILED "Backup directory could not be created"
  chmod 700 -- "$BACKUP_DIR" || backup_die PRECHECK_FAILED "Backup directory permissions could not be secured"
fi
[[ -w "$BACKUP_DIR" ]] || backup_die PRECHECK_FAILED "Backup directory is not writable"

directory_owner="$(stat -c '%u' -- "$BACKUP_DIR")" || backup_die PRECHECK_FAILED "Cannot inspect backup directory owner"
[[ "$directory_owner" == "$(id -u)" ]] || backup_die PRECHECK_FAILED "Backup directory must be owned by the current user"
directory_mode="$(stat -c '%a' -- "$BACKUP_DIR")" || backup_die PRECHECK_FAILED "Cannot inspect backup directory mode"
(( (8#$directory_mode & 077) == 0 )) || backup_die PRECHECK_FAILED "Backup directory must not grant group or world permissions"

lock_parent="$(dirname -- "$LOCK_PATH")"
[[ -d "$lock_parent" && ! -L "$lock_parent" ]] || backup_die PRECHECK_FAILED "Lock directory is unavailable or unsafe"
[[ ! -L "$LOCK_PATH" ]] || backup_die PRECHECK_FAILED "Lock file must not be a symbolic link"
exec 9>"$LOCK_PATH" || backup_die PRECHECK_FAILED "Lock file cannot be opened"
flock -n 9 || backup_die LOCK_UNAVAILABLE "Another database backup is already running"

container_running="$(docker inspect --format '{{.State.Running}}' "$POSTGRES_CONTAINER" 2>/dev/null)" || \
  backup_die PRECHECK_FAILED "PostgreSQL container is unavailable"
[[ "$container_running" == "true" ]] || backup_die PRECHECK_FAILED "PostgreSQL container is not running"

available_kib="$(df -Pk -- "$BACKUP_DIR" | awk 'NR == 2 { print $4 }')"
total_kib="$(df -Pk -- "$BACKUP_DIR" | awk 'NR == 2 { print $2 }')"
backup_require_unsigned_integer "available filesystem blocks" "$available_kib"
backup_require_unsigned_integer "total filesystem blocks" "$total_kib"
available_bytes=$((available_kib * 1024))
percent_required_bytes=$((total_kib * 1024 * MIN_FREE_PERCENT / 100))

last_dump_size=0
while IFS= read -r -d '' completed_dump; do
  candidate_size="$(stat -c '%s' -- "$completed_dump")" || backup_die PRECHECK_FAILED "Cannot inspect an existing dump"
  (( candidate_size > last_dump_size )) && last_dump_size="$candidate_size"
done < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.dump' -print0)
last_dump_required_bytes=$((last_dump_size * 2 + LAST_DUMP_MARGIN_BYTES))
required_free_bytes="$(backup_max "$MIN_FREE_BYTES" "$percent_required_bytes" "$last_dump_required_bytes")"
(( available_bytes >= required_free_bytes )) || \
  backup_die LOW_DISK "Insufficient free space for a safe backup"

postgres_server_version="$(docker exec "$POSTGRES_CONTAINER" psql --no-password --username "$POSTGRES_USER" --dbname "$DATABASE_NAME" --tuples-only --no-align --command 'SHOW server_version;' 2>/dev/null)" || \
  backup_die PRECHECK_FAILED "Cannot query PostgreSQL server version"
[[ -n "$postgres_server_version" ]] || backup_die PRECHECK_FAILED "PostgreSQL server version is empty"

pg_dump_version="$(docker exec "$POSTGRES_CONTAINER" pg_dump --version 2>/dev/null)" || \
  backup_die PRECHECK_FAILED "Cannot query pg_dump version"
[[ -n "$pg_dump_version" ]] || backup_die PRECHECK_FAILED "pg_dump version is empty"

migration_head="UNKNOWN"
queried_migration_head="$(docker exec "$POSTGRES_CONTAINER" psql --no-password --username "$POSTGRES_USER" --dbname "$DATABASE_NAME" --tuples-only --no-align --command 'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 1;' 2>/dev/null || true)"
if [[ -n "$queried_migration_head" ]]; then
  migration_head="$queried_migration_head"
fi

created_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
random_suffix="$(node -e "process.stdout.write(require('crypto').randomBytes(6).toString('hex'))")" || \
  backup_die PRECHECK_FAILED "Cannot generate backup identifier"
backup_id="${BACKUP_ENVIRONMENT}-${timestamp}-${random_suffix}"
if [[ -n "${CORO_BACKUP_ID_OVERRIDE:-}" ]]; then
  [[ "$BACKUP_ENVIRONMENT" != "production" ]] || backup_die PRECHECK_FAILED "Backup ID override is forbidden in production"
  [[ "$CORO_BACKUP_ID_OVERRIDE" =~ ^${BACKUP_ENVIRONMENT}-[A-Za-z0-9_-]+$ ]] || \
    backup_die PRECHECK_FAILED "Backup ID override is invalid"
  backup_id="$CORO_BACKUP_ID_OVERRIDE"
fi

partial_dump="${BACKUP_DIR}/${backup_id}.dump.partial"
final_dump="${BACKUP_DIR}/${backup_id}.dump"
partial_manifest="${BACKUP_DIR}/${backup_id}.manifest.json.partial"
final_manifest="${BACKUP_DIR}/${backup_id}.manifest.json"
validation_list="${BACKUP_DIR}/${backup_id}.restore-list.partial"

for artifact in "$partial_dump" "$final_dump" "$partial_manifest" "$final_manifest" "$validation_list"; do
  [[ ! -e "$artifact" && ! -L "$artifact" ]] || backup_die PRECHECK_FAILED "Backup artifact collision detected"
done

if ! docker exec "$POSTGRES_CONTAINER" pg_dump --no-password --username "$POSTGRES_USER" --dbname "$DATABASE_NAME" --format=custom >"$partial_dump"; then
  backup_die DUMP_FAILED "pg_dump did not complete successfully"
fi
[[ -s "$partial_dump" ]] || backup_die DUMP_EMPTY "pg_dump produced an empty artifact"

if ! docker exec --interactive "$POSTGRES_CONTAINER" pg_restore --list <"$partial_dump" >"$validation_list"; then
  backup_die STRUCTURAL_VALIDATION_FAILED "pg_restore could not read the custom archive"
fi
if ! grep -Eq '^[0-9]+;[[:space:]]+[0-9]+[[:space:]]' "$validation_list"; then
  backup_die STRUCTURAL_VALIDATION_FAILED "Archive contains no meaningful database objects"
fi
rm -f -- "$validation_list"

mv -n -- "$partial_dump" "$final_dump" || backup_die PRECHECK_FAILED "Completed dump could not be finalized"
[[ ! -e "$partial_dump" ]] || backup_die PRECHECK_FAILED "Completed dump collision detected"
[[ -f "$final_dump" && ! -L "$final_dump" ]] || backup_die PRECHECK_FAILED "Final dump is not a regular file"

sha256="$(sha256sum -- "$final_dump" | awk '{ print $1 }')" || backup_die CHECKSUM_FAILED "Cannot calculate SHA-256"
[[ "$sha256" =~ ^[a-f0-9]{64}$ ]] || backup_die CHECKSUM_FAILED "Invalid SHA-256 result"
size_bytes="$(stat -c '%s' -- "$final_dump")" || backup_die CHECKSUM_FAILED "Cannot calculate dump size"

MANIFEST_PATH="$partial_manifest" \
MANIFEST_BACKUP_ID="$backup_id" \
MANIFEST_CREATED_AT="$created_at" \
MANIFEST_ENVIRONMENT="$BACKUP_ENVIRONMENT" \
MANIFEST_DATABASE_NAME="$DATABASE_NAME" \
MANIFEST_POSTGRES_SERVER_VERSION="$postgres_server_version" \
MANIFEST_PG_DUMP_VERSION="$pg_dump_version" \
MANIFEST_SIZE_BYTES="$size_bytes" \
MANIFEST_SHA256="$sha256" \
MANIFEST_MIGRATION_HEAD="$migration_head" \
node <<'NODE' || backup_die MANIFEST_FAILED "Cannot generate manifest"
const fs = require('fs');
const manifest = {
  manifestVersion: 1,
  backupId: process.env.MANIFEST_BACKUP_ID,
  createdAt: process.env.MANIFEST_CREATED_AT,
  environment: process.env.MANIFEST_ENVIRONMENT,
  databaseLogicalName: process.env.MANIFEST_DATABASE_NAME,
  postgresServerVersion: process.env.MANIFEST_POSTGRES_SERVER_VERSION,
  pgDumpVersion: process.env.MANIFEST_PG_DUMP_VERSION,
  format: 'postgres-custom',
  sizeBytes: Number(process.env.MANIFEST_SIZE_BYTES),
  sha256: process.env.MANIFEST_SHA256,
  migrationHead: process.env.MANIFEST_MIGRATION_HEAD,
  structuralValidation: 'PASSED',
  remoteVerification: 'NOT_ATTEMPTED',
  status: 'LOCAL_VERIFIED',
};
fs.writeFileSync(process.env.MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
NODE

MANIFEST_PATH="$partial_manifest" node -e "JSON.parse(require('fs').readFileSync(process.env.MANIFEST_PATH, 'utf8'))" >/dev/null 2>&1 || \
  backup_die MANIFEST_FAILED "Generated manifest is invalid JSON"
mv -n -- "$partial_manifest" "$final_manifest" || backup_die MANIFEST_FAILED "Completed manifest could not be finalized"
[[ ! -e "$partial_manifest" ]] || backup_die MANIFEST_FAILED "Completed manifest collision detected"

chmod 600 -- "$final_dump" "$final_manifest" "$LOCK_PATH"

printf 'backupId=%s\n' "$backup_id"
printf 'status=LOCAL_VERIFIED\n'
printf 'sizeBytes=%s\n' "$size_bytes"
printf 'sha256=%s\n' "$sha256"
printf 'dumpPath=%s\n' "$final_dump"
printf 'manifestPath=%s\n' "$final_manifest"
