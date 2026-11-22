import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const layout = fs.readFileSync(
  new URL("../components/PortalLayout.tsx", import.meta.url),
  "utf8",
);
const buildings = fs.readFileSync(
  new URL("../buildings/page.tsx", import.meta.url),
  "utf8",
);
const buildingsCss = fs.readFileSync(
  new URL("../buildings/buildings.module.css", import.meta.url),
  "utf8",
);
const workstationCss = fs.readFileSync(
  new URL("./security-workstation.module.css", import.meta.url),
  "utf8",
);
const auth = fs.readFileSync(
  new URL("../store/auth.ts", import.meta.url),
  "utf8",
);

assert.match(layout, /Poste de sécurité/);
assert.match(page, /operational-capabilities\?buildingId=/);
assert.match(
  page,
  /available\.some\(\(capability\) => capability\.available\)/,
);
assert.match(page, /setBuildingId\(preferred\?\.building\.id \?\? ""\)/);
assert.doesNotMatch(page, /setBuildingId\(next\[0\]\?\.id/);
assert.match(page, /client-portal\/organizations\/\$\{organizationId\}/);
assert.match(page, /incident-reports\/forms\/templates/);
assert.match(page, /reportFileCapabilities/);
assert.match(page, /reportPermissions/);
assert.match(page, /INCIDENT_REPORT_CREATE/);
assert.match(page, /INCIDENT_REPORT_APPROVE/);
assert.match(page, /INCIDENT_REPORT_EXPORT/);
assert.match(page, /item\.status === "APPROVED" && canApprove/);
assert.match(page, /visibleReviewActions\(reportPermissions\)/);
assert.match(page, /reviewActions\.map\(\(action\)/);
assert.match(page, /attachmentUpload\.available === true/);
assert.match(page, /Pièce jointe indisponible/);
assert.match(page, /historicalArchiveAvailable/);
assert.match(page, /params\.set\("status", reportStatus\)/);
assert.match(page, /params\.set\("reportType", reportType\)/);
assert.match(
  page,
  /params\.set\(\s*showHistorical \? "importedFrom" : "createdFrom",\s*createdFrom,\s*\)/,
);
assert.match(
  page,
  /params\.set\(showHistorical \? "importedTo" : "createdTo", createdTo\)/,
);
assert.match(page, /Filtrer les rapports par statut/);
assert.match(page, /Filtrer les rapports par formulaire/);
assert.match(page, /Afficher les archives/);
assert.match(
  page,
  /incident-reports\$\{showHistorical \? "\/historical" : ""\}/,
);
assert.match(page, /provenanceKind === "HISTORICAL_IMPORT"/);
assert.match(page, /Archive importée|Archive historique/);
assert.match(page, /<PortalLayout>[\s\S]*<main className=\{styles\.page\}>/);
assert.match(page, /isCanonicalUuid\(buildingId\)/);
assert.match(page, /setTab\("overview"\)/);
assert.match(page, /Promise\.allSettled/);
assert.match(page, /templateResult\.status === "fulfilled"[\s\S]*\? asItems/);
assert.match(page, /Aucun formulaire de rapport disponible/);
assert.match(page, /eligibleTemplates\.length === 0/);
assert.match(
  page,
  /setForm\(\(current\) => \(\{[\s\S]*content:[\s\S]*\[key\]: value/,
);
assert.match(page, /instant\.toISOString\(\)/);
assert.match(page, /aria-invalid=\{Boolean\(error\)\}/);
assert.match(page, /conditionVisible/);
assert.match(page, /condition\.all/);
assert.match(page, /Section \{safeIndex \+ 1\} sur \{sections\.length\}/);
assert.match(page, /Vérifier l’aperçu/);
assert.match(page, /field\.type === "MULTI_SELECT"/);
assert.match(page, /Sauvegarde automatique incertaine/);
assert.match(page, /aucune nouvelle tentative automatique/);
assert.match(
  page,
  /reason instanceof ApiError && Array\.isArray\(reason\.details\)/,
);
assert.match(page, /<button onClick=\{onOpen\}>Ouvrir<\/button>/);
assert.match(
  page,
  /apiPatch\(base, \{[\s\S]*expectedLockVersion: report\.lockVersion/,
);
assert.match(page, /contentForEditing/);
assert.match(auth, /public readonly details\?: unknown/);
assert.match(workstationCss, /\.panel,\s*\.dialog\s*\{\s*color:\s*(#173042|var\(--p-text\))/);
assert.match(workstationCss, /\.fieldError\s*\{\s*color:\s*(#922b25|var\(--p-red-text\))/);
assert.match(workstationCss, /\.actions\s*\{[\s\S]*flex-wrap:\s*wrap/);
assert.match(workstationCss, /\.actions input\[type="date"\]/);
assert.match(workstationCss, /grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.doesNotMatch(workstationCss, /overflow-x:\s*hidden/);
assert.match(page, /operational-log\/entries/);
assert.match(page, /operational-shifts/);
assert.match(page, /operations\/directives/);
assert.match(page, /operations\/follow-ups/);
assert.doesNotMatch(page, /Authorization:\s*["']Bearer [^$]/);
assert.doesNotMatch(page, /demo@getcoro\.io|916f54ec/);
assert.match(buildings, /<PortalLayout>/);
assert.match(buildings, /className=\{styles\.grid\}/);
assert.match(buildingsCss, /@media \(max-width: 560px\)/);
assert.match(buildingsCss, /grid-template-columns: minmax\(0, 1fr\)/);

console.log("security-workstation contract: PASS");
