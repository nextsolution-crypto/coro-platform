import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { title: string; description: string; canonical: string; jsonLd: unknown[]; headings: [string, string][]; links: [string | null, string][]; form: { labels: [string, string | null][]; inputs: { tag: string; type: string | null; required: boolean; placeholder: string | null }[]; options: [string | null, string][]; submit: string } }>;
const baseline = JSON.parse(read('tests/fixtures/contact-baseline.json')) as Baseline;
const page = read('app/contact/page.tsx');
const form = read('app/DemoForm.tsx');

test('the registry holds exactly /about and /contact; /contact has no legacy footer', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle', '/sentinelle', '/sentinelle-population', '/coro-incident', '/security']);
  assert.equal(isLegacyFooterVisible('/contact'), false);
  assert.equal(isLegacyFooterVisible('/performance-objectifs'), false); // migrated in MIG-02C
  assert.equal(isLegacyFooterVisible('/'), true);
});

test('V2Shell owns the chrome: no page-owned header, main or footer, no legacy shell, no footer-hiding hack', () => {
  assert.match(page, /<V2Shell locale=\{locale\} pathname="\/contact">/);
  assert.doesNotMatch(page, /<SiteHeader|<SiteFooter|<main\b|<footer\b|pageShell|institutional\.module/);
  const css = read('app/contact/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/, 'V1 tokens only');
});

test('DemoForm remains the production form and LeadForm is not integrated', () => {
  assert.match(page, /import DemoForm from '@\/app\/DemoForm'/);
  assert.match(page, /<DemoForm lang=\{locale\} \/>/);
  assert.doesNotMatch(page, /LeadForm/);
});

test('DemoForm functional contract is unchanged: endpoint, method, JSON keys, buildingType values, referral cookies and fields', () => {
  assert.match(form, /'https:\/\/formspree\.io\/f\/xnpadzyq'/);
  assert.match(form, /method: 'POST'/);
  assert.match(form, /'Content-Type': 'application\/json'/);
  for (const key of ['firstName', 'lastName', 'email', 'organization', 'phone', 'buildingType', 'message']) assert.match(form, new RegExp(`${key}: ''`), key);
  assert.match(form, /getCookie\('coro_referral_code'\)/);
  assert.match(form, /getCookie\('coro_referral_first_touch'\)/);
  assert.match(form, /referralCode:\s*referralCode \?\? ''/);
  assert.match(form, /referralFirstTouchAt:\s*referralFirstTouchAt \?\? ''/);
  assert.match(form, /referralSource:\s*referralCode \? 'LINK' : ''/);
  assert.match(form, /_subject: `Demande de démo CORO — \$\{form\.organization\}`/);
  for (const bt of ['Tour à bureaux', 'Bâtiment commercial', 'Site industriel', 'Établissement de santé', "Institution d\\'enseignement", 'Autre']) assert.ok(form.includes(bt), bt);
  assert.match(form, /value=\{bt === t\.buildingTypes\[0\] \? '' : bt\}/);
  assert.doesNotMatch(form, /document\.cookie\s*=/, 'DemoForm only reads the referral cookies; capture stays on the homepage');
});

test('DemoForm accessibility fix is additive: every label is bound to its control, error is an alert, success a status', () => {
  assert.equal((form.match(/<label htmlFor=\{`\$\{uid\}-\d`\}/g) ?? []).length, 7);
  assert.equal((form.match(/id=\{`\$\{uid\}-\d`\}/g) ?? []).length, 7);
  assert.match(form, /role="alert"/);
  assert.match(form, /className="coro-demo-form-success" role="status"/);
  assert.match(form, /useId/);
});

test('the baseline form contract (fields, labels, required, options, submit) is what DemoForm still renders', () => {
  const fr = baseline.fr.form;
  assert.deepEqual(fr.labels.map(([label]) => label), ['Prénom *', 'Nom *', 'Courriel professionnel *', 'Organisation *', 'Téléphone (optionnel)', 'Type de bâtiment', 'Décrivez votre besoin (optionnel)']);
  assert.deepEqual(fr.inputs.map((i) => i.required), [true, true, true, true, false, false, false]);
  assert.deepEqual(fr.inputs.map((i) => i.type ?? i.tag), ['text', 'text', 'email', 'text', 'tel', 'select', 'textarea']);
  assert.equal(fr.submit, 'Envoyer la demande');
  for (const [text] of fr.labels) assert.ok(form.includes(text.replace(' *', '').replace(' (optionnel)', '')), text);
});

test('contact information and copy are preserved exactly, in both languages', () => {
  for (const s of ['mailto:info@getcoro.io', 'info@getcoro.io', 'tel:+15147917871', '+1 (514) 791-7871', '2879, boul. Pierre-Bernard', 'Montréal (Québec)', 'H1L 4R2', 'Canada']) assert.ok(page.includes(s), s);
  for (const s of ['Contactez CORO', 'Parlons de vos besoins.', 'Demander une démonstration', 'Présentez-nous brièvement votre organisation et votre besoin.', 'Communiquez avec nous', 'Contact CORO', 'Let’s discuss your needs.', 'Request a demonstration', 'Tell us briefly about your organization and your needs.', 'Contact us']) assert.ok(page.includes(s), s);
  assert.equal(baseline.fr.description, 'Communiquez avec CORO pour poser une question, discuter de vos besoins ou demander une démonstration.');
  assert.ok(page.includes(baseline.fr.description) && page.includes(baseline.en.description));
});

test('metadata: unchanged meaning, no double branding, canonical and alternates from the hardened contract', () => {
  for (const [locale, title] of [['fr', 'Contactez CORO'], ['en', 'Contact CORO']] as const) {
    assert.equal(titleContainsBrand(title), locale === 'fr' || locale === 'en');
    const m = buildPageMetadata({ path: '/contact?ref=CR-ABCDEF', locale, title, description: 'd' });
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/contact' : 'https://getcoro.io/contact?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
  }
  assert.match(page, /buildPageMetadata\(\{ path: '\/contact'/);
  assert.equal(baseline.fr.jsonLd.length, 0, 'the page had no structured data; none is invented');
  assert.doesNotMatch(page, /ld\+json|JsonLd/);
});

test('accessibility structure: one h1, form panel is a labelled section, decorative icons removed, no FUTURE route linked', () => {
  assert.match(page, /<EditorialHero id="contact-title"/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 0, 'the single h1 is rendered by EditorialHero');
  assert.match(page, /labelledBy="contact-form-title"/);
  assert.doesNotMatch(page, /lucide-react/);
  assert.doesNotMatch(page, /coro-incident|coro-exercices|\/guides|\/plateforme['"`]/);
  const linked = page.match(/['"`]\/[a-z][a-z0-9-]*/g) ?? [];
  for (const raw of linked) { const r = publicRoutes.find((x) => x.path === raw.slice(1)); if (r) assert.ok(r.implemented, r.path); }
});

test('the form keeps a visible keyboard focus ring and 44px controls despite DemoForm inline outline:none', () => {
  const css = read('app/contact/page.module.css');
  assert.match(css, /:focus-visible[^}]*outline:\s*3px solid var\(--coro-v1-focus\) !important/);
  assert.match(css, /min-block-size:\s*44px/);
});

test('MIG-01B-B: the form is harmonised with V1 tokens, scoped to the contact panel, with no legacy value or heavy decoration', () => {
  const css = read('app/contact/page.module.css');
  for (const token of ['--coro-v1-red-600', '--coro-v1-red-700', '--coro-v1-border-200', '--coro-v1-text-900', '--coro-v1-radius-control', '--coro-v1-focus']) assert.ok(css.includes(token), token);
  const block = css.slice(css.indexOf('MIG-01B-B'));
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/, 'no hard-coded colours');
  assert.doesNotMatch(block, /gradient|box-shadow|border-radius:\s+(?!var\(--coro-v1-radius-(?:control|panel)\))/);
  for (const line of block.split('\n').filter((l) => l.includes('!important') && l.includes('{'))) assert.match(line, /^\.formPanel/, `unscoped important rule: ${line}`);
  assert.match(css, /min-block-size:\s*44px/);
  // The shared component is untouched by this pass: legacy values stay in DemoForm for the homepage and /pricing.
  assert.match(read('app/DemoForm.tsx'), /#C0392B/);
});
