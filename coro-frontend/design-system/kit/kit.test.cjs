/* eslint-disable @typescript-eslint/no-require-imports */
// Kit de primitives : contrat CSS (isolation, repli Legacy, urgence) et rendu statique (accessibilité de base).
// Le comportement interactif de GlassModal (focus, Échap, inertie) est vérifié en navigateur réel par le banc
// (npm run glass:bench -- scenarios --only kit-modal).
require('../test-loader.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const kit = require('./index.ts');
const css = fs.readFileSync(path.join(__dirname, 'kit.css'), 'utf8');
const html = (el) => renderToStaticMarkup(el);
const h = React.createElement;

// ───────── Contrat CSS ─────────
function selectors(source) {
  const noComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = []; const re = /([^{}]+)\{/g; let m;
  while ((m = re.exec(noComments))) {
    const head = m[1].trim();
    if (head.startsWith('@')) continue; // @media / @supports : leurs règles internes sont lues séparément
    for (const part of head.split(',')) out.push(part.trim());
  }
  return out;
}

test('kit.css : tous les sélecteurs sont préfixés .cgx- (aucune règle globale)', () => {
  const sels = selectors(css);
  assert.ok(sels.length > 40);
  for (const s of sels) assert.ok(/^(\.cgx-|textarea\.cgx-)/.test(s), 'sélecteur non préfixé : ' + s);
});

test('kit.css : aucune couleur hexadécimale hors repli de var(--cg-…, repli)', () => {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/g, 'VAR');
  assert.deepEqual(stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) || [], []);
});

test('kit.css : chaque var(--cg-…) porte un repli Legacy', () => {
  const bad = [...css.matchAll(/var\((--cg-[\w-]+)\s*\)/g)].map((m) => m[1]);
  assert.deepEqual(bad, [], 'var(--cg-*) sans repli : ' + bad.join(', '));
});

test('kit.css : urgence et actions destructives utilisent uniquement les tokens --cg-emergency-* (opaques, identiques dans les thèmes)', () => {
  const danger = css.match(/\.cgx-button\[data-variant="danger"\]\s*\{[^}]*\}/)[0];
  const emergency = css.match(/\.cgx-badge\[data-tone="emergency"\]\s*\{[^}]*\}/)[0];
  const modal = css.match(/\.cgx-modal\[data-tone="danger"\]\s*\{[^}]*\}/)[0];
  for (const rule of [danger, emergency, modal]) assert.ok(/--cg-emergency-/.test(rule) && !/rgba|opacity|--cg-danger-bg|--cg-glass/.test(rule), rule);
});

test('kit.css : aucun backdrop-filter sur les composants de contenu (pas de bloc conteneur piégeant les éléments fixes)', () => {
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, sel, body] of rules) if (/backdrop-filter/.test(body)) assert.ok(/cgx-modal-backdrop/.test(sel), 'backdrop-filter interdit sur ' + sel.trim());
});

test('kit.css : transparence réduite et focus clavier pris en charge', () => {
  assert.ok(css.includes('prefers-reduced-transparency'));
  assert.ok(/\.cgx-button:focus-visible/.test(css) && /\.cgx-input:focus-visible/.test(css) && /\.cgx-table-wrap:focus-visible/.test(css));
});

// ───────── Rendu statique ─────────
test('StatusBadge : le ton est exposé et le texte porte le sens', () => {
  const out = html(h(kit.StatusBadge, { tone: 'emergency' }, 'Urgence'));
  assert.match(out, /class="cgx-badge"/); assert.match(out, /data-tone="emergency"/); assert.match(out, />Urgence</);
  assert.match(html(h(kit.StatusBadge, null, 'x')), /data-tone="neutral"/);
});

test('GlassButton : type="button" par défaut (jamais d’envoi involontaire) ; variantes exposées', () => {
  assert.match(html(h(kit.GlassButton, null, 'ok')), /type="button"/);
  assert.match(html(h(kit.GlassButton, { variant: 'danger' }, 'Supprimer')), /data-variant="danger"/);
  assert.match(html(h(kit.GlassButton, { type: 'submit' }, 'Envoyer')), /type="submit"/);
});

test('PageHeader : h1 par défaut, sous-titre et actions optionnels', () => {
  const out = html(h(kit.PageHeader, { title: 'Titre', eyebrow: 'Compte', subtitle: 'Sous-titre', actions: h('button', null, 'Agir') }));
  assert.match(out, /<h1 class="cgx-page-header__title">Titre<\/h1>/); assert.match(out, /Compte/); assert.match(out, /Sous-titre/); assert.match(out, /Agir/);
  assert.match(html(h(kit.PageHeader, { title: 'T', headingLevel: 2 })), /<h2 /);
  assert.ok(!/cgx-page-header__actions/.test(html(h(kit.PageHeader, { title: 'T' }))));
});

test('GlassTable : région nommée focalisable au clavier, table sémantique, état vide sans table', () => {
  const out = html(h(kit.GlassTable, { label: 'Liste', caption: 'Légende' },
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'A'))), h('tbody', null, h('tr', null, h('td', null, '1')))));
  assert.match(out, /role="region"/); assert.match(out, /aria-label="Liste"/); assert.match(out, /tabindex="0"/);
  assert.match(out, /<table class="cgx-table"/); assert.match(out, /<caption>Légende<\/caption>/); assert.match(out, /scope="col"/);
  const empty = html(h(kit.GlassTable, { label: 'Liste', isEmpty: true, emptyMessage: 'Rien' }, null));
  assert.ok(!/<table/.test(empty)); assert.match(empty, /Rien/);
});

test('GlassField : étiquette liée, aide et erreur reliées par aria-describedby, erreur annoncée sans dépendre de la couleur', () => {
  const out = html(h(kit.GlassField, { label: 'Nom', hint: 'Aide', error: 'Obligatoire', required: true }, (c) => h('input', c)));
  const id = out.match(/<label[^>]*for="([^"]+)"/)[1];
  assert.match(out, new RegExp(`<input[^>]*id="${id.replace(/[:]/g, '\\:')}"`));
  const described = out.match(/aria-describedby="([^"]+)"/)[1].split(' ');
  assert.equal(described.length, 2);
  for (const d of described) assert.ok(out.includes(`id="${d}"`), 'cible aria-describedby introuvable : ' + d);
  assert.match(out, /aria-invalid="true"/); assert.match(out, /role="alert"/); assert.match(out, /Erreur : Obligatoire/); assert.match(out, /required/);
  const ok = html(h(kit.GlassField, { label: 'Nom' }, (c) => h('input', c)));
  assert.ok(!/aria-invalid|aria-describedby|role="alert"/.test(ok));
});

test('GlassModal : fermée ou rendue côté serveur = aucun DOM (aucun portail sans navigateur)', () => {
  assert.equal(html(h(kit.GlassModal, { open: false, onClose() {}, title: 'T' })), '');
  assert.equal(html(h(kit.GlassModal, { open: true, onClose() {}, title: 'T' })), '');
});

test('les 6 primitives demandées sont exportées', () => {
  for (const name of ['GlassTable', 'GlassModal', 'GlassField', 'StatusBadge', 'PageHeader', 'GlassButton']) assert.equal(typeof kit[name], 'function', name);
});
