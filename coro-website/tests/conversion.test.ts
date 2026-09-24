import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { conversionCopy } from '../app/design-lab/conversion-data.ts';
import { access, business, footerGroups } from '../components/conversion/footer-content.ts';
import { publicRoutes } from '../lib/site/routes.ts';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const files = readdirSync(join(root, 'components/conversion')).map((name) => `components/conversion/${name}`);
const tsx = files.filter((file) => file.endsWith('.tsx'));
const css = stripComments(read('components/conversion/conversion.module.css'));
const studies = read('app/design-lab/ConversionStudies.tsx');
const leadForm = read('components/conversion/LeadForm.tsx');
const leadFormCode = stripComments(leadForm);
const demoCode = stripComments(read('app/design-lab/LeadFormDemo.tsx'));
const keys = (v: unknown, p = ''): string[] => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.entries(v).flatMap(([k, c]) => keys(c, `${p}${k}.`)) : [p];

test('Zone 07 exists with five studies, a full page ending and isolated views', () => {
  const page = read('app/design-lab/page.tsx');
  assert.match(page, /<ConversionZone\b/); assert.ok(page.includes('#conversion')); assert.match(page, /conversionViewKeys/);
  for (const id of ['conversion-a', 'conversion-b', 'conversion-c', 'conversion-d', 'conversion-e', 'conversion-end']) assert.ok(studies.includes(`id="${id}"`), id);
  assert.match(studies, /<TrustStrip[\s\S]*<CTASection[\s\S]*<SiteFooterV2/, 'the ending runs proof → CTA → footer');
  assert.match(studies, /<SectionStatement/);
});

