/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (relative) =>
  fs.readFileSync(path.join(__dirname, relative), "utf8");

test("direction dashboard uses the governed financial projection and role gate", () => {
  const source = read("page.tsx");
  assert.match(source, /\/rendement\/financial/);
  assert.match(source, /ADMIN/);
  assert.match(source, /SUPER_ADMIN/);
  assert.match(source, /Mandats incomplets/);
  assert.match(source, /formatFinancialAmount/);
  assert.match(source, /financialCurrencyLabel/);
  assert.doesNotMatch(source, /currency \?\? "CAD"/);
  assert.match(source, /main-d’œuvre connue/);
});

test("advisor profile uses only the operational projection", () => {
  const source = read("../../profile/rendement/page.tsx");
  assert.match(source, /\/rendement\/operational/);
  assert.doesNotMatch(source, /\/rendement\/financial/);
  assert.doesNotMatch(source, /soldAmount|knownLaborCost|contributionMargin/);
});
