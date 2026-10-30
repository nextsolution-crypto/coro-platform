# CORO production capacity and retention policy

Status: proposed operational policy. Nothing in this change activates deletion. Legal retention and P-7.3 remain authoritative for business records, audit evidence and backups.

## Measured basis and objective

The production filesystem is approximately 80 GiB. The latest observed state had about 16.2 GiB free while the conservative release gate required about 18.4 GiB. Docker occupied roughly 13.1 GiB, local backup staging 7.3 GiB and logs 1.1 GiB. Several deliveries per day can leave complete, unreferenced four-image generations. A 72-hour image delay can therefore retain roughly three days of failed or superseded candidates even though only one complete rollback is operationally required.

The recommended policy is:

- preserve the four images used by every container;
- preserve the four images from the immediate healthy rollback set recorded by the newest successfully **reconciled** release;
- preserve a named candidate only with a reason and an ISO expiry;
- make other unreferenced images and build cache eligible after 24 hours;
- warn below 24 GiB free and treat below 20 GiB as critical;
- retain at least the release gate requirement plus 5 GiB operational reserve.

The 24-hour delay does not shorten rollback retention: active and rollback images remain protected regardless of age. It bounds only orphaned and superseded cache. At the observed delivery rate it prevents the 72-hour accumulation while retaining a full day for investigation. If release frequency or physical image size changes, the policy values must be reviewed through a PR.

## Rotation authority

`coro-release-reconcile.sh` writes an atomic, checksummed reconciliation marker only after container digests, migration head, checkout and health evidence match. Cleanup selects only such a release. Its `images` become active and its `previousImages` become rollback. Failed, running, unknown and unreconciled releases never rotate protection. A rollback image listed as unsafe causes cleanup to fail closed.

Explicit candidate protection requires `id`, `reason`, `expiresAt` and four immutable digest references. Expired entries are reported and cease protection. This prevents permanent forgotten pins.

## Eligible categories

- Images: exact immutable IDs, absent from all containers and all protected sets, older than policy. References are rechecked immediately before `docker image rm`.
- Build cache: only records older than policy through filtered `docker builder prune`; images and volumes are outside that command.
- Stopped containers: only containers explicitly labelled `io.getcoro.disposable=true`, still exited at deletion time.
- Temporaries: only regular files under the dedicated non-symlink `/opt/coro-ops/tmp/release-cache`, older than one day.
- Container logs: Compose bounds each container to five 20 MiB files. The supplied journald policy bounds persistent journal to 512 MiB and runtime journal to 128 MiB. Installation is a separate activation step.

No global system/image/volume prune is permitted. PostgreSQL volumes, private documents, SMS evidence, audit evidence, remote manifests and business data are never candidates.

## Backups

The existing backup retention implementation remains the sole authority. It accepts only a strict local dump/local manifest/`REMOTE_VERIFIED` manifest triplet, keeps seven days, approximately 28 backups and the newest two. It remains **disabled** in this automation until restore governance and P-7.3 approve automatic local deletion. Remote backup deletion is not implemented. This deliberate hold prevents capacity maintenance from weakening restore readiness.

## Gate calculation

The existing release gate remains conservative: verified backup staging, candidate image pull/extraction allowance, PostgreSQL growth and operational reserve. The next gate revision should consume unique registry layer sizes from the built immutable digests and subtract layers already present; it must fall back to the current conservative logical-size estimate when layer evidence is unavailable. No threshold is reduced by this PR.

Cleanup reports logical candidate bytes separately from `df`-measured physical bytes recovered. Shared layers mean the former must never be presented as recovered disk.

## Activation, suspension and recovery

1. Merge only after tests and review.
2. Install and verify the journald drop-in, but do not restart Docker solely for this change. Compose limits apply when services are next governed-recreated.
3. Run the capacity workflow in `DRY_RUN`; review active, rollback, explicit and candidate sets.
4. Set repository variable `CORO_RELEASE_RETENTION_AUTOMATION_ENABLED=true` only after approval. This enables pre-release, post-reconciliation and daily maintenance under the common `coro-production-deployment` lock.
5. Disable immediately by setting the variable to `false`; scheduled execution and release hooks then skip mutation.

If cleanup is interrupted, exact removals already completed remain safe and the next run rebuilds protection from current containers and reconciliation evidence. A busy lock, changed reference, invalid marker, blocked rollback or missing evidence stops the run. Do not bypass the refusal; repair evidence or release state, then rerun dry-run.

## Initial dry-run and alerts

Before activation, record total/free bytes, Docker detailed usage, candidates by category, physical reclaim estimate limitations, newest reconciliation marker, rollback completeness and next eligibility time. A dry-run never claims physical recovery. Alert with the exact protected category when free space is critical and no eligible resource can restore the release requirement plus reserve; capacity expansion is considered only after this report shows recoverable accumulation is exhausted.
