/* eslint-disable @typescript-eslint/no-require-imports */
// Contrat de la migration Liquid Glass de /settings (Phase 06A).
// Garantit statiquement : Legacy intact, pas de couleur en dur nouvelle, aucune logique métier dans la vue Glass,
// registre en bêta (jamais ga). Le comportement réel est vérifié en navigateur par les scénarios settings-* du banc.
require('../../design-system/test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8').replace(/\r\n/g, '\n');
const view = fs.readFileSync(path.join(__dirname, 'SettingsGlassView.tsx'), 'utf8').replace(/\r\n/g, '\n');
// Code seul : les commentaires de documentation peuvent citer les mécanismes qu'ils décrivent.
const viewCode = view.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const { ROUTE_REGISTRY } = require('../../design-system/routes/route-registry.ts');

// Empreinte (SHA-256) de app/settings/page.tsx tel que commité avant la migration (a7d46913), fins de ligne LF.
const LEGACY_PAGE_SHA256 = 'df1dcde41969971b4d44440226d6ee92c9215392e24365a14215ccd94ff2dff0';
const LEGACY_HEX_COUNT = 18;

function withoutGlassBlocks(src) {
  const kept = []; let skipping = false;
  for (const line of src.split('\n')) {
    if (line.includes('GLASS:begin')) { skipping = true; continue; }
    if (line.includes('GLASS:end')) { skipping = false; continue; }
    if (!skipping) kept.push(line);
  }
  return kept.join('\n');
}

test('Legacy : hors blocs GLASS:begin/end, page.tsx est identique octet pour octet au code d’origine', () => {
  const sha = crypto.createHash('sha256').update(withoutGlassBlocks(page)).digest('hex');
  assert.equal(sha, LEGACY_PAGE_SHA256, 'le code Legacy de /settings a été modifié : mettre à jour cette empreinte est une décision de revue, pas un réflexe');
});

test('page.tsx : aucune couleur en dur ajoutée (même nombre de couleurs hex qu’à l’origine)', () => {
  assert.equal((page.match(/#[0-9A-Fa-f]{3,8}\b/g) || []).length, LEGACY_HEX_COUNT);
});

test('page.tsx : la vue Glass n’est rendue que si Glass est actif ET la route rendue en Glass (jamais en îlot)', () => {
  assert.match(page, /if \(ui === 'glass' && routeMode === 'glass'\) \{/);
  assert.match(page, /<SettingsGlassView sections=\{sections\} onNavigate=\{\(path\) => router\.push\(path\)\} \/>/);
  const blocks = page.split('\n').filter((l) => l.includes('GLASS:begin')).length;
  assert.equal(blocks, page.split('\n').filter((l) => l.includes('GLASS:end')).length, 'blocs équilibrés');
  assert.equal(blocks, 3, 'trois points d’insertion seulement : imports, hook, retour conditionnel');
});

test('vue Glass : aucune couleur en dur (tokens --cg-* uniquement)', () => {
  assert.deepEqual(view.match(/#[0-9A-Fa-f]{3,8}\b/g) || [], []);
  assert.deepEqual(view.match(/\b(rgb|rgba|hsl|oklch)\(/g) || [], []);
  const colors = [...view.matchAll(/(?:color|backgroundColor|border):\s*'([^']+)'/g)].map((m) => m[1]).filter((v) => !/^(none|0|1px solid var)/.test(v));
  for (const c of colors) assert.ok(/^var\(--cg-[a-z-]+\)$/.test(c), 'valeur de couleur hors token : ' + c);
});

test('vue Glass : aucune logique métier (ni rôle, ni API, ni authentification, ni stockage, ni navigation propre)', () => {
  for (const forbidden of [/\buseAuthStore\b/, /\bapi\./, /\bfetch\(/, /\baxios\b/, /\.role\b/, /\buser\b/, /\bADMIN\b/, /\blocalStorage\b/, /\buseRouter\b/, /router\.push/, /\bisAdmin\b/]) {
    assert.ok(!forbidden.test(viewCode), 'élément interdit dans la vue : ' + forbidden);
  }
  assert.ok(/onNavigate\(item\.path\)/.test(view), 'la navigation est déléguée à la page');
});

test('vue Glass : composants du Design System uniquement (kit, classes cg-*), accessibilité de structure', () => {
  assert.match(view, /from '@\/design-system\/kit'/);
  assert.match(view, /<PageHeader title="Paramètres" subtitle="Gérez votre profil et votre organisation" \/>/);
  assert.match(view, /type="button"/);
  assert.match(view, /aria-labelledby=\{headingId\}/);
  assert.match(view, /role="list"/);
  assert.match(view, /className="cg-glass cg-lift /);
});

test('vue Glass : chaque destination Legacy a une teinte (aucune route oubliée)', () => {
  const legacyPaths = [...page.matchAll(/path: '(\/settings\/[a-z0-9-]+)'/g)].map((m) => m[1]);
  assert.equal(legacyPaths.length, 8);
  for (const p of legacyPaths) assert.ok(view.includes(`'${p}':`), 'teinte manquante pour ' + p);
});

test('registre : /settings est en bêta native (jamais ga) ; ses sous-pages ne sont jamais Glass natifs ni ga (au plus re-teintées)', () => {
  const byPattern = new Map(ROUTE_REGISTRY.map((e) => [e.pattern, e]));
  assert.equal(byPattern.get('/settings').status, 'beta');
  assert.equal(byPattern.get('/settings').render, undefined, '/settings est un écran Glass natif');
  for (const e of ROUTE_REGISTRY) {
    if (!e.pattern.startsWith('/settings/')) continue;
    assert.notEqual(e.status, 'ga', e.pattern);
    assert.ok(e.status === 'legacy-only' || e.render === 'skin', `${e.pattern} : sous-page uniquement legacy-only ou re-teintée, jamais native`);
  }
});
