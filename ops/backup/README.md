# CORO PostgreSQL backup — BACKUP-01A

This package provides the version-controlled, local-only foundation for a fail-safe CORO PostgreSQL backup. It creates a PostgreSQL custom-format archive, validates it structurally, finalizes it atomically, calculates its SHA-256 digest, and writes a PII-safe JSON manifest.

It does not contact DigitalOcean Spaces, delete old backups, install a schedule, alter deployment, or restore production data.

BACKUP-01B adds an optional, separate remote stage. The local command remains independently usable. The remote stage uses the AWS CLI against the configured S3-compatible HTTPS endpoint and never imports backup credentials into the application runtime.

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

- BACKUP-01B: verified private off-site upload and safe local retention (implemented by `coro-db-upload.sh` and `coro-db-retention.sh`).
- BACKUP-01C: systemd service/timer and monitoring.
- BACKUP-01D: automated isolated restore drill and full runbook.
- BACKUP-01E: PITR/WAL and infrastructure-level resilience if adopted.

## Verified off-site stage (BACKUP-01B)

The remote stage accepts exactly one absolute path to a `LOCAL_VERIFIED` manifest. It rechecks the dump name, size and SHA-256 before making any request. Remote support is disabled unless `CORO_BACKUP_REMOTE_ENABLED=true` is explicit.

Required configuration:

| Variable | Meaning |
|---|---|
| `CORO_BACKUP_SPACES_ENDPOINT` | Plain HTTPS regional endpoint |
| `CORO_BACKUP_SPACES_REGION` | Spaces region |
| `CORO_BACKUP_SPACES_BUCKET` | Preferably a dedicated private backup bucket |
| `CORO_BACKUP_SPACES_PREFIX` | Safe trailing-slash prefix, such as `database-backups/production/` |
| `CORO_BACKUP_SPACES_ACCESS_KEY` | Dedicated backup access key |
| `CORO_BACKUP_SPACES_SECRET_KEY` | Dedicated backup secret |

Credentials must later be loaded from a root-readable environment file. They must never be included in an invocation, log, filename, manifest, or application environment. The backup key should be separate from the general application key and limited to the dedicated bucket where supported.

Objects use unique keys:

```text
<prefix>/<YYYY>/<MM>/<DD>/<backupId>.dump
<prefix>/<YYYY>/<MM>/<DD>/<backupId>.manifest.json
```

Both objects are private. The dump is verified by HEAD size and immutable metadata (`sha256`, `backup-id`), followed by a full streamed GET and SHA-256 recomputation. ETag is deliberately not used as a content-integrity authority. The manifest undergoes the same HEAD, metadata and full-GET verification. Only then is its local pending form atomically renamed to `<backupId>.remote.manifest.json`, and the atomic PII-safe `backup-state.json` records success.

The original `<backupId>.manifest.json` is never mutated and remains evidence of `LOCAL_VERIFIED`. A remote failure keeps the dump and original manifest, never creates the authoritative remote manifest, increments `consecutiveFailures`, and exits non-zero.

Transient network, timeout, throttling and HTTP 5xx failures receive at most three attempts with bounded exponential backoff and jitter. Authentication, authorization, deterministic size and checksum failures are not retried. Production command timeout defaults to five minutes per provider operation.

### Local retention

`coro-db-retention.sh` defaults to dry-run. Only a strict triplet containing a valid `REMOTE_VERIFIED` manifest, matching local manifest, and matching dump is eligible. The policy keeps seven days, at most approximately 28 six-hourly backups, and always the newest two. `LOCAL_VERIFIED`, failed, partial, unrelated, symlinked, and historical SQL/gzip files are not eligible.

Apply mode must be explicit:

```bash
CORO_BACKUP_DIR=/path/to/private/backups \
CORO_BACKUP_RETENTION_DRY_RUN=false \
./ops/backup/coro-db-retention.sh
```

