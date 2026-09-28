import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { isLegacyFooterVisible, migratedV2Routes } from '../lib/site/v2-migration.ts';
import { getRoute } from '../lib/site/routes.ts';
import { privacyContent, legalIdentity } from '../app/privacy/content.ts';

// /privacy (MIG-06) — legal-copy reshell into V2Shell/LegalV2. Baseline: tests/fixtures/privacy-baseline.json.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const page = read('app/privacy/page.tsx');
const legalV2 = read('app/privacy/LegalV2.tsx');
const baseline = JSON.parse(read('tests/fixtures/privacy-baseline.json')) as {
  fr: { updated: string; sectionCount: number; sectionTitles: string[]; legalIdentity: Record<string, string> };
  en: { updated: string; sectionCount: number; sectionTitles: string[] };
  canonical: { fr: string; en: string };
};

test('baseline fixture exists and is the trusted pre-MIG-06 source', () => {
  assert.ok(existsSync(join(process.cwd(), 'tests/fixtures/privacy-baseline.json')));
  assert.equal(baseline.fr.sectionCount, 15);
  assert.equal(baseline.en.sectionCount, 15);
});

test('route implementation: V2Shell used, LegalV2 renderer used', () => {
  assert.match(page, /V2Shell/);
  assert.match(page, /LegalV2/);
});

test('FR and EN content are genuinely distinct, not a fallback', () => {
  assert.notEqual(privacyContent.fr.intro, privacyContent.en.intro);
  assert.notEqual(privacyContent.fr.title, privacyContent.en.title);
  assert.notEqual(privacyContent.fr.updated, privacyContent.en.updated);
});

test('effective/update dates match the baseline exactly', () => {
  assert.equal(privacyContent.fr.updated, baseline.fr.updated);
  assert.equal(privacyContent.en.updated, baseline.en.updated);
});

test('section titles match the baseline exactly, in order, for both languages', () => {
  assert.deepEqual(privacyContent.fr.sections.map((s) => s.title), baseline.fr.sectionTitles);
  assert.deepEqual(privacyContent.en.sections.map((s) => s.title), baseline.en.sectionTitles);
});

test('legal identity (name, NEQ, address, contact) matches the baseline', () => {
  assert.equal(legalIdentity.neq, baseline.fr.legalIdentity.neq);
  assert.equal(legalIdentity.email, baseline.fr.legalIdentity.email);
  assert.equal(legalIdentity.phone, baseline.fr.legalIdentity.phone);
  assert.equal(`${legalIdentity.addressLines[0]}, ${legalIdentity.addressLines[1]}, ${legalIdentity.addressLines[2]}`, baseline.fr.legalIdentity.address);
});

test('key material clauses (scope, security, applicable law) are present verbatim in both languages', () => {
  assert.match(privacyContent.fr.sections[0].paragraphs![0], /NEQ 2282543935/);
  assert.match(privacyContent.en.sections[0].paragraphs![0], /NEQ 2282543935/);
  assert.match(privacyContent.fr.sections[14].paragraphs![0], /Loi sur la protection des renseignements personnels/);
  assert.match(privacyContent.en.sections[14].paragraphs![0], /Personal Information Protection and Electronic Documents Act/);
});

test('canonical stays https://getcoro.io/privacy for both languages (no new slug, no query-string canonical)', () => {
  assert.equal(baseline.canonical.fr, 'https://getcoro.io/privacy');
  assert.equal(baseline.canonical.en, 'https://getcoro.io/privacy?lang=en');
});

test('no DemoForm, no commercial CTA, no product cards introduced', () => {
  assert.doesNotMatch(page, /DemoForm|Demander une démo|Book a demo|pricing CTA/i);
  assert.doesNotMatch(legalV2.replace(/\/\*[\s\S]*?\*\//g, ''), /DemoForm|Demander une démo|Book a demo|pricing CTA/i);
});

test('no Product/Offer/SoftwareApplication structured data on a legal page', () => {
  assert.doesNotMatch(page + legalV2, /application\/ld\+json|"@type":\s*"(Product|Offer|SoftwareApplication)"/);
});

test('registry: /privacy is registered V2', () => {
  assert.equal(migratedV2Routes.includes('/privacy'), true);
  assert.equal(isLegacyFooterVisible('/privacy'), false);
  const r = getRoute('privacy');
  assert.equal(r?.path, '/privacy');
  assert.equal(r?.publication, 'LEGACY-PRESERVE');
});
