/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs"),
  path = require("path");
const dashboard = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const wizard = fs.readFileSync(path.join(__dirname, "new/page.tsx"), "utf8");
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
  "Aucun prix n’est calculé dans React",
  "VALEUR OPÉRATIONNELLE ESTIMÉE",
  "OBSERVED_SNAPSHOT",
  "commercialQuantityBasis",
  "commercialQuantityBasis: commercialQuantityBasis || undefined",
  "METERED est indisponible",
  "revenueCategory",
  "Catégorie de revenu",
  'revenueCategory: "OTHER_ONE_TIME"',
])
  if (!wizard.includes(token)) throw new Error(`wizard missing ${token}`);
console.log("Commercial proposals configurator contract: OK");
