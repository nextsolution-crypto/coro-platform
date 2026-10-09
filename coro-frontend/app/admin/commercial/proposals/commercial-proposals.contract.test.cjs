/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs"),
  path = require("path");
const dashboard = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const wizard = fs.readFileSync(path.join(__dirname, "new/page.tsx"), "utf8");
const detail = fs.readFileSync(
  path.join(__dirname, "[proposalId]/page.tsx"),
  "utf8",
);
const customerSafeReview = fs.readFileSync(
  path.join(__dirname, "../configurator/CustomerSafeReview.tsx"),
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
  "Ouvrir l’aperçu client",
  "openPreview",
  "onClose={closePreview}",
  "document-compositions",
  "Composer le brouillon documentaire",
  "Prêt pour émission",
  "Brouillon interne — exigences manquantes",
  "Diagnostics de préparation",
  "Sections incluses",
])
  if (!detail.includes(token)) throw new Error(`finalization missing ${token}`);
for (const forbidden of ["catalogUnitAmountMinor", "costAssumption", "margin"])
  if (detail.includes(forbidden))
    throw new Error(`detail leaks internal field ${forbidden}`);
if (/setPreview\(response\.data\)[\s\S]*?\}, \[proposalId\]\)/.test(detail))
  throw new Error("detail load must not automatically reopen customer preview");
for (const token of [
  'event.key === "Escape"',
  "event.target === event.currentTarget",
  "closeButtonRef.current?.focus()",
  "previouslyFocused?.focus()",
  'document.body.style.overflow = "hidden"',
  "hasNonZeroMinor(preview.totals.monthlyRecurringMinor)",
])
  if (!customerSafeReview.includes(token))
    throw new Error(`customer preview dismissal missing ${token}`);
console.log("Commercial proposals configurator contract: OK");
