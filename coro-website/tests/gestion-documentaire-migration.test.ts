import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { publicRoutes } from '../lib/site/routes.ts';
import { buildPageMetadata, titleContainsBrand } from '../lib/site/seo.ts';
import { productContent } from '../lib/site/product-content.ts';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
type Baseline = Record<'fr' | 'en', { description: string; headings: [string, string][]; links: [string | null, string][]; jsonLd: unknown[]; images: string[]; mainText: string }>;
const baseline = JSON.parse(read('tests/fixtures/gestion-documentaire-baseline.json')) as Baseline;
const page = read('app/gestion-documentaire/page.tsx');
const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('the registry holds the four MIG-01 routes plus /gestion-documentaire and nothing else; no legacy footer on it', () => {
  assert.deepEqual([...migratedV2Routes], ['/about', '/contact', '/partners', '/programme-recommandation', '/gestion-documentaire', '/gestion-de-projets', '/performance-objectifs']);
  assert.equal(isLegacyFooterVisible('/gestion-documentaire'), false);
  for (const legacy of ['/portail-client', '/']) assert.equal(isLegacyFooterVisible(legacy), true, legacy);
});

test('V2Shell owns the chrome: no page-owned header, main, footer or legacy shell; V1 tokens only', () => {
  assert.match(page, /<V2Shell locale=\{l\} pathname="\/gestion-documentaire">/);
  assert.doesNotMatch(code, /<SiteHeader|<SiteFooter|<main\b|<footer\b|pageShell|ProductPage|ProductCompositions|institutional\.module|lucide-react/);
  const css = read('app/gestion-documentaire/page.module.css');
  assert.doesNotMatch(css, /pageShell|\+\s*footer|display:\s*none|gradient|box-shadow/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|--coro-(?!v1)/);
  assert.match(page, /<HeroTechnical/);
  assert.match(page, /heading="h1"/);
});

test('PRODUCT TRUTH: only PMU, PSI and PCA are available; PGC, PRA and PUE are Phase 2 in both languages', () => {
  for (const [code_, available] of [['PMU', true], ['PSI', true], ['PCA', true], ['PGC', false], ['PRA', false], ['PUE', false], ['ERP', true], ['FSP', true], ['BCP', true], ['CMP', false], ['DRP', false], ['EEP', false]] as const) {
    assert.match(page, new RegExp(`\\['${code_}', '[^']+', '/documents/[a-z-]+', ${available}\\]`), `${code_} availability`);
  }
  assert.match(page, /available: 'Disponible', phase2: 'Phase 2'/);
  assert.match(page, /available: 'Available', phase2: 'Phase 2'/);
  assert.match(page, /refs: \[\['PMU'[^\]]*\], \['PSI'[^\]]*\], \['PCA'[^\]]*\]\]/);
  assert.match(page, /refs: \[\['ERP'[^\]]*\], \['FSP'[^\]]*\], \['BCP'[^\]]*\]\]/);
  // The published boundary text is kept verbatim from the product content, which itself separates confirmed and unvalidated documents.
  assert.match(productContent.documents.fr.boundary, /PMU, PSI et PCA sont confirmés.*PGC, PRA et PUE/);
  assert.match(page, /p\.boundary/);
  assert.match(page, /pas d'authorité|Phase 2/);
});

test('no unverified claim: no certification, guaranteed compliance, regulator approval, legacy 43-procedure count or invented functionality', () => {
  assert.doesNotMatch(code, /certifi|certified|garanti|guarantee|approuvé par|approved by|CNESST|CNPI|ISO\s?22301|43\b|conforme\b|compliant/i);
  assert.doesNotMatch(code, /intelligence artificielle|\bIA\b|\bAI\b|automatique|automatic/i);
  assert.match(productContent.documents.fr.boundary, /sans garantir à lui seul la conformité/);
  assert.doesNotMatch(read('app/gestion-documentaire/page.tsx'), /LegacyGestionDocumentaire/);
});

