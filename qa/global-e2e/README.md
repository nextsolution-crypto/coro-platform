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

The Compose network is Docker `internal`; it has no default Internet route and
all published ports bind only to loopback. Application containers additionally
use `--dns 127.0.0.1`: Docker service names stay local while external DNS fails
closed. `provider-fake` supplies deterministic QA-local success and failure
responses without provider credentials.
