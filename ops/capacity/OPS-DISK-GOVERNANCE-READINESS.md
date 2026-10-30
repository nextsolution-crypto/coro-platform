# CORO disk governance — release readiness

Date: 2026-10-30

Branch: `ops/release-rotation-governance`

Activation: **NOT ACTIVATED**

First purge: **NOT EXECUTED**

## Baseline

Latest governed observation before this PR:

- filesystem: approximately 80 GiB;
- free: 17,391,849,472 bytes (about 16.2 GiB);
- calculated release requirement: 19,705,674,907 bytes (about 18.4 GiB);
- deficit: 2,313,825,435 bytes;
- Docker: approximately 13.1 GiB;
- local backup staging: approximately 7.3 GiB;
- logs: approximately 1.1 GiB.

The previous dry-run found stale unreferenced image candidates, but logical image sizes include shared layers. Their sum is not a defensible physical-recovery claim. The new workflow reports `df` deltas only during a later authorized execution and keeps dry-run estimates explicitly non-physical.

## Implemented policy

- Active four-image set and complete immediate rollback set protected without age limit.
- Rotation only after an atomic successful reconciliation marker.
- Failed, interrupted, concurrent and unreconciled releases cannot rotate rollback.
- Explicit candidate pins require a reason and expiry.
- Unreferenced images and build cache become eligible after 24 hours.
- Exact image deletion, immediate reference recheck, no global prune and no volumes.
- Only explicitly labelled disposable stopped containers are eligible.
- Temporary cleanup is restricted to the dedicated release-cache directory.
- Container logs are bounded to 5 × 20 MiB; proposed journal bounds are 512 MiB persistent and 128 MiB runtime.
- Shared GitHub concurrency and host deployment lock cover pre-release, post-release and daily maintenance.
- Backup deletion remains excluded until its separate restore/legal activation criteria are approved.

## Tests

Local relevant suite: 75/75 PASS. It covers successful/failed/unreconciled release selection, rollback integrity, unsafe rollback refusal, expiring candidate protection, concurrent lock, exact reference recheck, interruption-safe rerun, low-space gate contracts, release recovery and workflow feature gating. Compose configuration and `git diff --check` pass.

## Initial dry-run

The branch workflow must be run in `DRY_RUN` after publication of the PR so the exact reviewed code can inspect production read-only. Until its immutable workflow log is available:

- physical bytes recoverable: `NOT_VERIFIED`;
- first eligibility list under the 24-hour policy: `NOT_VERIFIED`;
- no deletion has occurred.

Attempted workflow `41061870359` on commit `2c8d21069f41ee1ae9862644b3d5c9d4a77dc4aa` validated the scripts, then GitHub rejected the `maintain` job before any step because branch `ops/release-rotation-governance` is not allowed to use the protected `production` environment. This control was not bypassed. Consequently, the initial production dry-run must be dispatched from `main` after review and merge, while the automation variable is still false and before any execute-mode approval.

## Activation decision

The GitHub variable `CORO_RELEASE_RETENTION_AUTOMATION_ENABLED` remains unset/false. Merge does not by itself authorize activation. Follow `RELEASE-RETENTION-OPERATIONS.md`, reconcile the pre-existing active release to bootstrap its marker, review a dry-run, then explicitly enable the variable. Disable by returning it to `false`.
