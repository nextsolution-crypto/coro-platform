const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "page.tsx"), "utf8");

assert.match(page, /\/display-authority/);
assert.match(page, /DISPLAY_READ/);
assert.match(page, /displayBuildingIds/);
assert.match(page, /Les droits d’urgence ne\s+sont pas délégables ici/);
assert.match(page, /Accès CORO Display/);
assert.match(page, /Créateur \/ Mise à jour/);
assert.match(page, /Réviseur \/ Approbateur/);
assert.match(page, /applyDisplayProfessionalProfile/);
assert.match(page, /DISPLAY_PLAN_REVIEW/);
assert.match(page, /DISPLAY_PLAN_APPROVE/);
assert.match(page, /DISPLAY_PLAN_PUBLISH/);
assert.match(page, /le créateur ne peut jamais approuver sa propre/);

console.log("display authority administration contract: PASS");
