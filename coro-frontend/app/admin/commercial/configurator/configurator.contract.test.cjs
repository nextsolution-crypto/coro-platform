/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const contract = await import("./configurator-contract.mjs");
  const { applyFamilySelection } =
    await import("./scenario-family-selection.mjs");
  const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
  const layout = fs.readFileSync(
    path.join(__dirname, "../../../../components/layout/AppLayout.tsx"),
    "utf8",
  );
  const legacy = fs.readFileSync(
    path.join(__dirname, "../simulator/page.tsx"),
    "utf8",
  );
  const guided = [
    "GuidedWorkspace.tsx",
    "ScenarioEditor.tsx",
    "ScenarioSidebar.tsx",
    "ScenarioResults.tsx",
    "ScenarioComparison.tsx",
    "CustomerSafeReview.tsx",
  ]
    .map((file) => fs.readFileSync(path.join(__dirname, file), "utf8"))
    .join("\n");
  const customerReview = fs.readFileSync(
    path.join(__dirname, "CustomerSafeReview.tsx"),
    "utf8",
  );
  const scenarioEditor = fs.readFileSync(
    path.join(__dirname, "ScenarioEditor.tsx"),
    "utf8",
  );
  assert.equal(
    contract.CONFIGURATOR_API_BASE,
    "/admin/v1/commercial/simulator/configurator",
  );
  assert.equal(contract.COMMERCIAL_FAMILY_CODES.length, 9);
  const professionalSelected = applyFamilySelection([], "PROFESSIONAL", true);
  assert.deepEqual(professionalSelected, ["PROFESSIONAL"]);
  assert.equal(professionalSelected.includes("PROFESSIONAL"), true);
  assert.deepEqual(
    applyFamilySelection(professionalSelected, "PROFESSIONAL", true),
    ["PROFESSIONAL"],
  );
  assert.deepEqual(
    applyFamilySelection(professionalSelected, "PROFESSIONAL_SERVICES", true),
    ["PROFESSIONAL", "PROFESSIONAL_SERVICES"],
  );
  assert.deepEqual(
    applyFamilySelection(
      ["PROFESSIONAL", "PROFESSIONAL_SERVICES"],
      "PROFESSIONAL",
      false,
    ),
    ["PROFESSIONAL_SERVICES"],
  );
  assert.match(guided, /CAPACITY_BAND/);
  assert.match(guided, /Total price for declared capacity band/);
  assert.deepEqual(contract.GUIDED_SCENARIO_ACTIONS, [
    "create",
    "edit",
    "duplicate",
    "archive",
    "select",
    "calculate",
  ]);
  assert.match(page, /"organizations"/);
  assert.match(page, /"prospects"/);
  assert.match(page, /targets\/\$\{resource\}/);
  assert.match(page, /price-books/);
  assert.match(page, /api\.post\(`\$\{CONFIGURATOR_API_BASE\}\/workspaces`/);
  assert.doesNotMatch(
    page,
    /placeholder=["'](?:Target|PriceBookVersion).*UUID/i,
  );
  assert.doesNotMatch(page, /<textarea[^>]+JSON/i);
  assert.doesNotMatch(page, /revenueCategory/);
  assert.match(page, /availability === "FUTURE"/);
  assert.match(layout, /Configurateur d’offres/);
  assert.match(legacy, /workspace/);
  assert.match(page, /GuidedWorkspace/);
  assert.match(guided, /Save configuration/);
  assert.match(guided, /Recalculate/);
  assert.match(guided, /Contribution/);
  assert.match(guided, /duplicate/);
  assert.match(guided, /archive/);
  assert.match(guided, /lockVersion/);
  assert.match(guided, /Catalog\s+setup is required/);
  assert.match(guided, /component\.packaging/);
  assert.match(guided, /Composition incomplète/);
  assert.match(guided, /scenario\.packaging\.status/);
  assert.match(guided, /Comparaison des sc/);
  assert.match(
    guided,
    /CUSTOMER_PREVIEW_RECALCULATION_REQUIRED|customer-preview/,
  );
  assert.match(guided, /runs\/\$\{scenario\.latestResult!\.id\}\/convert/);
  assert.match(guided, /Aperçu client non contractuel/);
  assert.match(guided, /Équivalent annuel récurrent/);
  assert.match(guided, /annualRecurringEquivalentMinor/);
  assert.match(guided, /commercialQuantityBasis/);
  assert.match(guided, /Declared by commercial operator/);
  assert.match(scenarioEditor, /applyFamilySelection/);
  assert.match(scenarioEditor, /event\.currentTarget\.checked/);
  assert.match(scenarioEditor, /data-selected=\{selected\}/);
  assert.match(guided, /Déclarée par/);
  assert.doesNotMatch(guided, /commercialRuleCode|commercialRuleVersion/);
  assert.doesNotMatch(guided, />METERED</);
  assert.doesNotMatch(customerReview, /costAssumption|catalogUnitAmountMinor/);
  assert.match(guided, /simulator\/configurator\/workspaces/);
  assert.doesNotMatch(guided, /<textarea[^>]*>.*JSON/is);
  assert.doesNotMatch(guided, /UUID|minor units|basis points|scopeKey/i);
  console.log("commercial configurator frontend contract: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
