const fs = require("node:fs"),
  path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
for (const token of [
  "/admin/v1/commercial/content",
  "Créer le brouillon Professional",
  "Définir l’offre",
  "Vérifier la disponibilité",
  "Rédiger les descriptions",
  "Réviser et approuver",
  "Inclus dans Professional",
  "Solutions autonomes",
  "Fonctionnalités futures",
  "Français",
  "English",
  "Informations avancées",
  "Réessayer",
  "Soumettre en revue",
  "Approuver explicitement",
  "Archiver",
  "commercialIntent",
  "deliveryMaturity",
  "Provenance",
  "non vérifiés",
])
  if (!page.includes(token))
    throw new Error(`commercial content UI missing ${token}`);
for (const forbidden of [
  "priceMinor",
  "costAssumption",
  "entitlement",
  "margin",
])
  if (page.includes(forbidden))
    throw new Error(
      `commercial content UI crossed authority boundary: ${forbidden}`,
    );
if (!page.includes("disabled={busy || blockers.length > 0}"))
  throw new Error("approval must remain blocked while readiness issues exist");
if (!page.includes("contents.length === 0 && !error"))
  throw new Error("empty content state must remain explicit");
const effect = page.slice(
  page.indexOf("useEffect(() =>"),
  page.indexOf("useEffect(() =>") + 250,
);
if (effect.includes("professional-draft"))
  throw new Error("page load must not create the Professional draft");
console.log("commercial content contract: PASS");
