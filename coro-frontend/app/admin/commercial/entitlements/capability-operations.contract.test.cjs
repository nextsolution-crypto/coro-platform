const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(
  path.join(
    __dirname,
    "../../../../components/admin/capability-operations/CapabilityOperationsWorkspace.tsx",
  ),
  "utf8",
);
test("uses grant-specific previewed mutations", () => {
  assert.match(source, /Grant-specific mutation/);
  assert.match(source, /entitlements\/preview/);
  assert.doesNotMatch(
    source,
    /licensedSwitch|enabledSwitch|distributableSwitch/,
  );
});
test("states the non-enforcement boundary in FR and EN", () => {
  assert.match(source, /Aucun mécanisme d'enforcement n'est appliqué/);
  assert.match(source, /No enforcement mechanism is applied/);
});
