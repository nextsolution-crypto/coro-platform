# CORO PostgreSQL backup — BACKUP-01A

This package provides the version-controlled, local-only foundation for a fail-safe CORO PostgreSQL backup. It creates a PostgreSQL custom-format archive, validates it structurally, finalizes it atomically, calculates its SHA-256 digest, and writes a PII-safe JSON manifest.

It does not contact DigitalOcean Spaces, delete old backups, install a schedule, alter deployment, or restore production data.

## Architecture

```text
precheck → flock → pg_dump custom partial → pg_restore --list
→ atomic dump rename → SHA-256 → validated manifest partial
→ atomic manifest rename → LOCAL_VERIFIED
```

The command uses `docker exec` against the configured PostgreSQL container. Passwords and `DATABASE_URL` are neither required nor accepted by the script. PostgreSQL authentication must already be safely configured for execution inside the container.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `CORO_BACKUP_ENVIRONMENT` | `production` | Safe environment identifier |
| `CORO_BACKUP_DIR` | `/opt/coro-ops/backups/database` | Private artifact directory |
| `CORO_BACKUP_DATABASE` | `coro_db` | Logical database name |
| `CORO_BACKUP_POSTGRES_CONTAINER` | `coro_postgres` | Docker container name |
| `CORO_BACKUP_POSTGRES_USER` | `coro_user` | PostgreSQL role name |
| `CORO_BACKUP_LOCK_PATH` | backup directory lock | Host lock file |
| `CORO_BACKUP_CREATE_DIR` | `false` | Permit creation of the configured directory |
| `CORO_BACKUP_MIN_FREE_BYTES` | 5 GiB | Absolute free-space floor |
| `CORO_BACKUP_MIN_FREE_PERCENT` | 10 | Filesystem percentage floor |
| `CORO_BACKUP_LAST_DUMP_MARGIN_BYTES` | 1 GiB | Margin above twice the largest local dump |

Production should retain the defaults for the three free-space safeguards unless measured database growth justifies stricter values. Test environments may lower them explicitly.

The backup directory must be owned by the invoking user, must not be a symlink, and must grant no permissions to group or world. The script sets `umask 077`; completed dumps and manifests are mode `0600`.

## Manual invocation

Use placeholders and an already prepared private directory:

```bash
sudo install -d -m 0700 -o <backup-user> -g <backup-group> /path/to/private/backups
sudo -u <backup-user> env \
  CORO_BACKUP_ENVIRONMENT=production \
  CORO_BACKUP_DIR=/path/to/private/backups \
  CORO_BACKUP_DATABASE=<database> \
  CORO_BACKUP_POSTGRES_CONTAINER=<container> \
  CORO_BACKUP_POSTGRES_USER=<role> \
  CORO_BACKUP_LOCK_PATH=/path/to/private/backups/.backup.lock \
  ./ops/backup/coro-db-backup.sh
```

Never put a database password or Spaces secret in this command.

## Artifacts and result

Each successful execution creates unique files on the same filesystem:

```text
<environment>-<UTC timestamp>-<random>.dump
<environment>-<UTC timestamp>-<random>.manifest.json
```

Partial files are never considered completed backups. A successful command exits zero and prints only the backup ID, `LOCAL_VERIFIED` status, size, SHA-256, and local paths. Any mandatory failure exits non-zero with a stable error code and never deletes an earlier successful backup.

The migration head is the latest finished, non-rolled-back Prisma migration when that query is available. It is recorded as `UNKNOWN` when it cannot safely be obtained; this does not invalidate the database archive.

## Restore safety

BACKUP-01A validates the archive but performs no restore. Future restore drills must use a disposable PostgreSQL instance and a database named `coro_restore_test_<timestamp>`. They must hard-refuse `coro_db`, `postgres`, `template0`, and `template1`. Production cutover always requires explicit human approval.

## Future phases

- BACKUP-01B: verified private off-site upload and retention.
- BACKUP-01C: systemd service/timer and monitoring.
- BACKUP-01D: automated isolated restore drill and full runbook.
- BACKUP-01E: PITR/WAL and infrastructure-level resilience if adopted.
