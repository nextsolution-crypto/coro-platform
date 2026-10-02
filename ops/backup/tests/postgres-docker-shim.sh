#!/usr/bin/env bash

set -Eeuo pipefail

: "${CORO_RESTORE_TEST_HOST:?Disposable PostgreSQL host is required}"
: "${CORO_BACKUP_POSTGRES_CONTAINER:?Disposable container identity is required}"
[[ "$CORO_BACKUP_POSTGRES_CONTAINER" == *_disposable ]] || { printf 'Refusing non-disposable target\n' >&2; exit 1; }

case "${1:-}" in
  inspect)
    printf 'true\n'
    ;;
  exec)
    shift
    [[ "${1:-}" == '--interactive' ]] && shift
    [[ "${1:-}" == "$CORO_BACKUP_POSTGRES_CONTAINER" ]] || { printf 'Unexpected disposable target\n' >&2; exit 1; }
    shift
    command_name="${1:-}"
    shift
    case "$command_name" in
      psql)
        exec "$command_name" --host "$CORO_RESTORE_TEST_HOST" "$@"
        ;;
      pg_dump)
        if [[ "${1:-}" == '--version' ]]; then exec pg_dump --version; fi
        exec pg_dump --host "$CORO_RESTORE_TEST_HOST" "$@"
        ;;
      pg_restore)
        exec pg_restore "$@"
        ;;
      *)
        printf 'Unsupported disposable PostgreSQL command\n' >&2
        exit 1
        ;;
    esac
    ;;
  *)
    printf 'Unsupported disposable Docker operation\n' >&2
    exit 1
    ;;
esac
