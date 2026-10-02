#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd -P)"
SUBJECT="${ROOT}/ops/backup/coro-db-backup.sh"

: "${CORO_BACKUP_POSTGRES_CONTAINER:?Disposable PostgreSQL container is required}"
: "${CORO_BACKUP_DATABASE:?Disposable source database is required}"
: "${CORO_BACKUP_POSTGRES_USER:?Disposable PostgreSQL role is required}"
: "${CORO_BACKUP_DIR:?Disposable backup directory is required}"
: "${CORO_RESTORE_TEST_HOST:?Disposable PostgreSQL hostname is required}"
: "${CORO_RESTORE_TEST_DATABASE:?Disposable restore database is required}"

[[ "$CORO_BACKUP_ENVIRONMENT" == "test" ]] || { printf 'Refusing non-test environment\n' >&2; exit 1; }
[[ "$CORO_BACKUP_POSTGRES_CONTAINER" == *_disposable ]] || { printf 'Refusing non-disposable container\n' >&2; exit 1; }
[[ "$CORO_BACKUP_DATABASE" != "coro_db" ]] || { printf 'Refusing production database\n' >&2; exit 1; }
[[ "$CORO_RESTORE_TEST_DATABASE" == coro_restore_test_* ]] || { printf 'Unsafe restore database name\n' >&2; exit 1; }
case "$CORO_RESTORE_TEST_DATABASE" in
  coro_db|postgres|template0|template1) printf 'Forbidden restore database name\n' >&2; exit 1 ;;
esac

"$SUBJECT"

mapfile -d '' dumps < <(find "$CORO_BACKUP_DIR" -maxdepth 1 -type f -name '*.dump' -print0)
[[ "${#dumps[@]}" -eq 1 ]] || { printf 'Expected exactly one completed dump\n' >&2; exit 1; }
dump_path="${dumps[0]}"

pg_restore --list "$dump_path" >/dev/null
createdb --host "$CORO_RESTORE_TEST_HOST" --username "$CORO_BACKUP_POSTGRES_USER" "$CORO_RESTORE_TEST_DATABASE"
pg_restore --host "$CORO_RESTORE_TEST_HOST" --username "$CORO_BACKUP_POSTGRES_USER" --dbname "$CORO_RESTORE_TEST_DATABASE" --exit-on-error "$dump_path"

restored_marker="$(psql --host "$CORO_RESTORE_TEST_HOST" --username "$CORO_BACKUP_POSTGRES_USER" --dbname "$CORO_RESTORE_TEST_DATABASE" --tuples-only --no-align --command 'SELECT marker FROM backup01a_expected WHERE id = 1;')"
[[ "$restored_marker" == "expected" ]] || { printf 'Restored fixture does not match\n' >&2; exit 1; }

printf 'REAL_POSTGRES_BACKUP=PASS\n'
printf 'REAL_POSTGRES_RESTORE=PASS\n'
printf 'RESTORE_DATABASE=%s\n' "$CORO_RESTORE_TEST_DATABASE"