Remote deletion is intentionally not implemented. DigitalOcean Spaces supports time-based lifecycle and versioning through its API, but the reviewed documentation does not establish a WORM/Object Lock control suitable for CORO. Its limited keys are bucket-scoped and object write permission includes delete. A credential compromise therefore remains capable of deleting remote backups. A dedicated bucket, versioning, a separately controlled retention identity, access logs, and eventually a second immutable destination are recommended before destructive remote retention.

### Future provider validation

After separate authorization, validate with dedicated test credentials and a random prefix under `database-backups/validation/`. Use a non-production fixture, confirm private ACL, HEAD metadata, full GET checksum and versioning state, then request explicit approval before deleting the validation objects. BACKUP-01B does not execute this procedure.

## Isolated restore drill (BACKUP-01D)

`coro-db-restore-test.sh` proves a local or freshly downloaded verified artifact in a newly generated PostgreSQL 16 disposable container. It accepts no database or container target. Database names always begin with `coro_restore_test_`; container names always end with `_disposable`; resources are labelled with their generated restore ID and cleanup refuses mismatched labels.

Local mode accepts the original `LOCAL_VERIFIED` manifest. Remote mode accepts the matching `REMOTE_VERIFIED` manifest, requires the original local evidence, downloads through the private S3 API into `.partial`, checks size/metadata/VersionId/SHA-256, and then atomically finalizes the downloaded artifact.

The drill validates the archive, PostgreSQL major version, public schema, Prisma migration head, stable critical tables, aggregate counts, orphan aggregates, and canonical Population phone anomaly count. It never prints rows or PII and never starts the application backend. Its application smoke is a provider-free, read-only SQL connectivity/model-count check.

The generated report and workspace are mode `0600`/`0700`. Default cleanup removes only the labelled disposable container after the report. Remote downloaded dump cleanup occurs only after success; original backup artifacts are never removed. Failure cleanup can be disabled explicitly for investigation, but this does not weaken target guards.

See `RECOVERY-RUNBOOK.md` for incident scenarios and the mandatory separation between isolated restoration and human-approved production cutover.

## Automated operations (BACKUP-01C)

`coro-db-backup-run.sh` is the only scheduled entry point. It runs the local backup, accepts only the exact `manifestPath` and `backupId` emitted by that invocation, uploads that manifest, and succeeds only after `REMOTE_VERIFIED`. The existing flock in `coro-db-backup.sh` remains authoritative for timer/manual concurrency. Retention is not part of this chain.

Configuration is split between `/etc/coro-backup/backup.env` (operational values) and root-only `/etc/coro-backup/spaces.env` (provider credentials). Examples under `config/` contain no production secret. systemd logs PII-safe status through journald. No external alert provider is configured; `OnFailure` records `ALERT_PROVIDER=NOT_CONFIGURED` and operators must inspect `systemctl status` and `journalctl`.

The backup timer runs every six hours with `Persistent=true`. Health runs every fifteen minutes. `coro-db-backup-health.sh` exits `0` for HEALTHY, `1` for WARNING and `2` for CRITICAL. Backup thresholds are 7/8 hours and two consecutive failures. Restore thresholds are 35/45 days; existing valid `RESTORE_VERIFIED` reports are discovered read-only.

The monthly restore service requires an explicitly installed `restore.env` containing an exact REMOTE_VERIFIED manifest and VersionId. Because current remote manifests do not persist VersionId, its timer must remain disabled until that deterministic selection is configured and reviewed. No backup or restore timer is enabled by `install.sh` unless `--enable` is explicit; even that flag enables only backup and health timers.

Installation preview:

```bash
./ops/backup/install.sh --dry-run
```

After production configuration and separate approval, install as root, verify units, execute one manual `coro-db-backup.service`, confirm REMOTE_VERIFIED and HEALTHY, inspect the journal, then enable backup and health timers. Never enable retention automatically.

Migration checkpoint contract: risky migrations must invoke `coro-db-backup-run.sh` immediately before mutation and stop unless it returns zero/REMOTE_VERIFIED. Additive low-risk work may instead use `coro-db-backup-health.sh` when policy permits a recent verified backup; destructive, backfill and new constraint operations always require a dedicated checkpoint.
