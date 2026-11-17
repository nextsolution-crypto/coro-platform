# CORO-RP-CLIENT-01A — Typed client authority foundation

## Scope

CLIENT-01A introduces the minimum authority foundation required before any
CORO Report or operational route can be exposed to the client portal. It does
not expose a route, grant a permission, enable a feature flag, or migrate
historical provenance.

## Authority boundary

- `USER` continues to use internal JWT authentication and
  `PlatformPermissionGrant`.
- `CLIENT_USER` is established only by `ClientJwtGuard` after signature,
  session-version, active identity, active client, and organization checks.
- Portal operational permissions are reloaded from the canonical `ClientUser`
  row on every request.
- Active building assignments are reloaded from
  `ClientOperationalBuildingAssignment`; legacy `buildingIds` are not treated
  as operational authority.
- Browser-provided actor types, permissions, or assignments are ignored.

## Data model

- `ClientOperationalPermission` is intentionally distinct from
  `PlatformPermission`.
- `ClientOperationalBuildingAssignment` is tenant and building scoped through
  composite foreign keys.
- Active and revoked states are constrained in PostgreSQL.
- Effective periods must be coherent.
- The grantor and revoker remain internal users for CLIENT-01A. Governed client
  administration is deferred until its service can enforce the explicit
  `CLIENT_OPERATIONAL_AUTHORITY_MANAGE` permission without self-escalation.

## Compatibility and migration

- Additive enum, array column, assignment table, indexes, checks, and foreign
  keys only.
- No historical row is rewritten.
- No implicit grants or assignments are inserted.
- Existing internal Report and Operations paths remain unchanged.
- Global feature flags remain unchanged and disabled in production.

## Verification

- Prisma schema validation: PASS.
- Prisma client generation: PASS.
- Targeted Jest suites: 30/30 PASS.
- Backend build: PASS with an 8 GiB Node heap; the default 4 GiB heap was
  insufficient for the existing repository build.
- Full migration chain on disposable PostgreSQL 16: PASS (195 migrations).
- Expected assignment constraints present in PostgreSQL: PASS.

## Deferred by design

- CLIENT-01B: typed historical provenance and PostgreSQL actor exclusivity.
- CLIENT-01C: shared business-service authority checks and client controllers.
- CLIENT-01D: tenant/building entitlements and Demo activation preparation.
- No portal interface port is safe before CLIENT-01B and CLIENT-01C.

## Residual risks

- Array permissions follow existing portal conventions; administration must use
  governed service methods with audit and optimistic concurrency.
- No ClientUser can use the new authority until the later controller and
  service layers are delivered.
- The repository dependency audit reports pre-existing findings; this PR adds
  no dependency.

Verdict: **GO for review of CLIENT-01A; NO-GO for portal activation.**
