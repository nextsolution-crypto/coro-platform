/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const c = await import("./configuration-contract.mjs");
  const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
  assert.equal(c.GOVERNED_CONFIGURATION_DEFINITION, "professional-direct/v1");
  assert.deepEqual(c.GOVERNED_CONFIGURATION_STEPS, [
    "ANALYZE",
    "APPLY",
    "REVIEW",
    "APPROVE",
    "PUBLISH",
  ]);
  assert.equal(c.configurationCanApply({ blockers: [], changes: 12 }), true);
  assert.equal(c.configurationCanApply({ blockers: [{}], changes: 12 }), false);
  assert.equal(c.configurationCanApprove({ status: "READY_FOR_REVIEW" }), true);
  assert.equal(
    c.configurationCanPublish({
      status: "APPROVED",
      approval: { current: true },
    }),
    true,
  );
  assert.equal(
    c.configurationCanPublish({
      status: "APPROVED",
      approval: { current: false },
    }),
    false,
  );
  assert.equal(c.OFFER_CONFIGURATOR_LABEL, "Configurateur d’offres");
  assert.equal(c.PRICING_CONFIGURATION_LABEL, "Configuration tarifaire");
  assert.deepEqual(
    c.publishedApprovalPresentation({
      status: "PUBLISHED",
      approval: {
        current: false,
        approvedByDisplayName: "Mathieu Montaroux",
        approvedAt: "2026-10-05T12:00:00.000Z",
        publishedAt: "2026-10-05T12:05:00.000Z",
      },
    }),
    {
      state: "HISTORICAL_APPROVAL",
      approvedBy: "Mathieu Montaroux",
      approvedAt: "2026-10-05T12:00:00.000Z",
      publishedAt: "2026-10-05T12:05:00.000Z",
    },
  );
  assert.equal(
    c.publishedApprovalPresentation({
      status: "APPROVED",
      approval: { current: false, approvedAt: "2026-10-05T12:00:00.000Z" },
    }),
    null,
  );
  for (const label of [
    "Abonnement CORO Professional",
    "Implantation",
    "Services professionnels",
    "INTERNE — NON VISIBLE PAR LE CLIENT",
    "Coût récurrent SaaS CORO Professional",
    "Non configuré",
    "Contrôles de politique",
    "Détails techniques",
    "Approuvée par",
    "Publiée le",
    "Conforme",
    "À renouveler",
  ])
    assert.match(page, new RegExp(label));
  for (const amount of [
    "450000",
    "750000",
    "950000",
    "1150000",
    "1350000",
    "1550000",
    "1750000",
    "1900000",
    "2100000",
    "2250000",
  ])
    assert.doesNotMatch(page, new RegExp(`amountMinor:\\s*["']${amount}`));
  assert.doesNotMatch(page, /JSON\.stringify\(review\.policies/);
  assert.match(page, /<details/);
  assert.match(
    page,
    /analysis\.status !== "APPROVED"[\s\S]*?!analysis\.approval\?\.current/,
  );
  console.log("commercial configuration contract: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
