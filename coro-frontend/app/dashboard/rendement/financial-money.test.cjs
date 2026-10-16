/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "financial-money.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const helperModule = new Module(sourcePath, module);
helperModule.filename = sourcePath;
helperModule.paths = module.paths;
helperModule._compile(compiled, sourcePath);
const { financialCurrencyLabel, formatFinancialAmount } = helperModule.exports;

test("formats only the three Founder-supported currencies through Intl currency mode", () => {
  assert.match(formatFinancialAmount("12.34", "CAD"), /12,34/);
  assert.match(formatFinancialAmount("12.34", "USD"), /12,34/);
  assert.match(formatFinancialAmount("12.34", "EUR"), /12,34/);
  assert.equal(financialCurrencyLabel("CAD"), "CAD");
  assert.equal(financialCurrencyLabel("USD"), "USD");
  assert.equal(financialCurrencyLabel("EUR"), "EUR");
});

test("renders missing and UNKNOWN currency explicitly without RangeError or CAD inference", () => {
  for (const currency of [null, undefined, "UNKNOWN"]) {
    assert.doesNotThrow(() => formatFinancialAmount("1250.00", currency));
    const rendered = formatFinancialAmount("1250.00", currency);
    assert.match(rendered, /1\s250,00/);
    assert.match(rendered, /Devise inconnue/);
    assert.doesNotMatch(rendered, /\$|CAD/);
  }
});

test("keeps unsupported historical codes visible without currency formatting", () => {
  for (const currency of ["ZZZ", "GBP", "TOOLONG", "X"]) {
    const rendered = formatFinancialAmount("1250.00", currency);
    assert.match(rendered, /Devise non prise en charge/);
    assert.match(rendered, new RegExp(`\\(${currency}\\)`));
    assert.doesNotMatch(rendered, /\$|CAD/);
  }
});

test("preserves zero, negative amounts, and null amount semantics", () => {
  assert.match(formatFinancialAmount("0", "CAD"), /0,00/);
  assert.match(formatFinancialAmount("-125.50", "CAD"), /-125,50/);
  assert.equal(formatFinancialAmount(null, "CAD"), "Non disponible");
});

test("provides explicit French and English unknown-currency labels", () => {
  assert.equal(financialCurrencyLabel(null, "fr"), "Devise inconnue");
  assert.equal(financialCurrencyLabel("UNKNOWN", "en"), "Unknown currency");
  assert.match(
    formatFinancialAmount("42", "GBP", "en"),
    /Unsupported currency \(GBP\)/,
  );
  assert.equal(formatFinancialAmount(null, "USD", "en"), "Not available");
});

test("keeps valid and unknown total groups separate and renderable", () => {
  const totals = [
    { currency: "CAD", amount: "100.00" },
    { currency: "USD", amount: "80.00" },
    { currency: "UNKNOWN", amount: "25.00" },
  ];
  const rendered = totals.map((total) => ({
    currency: financialCurrencyLabel(total.currency),
    amount: formatFinancialAmount(total.amount, total.currency),
  }));

  assert.equal(rendered.length, 3);
  assert.equal(rendered[0].currency, "CAD");
  assert.equal(rendered[1].currency, "USD");
  assert.equal(rendered[2].currency, "Devise inconnue");
  assert.match(rendered[2].amount, /Devise inconnue/);
});

test("keeps an incomplete mandate explicit without inferring a currency", () => {
  const mandate = {
    soldAmount: null,
    soldCurrency: null,
    knownLaborCost: "0.00",
    completeness: "INCOMPLETE",
  };

  assert.equal(
    formatFinancialAmount(mandate.soldAmount, mandate.soldCurrency),
    "Non disponible",
  );
  assert.match(
    formatFinancialAmount(mandate.knownLaborCost, mandate.soldCurrency),
    /Devise inconnue/,
  );
  assert.equal(mandate.completeness, "INCOMPLETE");
});
