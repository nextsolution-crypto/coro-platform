const assert = require("node:assert/strict");
import("./control-center-contract.mjs").then(
  ({ CONTROL_CENTER_SECTIONS, PHASE_3A_INVARIANTS }) => {
    assert.equal(CONTROL_CENTER_SECTIONS.length, 6);
    assert.deepEqual(PHASE_3A_INVARIANTS, {
      observationOnly: true,
      enforcement: "NONE",
      billable: false,
    });
  },
);
