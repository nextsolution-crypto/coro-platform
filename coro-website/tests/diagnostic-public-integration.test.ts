import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { footerGroups } from '../components/conversion/footer-content.ts';
import { visibleNavigation } from '../lib/site/navigation.ts';
import { buildStaticSitemapEntries } from '../lib/site/sitemap.ts';
import { staticSitemapRoutes } from '../lib/site/routes.ts';

const read = (path: string) => readFileSync(resolve(path), 'utf8');

test('DX-04 navigation adds one localized Diagnostic item inside Resources', () => {
  for (const locale of ['fr', 'en'] as const) {
    const resources = visibleNavigation(locale).find((group) => group.id === 'resources');
    const diagnostic = resources?.items.filter((item) => item.id === 'diagnostic') ?? [];
    assert.equal(diagnostic.length, 1);
    assert.equal(diagnostic[0].href, locale === 'fr' ? '/diagnostic' : '/diagnostic?lang=en');
    assert.equal(diagnostic[0].label[locale], locale === 'fr' ? 'Évaluer ma préparation' : 'Assess my preparedness');
  }
});

test('DX-04 footer adds the bilingual link without creating another group', () => {
  assert.equal(footerGroups.length, 4);
  const links = footerGroups.flatMap((group) => group.links).filter((link) => link.path === '/diagnostic');
  assert.equal(links.length, 1); assert.equal(links[0].label.fr, 'Diagnostic Express'); assert.equal(links[0].label.en, 'Express Diagnostic');
});

test('DX-04 homepage invitation is compact, bilingual and points only to the diagnostic route', () => {
  const component = read('app/home/components/Sections.tsx'); const content = read('app/home/content.ts');
  assert.match(component, /diagnosticInvite/); assert.match(component, /c\.resources\.diagnostic\.cta\.href/);
  assert.match(content, /Votre organisation est-elle réellement prête à faire face à une urgence/);
  assert.match(content, /Is your organization truly ready to face an emergency/);
  assert.match(content, /Gratuit · Sans inscription · Résultat immédiat/);
  assert.match(content, /Free · No registration · Immediate result/);
});

test('DX-04 metadata uses the approved copy, indexed robots and canonical helper', () => {
  const page = read('app/diagnostic/page.tsx');
  assert.match(page, /Diagnostic de préparation organisationnelle/);
  assert.match(page, /Organizational Preparedness Assessment/);
  assert.match(page, /Évaluez gratuitement votre préparation aux situations d'urgence en huit questions/);
  assert.match(page, /Assess your organization's emergency preparedness in eight questions/);
  assert.match(page, /path: '\/diagnostic'/); assert.match(page, /indexable: true/);
});

test('DX-04 sitemap emits FR canonical and EN alternate for the diagnostic', () => {
  const entries = buildStaticSitemapEntries(staticSitemapRoutes, new Date('2026-10-27'));
  const diagnostic = entries.find((entry) => entry.url === 'https://getcoro.io/diagnostic');
  assert.ok(diagnostic); assert.equal(diagnostic.priority, 0.8); assert.equal(diagnostic.changeFrequency, 'monthly');
  assert.equal(diagnostic.alternates?.languages?.['en-CA'], 'https://getcoro.io/diagnostic?lang=en');
});

test('DX-04 adds no response transport, analytics or enriched commercial form', () => {
  const source = read('app/diagnostic/DiagnosticExperience.tsx');
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|gtag|analytics|<form/);
  assert.doesNotMatch(source, /localStorage|document\.cookie|URLSearchParams/);
});

test('DX-04B integrates the two optimized visual assets with bilingual alternatives', () => {
  const source = read('app/diagnostic/DiagnosticExperience.tsx');
  const hero = statSync(resolve('public/images/Coro_Diagnostic/coro-diagnostic-hero.webp'));
  const conclusion = statSync(resolve('public/images/Coro_Diagnostic/coro-diagnostic-dimensions.webp'));

  assert.match(source, /import Image from 'next\/image'/);
  assert.match(source, /coro-diagnostic-hero\.webp/);
  assert.match(source, /coro-diagnostic-dimensions\.webp/);
  assert.match(source, /heroImageAlt/);
  assert.match(source, /conclusionImageAlt/);
  assert.match(source, /Votre diagnostic est une première étape/);
  assert.match(source, /Your diagnostic is a first step/);
  assert.ok(hero.size < 100_000);
  assert.ok(conclusion.size < 50_000);
});
