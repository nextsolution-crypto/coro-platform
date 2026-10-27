import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildDiagnosticCommercialSummary } from '../lib/diagnostic/commercial.ts';
import { buildDiagnosticResult } from '../lib/diagnostic/results.ts';
import type { CompleteDiagnosticResponses } from '../lib/diagnostic/types.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const responses = (answers: readonly string[]) => Object.fromEntries(answers.map((answer, index) => [`D${index + 1}`, answer])) as CompleteDiagnosticResponses;

test('DX-06 summary is deterministic, bounded to three priorities and excludes the eight responses', () => {
  const model = buildDiagnosticResult(responses(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C']));
  const first = buildDiagnosticCommercialSummary(model, 'fr');
  const second = buildDiagnosticCommercialSummary(model, 'fr');
  assert.deepEqual(first, second);
  assert.equal(first.diagnosticPriorities.split(' | ').length, 3);
  assert.deepEqual(Object.keys(first).sort(), ['diagnosticCoverage', 'diagnosticLevel', 'diagnosticPriorities', 'diagnosticScore', 'diagnosticVersion']);
  assert.doesNotMatch(JSON.stringify(first), /"D[1-8]"\s*:/);
});

test('DX-06 provisional and definitive summaries preserve the canonical result', () => {
  const definitive = buildDiagnosticResult(responses(['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C']));
  const provisional = buildDiagnosticResult(responses(['A', 'B', 'C', 'D', 'D', 'E', 'E', 'E']));
  assert.equal(buildDiagnosticCommercialSummary(definitive, 'en').diagnosticLevel, 'Structured preparation');
  assert.equal(buildDiagnosticCommercialSummary(definitive, 'en').diagnosticScore, '79 %');
  assert.match(buildDiagnosticCommercialSummary(provisional, 'fr').diagnosticLevel, /provisoire/);
  assert.equal(buildDiagnosticCommercialSummary(provisional, 'fr').diagnosticCoverage, '38 % (3/8)');
});

test('DX-06 reuses DemoForm and sends the summary only after explicit consent', () => {
  const experience = read('app/diagnostic/DiagnosticExperience.tsx');
  const form = read('app/DemoForm.tsx');
  assert.match(experience, /<DemoForm lang=\{resultLocale\} variant="diagnostic"/);
  assert.match(form, /variant === 'diagnostic' && includeDiagnosticSummary && diagnosticSummary/);
  assert.match(form, /https:\/\/formspree\.io\/f\/xnpadzyq/);
  assert.match(form, /coro_referral_code/);
  assert.match(form, /coro_referral_first_touch/);
  assert.match(form, /does not subscribe you to marketing communications/);
  assert.doesNotMatch(experience, /diagnosticScore=.*(?:href|URLSearchParams)|responses=.*(?:href|URLSearchParams)/);
});

test('DX-06 keeps result, PDF and recommendations available without opening the form', () => {
  const experience = read('app/diagnostic/DiagnosticExperience.tsx');
  assert.match(experience, /const \[showCommercialForm, setShowCommercialForm\] = useState\(false\)/);
  assert.match(experience, /showCommercialForm && <div id="diagnostic-commercial-form"/);
  assert.match(experience, /downloadPdf/);
  assert.match(experience, /result\.detailedRecommendations\.map/);
});

test('DX-06 is bilingual and adds no analytics, CRM or server persistence', () => {
  const files = `${read('app/diagnostic/DiagnosticExperience.tsx')}\n${read('app/DemoForm.tsx')}\n${read('lib/diagnostic/commercial.ts')}`;
  assert.match(files, /Demander une évaluation approfondie/);
  assert.match(files, /Request an in-depth assessment/);
  assert.doesNotMatch(files, /gtag|analytics|segment|hubspot|salesforce|localStorage|indexedDB|sendBeacon/i);
});
