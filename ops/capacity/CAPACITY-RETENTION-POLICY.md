# CORO production capacity and retention policy

Status: operational engineering policy; retention periods remain subordinate to P-7.3 legal approval.

## Protected assets

Automated cleanup must never remove active container images, the four active release images, the four immediate rollback images, Docker volumes, PostgreSQL data, backup history or manifests, SMS evidence, customer documents, secrets, configuration backups, audit evidence, source repositories, or active worktrees.

## Eligibility

Only an image cache that is absent from every container reference, absent from the active successful release manifest, absent from its `previousImages`, and at least 72 hours old is eligible. Removal is by exact immutable image ID without `--force`. Build-cache cleanup, log rotation, backup staging retention, release evidence retention, and any evidence deletion require their own reviewed policy; they are not authorized by the image-cache workflow.

## Capacity gates

- Backup capacity is the maximum of 5 GiB, 10% of the filesystem, and twice the largest local dump plus 1 GiB. It is never weakened.
- Operational reserve is the maximum of 5 GiB or 10% of the filesystem.
- A release requires backup capacity plus 125% of the measured active application image set, a PostgreSQL growth allowance of max(20% of current database size, 2 GiB), and the operational reserve.
- Warning threshold: max(10 GiB, 20% free). Critical threshold: max(backup capacity, operational reserve).
- A failed release-capacity gate stops before backup, image pulls, migration, or container replacement.

## Operations

Run the read-only audit before every production release and at least weekly. Review warning state daily until resolved. At critical state, freeze releases and run a governed dry-run inventory. Execution requires the exact workflow approval and the shared production lock. No destructive cleanup is scheduled automatically.

Evidence must record the filesystem and inode baseline, protected image set, exact candidate IDs, sizes, age, reason, pre/post free space, backup headroom, release headroom, and workflow run ID. Escalate when no eligible cache can restore the warning threshold; capacity expansion is then preferred to deleting protected history.
