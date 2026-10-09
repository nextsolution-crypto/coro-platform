/* eslint-disable @typescript-eslint/no-require-imports -- Node contract test. */
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const navigation = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "components",
    "layout",
    "AppLayout.tsx",
  ),
  "utf8",
);

for (const expected of [
  "Préparer une offre",
  "Créer volontairement un prospect",
  "Reprendre une offre existante",
  "Créer une nouvelle offre",
  "Client",
  "Solution",
  "Configuration et prix",
  "Document commercial",
  "Vérification et finalisation",
  "/admin/v1/commercial/dossiers/${selected.type}/${selected.id}",
  "targetType=${selected.type}&targetId=${selected.id}",
  'aria-label="Progression de l’offre"',
  "focus-visible:outline",
]) {
  if (!source.includes(expected))
    throw new Error(`Missing Founder Journey contract: ${expected}`);
}
for (const expected of [
  "Tableau commercial",
  "Préparer une offre",
  "Dossiers commerciaux",
  "Administration commerciale",
  "Outils avancés",
  "/admin/commercial/proposals/new",
]) {
  if (!navigation.includes(expected))
    throw new Error(`Missing commercial navigation: ${expected}`);
}
for (const forbidden of [
  "api.post",
  "api.patch",
  "api.delete",
  "firstYearCost",
  "margin",
  "internalNotes",
]) {
  if (source.includes(forbidden))
    throw new Error(`Unsafe Founder Journey behavior: ${forbidden}`);
}
console.log("commercial Founder Journey contract: PASS");
