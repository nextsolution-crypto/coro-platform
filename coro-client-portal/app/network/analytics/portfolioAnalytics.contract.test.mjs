import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const page = fs.readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const css = fs.readFileSync(
  new URL("./portfolio-analytics.module.css", import.meta.url),
  "utf8",
);
test("governed filters and export", () => {
  assert.match(page, /client-portal\/network\/analytics/);
  assert.match(page, /portfolioId/);
  assert.match(page, /regionId/);
  assert.match(page, /buildingId/);
  assert.match(page, /type="date"/);
  assert.match(page, /apiDownload/);
  assert.doesNotMatch(page, /SUPER_ADMIN|Platform Authority/);
});
test("freshness and missing data", () => {
  assert.match(page, /missingData/);
  assert.match(page, /freshness/);
  assert.match(page, /Exporter CSV/);
});
test("responsive component geometry", () => {
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /@media\s*\(max-width:\s*520px\)/);
  assert.match(css, /min-width:\s*0/);
});
