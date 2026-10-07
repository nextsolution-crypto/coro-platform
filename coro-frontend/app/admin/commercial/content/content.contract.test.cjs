const fs = require("node:fs"),
  path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
for (const token of [
  "/admin/v1/commercial/content",
  "Créer le brouillon Professional",
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
console.log("commercial content contract: PASS");
