const assert = require("node:assert/strict");
(async () => {
  const c = await import("./configuration-contract.mjs");
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
  console.log("commercial configuration contract: PASS");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
