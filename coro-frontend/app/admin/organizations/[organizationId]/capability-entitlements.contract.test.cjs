const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
for (const text of [
  "Licensed:",
  "Enabled:",
  "Distributable:",
  "Mismatch:",
  "Enforcement:",
  "NONE",
])
  assert(page.includes(text), `missing ${text}`);
assert(!page.includes("Billing tab"), "Phase 2C must not add billing");
console.log("Capability entitlements Organization 360 contract: OK");
