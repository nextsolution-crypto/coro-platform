import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata } from '../lib/site/seo.ts';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const truth = JSON.parse(read('tests/fixtures/coro-incident-product-truth.json')) as { incidentTypeCount: number; channelsImplemented: string[] };
const page = read('app/coro-incident/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/coro-incident/page.module.css');
const schema = read('../coro-backend/prisma/schema.prisma');
const svc = read('../coro-backend/src/occupancy/incident.service.ts');

test('route: implemented, in the sitemap, FR only; registry ends with /coro-incident', () => {
  const r = getRoute('incident');
  assert.equal(r?.implemented, true); assert.equal(r?.sitemap, true); assert.equal(r?.en, false);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/coro-incident'));
  assert.ok(migratedV2Routes.includes('/coro-incident')); assert.equal(migratedV2Routes.at(-1), '/security');
  assert.equal(isLegacyFooterVisible('/coro-incident'), false);
});

test('FR ONLY: hasEnglish false, englishAvailable false, canonical FR, hreflang fr-CA + x-default', () => {
  assert.match(page, /hasEnglish: false/); assert.match(page, /englishAvailable=\{false\}/);
  const m = buildPageMetadata({ path: '/coro-incident', locale: 'en', hasEnglish: false, title: 't', description: 'd' });
  assert.equal(m.alternates?.canonical, 'https://getcoro.io/coro-incident');
  assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'x-default']);
});

test('approved H1 and exact hero: decorative marketing illustration', () => {
  assert.match(page, /lines: \['Quand l’incident commence,', 'chaque action compte\.'\]/);
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/sentinel/first-responders-arrival.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/sentinel/first-responders-arrival.webp')));
});

test('incident types: the 15 listed types match the current enum size; no internal procedure codes', () => {
  const body = schema.match(/enum IncidentType \{([\s\S]*?)\}/)?.[1] ?? '';
  assert.equal(body.split('\n').filter((l) => /^\s+[A-Z_]+/.test(l)).length, truth.incidentTypeCount);
  assert.equal((page.match(/types: \[([^\]]*)\]/)?.[1].split(',').length ?? 0), 15);
  assert.doesNotMatch(code, /\bP0\d\d\b|SMOKE_DISCOVERY|INCIDENT_PROCEDURE/);
  assert.match(svc, /INCIDENT_PROCEDURE_MAP\[body\.type\]/);
});

test('snapshots, mobilization, channels: email and SMS with consent only; no voice, no app, no 911', () => {
  assert.match(svc, /occupantsSnapshot/); assert.match(svc, /teamSnapshot/);
  assert.match(svc, /smsConsent/);
  assert.deepEqual(truth.channelsImplemented, ['email', 'sms']);
  assert.match(code, /SMS, seulement pour les personnes qui ont donné leur consentement/);
  assert.doesNotMatch(code, /appel vocal|voix|notification (d’|de l’)application|push|911|répartition|dépêch|service d’incendie|pompiers? (est|sont) avis/i);
});

