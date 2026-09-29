import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/security/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
// FAQ questions may quote a forbidden phrase in order to answer it ("Toutes les données restent-elles au Canada?"): claims are checked without the question strings.
const claims = code.replace(/q: '[^']*'/g, "q: ''");
const css = read('app/security/page.module.css');
const baseline = JSON.parse(read('tests/fixtures/security-baseline.json')) as { fr: { headings: [number, string][]; jsonLd: object[] } };

test('registry and route: /security is V2, bilingual, implemented and in the sitemap in FR and EN; /pricing is not migrated', () => {
  assert.ok(migratedV2Routes.includes('/security'));
  assert.ok(migratedV2Routes.indexOf('/security') < migratedV2Routes.indexOf('/pricing'), '/pricing was registered after /security (MIG-04B)');
  assert.equal(isLegacyFooterVisible('/security'), false);
  const r = getRoute('security');
  assert.equal(r?.implemented, true); assert.equal(r?.sitemap, true); assert.equal(r?.en, true);
  assert.ok(staticSitemapRoutes.some((x) => x.path === '/security'));
});

test('language: TRUE FR / EN, identical structure, no FR-only contract', () => {
  assert.doesNotMatch(page, /hasEnglish: false|englishAvailable=\{false\}/);
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/security">/);
  assert.match(page, /buildPageMetadata\(\{ path: '\/security', locale: l/);
  const fr = code.slice(code.indexOf('  fr: {'), code.indexOf('  en: {'));
  const en = code.slice(code.indexOf('  en: {'), code.indexOf('export async function generateMetadata'));
  for (const key of ['metaTitle', 'description', 'label', 'lines', 'lead', 'detail', 'demo', 'ask', 'mailSubject', 's1', 's2', 's3', 's4', 's5', 's6', 'faq', 'faqItems', 'statement', 'support']) {
    assert.ok(fr.includes(`${key}:`) && en.includes(`${key}:`), key);
  }
  assert.equal((fr.match(/\{ q: /g) ?? []).length, 6);
  assert.equal((en.match(/\{ q: /g) ?? []).length, 6);
});

test('hero: the replacement marketing illustration, decorative, cropped to the infrastructure aisle; V1 H1 preserved', () => {
  const call = page.match(/photo=\{\{[^}]*\}\}/)?.[0] ?? '';
  assert.ok(call.includes("src: '/website-v2/security/security-canadian-hosting.webp'"));
  assert.doesNotMatch(call, /alt:/);
  assert.ok(existsSync(join(process.cwd(), 'public/website-v2/security/security-canadian-hosting.webp')));
  assert.match(call, /position: '100% 50%'/);
  assert.match(page, /lines: \['La sécurité fait partie', 'de l’architecture\.'\]/);
  assert.equal(baseline.fr.headings[0][1], 'La sécurité fait partie de l’architecture.');
  assert.equal((page.match(/<EditorialHero/g) ?? []).length, 1);
  assert.equal((page.match(/MediaFrame|<img/g) ?? []).length, 0, 'no other image, no badge, no seal');
});

test('Canadian infrastructure: PRIMARY application infrastructure, never "all data stays in Canada"; third parties acknowledged in cautious wording without a vendor list', () => {
  assert.match(code, /L’infrastructure applicative principale de CORO est hébergée au Canada, dans la région de Toronto/);
  assert.match(code, /CORO’s primary application infrastructure is hosted in Canada, in the Toronto region/);
  assert.match(code, /Cela ne veut pas dire que tout traitement lié au service se fait au Canada/);
  assert.match(code, /This does not mean that all processing related to the service takes place in Canada/);
  assert.match(code, /peuvent traiter certaines données à l’extérieur du Canada/);
  assert.match(code, /may process certain data outside Canada/);
  assert.doesNotMatch(claims, /toutes les données (restent|demeurent|sont hébergées|se trouvent)|all (the |of the )?data (stays|remains|is hosted|resides)|100 ?%.{0,20}Canad/i);
  assert.doesNotMatch(code, /Cloudflare|Brevo|Anthropic|Formspree|Mapbox/);
  assert.match(code, /Pas nécessairement\./); assert.match(code, /Not necessarily\./);
});

test('no certification, compliance, standard or attestation claim; no badge', () => {
  assert.doesNotMatch(claims, /conforme à la Loi 25|Loi 25 conforme|compliant with Law 25|Law 25 compliant|certifi(é|ée|e) (LPRPDE|PIPEDA)|PIPEDA certified/i);
  assert.doesNotMatch(claims, /SOC ?[23]|ISO ?27001|ISO ?22301|CNPI|CNESST|HIPAA|PCI/i);
  assert.match(code, /CORO n’affiche pas de certification de sécurité/);
  assert.match(code, /CORO does not display any security certification/);
  assert.match(code, /Cette page ne déclare pas de conformité/);
  assert.match(code, /This page does not declare compliance/);
});

test('technical claim boundaries (MIG-04-PRE): no E2E, no 24/7, no retention or snapshot claim, no firewall, no penetration test, no SLA figure, no hyperbole', () => {
  assert.doesNotMatch(claims, /bout en bout|end-to-end/i);
  assert.doesNotMatch(claims, /24 ?\/ ?7|24 ?h\b|24 heures|24 hours|surveillance continue|continuous monitoring|en tout temps|around the clock/i);
  assert.doesNotMatch(claims, /30 jours|30 days|snapshot|quotidien|daily|toutes les 6|every 6|6 heures|6 hours|redondan/i);
  assert.doesNotMatch(claims, /pare-feu|firewall|test d’intrusion|penetration|zero.?trust|confiance zéro|reprise après sinistre|disaster recovery|99[,.]9/i);
  assert.doesNotMatch(claims, /militaire|military|bank-level|niveau bancaire|inviolable|unbreakable|entièrement sécur|fully secure|à toute épreuve/i);
  assert.doesNotMatch(claims, /en-têtes? (HTTP )?de sécurité|security headers/i);
});

test('MFA is not a selling point (SECURITY-HARDENING — MFA): no MFA, two-factor or trusted-device wording', () => {
  assert.doesNotMatch(claims, /\bMFA\b|double authentification|authentification à deux|two-factor|multi-?factor|2FA|appareil de confiance|trusted device/i);
});

test('verified controls only: TLS, hashed passwords, roles, logical separation, limited attempts, rate limits, logging; backup wording is the Terms-of-Use general wording without numbers', () => {
  for (const fragment of ['HTTPS/TLS', 'sous forme hachée', 'Rôles et permissions', 'séparées logiquement', 'tentatives de connexion répétées est limité', 'limites de débit', 'journalisées',
    'mécanismes de sauvegarde et de continuité adaptés à son infrastructure', 'hashed form', 'Roles and permissions', 'logically separated', 'Repeated sign-in attempts are limited', 'rate limits', 'logged',
    'backup and continuity mechanisms suited to its infrastructure']) assert.ok(code.includes(fragment), fragment);
  assert.doesNotMatch(claims, /rétention|retention|restaur|restore|RTO|RPO/i);
});

test('shared responsibility: CORO controls / providers support / organization owns, sourced from the Terms of Use, with no contractual language invented', () => {
  for (const fragment of ['Ce que CORO contrôle', 'Ce que soutiennent des fournisseurs', 'Ce qui relève de votre organisation', 'What CORO controls', 'What providers support', 'What rests with your organization']) assert.ok(code.includes(fragment), fragment);
  assert.match(code, /les engagements contractuels se trouvent dans les conditions d’utilisation/);
  assert.match(code, /contractual commitments are found in the terms of use/);
  assert.doesNotMatch(claims, /garantit|garantie|guarantee|responsabilité (civile|légale|contractuelle) de CORO|indemn|dommages/i);
});

test('privacy boundary: careful wording only, links to /privacy and /terms, no future or pricing route', () => {
  assert.match(code, /CORO tient compte du cadre législatif québécois \(Loi 25\) et du cadre fédéral \(LPRPDE \/ PIPEDA\) lorsqu’il s’applique/);
  assert.match(code, /CORO takes into account the Québec legislative framework \(Law 25\) and the federal framework \(PIPEDA\) where it applies/);
  assert.match(code, /localizedHref\('\/privacy', l\)/); assert.match(code, /localizedHref\('\/terms', l\)/);
  assert.doesNotMatch(code, /\/pricing|\/plateforme|\/coro-exercices|\/guides|\/qr-intervention|\/sentinelle-population|\/coro-incident/);
});

test('metadata: brand-free semantic titles, no certification keyword, descriptions match the approved territory', () => {
  assert.match(page, /metaTitle: 'Sécurité et hébergement des données au Canada'/);
  assert.match(page, /metaTitle: 'Security and data hosting in Canada'/);
  for (const m of code.match(/metaTitle: '[^']*'/g) ?? []) assert.doesNotMatch(m, /CORO/);
  for (const m of code.match(/description: '[^']*'/g) ?? []) assert.doesNotMatch(m, /certifi|conform|complian|SOC|ISO|Loi 25|Law 25|garant|100/i);
});

test('JSON-LD and FAQ: FAQPage generated from the same visible FAQ items; no SoftwareApplication, no certification schema', () => {
  assert.ok(page.includes('faqJsonLd(t.faqItems.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={t.faqItems.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
  assert.doesNotMatch(code, /SoftwareApplication|BreadcrumbList|Organization|WebPage|hasCredential|Certification/);
  assert.equal(baseline.fr.jsonLd.length, 1, 'the V1 baseline carried a single WebPage / SoftwareApplication object, replaced by FAQPage');
});

test('links and CTAs: demonstration and a security question by email; no resource links (no strong article exists); CSS uses V1 tokens only and no status colour', () => {
  assert.match(code, /localizedHref\('\/#demo', l\)/);
  assert.match(code, /mailto:info@getcoro\.io\?subject=/);
  assert.doesNotMatch(code, /\/blog\//);
  assert.doesNotMatch(css, /gradient|box-shadow|#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)|green|#2[0-9a-f]{5}/i);
});

test('structure: six numbered sections, one rows list per control group, at most one multi-column group, nothing decorative', () => {
  assert.equal((code.match(/labelledBy="security-s\d-title"/g) ?? []).length, 6);
  assert.equal((code.match(/className=\{styles\.cols\}/g) ?? []).length, 1);
  assert.doesNotMatch(css, /animation|transition/);
});