test('product copy is preserved from the live page: title, intro, steps, capabilities, boundary, FAQ and CTA', () => {
  for (const locale of ['fr', 'en'] as const) {
    const p = productContent.documents[locale];
    assert.equal(p.flow.length, 8);
    assert.equal(p.capabilities.length, 4);
    assert.equal(p.faq.length, 2);
    const before = baseline[locale].mainText;
    for (const s of [p.intro, p.flowTitle, p.capTitle, p.boundaryTitle, p.capabilities[0].text, p.faq[0].a, p.cta]) assert.ok(before.includes(s), `baseline ${locale}: ${s.slice(0, 40)}`);
  }
  for (const s of ['p.intro', 'p.flow', 'p.capTitle', 'p.capabilities', 'p.boundaryTitle', 'p.boundary', 'p.faq', 'p.cta', 'p.connections', 'p.flowTitle']) assert.ok(page.includes(s), s);
  assert.deepEqual(productContent.documents.fr.title, ['De l’information structurée', 'aux plans approuvés.'].join(' '));
  assert.ok(page.includes("'De l’information structurée', 'aux plans approuvés.'") && page.includes("'From structured information', 'to approved plans.'"));
});

test('guides silo: every one of the six implemented guides is linked from the commercial page, in both languages, with the guide kept FR-only', () => {
  const guides = ['plan-mesures-urgence-pmu', 'plan-securite-incendie-psi', 'plan-continuite-activites-pca', 'plan-gestion-crise-pgc', 'plan-reprise-activites-pra', 'plan-urgence-environnementale-pue'];
  for (const slug of guides) {
    assert.equal((page.match(new RegExp(`/documents/${slug}`, 'g')) ?? []).length, 2, `${slug} linked in FR and EN`);
    const route = publicRoutes.find((r) => r.path === `/documents/${slug}`);
    assert.ok(route?.implemented && route.en === false, slug);
  }
  assert.match(page, /Read the guide \(in French\)/);
  assert.doesNotMatch(code, /href="\/guides|'\/guides|\/plateforme['"`]/, '/guides and /plateforme are not implemented / not exposed');
});

test('CTA: demonstration stays /#demo; connected product pages are existing implemented routes only', () => {
  assert.match(page, /localizedHref\('\/#demo', l\)/);
  assert.match(page, /primary: \{ label: p\.cta, href: demo \}/);
  assert.match(page, /primary=\{\{ label: t\.ctaPrimary, href: demo \}\}/);
  for (const c of [...productContent.documents.fr.connections, ...productContent.documents.en.connections]) if (c.href) assert.ok(publicRoutes.some((r) => r.path === c.href && r.implemented), c.href);
  assert.doesNotMatch(code, /coro-incident|coro-exercices|\/plateforme['"`]/);
});

test('media: the real editor screenshot and the approved technical drawings exist; the illustration is not presented as product UI', () => {
  for (const file of ['public/screenshot-editor.jpg', 'public/website-v2/architecture/building-blueprint.webp', 'public/website-v2/architecture/building-cutaway.webp']) assert.ok(existsSync(join(process.cwd(), file)), file);
  assert.match(page, /src="\/screenshot-editor\.jpg"/);
  assert.match(page, /kind="technical"/);
  // The provenance of the visible example data is unconfirmed (PUBLICATION-BLOCKER before Go-Live), so the frame never says "real".
  assert.doesNotMatch(code, /Capture réelle|Real screenshot|real customer|clients? réels?/i);
  assert.match(page, /'CORO Documents · Éditeur'/);
  assert.match(page, /'CORO Documents · Editor'/);
  assert.match(page, /<SplitContent ratio="4-8" order="media-text" align="start" bleed="left"/, 'the screenshot column is the larger one');
  assert.match(page, /Illustration/);
  assert.doesNotMatch(code, /coro-gestion-documentaire\.webp|coro-document-management\.webp/, 'the generic illustration formerly labelled "interface" is no longer used');
  assert.ok(baseline.fr.images[0].includes('Interface CORO Documents'), 'baseline documents the previous mislabelled illustration');
});

