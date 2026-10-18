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

test('GlassTable : conteneur défilant focalisable par défaut, retirable (focusable=false) et largeur minimale optionnelle', () => {
  const body = h('tbody', null, h('tr', null, h('td', null, '1')));
  assert.match(html(h(kit.GlassTable, { label: 'L' }, body)), /tabindex="0"/);
  assert.ok(!/tabindex/.test(html(h(kit.GlassTable, { label: 'L', focusable: false }, body))));
  assert.match(html(h(kit.GlassTable, { label: 'L', minWidth: 900 }, body)), /style="min-width:900px"/);
  assert.ok(!/min-width/.test(html(h(kit.GlassTable, { label: 'L' }, body))));
});

// ───────── Primitives V2 (mandat 49) ─────────
test('GlassCard : section par défaut, tons et espacements exposés, nom accessible', () => {
  const out = html(h(kit.GlassCard, { label: 'Résumé', tone: 'warning', padding: 'lg' }, 'x'));
  assert.match(out, /^<section class="cgx-card"/); assert.match(out, /data-tone="warning"/); assert.match(out, /data-padding="lg"/); assert.match(out, /aria-label="Résumé"/);
  assert.match(html(h(kit.GlassCard, { as: 'article' }, 'x')), /^<article /);
  assert.ok(!/aria-label/.test(html(h(kit.GlassCard, { as: 'div', label: 'ignoré' }, 'x'))), 'un div n’a pas de nom accessible');
});

test('GlassPanel : surface flottante nommée (rôle explicite)', () => {
  const out = html(h(kit.GlassPanel, { role: 'menu', label: 'Actions' }, 'x'));
  assert.match(out, /class="cgx-panel"/); assert.match(out, /role="menu"/); assert.match(out, /aria-label="Actions"/);
  assert.match(html(h(kit.GlassPanel, { label: 'Zone' }, 'x')), /role="group"/);
});

test('StatCard : libellé, valeur et aide ; pictogramme décoratif masqué aux lecteurs d’écran', () => {
  const out = html(h(kit.StatCard, { label: 'Validés', value: '12', helper: 'ce mois', icon: h('i', null, '*'), tone: 'success' }));
  assert.match(out, />Validés</); assert.match(out, />12</); assert.match(out, /ce mois/); assert.match(out, /aria-hidden="true"/); assert.match(out, /data-tone="success"/);
  assert.ok(!/cgx-stat__helper/.test(html(h(kit.StatCard, { label: 'a', value: 'b' }))));
});

test('états : vide (titre + action), chargement (status poli, occupé), erreur (alert) ; jamais muets', () => {
  const empty = html(h(kit.EmptyState, { title: 'Aucun projet', description: 'Créez-en un.', action: h('button', null, 'Créer') }));
  assert.match(empty, /data-kind="empty"/); assert.match(empty, /Aucun projet/); assert.match(empty, /Créer/);
  const loading = html(h(kit.LoadingState, { lines: 3 }));
  assert.match(loading, /role="status"/); assert.match(loading, /aria-live="polite"/); assert.match(loading, /aria-busy="true"/); assert.match(loading, /Chargement/);
  assert.equal((loading.match(/cgx-skeleton__line/g) || []).length, 3); assert.match(loading, /class="cgx-skeleton" aria-hidden="true"/);
  const error = html(h(kit.ErrorState, { message: 'Réseau indisponible', action: h('button', null, 'Réessayer') }));
  assert.match(error, /role="alert"/); assert.match(error, /data-kind="error"/); assert.match(error, /Une erreur est survenue/); assert.match(error, /Réseau indisponible/); assert.match(error, /Réessayer/);
});

test('FilterBar : région « search » nommée, action de réinitialisation optionnelle', () => {
  const out = html(h(kit.FilterBar, { label: 'Filtrer les projets', reset: h('button', null, 'Réinitialiser') }, h('input', null)));
  assert.match(out, /role="search"/); assert.match(out, /aria-label="Filtrer les projets"/); assert.match(out, /Réinitialiser/);
  assert.ok(!/cgx-filter-bar__reset/.test(html(h(kit.FilterBar, { label: 'x' }, 'y'))));
});

