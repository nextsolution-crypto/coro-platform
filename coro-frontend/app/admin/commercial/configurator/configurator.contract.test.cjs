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
  assert.equal(
    contract.CONFIGURATOR_API_BASE,
    "/admin/v1/commercial/simulator/configurator",
  );
  assert.equal(contract.COMMERCIAL_FAMILY_CODES.length, 8);
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
  assert.match(page, /availability === "FUTURE"/);
  assert.match(layout, /Commercial Configurator/);
  assert.match(legacy, /workspace/);
  console.log("commercial configurator frontend contract: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
