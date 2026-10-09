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
  "Préparer une offre",
  "Chargement des propositions",
  "Impossible de charger les propositions",
  "Accès non autorisé",
  "Aucune proposition enregistrée",
  "Aucune proposition ne correspond aux filtres",
  "Réessayer",
  "Référence, titre ou client",
  "Prospects",
  "Organisations",
  "/admin/v1/commercial/proposals",
])
  if (!dashboard.includes(token)) throw new Error(`dashboard missing ${token}`);
if (
  !/href=\{`\/admin\/commercial\/proposals\/\$\{proposal\.id\}`\}/.test(
    dashboard,
  )
)
  throw new Error("dashboard must link directly to Proposal detail");

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
  "Prévisualiser le contenu client",
  "onClose={() => setPreview(undefined)}",
  "document-compositions",
  "Informations générales",
  "Solution et prestations",
  "Investissement",
  "Conditions commerciales",
  "Aperçu et revue",
  "Composer le document",
  "Admissible à l’émission documentaire",
  "Brouillon interne non transmissible",
  "Diagnostic documentaire",
  "Générer le PDF V2",
  "generate-pdf-v2",
  "PDF historique V3",
  "typedClauseParameters",
  "approved-projection",
  "/admin/v1/commercial/content",
  "/admin/v1/commercial/legal-issuers",
])
  if (!detail.includes(token))
    throw new Error(`document workspace missing ${token}`);

for (const forbidden of [
  "catalogUnitAmountMinor",
  "costAssumption",
  "margin",
  "Paramètres de clauses gouvernés (JSON)",
])
  if (detail.includes(forbidden))
    throw new Error(`detail leaks forbidden content ${forbidden}`);
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

console.log("Commercial proposals governed document workspace contract: OK");