test('chronology: an ordered semantic list of seven steps in the approved order, without timestamps', () => {
  const names = ['Activation', 'Mobilisation', 'Action', 'Mise à jour', 'Clôture', 'Rapport', 'Retour d’expérience'];
  let at = -1;
  for (const n of names) { const i = page.indexOf(`['${n}', `); assert.ok(i > at, n); at = i; }
  assert.match(page, /<ol className=\{styles\.timeline\}>/);
  assert.doesNotMatch(code, /\b\d{1,2}\s?h\s?\d{2}\b|\b\d{1,2}:\d{2}\b/);
  assert.match(css, /@media \(max-width: 40rem\)[\s\S]*?\.timeline \{ grid-template-columns: 1fr/);
});

test('intervention link: "lien d’intervention sécurisé", active-incident dependency, no QR claim, no validity duration or revocation claim', () => {
  assert.match(code, /lien d’intervention sécurisé/);
  assert.match(code, /tant que l’incident est actif/);
  assert.match(svc, /!incident\.isActive/);
  assert.match(svc, /publicAccessToken = randomUUID\(\)/);
  assert.match(svc, /publicAccessCount/);
  assert.doesNotMatch(code, /QR|24 ?h|24 heures|révoc|expire après|durée de validité/i);
});

test('report and REX: report and REX are distinct, four REX fields, no compliance or evidence claim', () => {
  for (const f of ['rexWentWell', 'rexToImprove', 'rexRecommendations', 'rexCorrectiveActions']) assert.match(schema, new RegExp(f));
  for (const s of ['Ce qui a bien fonctionné', 'Points à améliorer', 'Recommandations', 'Actions correctives proposées']) assert.ok(page.includes(s), s);
  assert.match(code, /Le rapport dit ce qui s’est passé\. Le retour d’expérience dit ce qui change\./);
  assert.doesNotMatch(code, /ISO|CNPI|CNESST|NFPA|CCOHS|conforme à|prêt (pour|à) (l’inspection|archiver)|preuve légale|inspection/i);
});

test('exercise mode and simultaneous incidents match the code; the fire-panel bridge is not promoted', () => {
  assert.match(svc, /\[EXERCICE\]/); assert.match(svc, /if \(!isExercise\)/);
  assert.match(code, /préfixés \[EXERCICE\]/); assert.match(code, /Plusieurs incidents peuvent être actifs en même temps/);
  assert.match(read('../coro-backend/src/occupancy/incident.controller.ts'), /active-all/);
  assert.doesNotMatch(code, /panneau d’alarme|panneau d'alarme|PAI\b|automatiquement détecte|détection automatique|coro-exercices/i);
});

test('links and CTAs: Résilience and Sentinelle only; demonstration; exact CORO Client login; no Population, no future route', () => {
  assert.match(page, /const LOGIN = 'https:\/\/client\.getcoro\.io\/login';/);
  assert.match(code, /localizedHref\('\/#demo', l\)/);
  assert.ok(page.includes("href: '/resilience-operationnelle'") && page.includes('href="/sentinelle"'));
  assert.doesNotMatch(code, /sentinelle-population|\/coro-exercices|\/plateforme|\/qr-intervention/);
});

test('metadata, JSON-LD and structure: brand-free title, FAQPage from the visible FAQ only; one proof screenshot with cartouche and named scroll region', () => {
  assert.match(page, /metaTitle: 'Gestion d’incident : activation, chronologie et rapport'/);
  assert.ok(page.includes('faqJsonLd(t.faq.map(([q, a]) => ({ question: q, answer: a })))'));
  assert.ok(page.includes('items={t.faq.map(([q, a], i) => ({ id: `faq-${i}`, question: q, answer: a }))}'));
  assert.doesNotMatch(code, /SoftwareApplication|BreadcrumbList|Organization/);
  assert.equal((page.match(/<MediaFrame kind="technical"/g) ?? []).length, 1);
  assert.equal((page.match(/<MediaFrame src="\/website-v2\/incident\/[a-z-]+\.webp" alt=""/g) ?? []).length, 3);
  for (const f of ['incident-building', 'incident-command', 'normal-operations']) assert.ok(existsSync(join(process.cwd(), `public/website-v2/incident/${f}.webp`)));
  assert.match(page, /'CORO Incident · Fiche d’intervention', 'Information pour les intervenants', 'Capture d’écran'/);
  assert.match(page, /role="region" tabIndex=\{0\} aria-label=\{t\.s5\.panLabel\}/);
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('editorial resources: three existing blog articles between ecosystem and FAQ, real titles, no future route (verified against the public blog API on 2026-09-26)', () => {
  const slugs = ['equipe-urgence-disponible-batiment', 'exercice-sur-table-tester-plan-urgence', 'identifier-lacunes-organisation-mesures-urgence'];
  for (const slug of slugs) assert.ok(page.includes(`href: '/blog/${slug}'`), slug);
  assert.equal((page.match(/href: '\/blog\//g) ?? []).length, 3);
  assert.ok(page.indexOf('incident-eco-title') < page.indexOf('incident-res-title') && page.indexOf('incident-res-title') < page.indexOf('incident-faq-title'));
  assert.match(css, /\.resources a:focus-visible/);
});
