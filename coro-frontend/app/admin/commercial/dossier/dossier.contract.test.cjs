const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(
  path.join(__dirname, "[targetType]", "[targetId]", "page.tsx"),
  "utf8",
);
const navigationSources = [
  path.join(__dirname, "..", "prospects", "page.tsx"),
  path.join(__dirname, "..", "configurator", "GuidedWorkspace.tsx"),
  path.join(__dirname, "..", "proposals", "[proposalId]", "page.tsx"),
  path.join(
    __dirname,
    "..",
    "..",
    "organizations",
    "[organizationId]",
    "page.tsx",
  ),
].map((file) => fs.readFileSync(file, "utf8"));
for (const expected of [
  "/admin/v1/commercial/dossiers/${targetType}/${targetId}",
  "Configurations commerciales",
  "Propositions et documents",
  "Contrats",
  "Activations",
  "Prochaine action",
  "Aucun droit n’est inféré",
  "Création directe/historique",
  "Chargement du dossier commercial",
  "Accès réservé",
  "Impossible de charger",
]) {
  if (!source.includes(expected))
    throw new Error(`Missing dossier contract: ${expected}`);
}
for (const forbidden of [
  "firstYearCost",
  "margin",
  "internalNotes",
  "snapshotHash",
  "JSON.stringify(dossier)",
]) {
  if (source.includes(forbidden))
    throw new Error(`Unsafe dossier field: ${forbidden}`);
}
for (const [index, navigationSource] of navigationSources.entries()) {
  if (!navigationSource.includes("/admin/commercial/dossier/")) {
    throw new Error(`Missing contextual dossier navigation source ${index}`);
  }
}
console.log("commercial unified dossier frontend contract: PASS");
