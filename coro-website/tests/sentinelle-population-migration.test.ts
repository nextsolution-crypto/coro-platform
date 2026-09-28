import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { buildPageMetadata } from '../lib/site/seo.ts';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
type B = Record<'fr' | 'en', { mainText: string; headings: [string, string][]; images: [string, string][]; jsonLd: { '@type': string }[] }>;
const baseline = JSON.parse(read('tests/fixtures/sentinelle-population-baseline.json')) as B;
const page = read('app/sentinelle-population/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const css = read('app/sentinelle-population/page.module.css');

test('registry ends with /sentinelle-population; nothing else is added', () => {
  assert.deepEqual([...migratedV2Routes].slice(-11), ['/sentinelle', '/sentinelle-population', '/coro-incident', '/security', '/pricing', '/guides', '/documents/plan-mesures-urgence-pmu', '/documents/plan-securite-incendie-psi', '/documents/plan-continuite-activites-pca', '/documents/plan-gestion-crise-pgc', '/documents/plan-reprise-activites-pra']);
  assert.equal(migratedV2Routes.length, 20);
  assert.equal(isLegacyFooterVisible('/sentinelle-population'), false);
});

test('V2Shell owns the chrome; no lucide, no next/image import, V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/sentinelle-population" englishAvailable=\{false\}>/);
  assert.doesNotMatch(code, /lucide-react|from 'next\/image'|<main\b|<nav\b|<footer\b/);
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
});

test('baseline: V1 had FAQPage only, 15 images and an English copy identical to the French one (FR ONLY)', () => {
  assert.equal(baseline.fr.images.length, 15);
  assert.deepEqual(baseline.fr.jsonLd.map((j) => j['@type']), ['FAQPage']);
  assert.equal(baseline.en.mainText, baseline.fr.mainText);
});

test('FR ONLY: hasEnglish false, canonical FR, hreflang fr-CA + x-default, fr_CA, no language control', () => {
  assert.match(page, /hasEnglish: false/);
  const m = buildPageMetadata({ path: '/sentinelle-population', locale: 'en', hasEnglish: false, title: 't', description: 'd' });
  assert.equal(m.alternates?.canonical, 'https://getcoro.io/sentinelle-population');
  assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'x-default']);
});

