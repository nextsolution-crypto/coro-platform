# CORO global E2E QA harness

Reusable, fail-closed orchestration for authenticated CORO acceptance. Runtime
state is confined to `D:\CORO-QA`; only local loopback services are accepted.
The harness never embeds credentials and refuses production-like variables,
hosts and ports.

```powershell
node qa/global-e2e/src/cli.mjs check
node --test qa/global-e2e/test/*.test.mjs
node qa/global-e2e/src/cli.mjs smoke
node qa/global-e2e/src/business-smoke.mjs
node qa/global-e2e/src/campaign.mjs --plan
node qa/global-e2e/src/campaign.mjs --from=business
node qa/global-e2e/src/cli.mjs cleanup
```

`smoke` starts deterministic provider and private-object-storage fakes, proves
their failure modes and writes a sanitized JSON report. Full application smoke
is enabled by setting `CORO_QA_BACKEND_URL`, `CORO_QA_FRONTEND_URL`,
`CORO_QA_PORTAL_URL`, `CORO_QA_ACTOR_FILE`, and `CORO_QA_MFA_DIR` to isolated
local resources. It reuses `coro-frontend/design-system/bench/cdp.cjs` and the
real-session helpers; it does not require an interactive Chrome session.

Foundational identities may be seeded directly because they are test
preconditions. Platform Authority must always transition through the governed
HTTP `draft` and `activate` endpoints. Business lifecycle records are never
advanced with direct SQL by this harness.

`business-smoke.mjs` completes the authenticated Booking/Planner and Rendement
financial transitions through the real CORO API. It uses only the synthetic
actors, local MFA capture and disposable database declared by this harness.

`campaign.mjs` is the fail-closed stage orchestrator. It requires a separately
health-checked local stack (`CORO_QA_CAMPAIGN_READY=true`), records a sanitized
stage journal under `D:\CORO-QA`, stops on the first failing stage and supports
an explicit `--from`/`--through` resume range. Infrastructure setup and teardown
remain explicit so an application failure cannot be hidden by automatic retries.

## QA Identity Lab

The reusable identity catalogue, D:-scoped secret store, protected MFA adapter,
multi-actor session helpers and CORS-aware preflight live in `src/identity-*.mjs`,
`src/secret-store.mjs`, `src/mfa-capture-adapter.mjs` and
`src/browser-orchestration.mjs`. No password or channel credential is committed.
Initialize the local store once, then run preflight before any long browser run:

```powershell
node qa/global-e2e/src/identity-lab-cli.mjs init
node qa/global-e2e/src/identity-lab-cli.mjs preflight
node qa/global-e2e/src/identity-session-acceptance.mjs
```

Use `identity:rotate` between campaigns when credentials must change and
`identity:cleanup` to remove the fixed transient containers and unconsumed MFA
captures. Evidence and the restricted secret store are preserved deliberately.

The MFA adapter consumes the backend's restricted QA capture files, immediately
deletes each consumed challenge, and exposes it only through an authenticated
loopback channel. Production origins, credentials and ports remain rejected.
The session acceptance stage proves one-time refresh-token rotation, replay
denial, logout and post-logout refresh denial against the real QA backend.

Exercise/REX campaigns resolve their active API, Portal, MFA capture, actor
catalogue, Chrome/CDP and evidence locations through `exercise-rex-runtime.mjs`.
Campaign-specific paths are prohibited; missing MFA configuration and non-local
origins fail closed. Sanitized runtime evidence contains origins and readiness
booleans only, never credentials, MFA values or filesystem paths.

`identity-stack.ps1` is the reusable Windows/Docker bootstrap. It validates
loopback ports, starts disposable PostgreSQL and local provider fakes, applies
migrations, seeds the canonical identity catalogue, starts the real backend and
portal on the internal network, and records a sanitized readiness manifest.
`Stop` removes only its fixed, stack-prefixed containers and preserves evidence.
The database, backend, portal and provider-fake loopback ports are independently
configurable, allowing concurrent isolated campaigns without a shared host-port
collision.

For the restricted Client Portal pilot, pass the synthetic organization through
`-RestrictedPilotOrganizationId` when starting `identity-stack.ps1`, then run
`npm run client-pilot-access:acceptance` and
`npm run client-pilot-access:browser` from this package. The API campaign proves
direct denials, zero side effects, archive read continuity and password/session
rotation. The browser campaign records the measured 12-combination responsive
matrix under `D:\CORO-QA`; it requires a QA portal image built with the governed
Glass preview token. Neither runner accepts production origins or provider
delivery.

When the backend is intentionally not published to the Windows host,
`internal-runner.mjs` runs one of three allowlisted API scripts in the backend
network namespace and exposes a fixed loopback-only 3155→3002 proxy there. It
does not accept commands, hosts or ports from user input.

The Compose network is Docker `internal`; it has no default Internet route and
all published ports bind only to loopback. Application containers additionally
use `--dns 127.0.0.1`: Docker service names stay local while external DNS fails
closed. `provider-fake` supplies deterministic QA-local success and failure
responses without provider credentials.
