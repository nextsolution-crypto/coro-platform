# Remote retention plan — no automated deletion in BACKUP-01B

BACKUP-01B intentionally performs no remote `DELETE` and does not install a lifecycle rule.

DigitalOcean Spaces supports API-managed versioning and time-based lifecycle expiration, but tag-based lifecycle selection is unsupported. The reviewed official documentation does not establish a CORO-usable Object Lock/WORM guarantee. Limited access keys are bucket-scoped, not prefix-scoped, and object write access includes deletion. Automatic deletion is therefore deferred until a dedicated bucket and its recovery/security controls are reviewed.

## Target GFS policy

- six-hourly: 7 days;
- daily: 30 days;
- weekly: 12 weeks;
- monthly: 12 months.

Before implementation, a future reviewed phase must:

1. inventory only the configured bucket and exact `database-backups/<environment>/` prefix;
2. parse only keys produced by BACKUP-HARDENING;
3. pair each dump with a valid `REMOTE_VERIFIED` manifest;
4. retain the newest two verified backups unconditionally;
5. produce and approve a deterministic dry-run GFS plan;
6. confirm versioning is enabled and test recovery of a deleted current version;
7. separate the routine upload identity from any deletion/retention identity where feasible;
8. verify lifecycle behavior against versioned objects;
9. test provider failures and ensure no deletion outside the exact prefix;
10. require explicit authorization before the first destructive provider operation.

Until those gates are met, remote objects are append-only from the application’s perspective and removal is a manual, separately reviewed operation.
