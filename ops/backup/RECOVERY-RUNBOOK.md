# CORO database recovery runbook

This runbook separates evidence gathering and isolated restoration from any production cutover. No tool in BACKUP-01D performs a production cutover.

## Universal first response

1. Stop the source of corruption when operationally safe.
2. Preserve the current database and logs; do not overwrite evidence.
3. Identify the incident owner and decision authority.
4. Select a verified backup using its manifest, checksum, object key, and VersionId where available.
5. Restore only into an isolated `coro_restore_test_*` environment.
6. Review the PII-safe restore report.
7. Obtain explicit human approval before designing or executing a production cutover.

## A. Logical investigation or targeted recovery

Restore the selected backup in isolation. Query only the affected tables and compare aggregate/history evidence. Prepare a separately reviewed corrective script or export. Never pipe restored rows directly into production and never expose PII in the restore report.

## B. Full database corruption

Quiesce production writes if authorized, preserve the corrupted database, restore the chosen artifact in isolation, validate migrations/tables/relationships, and perform application read-only smoke checks. A new production database and cutover plan require a separate change approval, rollback plan, communications plan, and explicit human authorization.

## C. Complete host loss

Provision a clean host from reviewed infrastructure instructions, recover root-only credentials from their authority, obtain the immutable/versioned backup artifact, verify its SHA-256, and complete an isolated drill before any production database is created. Recreate application configuration independently; a PostgreSQL dump does not contain host configuration or all cluster-global roles.

## D. Bad Prisma migration

Stop further migrations. Preserve the failed database. Restore the pre-migration backup in isolation and determine whether a forward corrective migration can preserve newer writes. Without PITR, any rollback to a dump creates a data-loss window that must be explicitly accepted. Never run `prisma migrate deploy` against the restore drill database.

## E. Backup provider unavailable

Preserve every local verified artifact and suspend retention. Use the newest locally verified dump for an isolated drill. Do not classify it as remotely protected. Escalate provider recovery and consider a second destination before resuming destructive retention.

## Isolated restore command

Use a private `0700` workspace and root-readable environment file. For local mode, supply the original `LOCAL_VERIFIED` manifest. For remote mode, supply the `REMOTE_VERIFIED` manifest and an exact VersionId when known. The tool generates all disposable resource names and permits no target override.

## Production cutover boundary

Production cutover is not cleanup and is not part of the restore drill. It must specify maintenance mode, final-write capture, DNS/connection changes, credentials, rollback, validation, business approval, evidence retention, and incident communications. It always requires an explicit human command outside BACKUP-01D.

## First production-backup drill procedure — do not execute during implementation

For backup `production-20261002T210109Z-893a383f9dfa`:

1. load the dedicated backup credentials from the root-only operational file;
2. create a new private restore workspace;
3. select object `database-backups/production/2026/10/02/production-20261002T210109Z-893a383f9dfa.dump`;
4. request VersionId `e5b13ec2496603efb6096dc101b07eee`;
5. require SHA-256 `ca02480f48531ea29f6663c73f4671fee5000220e4a33dc995029090dad0950c`;
6. perform private GET to `.partial`, validate, and atomically finalize;
7. create only the generated PostgreSQL 16 disposable container/database;
8. restore and run all structural, aggregate, migration and consistency checks;
9. retain the `0600` restore report;
10. remove credentials from the process environment;
11. remove only the labelled disposable container after review;
12. never connect to or modify `coro_db`.

This procedure requires separate production authorization.

## Automated service operations

Installation and enablement remain separate approvals. Verify the deployed commit, run `install.sh --dry-run`, install/update scripts and units, preserve the existing `/etc/coro-backup/spaces.env`, derive `backup.env` from its example, run `systemd-analyze verify`, then perform one manual service execution. Require a new `REMOTE_VERIFIED` manifest, HEALTHY output, clean journal and a confirmed next timer trigger before enabling schedules. Do not enable retention.

Useful diagnostics:

```bash
systemctl status coro-db-backup.service coro-db-backup.timer coro-db-backup-health.timer
journalctl -u coro-db-backup.service -u coro-db-backup-health.service
/opt/coro-ops/backup/coro-db-backup-health.sh
systemctl list-timers coro-db-backup.timer coro-db-backup-health.timer
```

`Persistent=true` runs a missed timer after boot. The existing non-blocking backup flock prevents overlap and produces a visible service failure; systemd does not use an aggressive automatic restart, so the next normal timer remains authoritative.

The restore timer is monthly but must stay disabled until `/etc/coro-backup/restore.env` names an exact verified manifest and VersionId. A successful historical restore report may satisfy health without being rewritten. Automatic production restore and production cutover remain forbidden.