test('the intent principles exist in both languages and the two CTA intensities differ', () => {
  assert.ok(conversionCopy.fr.zone.principles.includes('La conversion est la prochaine étape, pas une interruption.'));
  assert.ok(conversionCopy.fr.zone.principles.includes('La confiance se prouve.'));
  assert.ok(conversionCopy.en.zone.principles.includes('Conversion is the next step, not an interruption.'));
  assert.ok(conversionCopy.en.zone.principles.includes('Trust is demonstrated.'));
  assert.match(css, /\.cta\[data-tone="dark"\] \.ctaStatement/);
  assert.match(css, /\.cta:not\(\[data-tone="dark"\]\) \.ctaInner \{[^}]*grid-template-columns/);
  assert.match(css, /\.cta\[data-tone="dark"\] \.ctaInner \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
});

test('demo CTA copy is the approved Lab copy and the primary action stays CORO red', () => {
  assert.equal(conversionCopy.fr.cta.statement, 'Voir CORO dans votre environnement.');
  assert.equal(conversionCopy.fr.cta.support, 'Une démonstration structurée autour de vos bâtiments, de vos plans et de vos opérations.');
  assert.equal(conversionCopy.fr.cta.primary, 'Demander une démonstration');
  assert.equal(conversionCopy.en.cta.statement, 'See CORO in your environment.');
  assert.equal(conversionCopy.en.cta.primary, 'Request a demo');
  const cta = read('components/conversion/CTASection.tsx');
  assert.match(cta, /<Button href=\{primary\.href\} surface=/, 'the primary action uses the default (primary) shared Button');
  assert.doesNotMatch(cta, /variant="(secondary|ghost)"[^>]*primary/);
  assert.match(read('components/ui/primitives.module.css'), /\.primary\{background:var\(--coro-red-600\)/);
  assert.match(read('app/design-tokens.css'), /--coro-v1-red-600: #e51b2a/);
  const route = publicRoutes.find((r) => r.path === '/contact');
  assert.ok(route?.implemented, 'the demo CTA points at an implemented route');
});

test('a CTA is a composition, not a giant rounded card, gradient or banner', () => {
  const block = css.match(/\.cta \{[^}]*\}/)?.[0] ?? '';
  assert.doesNotMatch(block, /border-radius|gradient|box-shadow/);
  assert.doesNotMatch(css, /position:\s*(fixed|sticky)/, 'no floating conversion banner');
  assert.doesNotMatch(read('components/conversion/CTASection.tsx'), /countdown|urgent|maintenant|book now/i);
});

test('the lab form cannot make a network request, read cookies or store anything', () => {
  for (const source of [leadFormCode, demoCode]) {
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|formspree|document\.cookie|localStorage|sessionStorage|indexedDB|navigator\./i);
  }
  assert.doesNotMatch(leadFormCode, /<form[^>]*\b(action|method)=/, 'no native submission target');
  assert.match(leadFormCode, /event\.preventDefault\(\)/);
  assert.match(leadFormCode, /noValidate/);
  assert.doesNotMatch(demoCode, /setInterval/);
});

test('the form has real labels, autocomplete, required semantics and accessible errors', () => {
  const labels = leadFormCode.match(/<label htmlFor=/g) ?? [];
  assert.ok(labels.length >= 4 && (leadFormCode.match(/\{field\('/g) ?? []).length === 4, 'every field has a real associated label');
  for (const token of ['given-name', 'family-name', 'email', 'organization', 'tel']) assert.match(leadFormCode, new RegExp(`autoComplete[:=]\\s*\\{?['"]${token}['"]`), token);
  assert.match(leadFormCode, /aria-invalid=/); assert.match(leadFormCode, /aria-describedby=/); assert.match(leadFormCode, /aria-required=/);
  assert.match(leadFormCode, /role="alert"/); assert.match(leadFormCode, /role="status"/); assert.match(leadFormCode, /aria-busy=/);
  assert.match(leadFormCode, /<fieldset/); assert.match(leadFormCode, /<legend>/);
  assert.doesNotMatch(leadFormCode, /placeholder=/, 'a placeholder is never a label');
  assert.match(css, /\.field :is\(input, select, textarea\) \{[^}]*min-block-size: 2\.75rem[^}]*radius-control/);
  assert.match(css, /\.field :is\(input, select, textarea\):focus-visible \{[^}]*outline: 3px/);
  assert.match(css, /\.field\[data-invalid="true"\][^{]*\{[^}]*border-width: 2px/);
  assert.match(css, /\.fieldError > span\[aria-hidden\]/, 'an error is a glyph and a sentence, not only a colour');
  for (const locale of ['fr', 'en'] as const) assert.match(leadForm, new RegExp(locale === 'fr' ? 'Envoi en cours' : 'Sending'));
});

test('the six states exist and success or error never rely on colour alone', () => {
  for (const state of ['default', 'error', 'submitting', 'success', 'failure']) assert.ok(leadFormCode.includes(`'${state}'`), state);
  assert.deepEqual(conversionCopy.fr.form.list.map(([key]) => key), ['default', 'focus', 'error', 'submitting', 'success', 'failure']);
  assert.deepEqual(conversionCopy.en.form.list.map(([key]) => key), ['default', 'focus', 'error', 'submitting', 'success', 'failure']);
  assert.match(leadFormCode, /disabled=\{busy\}/);
});

test('referral is a demo-only context contract; production attribution stays untouched', () => {
  assert.equal(conversionCopy.fr.form.referral, 'CR-DEMO01');
  assert.match(leadFormCode, /data-referral-context/);
  assert.doesNotMatch(leadFormCode + demoCode, /coro_referral/);
  const demoForm = read('app/DemoForm.tsx'); const home = read('app/HomePageClient.tsx');
  assert.match(demoForm, /getCookie\('coro_referral_code'\)/); assert.match(demoForm, /getCookie\('coro_referral_first_touch'\)/);
  assert.match(demoForm, /https:\/\/formspree\.io\/f\/xnpadzyq/);
  assert.match(home, /const REFERRAL_COOKIE_CODE = 'coro_referral_code'/); assert.match(home, /const REFERRAL_COOKIE_FIRST_TOUCH = 'coro_referral_first_touch'/);
  for (const locale of ['fr', 'en'] as const) assert.match(conversionCopy[locale].form.contract, /coro_referral_code[\s\S]*coro_referral_first_touch/);
});

test('trust is evidence: no logos, certifications, testimonials or figures; unverified wording is marked for review', () => {
  const trust = read('components/conversion/TrustStrip.tsx');
  assert.doesNotMatch(trust, /<img|next\/image|<svg/);
  for (const locale of ['fr', 'en'] as const) {
    const items = conversionCopy[locale].trust.items;
    assert.equal(items.length, 4);
    for (const item of items) assert.ok(('source' in item) !== ('review' in item), `${item.code}: sourced XOR marked for review`);
    assert.ok(items.some((item) => 'review' in item), 'at least one claim awaits validation');
    assert.doesNotMatch(JSON.stringify([conversionCopy[locale].trust, conversionCopy[locale].cta]), /ISO ?\d|SOC ?2|certifi|award|prix |témoignage|testimonial|% |\d+\s?%|uptime|ROI|leader|clients? nous|trusted by/i);
    for (const item of items) if ('source' in item) assert.ok(publicRoutes.some((r) => r.path === item.source.href && r.implemented), `${item.source.href} is an implemented route`);
  }
  assert.match(trust, /trustReview/);
});

test('the footer preserves the production business information and known destinations only', () => {
  const legacy = read('app/components/Footer.tsx');
  assert.ok(legacy.includes(business.neq)); assert.ok(legacy.includes('2879 Boul. Pierre-Bernard')); assert.ok(legacy.includes('H1L 4R2'));
  assert.ok(legacy.includes(business.email)); assert.ok(legacy.includes('+1 (514) 791-7871')); assert.ok(legacy.includes('tel:+15147917871'));
  assert.equal(access.platform, 'https://app.getcoro.io/login'); assert.equal(access.client, 'https://client.getcoro.io/login');
  assert.ok(legacy.includes(access.platform) && legacy.includes(access.client));
  assert.ok(read('components/site/SiteFooter.tsx').includes(access.platform) && read('components/site/SiteFooter.tsx').includes(access.client));
  for (const group of footerGroups) for (const link of group.links) {
    const route = publicRoutes.find((r) => r.path === link.path);
    assert.ok(route?.implemented, `${link.path} is implemented`);
    assert.equal(link.fr, route.fr, `${link.path} FR availability`); assert.equal(link.en, route.en, `${link.path} EN availability`);
  }
  const footer = read('components/conversion/SiteFooterV2.tsx');
  assert.doesNotMatch(footer, /<input|newsletter|twitter|linkedin|facebook|instagram|youtube/i);
  assert.doesNotMatch(footer + read('components/conversion/footer-content.ts'), /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}]/u, 'no emoji');
  assert.match(footer, /group\.id !== 'legal'/); assert.match(footer, /link\[locale\]/);
  assert.match(footer, /footerAccess/); assert.match(footer, /srOnly/);
});

test('components stay independent from production files and add no dependency, asset or tracking', () => {
  for (const file of [...tsx, 'components/conversion/footer-content.ts', 'app/design-lab/ConversionStudies.tsx', 'app/design-lab/LeadFormDemo.tsx', 'app/design-lab/conversion-data.ts']) {
    for (const imp of read(file).match(/from '[^']+'/g) ?? []) assert.doesNotMatch(imp, /HomePageClient|DemoForm|CookieBanner|@\/app\/|components\/site\/|components\/(hero|spatial|operational|flow)/, `${file} ${imp}`);
  }
  assert.deepEqual(Object.keys(JSON.parse(read('package.json')).dependencies).sort(), ['lucide-react', 'next', 'react', 'react-dom']);
  for (const file of [...tsx, 'app/design-lab/ConversionStudies.tsx']) assert.doesNotMatch(read(file), /next\/image|\/website-v2\/|gtag|analytics|pixel|recaptcha|hcaptcha/i, file);
  assert.match(read('app/design-lab/page.tsx'), /robots: \{ index: false, follow: false/);
  assert.ok(existsSync(join(root, 'app/components/CookieBanner.tsx')));
});

test('motion is minimal: a state settle only, off under reduced motion, nothing pulses or counts down', () => {
  assert.doesNotMatch(css, /infinite|radial-gradient|conic-gradient|blur\(|backdrop-filter|box-shadow|drop-shadow|text-shadow/);
  assert.doesNotMatch(css, /@keyframes\s+(pulse|blink|flash|glow|shake|spin|confetti)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('copy is bilingual with identical structure', () => {
  assert.deepEqual(keys(conversionCopy.fr).sort(), keys(conversionCopy.en).sort());
});

// LAB-07B: footer information hierarchy. Business/contact and legal/utility are separate groups; nothing new is added.
import { footerCopy } from '../components/conversion/footer-content.ts';
const footerSource = read('components/conversion/SiteFooterV2.tsx');
const footerData = read('components/conversion/footer-content.ts');

test('the access heading is a single word, with external-site context kept for assistive technology', () => {
  assert.equal(footerCopy.fr.access, 'Accès'); assert.equal(footerCopy.en.access, 'Access');
  assert.doesNotMatch(footerData, /accessNote/);
  assert.match(footerSource, /<p className=\{styles\.footerHeading\}>\{t\.access\}<\/p>/);
  assert.match(footerSource, /<span className=\{styles\.srOnly\}> \{t\.external\}<\/span>/);
  assert.equal(footerCopy.fr.external, '(site externe)'); assert.equal(footerCopy.en.external, '(external site)');
  assert.equal(access.platform, 'https://app.getcoro.io/login'); assert.equal(access.client, 'https://client.getcoro.io/login');
});

test('the hosting phrase leaves the footer brand block; the verified proof stays in the trust strip', () => {
  assert.doesNotMatch(footerSource + footerData, /bhosting:|Hébergé au Canada|Hosted in Canada|footerHosting|t.hosting/);
  assert.doesNotMatch(css, /footerHosting/);
  const brand = footerSource.slice(footerSource.indexOf('footerBrand'), footerSource.indexOf('<nav'));
  assert.match(brand, /footerTagline/); assert.doesNotMatch(brand, /<p[^>]*Hosting/i);
  assert.equal(footerCopy.fr.tagline, 'Conformité opérationnelle et résilience organisationnelle.');
  assert.equal(footerCopy.en.tagline, 'Operational compliance and organizational resilience.');
  for (const locale of ['fr', 'en'] as const) assert.ok(conversionCopy[locale].trust.items.some((item) => item.code === 'CANADA' && 'source' in item), 'hosting proof remains');
});

test('business/contact and legal/utility are structurally separate groups, in that order', () => {
  const base = footerSource.slice(footerSource.indexOf('footerBase'));
  const contact = base.indexOf('footerContact'); const legal = base.indexOf('footerLegalGroup');
  assert.ok(contact > 0 && legal > contact, 'contact group first, then legal group');
  const contactBlock = base.slice(contact, legal); const legalBlock = base.slice(legal);
  assert.match(contactBlock, /business\.address/); assert.match(contactBlock, /business\.email/); assert.match(contactBlock, /business\.phone/);
  assert.doesNotMatch(contactBlock, /business\.neq|footerLegal|switchLocaleHref|rights/);
  assert.match(legalBlock, /business\.year/); assert.match(legalBlock, /business\.neq/); assert.match(legalBlock, /switchLocaleHref/);
  assert.doesNotMatch(legalBlock, /business\.(address|email|phone)/);
  assert.match(base, /<address className=\{styles\.footerContact\}/);
  assert.match(css, /\.footerBase \{[^}]*border-block-start/); assert.doesNotMatch(css, /\.footerContact[^{]*\{[^}]*(border-radius|box-shadow|background)/, 'groups are not cards');
});

test('business and legal values are unchanged and nothing new is added to the footer', () => {
  assert.equal(business.name, 'CORO'); assert.equal(business.year, 2026); assert.equal(business.neq, '2282543935');
  assert.deepEqual([...business.address], ['2879 Boul. Pierre-Bernard', 'Montréal (QC), H1L 4R2', 'Canada']);
  assert.equal(business.email, 'info@getcoro.io'); assert.equal(business.phone, '+1 (514) 791-7871');
  assert.match(footerSource, /© \{business\.year\} \{business\.name\}\./);
  assert.doesNotMatch(footerSource + footerData, /Solutions Inc|Montaroux|RÉSILIENCE · CONFORMITÉ|newsletter|linkedin|certif/i);
});

test('CTA, trust strip, lead form and their CSS were not touched by the footer pass', () => {
  assert.match(read('components/conversion/CTASection.tsx'), /export function DemoCTA/);
  assert.match(read('components/conversion/TrustStrip.tsx'), /trustReview/);
  assert.match(read('components/conversion/LeadForm.tsx'), /data-referral-context/);
  for (const selector of ['.ctaStatement', '.trustItem', '.fieldError', '.referral', '.formBanner']) assert.ok(css.includes(selector), selector);
});
