/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");

(async () => {
  const contract = await import("./simulator-contract.mjs");
  assert.equal(contract.SIMULATOR_API_BASE, "/admin/v1/commercial/simulator");
  assert.deepEqual(contract.SIMULATOR_TABS, [
    "Configuration",
    "Price",
    "Cost",
    "Value",
    "Comparison",
  ]);
  assert.match(contract.SIMULATOR_OBSERVATION_NOTICE, /no entitlement/i);
  assert.equal(contract.SIMULATOR_AUTHORITY.price, "PriceBookVersion");
  assert.equal(contract.SIMULATOR_AUTHORITY.proposal, "explicit conversion");
  console.log("commercial simulator frontend contract: PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