test('ResponsiveDataCards : même contenu en tableau et en cartes, colonne principale = titre de carte, état vide nommé', () => {
  const columns = [
    { key: 'n', header: 'Nom', render: (r) => r.n, primary: true },
    { key: 's', header: 'Statut', render: (r) => r.s },
  ];
  const out = html(h(kit.ResponsiveDataCards, { label: 'Projets', columns, rows: [{ id: '1', n: 'Alpha', s: 'Actif' }, { id: '2', n: 'Bêta', s: 'Archivé' }], getRowKey: (r) => r.id }));
  assert.equal((out.match(/<th scope="col"/g) || []).length, 2); assert.equal((out.match(/<tr>/g) || []).length, 3);
  assert.equal((out.match(/cgx-datacard__title/g) || []).length, 2); assert.match(out, /<dt>Statut<\/dt><dd>Actif<\/dd>/);
  assert.match(out, /<ul class="cgx-datacards__list" aria-label="Projets"/); assert.match(out, /role="region" aria-label="Projets"/);
  const empty = html(h(kit.ResponsiveDataCards, { label: 'Projets', columns, rows: [], getRowKey: (r) => r.id, emptyMessage: 'Rien' }));
  assert.match(empty, /Rien/); assert.ok(!/<table/.test(empty));
  // Le CSS passe aux cartes à 720 px et masque l'autre rendu (display: none : retiré de l'arbre d'accessibilité).
  assert.match(css, /@media \(max-width: 720px\)\s*\{[^}]*\.cgx-datacards__table \{ display: none; \}[^}]*\.cgx-datacards__list \{ display: grid; \}/);
  assert.match(css, /\.cgx-datacards__list \{ display: none;/);
});

test('PeriodSelector : champs date nommés, période inversée signalée, préréglage actif exposé (aria-pressed), jamais de lecture d’horloge', () => {
  const preset = { id: 'm', label: 'Ce mois', range: () => ({ from: '2026-10-01', to: '2026-10-31' }) };
  const ok = html(h(kit.PeriodSelector, { legend: 'Période', value: { from: '2026-10-01', to: '2026-10-31' }, onChange: () => {}, presets: [preset] }));
  assert.match(ok, /<legend class="cgx-period__legend">Période<\/legend>/); assert.match(ok, /type="date"/); assert.equal((ok.match(/<label /g) || []).length, 2);
  assert.match(ok, /aria-pressed="true"/); assert.ok(!/role="alert"/.test(ok)); assert.match(ok, /max="2026-10-31"/); assert.match(ok, /min="2026-10-01"/);
  const bad = html(h(kit.PeriodSelector, { legend: 'Période', value: { from: '2026-11-01', to: '2026-10-01' }, onChange: () => {}, presets: [preset] }));
  assert.match(bad, /role="alert"/); assert.match(bad, /aria-invalid="true"/); assert.match(bad, /aria-pressed="false"/);
  const src = fs.readFileSync(path.join(__dirname, 'PeriodSelector.tsx'), 'utf8');
  assert.ok(!/new Date\(|Date\.now\(/.test(src), 'le composant ne lit jamais l’horloge (le fuseau appartient à l’écran)');
  assert.ok(/if \(next\.from && next\.to && next\.from > next\.to\) return;/.test(src), 'une période inversée n’est jamais transmise');
});

test('primitives V2 : seuls les écrans explicitement migrés les emploient', () => {
  const root = path.join(__dirname, '..', '..');
  const users = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.next', 'design-system', 'public'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx$/.test(e.name) && /design-system\/kit/.test(fs.readFileSync(p, 'utf8'))) users.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  };
  walk(path.join(root, 'app')); walk(path.join(root, 'components'));
  for (const u of users) assert.ok(/^app\/(glass-kit|settings|activities\/portfolio|dashboard|profile|admin\/platform-permission-grants)/.test(u) || /^components\//.test(u), 'emploi inattendu du kit : ' + u);
});
