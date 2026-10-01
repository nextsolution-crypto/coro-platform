/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const contract = await import("./configurator-contract.mjs");
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
  ]
    .map((file) => fs.readFileSync(path.join(__dirname, file), "utf8"))
    .join("\n");
  assert.equal(
    contract.CONFIGURATOR_API_BASE,
    "/admin/v1/commercial/simulator/configurator",
  );
  assert.equal(contract.COMMERCIAL_FAMILY_CODES.length, 8);
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
  assert.match(layout, /Commercial Configurator/);
  assert.match(legacy, /workspace/);
  assert.match(page, /GuidedWorkspace/);
  assert.match(guided, /Save configuration/);
  assert.match(guided, /Recalculate/);
  assert.match(guided, /Contribution/);
  assert.match(guided, /duplicate/);
  assert.match(guided, /archive/);
  assert.match(guided, /lockVersion/);
  assert.match(guided, /Catalog\s+setup is required/);
  assert.doesNotMatch(guided, /<textarea[^>]*>.*JSON/is);
  assert.doesNotMatch(guided, /UUID|minor units|basis points|scopeKey/i);
  console.log("commercial configurator frontend contract: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
