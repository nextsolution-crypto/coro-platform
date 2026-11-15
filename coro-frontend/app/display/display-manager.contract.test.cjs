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
assert.match(page, /DISPLAY_DEVICE_MANAGE/);
assert.match(page, /Ajouter un ecran/);
assert.match(page, /\/spatial`/);
assert.match(page, /\/floors`/);
assert.match(page, /\/zones`/);
assert.match(page, /\/display-locations`/);
assert.match(page, /Completer l'emplacement/);
assert.match(page, /Enregistrer et rendre admissible/);
assert.match(page, /expectedLockVersion:\s*location\.lockVersion/);
assert.match(page, /youAreHereX/);
assert.match(page, /orientationDegrees/);
assert.doesNotMatch(
  page,
  /f\.displayLocations\s*\.filter\(/,
  "an incomplete location must remain visible with its ineligibility reason",
);
assert.match(page, /approvePlan/);
assert.match(page, /publishPlan/);
assert.match(page, /generatePdfPreview/);
assert.match(page, /pdf-render-jobs/);
assert.match(page, /Choisissez explicitement la page PDF/);
assert.match(page, /targetDpi:\s*300/);
assert.match(page, /aria-live="polite"/);
assert.doesNotMatch(
  page,
  /act\("preview"\)/,
  "PDF preview must use the isolated asynchronous rasterizer",
);
assert.match(page, /window\.confirm/);
assert.match(page, /DeviceSupervision/);
assert.match(page, /buildingId/);
assert.match(page, /Contexte bâtiment/);
assert.match(page, /Ce bâtiment n’est pas accessible dans CORO Display/);
assert.match(css, /\.contextBanner/);
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
  /publicUrl|variantStorageKey|sourceStorageKey|outputStorageKey/,
  "no private storage key or public URL is exposed",
);
assert.match(css, /@media\s*\(max-width:\s*760px\)/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
console.log("DISPLAY-05A frontend contract: PASS");
