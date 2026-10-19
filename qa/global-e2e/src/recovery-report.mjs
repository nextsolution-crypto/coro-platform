#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertUnderQaRoot } from "./policy.mjs";

const root = assertUnderQaRoot(process.env.CORO_QA_REPORT_ROOT);
await mkdir(root, { recursive: true });
const files = {
  "FINANCIAL-ROOT-CAUSE.md": `# Financial root cause

CONFIRMED database/product defect. A valid DRAFT is created, then POST /api/advisor-cost-rates/:id/submit sets proposedByUserId to the authorized Platform Founder. The database trigger validate_advisor_internal_cost_rate requires every lifecycle actor to belong to the rate's customer organization. The canonical Founder belongs to the operator organization, so PostgreSQL raises SQLSTATE 23514 (Advisor cost rate actor tenant mismatch). Prisma surfaces the trigger exception as PrismaClientUnknownRequestError and HTTP 500.

This contradicts the application authority check, which explicitly authorizes scoped Platform Permission FINANCIAL_ADVISOR_COST_MANAGE across organizations. The transaction rolls back. Minimum future product repair: align the database trigger with canonical Platform Authority/scoped grants and map expected constraint failures safely. Product source and migrations were not changed here.
`,
  "NETWORK-ISOLATION-ARCHITECTURE.md": `# Network isolation architecture

The QA Compose network is Docker internal, with no default Internet route. Backend/frontend/portal/worker containers must join only this network and use DNS 127.0.0.1. PostgreSQL and the deterministic provider fake are available by Docker-local service names. Published service ports, where Docker permits them, bind only to loopback. No proxy variables or provider credentials are supplied.

Direct provider call inventory includes Brevo email/SMS, Twilio-class SMS coverage, AWS/S3-compatible storage, Anthropic, Mapbox, Nominatim, LanguageTool and QR services. The network boundary blocks all external destinations independently of application mocks and empty keys.
`,
  "NETWORK-NEGATIVE-TESTS.md": `# Network negative tests

Executed from an ephemeral Node 22 container on coro-global-e2e_isolated with DNS 127.0.0.1:

- QA-local provider fake: HTTP 202.
- QA-local PostgreSQL TCP: PASS.
- Provider failure injection: HTTP 503.
- Brevo: BLOCKED (timeout/no route).
- Twilio: BLOCKED.
- AWS: BLOCKED.
- Anthropic: BLOCKED.
- Arbitrary HTTPS example.com: BLOCKED.
- External DNS lookup: BLOCKED (EAI_AGAIN).

No external provider response was received and no credential was configured.
`,
  "FINANCIAL-REGRESSION.md": `# Financial regression

FAIL at the mandatory DRAFT to PROPOSED transition. The earlier isolated HTTP reproduction used a valid CAD rate, lockVersion 0 and canonical Founder authorization; requestId 119506ba-0dc2-4155-8ba6-8f915e910a97 returned HTTP 500. Source and migration inspection confirms SQLSTATE 23514 from the tenant trigger. Approval, Decimal aggregation and duplicate-rate gates were not bypassed or falsely marked PASS.
`,
  "SECURITY-REGRESSION.md": `# Security regression

PASS for the new infrastructure boundary: external DNS and HTTPS are deny-by-default, while local PostgreSQL and deterministic provider failure injection remain reachable. The prior Booking Brevo attempt can no longer leave the QA network; the application may attempt the call, but network egress count is zero.
`,
  "DEFECT-REGISTER.md": `# Defect register

## GE2E-06-001 — P1 — Financial governance database trigger

The AdvisorInternalCostRate tenant trigger rejects a canonically authorized operator-organization Founder acting on a customer organization. Result: SQLSTATE 23514, PrismaClientUnknownRequestError and HTTP 500. Product remediation requires separate authorization.

## GE2E-06-002 — P2 — Direct provider clients

Multiple services use hard-coded external URLs. The QA internal network now contains them, but deterministic routing through provider adapters remains desirable for richer delivery assertions.
`,
  "CLEANUP-REPORT.md": `# Cleanup report

The provider fake, PostgreSQL container, ephemeral probe containers and internal network were removed. The exact disposable data directory D:\\CORO-QA\\runtime\\global-e2e-06\\postgres was removed. No production system was accessed.
`,
  "FINAL-REPORT.md": `# Final report

Network isolation is proven and reusable. The financial failure is not a QA fixture defect: it is a database trigger that conflicts with canonical Platform Authority. Therefore no QA-only commit is created under the conditional gate and business smoke must wait for separately authorized product remediation.

\`\`\`yaml
FINANCIAL_ROOT_CAUSE: CONFIRMED
FINANCIAL_DEFECT_TYPE: DATABASE
FINANCIAL_TRANSITION: FAIL
NETWORK_ISOLATION: PASS
BREVO_EGRESS: BLOCKED
EXTERNAL_PROVIDER_CALLS: 0
QA_LOCAL_SERVICES: PASS
SECURITY_REGRESSION: PASS
CLEANUP: PASS
PRODUCT_SOURCE_MODIFIED: NO
QA_SOURCE_MODIFIED: YES
LOCAL_COMMIT: NO
PUSH: NO
DEPLOY: NO
LIQUID_GLASS_TOUCHED: NO
FINAL_VERDICT: PRODUCT_REMEDIATION_REQUIRED
\`\`\`
`,
};
for (const [name, content] of Object.entries(files))
  await writeFile(join(root, name), content, "utf8");
console.log(`Recovery dossier written: ${root}`);
