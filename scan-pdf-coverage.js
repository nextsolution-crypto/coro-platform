/**
 * CORO — Scan de couverture PDF
 * Vérifie quels champs du configurateur sont référencés dans les templates d'export
 * Usage : node scan-pdf-coverage.js
 */

const fs   = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname);

// ── Chemins ──────────────────────────────────────────────────────────────────
const CONFIGURATOR = path.join(BASE, 'coro-backend/src/configurator/configurator.service.ts');
const TEMPLATES    = [
  path.join(BASE, 'coro-backend/src/export/templates/modules/module7.template.ts'),
  path.join(BASE, 'coro-backend/src/export/templates/modules/simple-modules.template.ts'),
  path.join(BASE, 'coro-backend/src/export/templates/modules/module3.template.ts'),
  path.join(BASE, 'coro-backend/src/export/templates/modules/module4.template.ts'),
  path.join(BASE, 'coro-backend/src/export/templates/cover.template.ts'),
];

const OUTPUT = path.join(BASE, 'coro-pdf-coverage.txt');

// ── Helpers ───────────────────────────────────────────────────────────────────
const lines = [];
const log   = (s = '') => { lines.push(s); console.log(s); };

// ── 1. Extraire les clés du configurateur ─────────────────────────────────────
const configSrc = fs.readFileSync(CONFIGURATOR, 'utf8');

// Cherche tous les patterns : key: 'xxx' ou key: "xxx"
const keyMatches = [...configSrc.matchAll(/key:\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"][\s,]/g)];
const allKeys    = [...new Set(keyMatches.map(m => m[1]))].sort();

// ── 2. Charger le contenu de tous les templates ────────────────────────────────
const templateContents = TEMPLATES.map(t => ({
  name:    path.basename(t),
  content: fs.existsSync(t) ? fs.readFileSync(t, 'utf8') : '',
}));

// ── 3. Pour chaque clé, vérifier la présence dans les templates ────────────────
const results = allKeys.map(key => {
  const found = templateContents
    .filter(t => {
      // Cherche config.key, config?.key, config['key'], config["key"]
      const patterns = [
        `config\\.${key}`,
        `config\\?\\.${key}`,
        `config\\['${key}'\\]`,
        `config\\["${key}"\\]`,
        `config\\.${key}`,
      ];
      return patterns.some(p => new RegExp(p).test(t.content));
    })
    .map(t => t.name);
  return { key, found, missing: found.length === 0 };
});

const covered = results.filter(r => !r.missing);
const missing = results.filter(r =>  r.missing);

// ── 4. Grouper les manquants par section du configurateur ──────────────────────

// On va aussi extraire les sections pour contextualiser
const sectionMatches = [...configSrc.matchAll(/id:\s*['"]([a-zA-Z_][a-zA-Z0-9_]*)['"],\s*\n?\s*title:\s*['"]([^'"]+)['"]/g)];
const sections       = sectionMatches.map(m => ({ id: m[1], title: m[2] }));

// ── 5. Affichage ───────────────────────────────────────────────────────────────
log('═══════════════════════════════════════════════════════════');
log('  CORO — Scan de couverture PDF');
log(`  ${new Date().toLocaleString('fr-CA')}`);
log('═══════════════════════════════════════════════════════════');
log();
log(`  Champs configurateur scannés : ${allKeys.length}`);
log(`  Champs présents dans un template PDF : ${covered.length} (${Math.round(covered.length / allKeys.length * 100)}%)`);
log(`  Champs absents de tous les templates : ${missing.length} (${Math.round(missing.length / allKeys.length * 100)}%)`);
log();

log('═══════════════════════════════════════════════════════════');
log('  CHAMPS COUVERTS (présents dans au moins 1 template)');
log('═══════════════════════════════════════════════════════════');
for (const r of covered) {
  log(`  ✓ ${r.key.padEnd(40)} → ${r.found.join(', ')}`);
}

log();
log('═══════════════════════════════════════════════════════════');
log('  CHAMPS MANQUANTS (absents de tous les templates PDF)');
log('═══════════════════════════════════════════════════════════');

// Catégoriser les manquants
const cnpiKeys = [
  'capaciteMaxReglementaire','traitementsMedicauxSurPlace',
  's1001Interconnexions','s1001DernierEssai','s1001RapportDisponible','s1001Coordonnateur',
  'ppnaeTypesLimitations','ppnaeMesures','ppnaeRegistreAJour',
  'psiEntreePrincipale','psiDerniereRevision','programmeInspectionEntretien',
  'travauxPointsChauds','permisTravauxChauds','surveillanceIncendieTPC',
  'inspectionFinaleDocumentee','methodeInspectionTPC','travauxToiture','responsableTravauxChauds',
  'laboratoirePresent','typeLaboratoire','gazComprimesPresents','armireCabinetVentile',
  'gazToxiquesPresents','detectionGazLabo','panneauxTMDLabo',
  'registresCoupeFeu','registresCoupeFeuNombre','registresCoupeFeuDerniereInspection','registresCoupeFeuRapport',
  'signalisationIssue','signalisationIssueType','signalisationIssueDerniereInspection',
  'portesIssueExposees','portesIssueMesure',
];

const knownMeta = [
  'province','typeDocument','anneDocument','versionDocument','reglementMunicipal',
  'ville','dateReleve',
];

const knownCoverOrM1 = [
  'responsableNom','responsableTitre','responsableEmail','responsableTelephone',
];

for (const r of missing) {
  let tag = '';
  if (cnpiKeys.includes(r.key))        tag = '[CNPI 2020 — à ajouter au PDF]';
  else if (knownMeta.includes(r.key))  tag = '[Métadonnées — couvert en couverture/M1]';
  else if (knownCoverOrM1.includes(r.key)) tag = '[Couvert en couverture/M1]';
  else                                 tag = '[À vérifier]';
  log(`  ✗ ${r.key.padEnd(40)} ${tag}`);
}

log();
log('═══════════════════════════════════════════════════════════');
log('  SECTIONS DU CONFIGURATEUR DÉTECTÉES');
log('═══════════════════════════════════════════════════════════');
for (const s of sections) {
  log(`  ${s.id.padEnd(25)} → ${s.title}`);
}

log();
log('═══════════════════════════════════════════════════════════');
log('  TEMPLATES SCANNÉS');
log('═══════════════════════════════════════════════════════════');
for (const t of templateContents) {
  const exists = t.content.length > 0;
  log(`  ${exists ? '✓' : '✗'} ${t.name} ${exists ? `(${t.content.length} chars)` : '— INTROUVABLE'}`);
}

fs.writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
console.log(`\n✅ Rapport généré : ${OUTPUT}`);
