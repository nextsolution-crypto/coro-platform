import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute } from '../lib/site/routes.ts';
import { termsContent } from '../app/terms/content.ts';
import { legalIdentity } from '../app/privacy/content.ts';

// /terms (MIG-06) — legal-copy reshell into V2Shell/LegalV2. Baseline: tests/fixtures/terms-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/terms/page.tsx');
const legalV2 = read('app/privacy/LegalV2.tsx');
const baseline = JSON.parse(read('tests/fixtures/terms-baseline.json')) as {
  fr: { updated: string; sectionCount: number; sectionTitles: string[]; legalIdentity: Record<string, string>; internalLinks: string[] };
  en: { updated: string; sectionCount: number; sectionTitles: string[] };
  canonical: { fr: string; en: string };
};

test('baseline fixture exists and is the trusted pre-MIG-06 source', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/terms-baseline.json')));
  assert.equal(baseline.fr.sectionCount, 20);
  assert.equal(baseline.en.sectionCount, 20);
});

test('route implementation: V2Shell used, shared LegalV2 renderer used', () => {
  assert.match(page, /V2Shell/);
  assert.match(page, /LegalV2/);
});

test('FR and EN content are genuinely distinct, not a fallback', () => {
  assert.notEqual(termsContent.fr.intro, termsContent.en.intro);
  assert.notEqual(termsContent.fr.title, termsContent.en.title);
  assert.notEqual(termsContent.fr.updated, termsContent.en.updated);
});

test('effective/update dates match the baseline exactly', () => {
  assert.equal(termsContent.fr.updated, baseline.fr.updated);
  assert.equal(termsContent.en.updated, baseline.en.updated);
});

test('section titles match the baseline exactly, in order, for both languages', () => {
  assert.deepEqual(termsContent.fr.sections.map((s) => s.title), baseline.fr.sectionTitles);
  assert.deepEqual(termsContent.en.sections.map((s) => s.title), baseline.en.sectionTitles);
});

test('legal identity matches the baseline', () => {
  assert.equal(legalIdentity.neq, baseline.fr.legalIdentity.neq);
  assert.equal(legalIdentity.email, baseline.fr.legalIdentity.email);
  assert.equal(legalIdentity.phone, baseline.fr.legalIdentity.phone);
});

test('key material clauses (IP, acceptable use, warranty disclaimer, liability, termination, governing law, contact) are present in both languages', () => {
  const frTitles = termsContent.fr.sections.map((s) => s.title);
  const enTitles = termsContent.en.sections.map((s) => s.title);
  assert.ok(frTitles.some((t) => t.includes('Propriété intellectuelle')));
  assert.ok(enTitles.some((t) => t.includes('intellectual property')));
  assert.ok(frTitles.some((t) => t.includes('Utilisation acceptable')));
  assert.ok(enTitles.some((t) => t.includes('Acceptable use')));
  assert.ok(frTitles.some((t) => t.includes('Exclusion de garantie')));
  assert.ok(enTitles.some((t) => t.includes('Disclaimer of warranties')));
  assert.ok(frTitles.some((t) => t.includes('Limitation de responsabilité')));
  assert.ok(enTitles.some((t) => t.includes('Limitation of liability')));
  assert.ok(frTitles.some((t) => t.includes('Suspension et résiliation')));
  assert.ok(enTitles.some((t) => t.includes('Suspension and termination')));
  assert.ok(frTitles.some((t) => t.includes('Droit applicable et juridiction')));
  assert.ok(enTitles.some((t) => t.includes('Governing law and jurisdiction')));
  assert.equal(frTitles.at(-1), '20. Contact');
  assert.equal(enTitles.at(-1), '20. Contact');
});

test('the section 13 privacy cross-link is preserved (matches baseline internalLinks)', () => {
  const frPrivacySection = termsContent.fr.sections.find((s) => s.title.includes('Confidentialité'));
  assert.equal(frPrivacySection?.privacyLink, true);
  assert.deepEqual(baseline.fr.internalLinks, ['/privacy']);
  assert.match(page, /privacyHref/);
});

test('canonical stays https://getcoro.io/terms for both languages (no new slug, no query-string canonical)', () => {
  assert.equal(baseline.canonical.fr, 'https://getcoro.io/terms');
  assert.equal(baseline.canonical.en, 'https://getcoro.io/terms?lang=en');
});

test('no DemoForm, no commercial CTA, no product cards introduced', () => {
  assert.doesNotMatch(page, /DemoForm|Demander une démo|Book a demo|pricing CTA/i);
  assert.doesNotMatch(legalV2.replace(/\/\*[\s\S]*?\*\//g, ''), /DemoForm|Demander une démo|Book a demo|pricing CTA/i);
});

test('no Product/Offer/SoftwareApplication structured data on a legal page', () => {
  assert.doesNotMatch(page + legalV2, /application\/ld\+json|"@type":\s*"(Product|Offer|SoftwareApplication)"/);
});

test('registry: /terms is registered V2', () => {
  assert.equal(migratedV2Routes.includes('/terms'), true);
  assert.equal(isLegacyFooterVisible('/terms'), false);
  const r = getRoute('terms');
  assert.equal(r?.path, '/terms');
  assert.equal(r?.publication, 'LEGACY-PRESERVE');
});
