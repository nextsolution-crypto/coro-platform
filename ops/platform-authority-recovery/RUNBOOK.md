# CORO Platform Authority — Founder break-glass recovery

This procedure is for a confirmed `ACTIVE` Platform Authority inconsistency only. It is not an authentication bypass, a routine administration path, or a substitute for password/MFA incident handling.

## Permitted cases

- Restore the persisted Founder account's active/SUPER_ADMIN state after a demonstrated accidental inconsistency.
- Restore the existing internal operator organization's active state.
- Rebind the Founder or operator organization only when the persisted binding is proven wrong and the replacement identity already satisfies every canonical invariant.

Compromised credentials and lost MFA are handled by the separate identity/security incident process. Revoked or missing employee grants are recreated through the normal Founder-controlled grant UI after Founder access is restored.

## Authorization

1. Open an incident with a UUID, reason, exact current and target IDs, expected lockVersion, and an expiry no more than 30 minutes away.
2. Verify identity out of band. Never collect passwords, MFA secrets, tokens, or recovery codes in the case.
3. Obtain two-person approval where available. In the current single-Founder model, record the explicit exception and all four compensating controls required by `recovery-case.mjs`.
4. A database operator distinct from the application session executes the reviewed, pinned script. The authorization reference must equal `CORO_RECOVERY_APPLY`.
5. Record the SHA-256 of `recovery-case.mjs`, `recover.sql`, and the approved case in the incident before execution.

## Before-state evidence

- Run the restricted production inspection and retain its sanitized artifact.
- Confirm one ACTIVE authority, exact expected binding and lockVersion, current Founder/operator states, active SUPER_ADMIN count, grants, backup/restore/rollback readiness, deployment lock and application health.
- Save the approved case outside the repository in a root-readable temporary directory; mode `0600`; remove it after evidence retention.

## Execution

Dry-run validation does not connect to PostgreSQL:

```sh
CORO_RECOVERY_WINDOW=OPEN node recovery-case.mjs /secure/case.json
```

Execution requires the separately controlled database-owner environment and two matching switches:

```sh
CORO_RECOVERY_WINDOW=OPEN \
CORO_RECOVERY_APPLY='<authorization-reference>' \
node recovery-case.mjs /secure/case.json --apply
```

The fixed SQL acquires one advisory lock, verifies the ACTIVE singleton and optimistic lockVersion, applies one allow-listed operation in one transaction, requires exactly one active SUPER_ADMIN, and appends `PLATFORM_AUTHORITY_FOUNDER_RECOVERY`. Binding repair temporarily disables only the named authority-protection trigger inside the same transaction; rollback restores both data and trigger state.

Never edit `recover.sql` during an incident. Never use `psql -c`, a generic SQL console, `session_replication_role`, broad updates, database restore, role promotion outside the script, or retry after an unknown outcome.

## After-state verification

1. Rerun restricted inspection and retain the artifact under separate control.
2. Confirm ACTIVE singleton, exact binding, lockVersion, one active SUPER_ADMIN, no new grants, append-only audit event and matching before/after hashes.
3. Validate Founder authentication, F5, Commercial Administration, Platform Permission Grants and Rendement.
4. Validate customer ADMIN platform/financial denial with an approved test identity.
5. Confirm no restart loop or critical backend error.
6. Close the incident only after the Founder and the operator review both artifacts. Remove the temporary case; do not delete audit evidence.

## Failure handling

Stop on any precondition failure, timeout, stale approval, duplicate incident ID, concurrency conflict, unexpected row count or unknown outcome. Do not retry, reset roles, modify grants, restore the database, or disable another trigger. Preserve all evidence and escalate for a new authorization.
