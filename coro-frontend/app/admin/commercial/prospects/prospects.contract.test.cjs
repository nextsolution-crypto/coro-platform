/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");
const configurator = fs.readFileSync(
  path.join(__dirname, "../configurator/page.tsx"),
  "utf8",
);
for (const label of [
  "Nouveau prospect",
  "Nom légal",
  "Nom d’affichage",
  "Référence",
  "Relation commerciale",
  "Canada",
  "Français",
  "Nom du contact",
  "Courriel",
  "Téléphone",
  "Préparer une offre",
  "Configurations commerciales",
  "Reprendre la configuration",
  "Créer une nouvelle configuration",
  "Propositions",
  "Aucune proposition enregistrée pour ce prospect.",
  "Aucun prospect pour le moment.",
])
  assert.match(page, new RegExp(label));
assert.match(page, /api\.post\("\/admin\/v1\/commercial\/prospects"/);
assert.match(page, /api\.patch/);
assert.match(page, /targetType=PROSPECT&prospectId=/);
assert.match(page, /audience=DIRECT/);
assert.match(
  page,
  /api\.get\(`\/admin\/v1\/commercial\/prospects\/\$\{id\}`\)/,
);
assert.match(page, /workspace=\$\{encodeURIComponent\(workspace\.id\)\}/);
assert.match(page, /proposals\/\$\{proposal\.id\}/);
assert.match(configurator, /params\.get\("targetType"\) === "PROSPECT"/);
assert.match(configurator, /params\.get\("prospectId"\)/);
assert.match(
  configurator,
  /targets\.find\(\(item\) => item\.id === requestedProspectId\)/,
);
assert.doesNotMatch(page, /Read-only index|No prospects/);
assert.doesNotMatch(page, /workspace.*post|proposals.*post/i);
console.log("commercial prospects founder UX contract: PASS");
