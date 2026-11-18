# CORO-DEMO-REPORT-01 — Activation readiness

## Boundary

- Canonical organization: `916f54ec-af22-45e0-99db-a369d9630002` (`CORO Démo`).
- Production remains unchanged by the readiness inventory.
- The six capabilities are SITE-scoped only.
- External email, SMS, Sentinelle, Building Bridge and customer webhooks remain blocked.
- Feature flags default to `false`; enabling them requires a separate production authorization.

## Required activation gate

The governed activation may proceed only when one read-only inventory proves all of the following:

1. The organization is active and its Demo environment is `ACTIVE / SIMULATE` with external providers disabled.
2. At least three active fictitious buildings are registered as Demo fixtures.
3. Six distinct active ClientUser identities are available for Agent A, Agent B, Supervisor, Reviewer, Property Manager and Unauthorized User.
4. All six commercial capabilities are available with an allowed SITE scope.
5. No effective SITE entitlement for those capabilities exists outside the explicitly authorized target.
6. The five global feature flags are still disabled before the change.
7. Each privileged profile has an active, time-valid assignment only to its authorized buildings; the unauthorized profile has neither operational permission nor assignment.

## Governed activation sequence (not authorized by this preparation)

1. Take and remotely verify the database backup; verify restoration evidence and acquire the production deployment lock.
2. Resolve the six existing ClientUsers without creating duplicate accounts.
3. Create exactly six SITE entitlements per authorized Demo building with immutable provenance and an effective revision.
4. Assign the manifest permission set and time-valid building assignments through the existing administration services.
5. Re-run cross-tenant negative checks while flags are still disabled.
6. Set the five flags to `true` through the governed runtime configuration and perform one controlled backend restart.
7. Verify cumulative enforcement: flag + entitlement + permission + assignment + valid ClientUser session + organization/client/building scope.
8. Execute authenticated browser UAT with normal MFA on desktop, tablet and phone.

## Deactivation and rollback

1. Set all five flags to `false` first and restart the backend through the governed release mechanism.
2. Revoke Demo entitlements and assignments with audit reasons; do not delete history.
3. Revoke Demo sessions if the authorization matrix changed.
4. Verify that every Report and workstation route fails closed and that other portal functions remain healthy.
5. Reset only records bearing the dedicated Demo fixture namespace; preserve all pre-existing CORO Démo data.

## Browser acceptance

No scenario is PASS until observed through `https://client.getcoro.io` with normal MFA. The acceptance matrix covers Agent A, Supervisor, Agent A correction, independent Reviewer/PDF, Agent B handover, Property Manager read-only access, and all unauthorized/inter-building/inter-tenant refusals.
