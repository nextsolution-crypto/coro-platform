/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (relative) =>
  fs.readFileSync(path.join(__dirname, relative), "utf8");

test("direction dashboard uses the governed financial projection and role gate", () => {
  const source = read("page.tsx") + read("../../../components/rendement/FinancialPanel.tsx");
  assert.match(source, /\/rendement\/financial/);
  assert.match(source, /ADMIN/);
  assert.match(source, /SUPER_ADMIN/);
  assert.match(source, /Mandats incomplets/);
  assert.match(source, /formatFinancialAmount/);
  assert.match(source, /financialCurrencyLabel/);
  assert.doesNotMatch(source, /currency \?\? "CAD"/);
  assert.match(source, /main-d’œuvre connue/);
});

test("advisor profile shows the same view, scoped by the server to the advisor", () => {
  const source = read("../../profile/rendement/page.tsx");
  assert.match(source, /\/rendement\/operational/);
  assert.match(source, /\/rendement\/financial/);
  assert.match(source, /FinancialPanel/);
  assert.match(source, /ce qui vous concerne/);
  assert.doesNotMatch(source, /params: \{[^}]*userId/);
});
