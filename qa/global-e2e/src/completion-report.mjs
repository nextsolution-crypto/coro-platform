#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertUnderQaRoot } from "./policy.mjs";

const root = assertUnderQaRoot(process.env.CORO_QA_REPORT_ROOT);
await mkdir(root, { recursive: true });
const reports = {
  "BUSINESS-SMOKE-RESULTS.md": `# Business smoke results

Execution: 2026-10-18, disposable PostgreSQL 16 with 138 migrations.

| Domain | Result | Evidence |
| --- | --- | --- |
| Booking / Planner | PASS | Authenticated client request, explicit eligibility, capacity hold, advisor governed decline, client cancellation, reload persistence, same-assignment actor denial, cross-tenant denial. |
| Rendement financial | BLOCKED | Draft internal rate creation succeeded; DRAFT to PROPOSED returned HTTP 500 (request 119506ba-0dc2-4155-8ba6-8f915e910a97). |
| Commercial chain | BLOCKED | Not executed after mandatory financial gate failed; existing frontend contracts passed 5 suites. |
| Private documents | BLOCKED | Not executed after mandatory financial/security gates failed. |
`,
  "BOOKING-PLANNER-EVIDENCE.md": `# Booking and Planner evidence

PASS through real authenticated APIs on the disposable stack: work schedule, advisor eligibility, Client Portal booking, governed commitment projection in Planner, advisor decline with exact version/fingerprint, unauthorized response denial, client cancellation and persisted reload. Cross-tenant assignment access returned 404.

Security deviation: the booking notification attempted an unauthenticated Brevo request and received HTTP 401. No message was delivered, but this violates the no-external-provider-call gate.
`,
  "FINANCIAL-EVIDENCE.md": `# Financial evidence

Platform Authority temporary scoped grants were created in QA. Cost-rate DRAFT creation succeeded. The real PostgreSQL transition to PROPOSED failed with HTTP 500 and PrismaClientUnknownRequestError (requestId 119506ba-0dc2-4155-8ba6-8f915e910a97). Product source was not changed.

Frontend safe-money contracts passed 7 scenarios covering CAD/USD/EUR, null, UNKNOWN, unsupported historical codes, zero, negative values and separated totals. The authenticated financial lifecycle remains BLOCKED before approval, sale and aggregation.
`,
  "COMMERCIAL-EVIDENCE.md": `# Commercial evidence

BLOCKED by the earlier mandatory product/security gates. No lifecycle status was directly manipulated. Frontend configuration, simulator, proposal workspace, dossier and entitlement contracts passed. The required PriceBook to Entitlement authenticated chain was not claimed as executed.
`,
  "PRIVATE-DOCUMENT-EVIDENCE.md": `# Private document evidence

BLOCKED. Harness unit coverage still proves authenticated tenant-prefixed immutable fake storage and anonymous denial, but no end-to-end application upload/version/retrieval/revocation chain was executed in this run. This distinction prevents false PASS reporting.
`,
  "BROWSER-EVIDENCE.md": `# Browser evidence

Prior Harness-04 evidence remains valid for representative authenticated application and Client Portal paths. No fresh browser claim was made after the mandatory API gate failed. Required Booking, Rendement, Configurator and document browser matrix is therefore PARTIAL.
`,
  "SECURITY-REGRESSION.md": `# Security regression

FAIL. Tenant denial, actor denial, MFA capture and QA-only identities behaved correctly. However, Booking notification code attempted an external Brevo call without credentials (HTTP 401). No credential or customer data was used and no delivery succeeded, but the mandate forbids the call itself.
`,
  "CLEANUP-REPORT.md": `# Cleanup report

PASS. The backend QA container, PostgreSQL container and isolated Docker network were removed. The exact disposable PostgreSQL data directory D:\\CORO-QA\\runtime\\global-e2e-05\\postgres and the temporary MFA capture directory were deleted. Sanitized reports and reusable harness source were retained.
`,
  "DEFECT-REGISTER.md": `# Defect register

## GE2E-05-001 — P1 — Rendement

Real PostgreSQL cost-rate transition DRAFT to PROPOSED returns HTTP 500 / PrismaClientUnknownRequestError. This blocks governed cost approval, sold amount and margin acceptance. Reproduce with POST /api/advisor-cost-rates/:id/submit after a valid DRAFT.

## GE2E-05-002 — P1 — Booking notification isolation

Creating a client booking calls Brevo directly even when the governed MFA capture is enabled. The call returned 401, but violates isolated QA and makes deterministic provider interception incomplete.
`,
  "FINAL-REPORT.md": `# Final report

The reusable harness now contains an authenticated Booking/Planner and financial smoke driver. Booking passes. A real product failure blocks the financial lifecycle, and an external provider attempt fails the security gate. Per the mandate, Commercial/private-document completion and the local commit are withheld.

\`\`\`yaml
BOOKING_PLANNER_SMOKE: PASS
FINANCIAL_SMOKE: BLOCKED
COMMERCIAL_SMOKE: BLOCKED
PRIVATE_DOCUMENT_SMOKE: BLOCKED
BROWSER_SMOKE: PARTIAL
SECURITY_REGRESSION: FAIL
CLEANUP: PASS
PRODUCTION_ISOLATION: FAIL
LOCAL_COMMIT: NO
PUSH: NO
DEPLOY: NO
LIQUID_GLASS_TOUCHED: NO
FINAL_VERDICT: BLOCKED
\`\`\`

Production itself was never accessed or mutated. PRODUCTION_ISOLATION is FAIL because the QA backend attempted a Brevo network call, not because production data or credentials were used.
`,
};
for (const [name, content] of Object.entries(reports))
  await writeFile(join(root, name), content, "utf8");
console.log(`Completion dossier written: ${root}`);
