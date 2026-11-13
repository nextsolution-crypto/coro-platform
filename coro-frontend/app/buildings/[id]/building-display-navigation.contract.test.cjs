const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");

assert.match(page, /displayPermissions\?\.includes\(['"]DISPLAY_READ['"]\)/);
assert.match(page, /\/display\?buildingId=\$\{encodeURIComponent\(buildingId\)\}/);
assert.match(page, /Ouvrir dans CORO Display/);

console.log("Building to CORO Display navigation contract: PASS");
