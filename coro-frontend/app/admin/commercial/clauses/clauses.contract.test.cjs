const fs = require("node:fs"),
  path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
for (const token of [
  "/admin/v1/commercial/clauses",
  "/admin/v1/commercial/clauses/preconfiguration/dry-run",
  "/admin/v1/commercial/clauses/preconfiguration/apply",
  "Préparer le catalogue DRAFT",
  "Analyser la préconfiguration B01",
  "Prévisualisation sans écriture",
  "APPLY_B01_STANDARD_DRAFTS",
  "ELIGIBLE_STANDARD_DRAFT",
  "brouillons standard DRAFT strictement inchangés",
  "revue juridique requise",
  "Applicabilité",
  "Paramètres contractuels permis",
  "Langue d’édition",
  "Détails techniques avancés",
  "Preuve de revue juridique",
  "Approuver explicitement",
  "Date de prise d&apos;effet",
  "Préparer une nouvelle version",
])
  if (!page.includes(token)) throw new Error(`clause UI missing ${token}`);
for (const forbidden of [
  "priceMinor",
  "entitlement",
  "generatePdf",
  "customerSafeProjection.push",
])
  if (page.includes(forbidden))
    throw new Error(`clause UI crossed boundary: ${forbidden}`);
console.log("commercial clause library contract: PASS");
