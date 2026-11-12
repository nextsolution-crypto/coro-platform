const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "display.module.css"), "utf8");

assert.match(page, /display-manager/);
assert.match(page, /import AppLayout from ["']@\/components\/layout\/AppLayout["']/);
assert.match(page, /<AppLayout>/);
assert.match(page, /DISPLAY_PLAN_CREATE/);
assert.match(page, /DISPLAY_PLAN_REVIEW/);
assert.match(page, /DISPLAY_PLAN_PUBLISH/);
assert.match(page, /DISPLAY_PLAN_REVOKE/);
assert.match(page, /approvePlan/);
assert.match(page, /publishPlan/);
assert.match(page, /window\.confirm/);
assert.match(page, /DeviceSupervision/);
assert.match(page, /Appareils supervisés/);
assert.doesNotMatch(page, /Appareils non enregistrés/);
assert.match(page, /aria-labelledby="display-plan-title"/);
assert.match(
  page,
  /responseType:\s*["']blob["']/,
  "private preview must use authenticated blob retrieval",
);
assert.doesNotMatch(
  page,
  /publicUrl|variantStorageKey/,
  "no private storage key or public URL is exposed",
);
assert.match(css, /@media\s*\(max-width:\s*760px\)/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
console.log("DISPLAY-05A frontend contract: PASS");
