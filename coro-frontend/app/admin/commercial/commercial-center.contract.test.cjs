const assert = require("node:assert/strict");
import("./commercial-center-contract.mjs").then(
  ({ COMMERCIAL_CENTER_ROUTES, COMMERCIAL_CENTER_MODE }) => {
    assert.equal(COMMERCIAL_CENTER_ROUTES.length, 6);
    assert.equal(COMMERCIAL_CENTER_MODE.editor, false);
  },
);
