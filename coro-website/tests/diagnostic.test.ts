import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { DIAGNOSTIC_QUESTION_COUNT, diagnosticQuestions } from '../lib/diagnostic/config.ts';
import { parseDiagnosticState } from '../lib/diagnostic/storage.ts';
import { visibleNavigation } from '../lib/site/navigation.ts';
import { getRoute, staticSitemapRoutes } from '../lib/site/routes.ts';
import { draftV2Routes, isLegacyFooterVisible } from '../lib/site/v2-migration.ts';

test('DX-01 exposes exactly eight stable bilingual dimensions and five distinct answers', () => {
  assert.equal(DIAGNOSTIC_QUESTION_COUNT, 8);
  assert.deepEqual(diagnosticQuestions.map((question) => question.id), ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']);
  for (const question of diagnosticQuestions) {
    assert.ok(question.dimension.fr && question.dimension.en && question.question.fr && question.question.en);
    assert.deepEqual(question.answers.map((answer) => answer.id), ['A', 'B', 'C', 'D', 'E']);
    for (const answer of question.answers) assert.ok(answer.label.fr && answer.label.en);
  }
});

test('DX-01 restores only valid tab-scoped state and fails closed on malformed input', () => {
  assert.deepEqual(parseDiagnosticState(JSON.stringify({ version: 1, step: 3, responses: { D1: 'A', D2: 'D', D9: 'A', D3: 'X' } })), { version: 1, step: 3, responses: { D1: 'A', D2: 'D' } });
  for (const invalid of [null, '', '{', JSON.stringify({ version: 2, step: 0, responses: {} }), JSON.stringify({ version: 1, step: 8, responses: {} }), JSON.stringify({ version: 1, step: 0 })]) assert.equal(parseDiagnosticState(invalid), null);
});

test('DX-04 registers the approved route for publication, navigation and sitemap without deploying it', () => {
  const route = getRoute('diagnostic');
  assert.deepEqual(route && { publication: route.publication, implemented: route.implemented, indexable: route.indexable, sitemap: route.sitemap }, { publication: 'PUBLISH-NOW', implemented: true, indexable: true, sitemap: true });
  assert.ok(existsSync(resolve('app/diagnostic/page.tsx')));
  assert.ok(staticSitemapRoutes.some((entry) => entry.id === 'diagnostic'));
  for (const locale of ['fr', 'en'] as const) assert.ok(visibleNavigation(locale).flatMap((group) => group.items).some((item) => item.id === 'diagnostic'));
  assert.deepEqual(draftV2Routes, ['/diagnostic']);
  assert.equal(isLegacyFooterVisible('/diagnostic'), false);
  const page = readFileSync(resolve('app/diagnostic/page.tsx'), 'utf8');
  assert.match(page, /indexable:\s*true/);
});

test('DX-01/DX-03 keep answers out of URLs, remove tab storage on completion/reset and make no network request', () => {
  const source = readFileSync(resolve('app/diagnostic/DiagnosticExperience.tsx'), 'utf8');
  assert.match(source, /sessionStorage\.setItem/);
  assert.ok((source.match(/sessionStorage\.removeItem/g) ?? []).length >= 2);
  assert.doesNotMatch(source, /localStorage|URLSearchParams|router\.(?:push|replace)|fetch\(/);
  assert.match(source, /buildDiagnosticResult/);
  assert.doesNotMatch(source, /XMLHttpRequest|navigator\.sendBeacon|WebSocket/);
});

test('DX-03 renders the approved result sections, provisional state and restart control in both languages', () => {
  const source = readFileSync(resolve('app/diagnostic/DiagnosticExperience.tsx'), 'utf8');
  for (const marker of ['resultHero', 'ResiliencePortrait', 'priorityGrid', 'planGrid', 'recommendationList', 'moduleGrid', 'resultFooter']) assert.match(source, new RegExp(marker));
  assert.match(source, /Résultat provisoire/); assert.match(source, /Provisional result/);
  assert.match(source, /Recommencer/); assert.match(source, /Start again/);
  assert.match(source, /View result in English/); assert.match(source, /Voir le résultat en français/);
  assert.match(source, /setResultLocale/); assert.match(source, /lang=\{resultLocale/);
  assert.match(source, /n'est pas l'Indice CORO officiel/); assert.match(source, /not the official CORO Index/);
  assert.match(source, /Votre résultat est temporaire/); assert.match(source, /Your result is temporary/);
});

test('DX-03 public module links come exclusively from the DX-02 registry', () => {
  const source = readFileSync(resolve('app/diagnostic/DiagnosticExperience.tsx'), 'utf8');
  assert.match(source, /moduleItem\.publicPath/);
  assert.doesNotMatch(source, /href=["']\/(?:coro-ops|coro-audit|coro-network)/);
});