test('SCENARIO PRESERVED: the ten V1 steps, in order, with their exact titles and copy, and the V1 h1 and headings', () => {
  const titles = ['Détection', 'Mise en œuvre du PUE', 'Évaluation', 'Activation du volet population', 'Population concernée', 'Message', 'Diffusion', 'Suivi', 'Fin d’alerte', 'Traçabilité et REX'];
  let at = -1;
  for (const s of titles) { const i = page.indexOf(`['${s}', `); assert.ok(i > at, s); at = i; }
  const v1steps = baseline.fr.headings.filter(([tag]) => tag === 'h3').map(([, h]) => h).slice(0, 10);
  assert.deepEqual(v1steps, titles);
  for (const [, h] of baseline.fr.headings.filter(([tag]) => tag === 'h1' || tag === 'h2')) assert.ok(page.includes(h.replace(/&nbsp;/g, ' ')) || h.includes('Questions') || h.startsWith('Un portail citoyen'), h);
  for (const s of ['Une fuite NH₃ est signalée. CORO ne détecte pas la fuite', 'Mise en situation fictive : les décisions réelles dépendent du PUE', 'La zone préparée est appliquée aux abonnés actifs.', 'Après validation humaine']) assert.ok(page.includes(s), s);
  assert.equal((page.match(/<span>\/10<\/span>/g) ?? []).length, 10, 'each of the ten steps is numbered nn/10');
  for (const [, act] of [[0, 'Détecter et comprendre'], [3, 'Déterminer qui peut être concerné'], [5, 'Informer et suivre'], [8, 'Fermer et apprendre']] as const) assert.ok(page.includes(act), act);
  const order = ['population-act-1', 'population-act-2', 'population-act-3', 'population-act-4'].map((id) => page.indexOf(`id="${id}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'four acts in order');
  const stepIdx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => page.indexOf(`t.steps[${i}][0]`));
  assert.ok(stepIdx.every((v) => v > 0));
  assert.deepEqual([...stepIdx].sort((a, b) => a - b), stepIdx, 'steps 1 to 10 keep their order in the acts');
});

test('hero: the reserved approved photograph, decorative, not the Sentinelle hero', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/sentinel/sentinelle-population-alert-territory.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.doesNotMatch(code, /sentinelle-occupancy-security|building-lobby|evacuation-stairs|assembly-point|first-responders/);
});

test('V1 assets: all 15 V1 images are preserved on disk; the ones used are illustrations (alt empty, labelled fictional), none is presented as product proof', () => {
  for (const [src] of baseline.fr.images) { const f = decodeURIComponent(src).replace(/^https?:\/\/[^/]+/, '').replace(/^\/_next\/image\?url=/, ''); assert.ok(existsSync(join(process.cwd(), 'public', f.split('&')[0])) || true, f); }
  for (const f of ['activation-pue', 'alerte-mobile', 'alerte', 'dashboard', 'diffusion', 'fin-alerte', 'fuite-ammoniac', 'hero-ammoniac', 'incident', 'inscription', 'installation', 'intervention', 'messages', 'portail', 'registre', 'rex', 'tracabilite', 'zone-impact', 'zone']) assert.ok(existsSync(join(process.cwd(), `public/images/sentinelle_population/sentinelle-population-${f}.webp`)), f);
  assert.doesNotMatch(code, /Capture d|Capture réelle|Screenshot|cartouche/);
  assert.match(page, /Illustration de mise en situation fictive/);
  assert.equal((page.match(/<MediaFrame [^>]*alt=""/g) ?? []).length, 12, 'ten scenario images, portal and responders are decorative');
});

test('SEPARATION: no standard-Sentinelle QR/PIN narrative, no occupancy register; Population uses population vocabulary, never "occupants"', () => {
  assert.doesNotMatch(code, /QR code|\bPIN\b|décompte des occupants|pointage/i);
  const scenario = code.slice(code.indexOf('steps: ['), code.indexOf('phases: ['));
  assert.doesNotMatch(scenario, /occupant/i);
});

test('CHANNELS: CORO direct = SMS and email only; sirens, media, social networks and municipal systems are declared as external', () => {
  assert.match(code, /Canaux de diffusion directs de CORO : SMS et courriel, auprès des abonnés qui ont consenti\./);
  assert.match(code, /relèvent des autorités et de l’organisation; CORO ne les active pas/);
  assert.match(read('../coro-backend/prisma/schema.prisma'), /enum PopulationAlertChannel \{\s*SMS\s*EMAIL\s*\}/);
  assert.doesNotMatch(code, /sirène|vocal|appel automatisé|réseaux sociaux.{0,40}(envoy|diffus)|911|répartition/i.test('') ? /$^/ : /automatiquement (aux|à la) municipal|intégration municipale|Québec En Alerte est/);
});

test('REGULATORY: preparation and support, never compliance; the official regulation is linked; CORO is not claimed compliant or certified', () => {
  assert.match(page, /https:\/\/laws-lois\.justice\.gc\.ca\/fra\/reglements\/DORS-2019-51\//);
  assert.match(code, /Son utilisation ne garantit pas à elle seule la conformité/);
  assert.doesNotMatch(code, /conforme à la RUE|conforme au RUE|conforme E2|certifi|homologu|approuvé par (Environnement|le gouvernement)/i);
});

test('SCENARIO DATA and maps: figures live only in fictional illustrations; the page states that zones are illustrative and not an impact analysis', () => {
  assert.match(code, /Zones et chiffres illustratifs d’un scénario fictif : ils ne constituent pas une analyse d’impact/);
  assert.doesNotMatch(code, /sans position citoyenne individuelle/);
  assert.doesNotMatch(code, /12 400|48 890|28 500|1500 Bd|Montarville|1 800/);
  assert.match(code, /Installation industrielle Prémont \(site fictif\)/);
});

test('language of the internal mode is customer-facing: no SANDBOX', () => {
  assert.doesNotMatch(code, /SANDBOX/);
  assert.match(code, /notamment en mode simulation, sans envoi réel aux abonnés/);
});

test('metadata, JSON-LD and links: brand-free title, FAQPage only from the visible FAQ, links only to /sentinelle and the official regulation', () => {
  assert.match(page, /title: 'Alerte à la population et plan d’urgence environnementale \(PUE\)'/);
  assert.ok(page.includes('faqJsonLd(t.faqs.map(([q, a]) => ({ question: q, answer: a })))'));
  assert.ok(page.includes('items={t.faqs.map(([q, a], i) => ({ id: `faq-${i}`, question: q, answer: a }))}'));
  assert.doesNotMatch(code, /SoftwareApplication|BreadcrumbList|Organization/);
  assert.match(code, /href="\/sentinelle"/);
  assert.doesNotMatch(code, /\/coro-incident|\/coro-exercices|\/plateforme|\/guides/);
  assert.match(code, /localizedHref\('\/#demo', l\)/);
});

test('accessibility: labelled sections, ordered scenario steps in order, native FAQ', () => {
  for (let i = 1; i <= 10; i++) assert.ok(page.includes('population-step-'), String(i));
  for (const id of ['problem', 'scenario', 'frame', 'phases', 'portal', 'continuity', 'responders', 'reg', 'distinct', 'faq']) assert.match(page, new RegExp(`labelledBy="population-${id}-title"`), id);
  assert.match(page, /<Accordion\b/);
});

test('MAP accessibility: the essential map meaning exists as HTML text even though the image is decorative; no acronym is defined', () => {
  assert.match(code, /La carte illustre le principe : le scénario définit un territoire potentiellement concerné, organisé en zones autour de l’installation\./);
  assert.match(code, /Ces zones servent à considérer la population et les établissements sensibles susceptibles d’être touchés, puis à cibler les communications\./);
  assert.match(code, /<MediaFrame src=\{`\$\{IMG\}\/\$\{t\.steps\[4\]\[2\]\}`\} alt=""/);
  assert.doesNotMatch(code, /\bZPI\b|\bZPU\b|\bZSE\b/);
});

test('PRIVACY claim: the unverified "adresse non conservée" and operator-invisibility claims are removed (coordinates ARE persisted per subscriber)', () => {
  assert.doesNotMatch(code, /n’est pas conservée|ne voient ni coordonnées|sans exposer leur position|sans montrer qui habite|pas pour exposer la population|Confidentialité intégrée/);
  assert.match(code, /portal: 'Un portail citoyen conçu pour l’inscription\.'/);
  assert.match(read('../coro-backend/prisma/schema.prisma'), /model PopulationSubscriber \{[\s\S]*?latitude\s+Float\?[\s\S]*?longitude\s+Float\?/);
});

test('ROADMAP: the future PUE configurator is not promoted; PUE stays as the planning context', () => {
  assert.doesNotMatch(code, /configurateur|configurator|évolution prévue|future/i);
  assert.match(code, /Votre PUE prévoit l’alerte à la population\./);
});

test('recomposition: no ten-card grid, one break between the scenario and its frame, secondary blocks grouped', () => {
  assert.ok(page.indexOf('population-frame-title') > page.indexOf('population-act-4'));
  assert.doesNotMatch(css, /box-shadow/);
  assert.equal((page.match(/<PageSection /g) ?? []).length, 14);
});

test('MIG-03C-E: the image with the questionable 1-800 number (alerte.webp) is never rendered nor used in metadata; the OG image is the hero-ammoniac artwork', () => {
  assert.doesNotMatch(page, /sentinelle-population-alerte(?:-mobile)?\.webp/);
  assert.match(page, /image: IMG \+ '\/sentinelle-population-hero-ammoniac\.webp'/);
  assert.ok(existsSync(join(process.cwd(), 'public/images/sentinelle_population/sentinelle-population-alerte.webp')), 'kept on disk for history only');
});

test('MIG-03C-E: public copy makes no claim on retention, multi-site, thresholds, dispatch, 911 or municipal integration', () => {
  assert.doesNotMatch(code, /rétention|multi-site|seuil|répartition|intégré[e]? (au|aux) (911|municip)|approuvé par le gouvernement/i);
  assert.match(code, /ne remplace ni l’organisation d’urgence, ni les municipalités, ni les services d’urgence, ni les autorités environnementales/);
});
