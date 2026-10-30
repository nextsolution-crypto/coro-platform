# Release retention operations

## Dry-run

Dispatch **Governed Production Capacity Maintenance** with `DRY_RUN`. It uses the exact workflow SHA, common deployment lock and immutable Git sources. Review every `CAPACITY_CLEANUP_CANDIDATE`; logical image sizes are not additive physical recovery estimates.

## Activation

- Confirm one reconciled release marker and a complete compatible rollback set.
- For the pre-existing release only, rerun its read-only reconciliation tool against the exact active SHA to create the first marker; do not manufacture or edit the marker by hand.
- Confirm backup health is `REMOTE_VERIFIED` and latest governed restore evidence is available.
- Install `50-coro-capacity-journal.conf` as `/etc/systemd/journald.conf.d/50-coro-capacity-journal.conf`, run `systemd-analyze cat-config systemd/journald.conf`, then reload journald according to the host runbook.
- Set `CORO_RELEASE_RETENTION_AUTOMATION_ENABLED=true` in GitHub repository variables.
- Run one manual `EXECUTE` with approval `EXECUTE_REVIEWED_RETENTION_POLICY`; verify services, PostgreSQL, rollback images and free bytes.

No backup retention timer is enabled by this procedure.

## Disable

Set `CORO_RELEASE_RETENTION_AUTOMATION_ENABLED=false`. Do not remove reconciliation markers or rollback images. Existing running services are unaffected.

## Recovery

On `DEPLOYMENT_LOCK_BUSY`, wait for the governed operation and rerun dry-run. On reference drift or invalid evidence, stop and reconcile the active release; never edit a manifest in place. On partial cleanup, inspect the category reports and rerun: operations are exact and idempotent. On low capacity with no candidates, report active, rollback, backup, database and business-data growth rather than deleting protected resources.
