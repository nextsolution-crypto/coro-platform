/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const contract = await import("./configurator-contract.mjs");
  const { applyFamilySelection } =
    await import("./scenario-family-selection.mjs");
  const {
    PROFESSIONAL_COMPONENTS,
    buildProfessionalDraftRequest,
    capacityBusinessBounds,
    professionalDraftFromScenario,
  } = await import("./professional-offer-builder.mjs");
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
    "ProfessionalOfferBuilder.tsx",
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
  const professionalCatalog = Object.values(PROFESSIONAL_COMPONENTS).map(
    (code) => ({ id: `id-${code}`, code }),
  );
  const professionalScenario = {
    id: "scenario-professional",
    lines: [
      {
        id: "annual",
        source: "CATALOG_COMPONENT",
        priceComponentId: `id-${PROFESSIONAL_COMPONENTS.annual}`,
        quantity: "125",
        costEfforts: [],
      },
      {
        id: "advanced",
        source: "CATALOG_COMPONENT",
        priceComponentId: `id-${PROFESSIONAL_COMPONENTS.advanced}`,
        quantity: "1",
        costEfforts: [],
      },
      {
        id: "delivery",
        source: "CATALOG_COMPONENT",
        priceComponentId: `id-${PROFESSIONAL_COMPONENTS.delivery}`,
        quantity: "10",
        costEfforts: [],
      },
      {
        id: "senior",
        source: "CATALOG_COMPONENT",
        priceComponentId: `id-${PROFESSIONAL_COMPONENTS.senior}`,
        quantity: "3",
        costEfforts: [],
      },
    ],
    drivers: [{ code: "ACTIVE_SITES", value: "125" }],
  };
  assert.deepEqual(
    professionalDraftFromScenario(professionalScenario, professionalCatalog),
    {
      capacity: "125",
      implementation: "ADVANCED",
      deliveryHours: "10",
      seniorHours: "3",
    },
  );
  const professionalRequest = buildProfessionalDraftRequest({
    scenario: professionalScenario,
    catalog: professionalCatalog,
    state: {
      capacity: "150",
      implementation: "STANDARD",
      deliveryHours: "15",
      seniorHours: "3",
    },
  });
  assert.deepEqual(professionalRequest.familyCodes, ["PROFESSIONAL"]);
  assert.deepEqual(professionalRequest.driverValues, [
    { driverCode: "ACTIVE_SITES", value: "150" },
  ]);
  assert.deepEqual(
    professionalRequest.catalogLines.map((line) => line.quantity),
    ["150", "1", "15", "3"],
  );
  assert.equal(
    professionalRequest.catalogLines.every(
      (line) => line.commercialQuantityBasis === "DECLARED",
    ),
    true,
  );
  assert.equal("catalogAmountCad" in professionalRequest, false);
  assert.equal("price" in professionalRequest, false);
  const noServicesRequest = buildProfessionalDraftRequest({
    scenario: professionalScenario,
    catalog: professionalCatalog,
    state: {
      capacity: "125",
      implementation: "ADVANCED",
      deliveryHours: "0",
      seniorHours: "0",
    },
  });
  assert.equal(noServicesRequest.catalogLines.length, 2);
  assert.equal(
    capacityBusinessBounds({ minimumQuantity: "101", maximumQuantity: "126" }),
    "101–125",
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
  assert.match(guided, /knownModeledDirectCostCad/);
  assert.match(guided, /Recurring SaaS cost: not configured/);
  assert.match(guided, /nextAssumptions\.cost\.length === 1/);
  assert.match(guided, /costAssumptionVersionId/);
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
  assert.match(guided, /params: \{ scenarioId: scenario\.id \}/);
  assert.match(guided, /Customer Preview could not be opened/);
  assert.match(guided, /role="dialog"/);
  assert.match(guided, /aria-modal="true"/);
  assert.match(guided, /preview\.inputs\.map/);
  assert.match(guided, /monthlyRecurringMinor !== null/);
  assert.match(guided, /onClose=\{\(\) => setPreview\(undefined\)\}/);
  assert.match(
    guided,
    /disabled=\{\s*draftDirty \|\|\s*!scenario\?\.latestResult \|\|\s*scenario\.stale \|\|\s*previewBusy/,
  );
  assert.match(guided, /Équivalent annuel récurrent/);
  assert.match(guided, /annualRecurringEquivalentMinor/);
  assert.match(guided, /commercialQuantityBasis/);
  assert.match(guided, /Declared by commercial operator/);
  assert.match(scenarioEditor, /applyFamilySelection/);
  assert.match(scenarioEditor, /event\.currentTarget\.checked/);
  assert.match(scenarioEditor, /data-selected=\{selected\}/);
  assert.match(scenarioEditor, /familyAuthoritySource === "LEGACY_INFERRED"/);
  assert.match(scenarioEditor, /familyAuthoritySource === "REVIEW_REQUIRED"/);
  assert.match(scenarioEditor, /Select\s+and save the intended solution/);
  assert.match(guided, /Déclarée par/);
  assert.doesNotMatch(guided, /commercialRuleCode|commercialRuleVersion/);
  assert.doesNotMatch(guided, />METERED</);
  assert.doesNotMatch(customerReview, /costAssumption|catalogUnitAmountMinor/);
  assert.match(guided, /simulator\/configurator\/workspaces/);
  assert.match(guided, /\/workspaces\/\$\{workspaceId\}\/evaluate/);
  assert.match(guided, /window\.setTimeout\(async \(\) =>/);
  assert.match(guided, /}, 450\)/);
  assert.match(guided, /AbortController/);
  assert.match(guided, /requestSequence/);
  assert.match(guided, /CORO Professional/);
  assert.match(guided, /Enterprise \/ sur devis/);
  assert.match(guided, /Aperçu en direct/);
  assert.match(guided, /Analyse interne/);
  assert.match(guided, /Options avancées/);
  assert.match(guided, /beforeunload/);
  assert.match(guided, /disabled=\{\s*draftDirty/);
  assert.doesNotMatch(scenarioEditor, /<textarea[^>]*>.*JSON/is);
  assert.doesNotMatch(guided, /UUID|minor units|basis points|scopeKey/i);
  console.log("commercial configurator frontend contract: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
