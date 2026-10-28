# Production document inventory results — 2026-10-28

## Scope and controls

Both inventories ran through manually dispatched, production-governed workflows under the shared maintenance lock. PostgreSQL access was wrapped in `SET TRANSACTION READ ONLY`. Only aggregate, sanitized results were emitted. No document content, storage reference, URL, personal identifier, credential, or tenant identifier is included here.

No application deployment, production migration, business-data mutation, storage ACL mutation, or WEB-AI activation occurred.

## Historical document references

- Workflow run: `40761361550` — **SUCCESS**
- Execution: **PASS**, database read-only: **true**
- References covered: **15**
- Unique referenced objects: **15**
- ProjectFile records: **11**
- ProjectFile version records: **4**
- Official PDF references: **4**
- Canonical private references: **4**
- Historical storage-key references: **11**
- Private access verified: **15**
- Public exposure confirmed: **0**
- Missing or broken: **0**
- Invalid: **0**
- Not verified: **0**
- Duplicate references: **0**

Boundary: orphan storage objects that are not referenced by the audited database records remain `OUT_OF_SCOPE`. Signed URL references were supported by the classifier but none were present.

## Canonical Document duplicates

- Workflow run: `40764677656` — **SUCCESS**
- Execution: **PASS**, database read-only: **true**
- Definition: more than one canonical `Document` row for the same `Project`; all `Document` and `Project` statuses included; legitimate `ProjectVersion` history excluded.
- Duplicate project groups: **0**
- Canonical Document rows in duplicate groups: **0**

No protected identifier was extracted because the aggregate contained no duplicate group. Temporary evidence was deleted on the production host before workflow completion.

## Production reconciliation

- Post-inventory inspection run: `40764793673` — **SUCCESS**
- Inspection: **PASS / GO**
- Active application SHA: `0654faeb6ad92e0f6f2a7cfbec1d9fc689fd90f4` (unchanged)
- PostgreSQL: **16.15**, healthy
- Migration count: **156** (unchanged)
- Migration head: `20261110010000_public_knowledge_foundation` (unchanged)
- Four application services: running, zero restarts
- Backup: `REMOTE_VERIFIED`
- Restore: `RESTORE_VERIFIED`
- Rollback images available: **4**
- Deployment lock: not busy

## Integration decision

The two production evidence blockers covered by this mandate are cleared for review: no referenced historical document was anonymously accessible in the measured scope, and no incompatible canonical `Document` duplicate was found. This result does not authorize merging product PRs #116 or #117 and does not extend to orphan storage objects.
