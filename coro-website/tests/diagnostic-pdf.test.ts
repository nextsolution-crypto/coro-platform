import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { generateDiagnosticPdf } from '../lib/diagnostic/pdf.ts';
import { buildDiagnosticResult } from '../lib/diagnostic/results.ts';
import type { CompleteDiagnosticResponses, DiagnosticAnswerId } from '../lib/diagnostic/types.ts';

const responses = (answers: readonly DiagnosticAnswerId[]): CompleteDiagnosticResponses => Object.fromEntries(answers.map((answer, index) => [`D${index + 1}`, answer])) as CompleteDiagnosticResponses;
const repeated = (answer: DiagnosticAnswerId) => responses(Array(8).fill(answer));
const fixedDate = new Date('2026-10-27T12:00:00-04:00');

function pdfFor(input: CompleteDiagnosticResponses, locale: 'fr' | 'en' = 'fr') {
  const model = buildDiagnosticResult(input);
  const bytes = generateDiagnosticPdf({ model, responses: input, locale, generatedAt: fixedDate });
  assert.equal(new TextDecoder('latin1').decode(bytes.slice(0, 8)), '%PDF-1.3');
  assert.ok(bytes.length > 5_000);
  return { model, bytes };
}

test('DX-05 generates valid local PDFs for 100%, 79% and 0% canonical results', () => {
  assert.equal(pdfFor(repeated('A')).model.evaluation.score, 100);
  assert.equal(pdfFor(responses(['A', 'A', 'A', 'A', 'A', 'B', 'B', 'C'])).model.evaluation.score, 79);
  assert.equal(pdfFor(repeated('C'), 'en').model.evaluation.score, 0);
});

test('DX-05 generates PDFs for insufficient, all-unknown and all-not-applicable coverage', () => {
  assert.equal(pdfFor(responses(['A', 'B', 'C', 'D', 'D', 'E', 'E', 'E'])).model.evaluation.isDefinitive, false);
  assert.equal(pdfFor(repeated('D')).model.evaluation.score, null);
  assert.equal(pdfFor(repeated('E'), 'en').model.evaluation.score, null);
});

test('DX-05 PDF reuses the canonical result model and DX-03B geometry', () => {
  const source = readFileSync(resolve('lib/diagnostic/pdf.ts'), 'utf8');
  assert.match(source, /model: DiagnosticResultModel/);
  assert.match(source, /buildResiliencePortraitGeometry\(input\.responses\)/);
  assert.doesNotMatch(source, /evaluateDiagnostic|buildDiagnosticResult|diagnosticPoints/);
});

test('DX-05 sharing exposes only the public questionnaire URL', () => {
  const source = readFileSync(resolve('app/diagnostic/DiagnosticExperience.tsx'), 'utf8');
  assert.match(source, /navigator\.share/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /window\.location\.origin}\/diagnostic/);
  const sharedUrl = source.match(/const url = `([^`]+)`;/)?.[1] ?? '';
  assert.match(sharedUrl, /window\.location\.origin/);
  assert.doesNotMatch(sharedUrl, /score=|responses=|priorities=|JSON\.stringify/);
});

test('DX-05 download is local, lazy-loaded and revokes its object URL', () => {
  const source = readFileSync(resolve('app/diagnostic/DiagnosticExperience.tsx'), 'utf8');
  assert.match(source, /import\('@\/lib\/diagnostic\/pdf'\)/);
  assert.match(source, /new Blob/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.doesNotMatch(source, /api\/.*pdf|external.*pdf/i);
});
