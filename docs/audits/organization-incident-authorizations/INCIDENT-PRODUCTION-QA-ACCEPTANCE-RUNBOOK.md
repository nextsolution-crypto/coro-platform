# Incident production synthetic acceptance runbook

This runbook is limited to the pre-existing synthetic organization, client,
building, and ClientUser reserved for CORO production acceptance. It does not
create an identity or send an invitation.

## Dry-run

Dispatch phase `dry-run` first. It acquires the production deployment lock,
requires a successful governed backup, verifies the exact synthetic foundation,
and performs no business-data mutation. It refuses a non-unique identity,
unexpected tenant/building scope, real occupants or employees, an unrelated
active Incident, or any pre-existing Incident authority.

## Prepare

Dispatch `Governed Production Incident QA Acceptance` with phase `prepare` and
the exact prepare approval. The job acquires the production deployment lock,
requires a fresh governed database backup, verifies the immutable script hash,
and fails closed unless all four synthetic resources are uniquely derived from
their expected names, tenant relations, scope, and active state.

Preparation reactivates the existing synthetic ClientUser, revokes stale access
artifacts, and creates one `isExercise=true` Incident in the governed
maintenance transaction. Notification code is never invoked. The fixture is
inserted with no public token, an already expired capability, and an immediate
revocation timestamp. The job proves that no Incident delivery, Population
event, or Population alert exists for the fixture.

The workflow intentionally does not grant Incident permissions. Those are
granted through the governed administration UI only after the identity and
fixture have been reconciled.

## Cleanup

Cleanup accepts the exact Incident id emitted by preparation, or discovers the
fixture only when discovery is unambiguous. It revokes only active
`INCIDENT_READ` assignments bearing the exact campaign reason, clears the individual Incident
permission, disables the identity, increments its session version, invalidates
unused links, removes trusted devices, cancels the synthetic exercise without
external integration, and preserves all audit evidence.

Cleanup is mandatory after success or failure. It is independently dispatchable
and idempotent: after a fully reconciled finalization, a repeat reports
`alreadyFinalized=true` without another mutation.

## Activation and rollback

The workflow is activated only by merging it to the default branch. Disabling
it consists of disabling the GitHub Actions workflow after a reconciled cleanup.
Identity reactivation and fixture creation are one database transaction. A
retry after an interrupted response reconciles and returns the same active
fixture rather than creating another. If any later step is uncertain, inspect
the workflow result and sanitized audit records before retrying.
