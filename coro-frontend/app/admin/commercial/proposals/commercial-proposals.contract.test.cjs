/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs"),
  path = require("path");
const dashboard = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const wizard = fs.readFileSync(path.join(__dirname, "new/page.tsx"), "utf8");
const detail = fs.readFileSync(
  path.join(__dirname, "[proposalId]/page.tsx"),
  "utf8",
);
for (const token of [
  "Nouvelle proposition",
  "Aucune proposition",
  "/admin/v1/commercial/proposals",
])
  if (!dashboard.includes(token)) throw new Error(`dashboard missing ${token}`);
for (const token of [
  "Target",
  "PriceBook",
  "Capabilities",
  "Population",
  "Pricing",
  "Adjustments",
  "Value Analysis",
  "PDF",
  "Acceptance",
  "Contract",
  "OBSERVED_SNAPSHOT",
  "commercialQuantityBasis",
  "revenueCategory",
])
  if (!wizard.includes(token)) throw new Error(`wizard missing ${token}`);
for (const token of [
  "customer-preview",
  "CustomerSafeReview",
  "generate-pdf",
  "validFrom",
  "termsFR",
  "/finalization",
  "request-review",
  "mark-ready",
  "download",
  'responseType: "blob"',
])
  if (!detail.includes(token)) throw new Error(`finalization missing ${token}`);
for (const forbidden of ["catalogUnitAmountMinor", "costAssumption", "margin"])
  if (detail.includes(forbidden))
    throw new Error(`detail leaks internal field ${forbidden}`);
console.log("Commercial proposals configurator contract: OK");