test('metadata: brand-free titles, hardened contract, canonical without tracking; structured data is the FAQ that is visible on the page', () => {
  assert.match(page, /title: copy\[l\]\.metaTitle/);
  for (const [locale, title] of [['fr', 'Gestion documentaire des plans d’urgence et de continuité'], ['en', 'Emergency and continuity plan document management']] as const) {
    assert.ok(page.includes(title), title);
    assert.equal(titleContainsBrand(title), false);
    const m = buildPageMetadata({ path: '/gestion-documentaire?ref=CR-ABCDEF', locale, title, description: 'd' });
    assert.equal(m.alternates?.canonical, locale === 'fr' ? 'https://getcoro.io/gestion-documentaire' : 'https://getcoro.io/gestion-documentaire?lang=en');
    assert.deepEqual(Object.keys(m.alternates?.languages ?? {}), ['fr-CA', 'en-CA', 'x-default']);
  }
  assert.doesNotMatch(code, /SoftwareApplication|Organization|LocalBusiness/);
  assert.match(page, /faqJsonLd\(p\.faq\.map/);
  assert.equal(baseline.fr.jsonLd.length, 0, 'the live page had no structured data');
});

test('accessibility structure: one h1 (HeroTechnical), labelled sections, availability written as text, FAQ as native disclosure', () => {
  assert.equal((code.match(/<h1\b/g) ?? []).length, 0);
  for (const id of ['docs-foundation-title', 'docs-cycle-title', 'docs-list-title', 'docs-boundary-title', 'docs-platform-title', 'docs-faq-title']) assert.match(page, new RegExp(`labelledBy="${id}"`), id);
  assert.match(page, /<Accordion\b/);
  assert.match(page, /className=\{styles\.status\}>\{available \? t\.available : t\.phase2\}/);
  assert.match(page, /aria-label=\{`\$\{t\.guideFor\} \$\{name\}`\}/);
});

test('FAQ JSON-LD equals the visible FAQ exactly, in French and English, from a single source', async () => {
  const { faqJsonLd } = await import('../lib/site/json-ld.ts');
  for (const locale of ['fr', 'en'] as const) {
    const visible = productContent.documents[locale].faq;
    const ld = faqJsonLd(visible.map((item) => ({ question: item.q, answer: item.a }))) as { '@type': string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    assert.equal(ld['@type'], 'FAQPage');
    assert.deepEqual(ld.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible.map((item) => [item.q, item.a]), locale);
    assert.equal(ld.mainEntity.length, 2, 'no hidden FAQ entry');
  }
  // The visible accordion and the structured data are built from the same array.
  assert.equal((page.match(/p\.faq/g) ?? []).length, 2);
  assert.ok(page.includes('faqJsonLd(p.faq.map((item) => ({ question: item.q, answer: item.a })))'));
  assert.ok(page.includes('items={p.faq.map((item, i) => ({ id: `faq-${i}`, question: item.q, answer: item.a }))}'));
});

test('hero markers are illustrative: aria-hidden pins, a semantic list that says so, no claim of real locations', () => {
  assert.match(read('components/hero/HeroMedia.tsx'), /className=\{styles\.pin\}[^>]*aria-hidden="true"/);
  assert.ok(page.includes('repères numérotés de la planche sont illustratifs et ne désignent aucun emplacement réel'));
  assert.ok(page.includes('numbered markers on the drawing are illustrative and do not point to any real location'));
  assert.ok(page.includes("titleBlock: ['Planche 01', 'Plans et documents', 'Illustration']"));
});

test('guide relationship is introduced without a new route, hub or cards', () => {
  assert.ok(page.includes("docsIntro: 'Chaque type de plan a son guide"));
  assert.ok(page.includes("docsIntro: 'Each plan type has its own guide"));
  assert.ok(page.includes('<p>{t.docsIntro}</p>'));
  assert.doesNotMatch(code, /href="\/guides|'\/guides/);
});

test('the proposed meta descriptions are exactly the approved ones', () => {
  assert.ok(page.includes("description: 'Générez, structurez, révisez et exportez vos plans de mesures d’urgence, de sécurité incendie et de continuité des activités (PMU, PSI, PCA) avec CORO. PGC, PRA et PUE en Phase 2.'"));
  assert.ok(page.includes("description: 'Generate, structure, review and export your emergency response, fire safety and business continuity plans (ERP, FSP, BCP) with CORO. CMP, DRP and EEP in Phase 2.'"));
});
