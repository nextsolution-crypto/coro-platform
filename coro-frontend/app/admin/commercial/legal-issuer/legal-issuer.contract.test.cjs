const fs = require("node:fs"),
  path = require("node:path");
const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
for (const token of [
  "/admin/v1/commercial/legal-issuers",
  "Préparer le brouillon CORO",
  "Vérifier explicitement",
  "Préparer une nouvelle version",
  "Archiver",
  "Provenance",
  "SHA-256",
  "UNSPECIFIED",
  "NOT_APPLICABLE",
])
  if (!page.includes(token))
    throw new Error(`legal issuer UI missing ${token}`);
for (const forbidden of [
  "priceMinor",
  "costAssumption",
  "entitlement",
  "bankAccount",
  "socialInsurance",
])
  if (page.includes(forbidden))
    throw new Error(`legal issuer UI crossed boundary: ${forbidden}`);
console.log("legal issuer contract: PASS");
