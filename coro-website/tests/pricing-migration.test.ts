import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/pricing/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
// FAQ questions may quote a forbidden word in order to answer it ("Existe-t-il une période d’essai?"): claims are checked without the question strings.
// The Referral callout is the one place where the referral credit is mentioned; it has its own test, so the price checks run without it.
const referralLines = code.match(/^\s*referral: \{.*$/gm) ?? [];
const claims = code.replace(/q: '[^']*'/g, "q: ''").replace(/^\s*referral: \{.*$/gm, '');
const css = read('app/pricing/page.module.css');
const baseline = JSON.parse(read('tests/fixtures/pricing-baseline.json')) as { fr: { headings: [number, string][]; jsonLd: { '@type': string }[] } };

test('registry and route: /pricing is V2, bilingual, implemented, in the sitemap in FR and EN, registered after /security', () => {
  assert.ok(migratedV2Routes.includes('/pricing'));
  assert.ok(migratedV2Routes.indexOf('/pricing') < migratedV2Routes.indexOf('/guides'), '/pricing was registered before /guides (MIG-05A)');
  assert.ok(migratedV2Routes.includes('/security'));
  assert.equal(isLegacyFooterVisible('/pricing'), false);
  const r = getRoute('pricing');
  assert.equal(r?.implemented, true); assert.equal(r?.sitemap, true); assert.equal(r?.en, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/pricing'));
});

test('language: TRUE FR / EN with identical structure', () => {
  assert.doesNotMatch(page, /hasEnglish: false|englishAvailable=\{false\}/);
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/pricing">/);
  const fr = code.slice(code.indexOf('  fr: {'), code.indexOf('  en: {'));
  const en = code.slice(code.indexOf('  en: {'), code.indexOf('export async function generateMetadata'));
  for (const key of ['metaTitle', 'description', 'label', 'lines', 'lead', 'detail', 'ask', 'how', 's1', 's2', 's3', 's4', 's5', 'res', 'faq', 'faqItems', 'form']) assert.ok(fr.includes(`${key}:`) && en.includes(`${key}:`), key);
  for (const [n, re] of [['faq items', /\{ q: /g], ['dimensions', /\['[^']+', '[^']+'\],\n/g]] as const) if (n === 'faq items') assert.equal((fr.match(re) ?? []).length, (en.match(re) ?? []).length);
  assert.equal((fr.match(/\{ q: /g) ?? []).length, 8);
  assert.equal((fr.match(/\{ slug: /g) ?? []).length, 3); assert.equal((en.match(/\{ slug: /g) ?? []).length, 3);
});

test('hero: the replacement marketing illustration, decorative, no logo, no caption or cartouche, never presented as a screenshot', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/pricing/pricing-coro-modular-platform-v2.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/pricing/pricing-coro-modular-platform-v2.webp')));
  assert.ok(!existsSync(join(process.cwd(), 'public/website-v2/pricing/pricing-coro-modular-platform.webp')), 'the blocked version is not restored');
  assert.ok(!existsSync(join(process.cwd(), 'public/website-v2/pricing/pricing-coro-plans.webp')), 'the invented-prices version is not restored');
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
  assert.equal((page.match(/MediaFrame|<img|cartouche|Capture d’écran|Screenshot/g) ?? []).length, 0);
  assert.equal(baseline.fr.headings[0][1], 'Une tarification qui s’adapte à votre organisation.', 'the V1 H1 is recorded in the baseline; V2 rewrites it (Model A)');
});

test('MODEL A: no price, no currency amount, no percentage, no "starting at", no calculator, no billing formula', () => {
  assert.doesNotMatch(claims, /\d[\d\s,.]*\s?(\$|CAD|USD|€|dollars?)|\$\s?\d|\/\s?(mois|an|month|year)|par (mois|an|utilisateur|bâtiment|site)|per (month|year|user|building|site)/i);
  assert.doesNotMatch(claims.replace(/photo=\{\{[^}]*\}\}/g, ''), /\d\s?%|pour cent|percent/i);
  assert.doesNotMatch(claims, /à partir de\s*[\d$]|à partir d’un prix|dès \d|starting (at|from)|from \$|as low as|prix de départ/i);
  assert.doesNotMatch(claims, /calculat|simulat|estimat|devis automatique|instant quote|tarif (fixe|mensuel|annuel)|monthly|annual price|mensuel|annuel/i);
  assert.doesNotMatch(claims, /factur(e|ation|ons|é) (par|selon|à)|billed (per|by)|invoiced (per|by)|détermine(nt)? (le|les) (prix|tarif)|determine(s)? the price/i);
  assert.match(code, /CORO n’affiche pas de prix fixe/); assert.match(code, /CORO does not display fixed prices/);
});

test('no Free / Standard / Enterprise reconstruction, no 30-day trial or trial limits, no founder programme, no 24-hour promise, no referral credit in the Pricing model', () => {
  assert.doesNotMatch(claims, /\b(Standard|Entreprise|Enterprise|Essentiel|Starter|Pro|Premium|Business)\b/);
  assert.doesNotMatch(claims, /gratuit|\bfree\b|\bessais?\b|\btrials?\b|freemium/i);
  assert.doesNotMatch(claims, /30 jours|30 days|3 projets|three projects|1 utilisateur|one user|filigran|watermark/i);
  assert.doesNotMatch(code, /fondateur|founder|founding|places limitées|limited (number|spots)|#fondateur/i);
  assert.doesNotMatch(claims, /24 ?h|24 heures|24 hours|sous 24|within 24|vingt-quatre/i);
  assert.doesNotMatch(claims.replace(/t\.referral\.\w+|\/programme-recommandation/g, ''), /250|recommandation|referral|crédit|credit/i);
  assert.match(code, /Notre équipe vous contactera pour discuter de vos besoins/); assert.match(code, /Our team will contact you to discuss your needs/);
});

test('FIX-24H: the shared DemoForm rendered on /pricing carries no response-time promise', () => {
  const form = read('app/DemoForm.tsx');
  assert.doesNotMatch(form, /24 ?h|24 heures|24 hours|sous 24|within 24|vingt-quatre/i);
});

test('trial question is answered without a promise: demonstration and discussion first', () => {
  assert.match(code, /Nous commençons par une démonstration et une discussion sur votre environnement/);
  assert.match(code, /We start with a demonstration and a discussion about your environment/);
  assert.doesNotMatch(code, /sans (carte|engagement)|no credit card|carte de crédit|credit card/i);
});

test('product capability is kept apart from commercial packaging: no module sold separately, no future module, no Phase-2 document, no SLA, no included hours', () => {
  assert.match(code, /non comme un module vendu séparément/); assert.match(code, /not as a separately sold module/);
  assert.match(code, /deux choses distinctes/); assert.match(code, /two separate things/);
  assert.doesNotMatch(claims, /Knowledge|Network|Campus|\bOps\b|\bAI\b|\bIA\b|intelligence artificielle|Exercices|Conformité|Compliance/);
  assert.doesNotMatch(claims, /\b(PGC|PRA|PUE|CMP|RRP|EEP)\b|phase 2/);
  assert.doesNotMatch(claims, /\bSLA\b|niveau de service|service level|support prioritaire|priority support|heures (incluses|de formation)|included hours|accompagnement de base|basic support/i);
  assert.doesNotMatch(claims, /module(s)? (payant|additionnel|optionnel|en option)|add-?on|extension(s)? payante|paid (module|extension)/i);
  assert.doesNotMatch(claims, /la plus courante|most common|conçu par des praticiens|built by .{0,40}practitioners/i);
});

test('scoping dimensions "help define the scope" and are not billing rules; Sentinelle Population variables are not listed', () => {
  assert.match(code, /aident à définir l’étendue du déploiement/); assert.match(code, /help define the extent of the deployment/);
  assert.match(code, /Ils ne sont pas des règles de facturation/); assert.match(code, /They are not billing rules/);
  assert.match(code, /demandent une discussion de cadrage distincte/); assert.match(code, /call for a separate scoping discussion/);
  assert.doesNotMatch(claims, /substance|quantité|établissement sensible|sensitive establishment|population (touchée|affected)|nombre d’abonnés|subscribers/i);
});

test('capabilities shown are the current public product families with real routes only; no FUTURE or REVIEW route', () => {
  for (const href of ['/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs', '/portail-client', '/resilience-operationnelle']) assert.ok(page.includes(`href: '${href}'`), href);
  assert.match(code, /localizedHref\('\/sentinelle-population', l\)/);
  assert.doesNotMatch(code, /\/plateforme|\/coro-exercices|\/guides|\/qr-intervention|\/coro-ops|\/coro-ai|\/coro-knowledge|\/coro-network|\/coro-campus|\/ressources|\/conformite-reglementation/);
});

test('hosting answer follows the Security page wording: primary infrastructure, no "all data in Canada"', () => {
  assert.match(code, /L’infrastructure applicative principale de CORO est hébergée au Canada, dans la région de Toronto/);
  assert.match(code, /CORO’s primary application infrastructure is hosted in Canada, in the Toronto region/);
  assert.doesNotMatch(claims, /toutes les données|all (the |of the )?data|DigitalOcean/i);
});

test('metadata: brand-free semantic titles, truthful descriptions (no price, trial, discount or certification)', () => {
  assert.match(page, /metaTitle: 'Tarification : une offre configurée selon votre organisation'/);
  assert.match(page, /metaTitle: 'Pricing: an offer configured around your organization'/);
  for (const m of code.match(/metaTitle: '[^']*'/g) ?? []) assert.doesNotMatch(m, /CORO/);
  for (const m of code.match(/description: '[^']*'/g) ?? []) assert.doesNotMatch(m, /gratuit|free|essai|trial|\d\s?[$%]|à partir|from|rabais|discount|certifi|24/i);
});

test('JSON-LD: FAQPage only, generated from the visible FAQ; no Offer, AggregateOffer, price, priceCurrency, free-trial or SoftwareApplication schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
  assert.doesNotMatch(code, /['"]Offer['"]|AggregateOffer|priceCurrency|['"]price['"]|\bprice:|SoftwareApplication|['"]WebPage['"]|BreadcrumbList|['"]Organization['"]|freeTrial|isAccessibleForFree/);
  assert.deepEqual(baseline.fr.jsonLd.map((x) => x['@type']), ['WebPage', 'BreadcrumbList', 'FAQPage'], 'the V1 baseline carried WebPage + BreadcrumbList + FAQPage');
});

test('resources: three existing published blog articles, real titles, contextual; none is a product page or a price claim', () => {
  const slugs = ['combien-coute-plan-mesures-urgence-pmu', 'plan-mesures-urgence-word-excel-logiciel', 'gerer-plans-urgence-plusieurs-batiments'];
  for (const slug of slugs) assert.ok(page.includes(`slug: '${slug}'`), slug);
  assert.equal((code.match(/\/blog\//g) ?? []).length, 1, 'links are generated from the three items');
  assert.match(code, /localizedHref\(`\/blog\/\$\{r\.slug\}`, l\)/);
});

test('CTA and form: the shared DemoForm is embedded unchanged with a local #demo anchor; no new quoting system; the referral attribution contract is untouched', () => {
  assert.match(code, /import DemoForm from '@\/app\/DemoForm'/);
  assert.match(code, /<DemoForm lang=\{l\} \/>/);
  assert.match(code, /id="demo"/); assert.match(code, /href="#demo"/);
  assert.match(code, /C’est le même que celui de la demande de démonstration|It is the same form as the demonstration request/);
  assert.doesNotMatch(code, /formspree|fetch\(|localStorage|document\.cookie/i);
  assert.doesNotMatch(code, /LOGIN|client\.getcoro\.io/);
});

test('structure and CSS: cards only in two intentional clusters (3 situations, 4 scope markers), ruled capability blocks, one navy scope flow, a Model-A band; V1 tokens only', () => {
  assert.equal((code.match(/className=\{styles\.flow\}/g) ?? []).length, 1);
  for (const c of ['situations', 'scope', 'compose', 'band']) assert.equal((code.match(new RegExp(`className=\\{styles\\.${c}\\}`, 'g')) ?? []).length, 1, c);
  assert.equal((code.match(/styles\.card\b/g) ?? []).length, 2, 'the card class is used by exactly the two clusters');
  assert.match(css, /\.situations[\s\S]*?repeat\(3, minmax\(0, 1fr\)\)/); assert.match(css, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.equal((code.match(/labelledBy="pricing-s\d-title"/g) ?? []).length, 5);
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|animation|transition/);
  assert.match(css, /@media \(max-width: 40rem\)[\s\S]*?\.flow \{ grid-template-columns: 1fr/);
});

const slice = (from: string, to: string) => code.slice(code.indexOf(from), code.indexOf(to, code.indexOf(from)));
const frCopy = () => code.slice(code.indexOf('  fr: {'), code.indexOf('  en: {'));
const enCopy = () => code.slice(code.indexOf('  en: {'), code.indexOf('export async function generateMetadata'));
const firstCol = (t: string, from: string, to: string) => [...t.slice(t.indexOf(from), t.indexOf(to, t.indexOf(from))).matchAll(/\['([^']+)', '/g)].map((m) => m[1]);

test('three customer-situation cards, exactly: one building / several buildings or sites / firms and professionals, without a price, a badge or a feature wall', () => {
  assert.deepEqual(firstCol(frCopy(), 'examples: [', '] as const'), ['Un bâtiment', 'Plusieurs bâtiments ou sites', 'Firmes et professionnels']);
  assert.deepEqual(firstCol(enCopy(), 'examples: [', '] as const'), ['One building', 'Several buildings or sites', 'Firms and professionals']);
  assert.match(code, /Ces situations ne sont pas des forfaits/); assert.match(code, /These situations are not packages/);
  assert.doesNotMatch(claims, /recommended|most popular|populaire|meilleur choix|best value|badge|✓|✔|checkmark/i);
});

test('four scope cards, exactly: sites and buildings / users / CORO capabilities / support; explicitly not a formula or a billing rule', () => {
  assert.deepEqual(firstCol(frCopy(), 'dims: [', '] as const'), ['Sites et bâtiments', 'Utilisateurs', 'Capacités CORO', 'Accompagnement']);
  assert.deepEqual(firstCol(enCopy(), 'dims: [', '] as const'), ['Sites and buildings', 'Users', 'CORO capabilities', 'Support']);
  assert.match(code, /Ils ne sont pas des règles de facturation/); assert.match(code, /They are not billing rules/);
  assert.doesNotMatch(claims, /détermine(nt)?|determin(e|es|ing) (the )?(price|cost)|fait varier le prix|drives? (the )?price|multipli(é|ez|cation)|multipl(y|ied) by/i);
});

test('capability composition: the five current capabilities around the organisation, no future module, not priced tiles', () => {
  assert.match(code, /className=\{styles\.core\}/); assert.match(code, /className=\{styles\.blocks\}/);
  assert.equal((slice('caps: [', '] as const').match(/href: '\/[a-z-]+'/g) ?? []).length, 5);
  assert.match(code, /CORO se compose autour de votre environnement/); assert.match(code, /CORO is composed around your environment/);
  assert.doesNotMatch(claims, /Knowledge|Network|Campus|\bOps\b|\bAI\b|add-?on|module(s)? (payant|additionnel)|paid module/);
});

test('Model-A band: a strong statement without a number or a formula; the navy flow keeps its four steps and is followed by a white band', () => {
  assert.match(code, /Pas de prix générique pour une organisation qui ne l’est pas\./);
  assert.match(code, /No generic price for an organization that isn’t generic\./);
  assert.doesNotMatch(slice("statement: 'Pas de prix", 'items:'), /\d/, 'the FR band copy carries no number');
  assert.deepEqual(firstCol(frCopy(), 'steps: [', '] as const'), ['Évaluation', 'Configuration', 'Déploiement', 'Accompagnement']);
  assert.deepEqual(firstCol(enCopy(), 'steps: [', '] as const'), ['Assessment', 'Configuration', 'Deployment', 'Support']);
  assert.match(page, /<PageSection tone="navy" labelledBy="pricing-s4-title">[\s\S]*?<\/PageSection>\s*<PageSection tone="white" density="immersive" labelledBy="pricing-s5-title">/);
});

test('Referral callout (human decision MIG-04B-B): contextual link to the existing programme, the amount the Referral page confirms, never a Pricing discount, before the FAQ and the form; Founder stays absent', () => {
  assert.equal(referralLines.length, 2);
  for (const line of referralLines) {
    assert.match(line, /250 \$|\$250/);
    assert.match(line, /distinct de l’offre décrite sur cette page|separate from the offer described on this page/);
    assert.doesNotMatch(line, /rabais|remise|réduction|discount|savings?|économi|cumul|stack|off your|sur votre (offre|abonnement)|on your (offer|subscription)|gratuit|free/i);
  }
  assert.match(code, /localizedHref\('\/programme-recommandation', l\)/);
  assert.equal((code.match(/250/g) ?? []).length, 2, 'the amount appears only in the two referral texts');
  assert.ok(page.indexOf('pricing-res-title') < page.indexOf('pricing-ref-title') && page.indexOf('pricing-ref-title') < page.indexOf('pricing-faq-title') && page.indexOf('pricing-faq-title') < page.indexOf('pricing-form-title'));
  assert.doesNotMatch(code, /fondateur|founder|founding|#fondateur/i);
  const referral = read('app/programme-recommandation/page.tsx');
  assert.match(referral, /250 \$/); assert.match(referral, /\$250/);
});

test('final conversion: "Construisons votre environnement CORO", context / buildings / needs, no delay promise, in an open white section around the unchanged shared DemoForm (the navy site footer follows it)', () => {
  assert.match(code, /Construisons votre environnement CORO\./); assert.match(code, /Let’s build your CORO environment\./);
  assert.match(code, /votre contexte, vos bâtiments ou sites et ce dont vous avez besoin/); assert.match(code, /your context, your buildings or sites and what you need/);
  assert.match(page, /<PageSection tone="white" id="demo" labelledBy="pricing-form-title">/);
  assert.match(code, /<DemoForm lang=\{l\} \/>/);
});
