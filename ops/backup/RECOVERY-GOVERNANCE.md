# CORO recovery governance

The following are internal engineering objectives approved for evaluation, not contractual service-level commitments:

| Control | Initial objective |
|---|---|
| Recovery time objective | 4 hours |
| Recovery point objective | 1 hour |
| Backup verification | Daily |
| Isolated PostgreSQL restore drill | Monthly |
| Full application recovery exercise | Quarterly |
| Major recovery exercise | Annually |

An objective is achieved only when a controlled exercise records measured evidence within the target. A local synthetic drill cannot prove production RTO or RPO.

## Deterministic restore-point selection

An operator must name the exact backup identifier. `coro-db-select-restore-point.sh` refuses missing, mismatched, unknown-migration, unversioned or non-versioned-retention evidence. It validates the local and remote manifests as one evidence pair and emits a sanitized selection record. Selecting an arbitrary latest object is prohibited.

Remote `VersionId` proves object-version identity, not immutability. `VERSIONED_NO_WORM_GUARANTEE` must not be presented as Object Lock or WORM evidence.

## Exercise record

Every exercise records the authorized operator and approver; exact backup identifier, database identity and remote VersionId; timestamps, measured recovery duration and data-loss window; migration head and SHA-256; results, findings, corrective actions; and applicable application, authentication and tenant-isolation checks.

Daily verification may be automated and read-only. Monthly, quarterly and annual exercises require an explicit reviewed selection and operator action. No schedule may automatically perform a production restore, production cutover, destructive cleanup or privileged recovery action.

## Feasibility decisions retained

- PostgreSQL WAL archiving/PITR is technically feasible but adds continuous archive monitoring, restore-chain testing, retention and encryption responsibilities. It is not activated.
- DigitalOcean Spaces versioning supplies version identity but the reviewed foundation does not demonstrate Object Lock/WORM. A compatible immutable destination or provider capability requires a separate decision.
- Legal hold, immutable retention duration, cost envelope and cross-provider recovery remain unapproved.
