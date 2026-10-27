import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDiagnosticResult, diagnosticSummary } from '../lib/diagnostic/results.ts';
import type { CompleteDiagnosticResponses, DiagnosticAnswerId } from '../lib/diagnostic/types.ts';

const answers = (value: DiagnosticAnswerId): CompleteDiagnosticResponses => ({ D1: value, D2: value, D3: value, D4: value, D5: value, D6: value, D7: value, D8: value });

test('scenario A: 100% produces a definitive advanced result, three strengths and no invented correction', () => {
  const result = buildDiagnosticResult(answers('A'));
  assert.equal(result.evaluation.score, 100); assert.equal(result.evaluation.level, 'advanced');
  assert.equal(result.strengths.length, 3); assert.equal(result.improvementRecommendations.length, 0);
  assert.match(diagnosticSummary(result, 'fr'), /aucune priorité corrective/);
});

test('scenario B: 79% stays structured and its plan starts with the approved priority', () => {
  const result = buildDiagnosticResult({ D1: 'A', D2: 'A', D3: 'A', D4: 'A', D5: 'A', D6: 'A', D7: 'B', D8: 'B' });
  assert.equal(result.evaluation.score, 92);
  const exact79 = buildDiagnosticResult({ D1: 'A', D2: 'A', D3: 'A', D4: 'A', D5: 'A', D6: 'B', D7: 'B', D8: 'C' });
  assert.equal(exact79.evaluation.score, 79); assert.equal(exact79.evaluation.level, 'structured'); assert.equal(exact79.plan[0].dimensionId, 'D8');
});

test('scenario C: 0% produces reinforce, no strength and C priorities in business order', () => {
  const result = buildDiagnosticResult(answers('C'));
  assert.equal(result.evaluation.score, 0); assert.equal(result.evaluation.level, 'reinforce'); assert.equal(result.strengths.length, 0);
  assert.deepEqual(result.improvementRecommendations.map((item) => item.dimensionId), ['D5', 'D4', 'D2']);
});

test('scenario D: exactly 75% coverage permits a definitive result and separates unknown verification', () => {
  const result = buildDiagnosticResult({ D1: 'A', D2: 'A', D3: 'B', D4: 'B', D5: 'C', D6: 'C', D7: 'D', D8: 'E' });
  assert.equal(result.evaluation.coveragePercent, 75); assert.equal(result.evaluation.isDefinitive, true);
  assert.deepEqual(result.verificationRecommendations.map((item) => item.dimensionId), ['D7']);
});

test('scenario E: insufficient coverage is provisional and never exposes a level', () => {
  const result = buildDiagnosticResult({ D1: 'A', D2: 'A', D3: 'B', D4: 'C', D5: 'D', D6: 'D', D7: 'E', D8: 'E' });
  assert.equal(result.evaluation.coveragePercent, 50); assert.equal(result.evaluation.level, null); assert.equal(result.evaluation.isDefinitive, false);
  assert.match(diagnosticSummary(result, 'en'), /not yet sufficient/);
});

test('scenario F: all unknown stays scoreless and creates verification rather than correction priorities', () => {
  const result = buildDiagnosticResult(answers('D'));
  assert.equal(result.evaluation.score, null); assert.equal(result.improvementRecommendations.length, 0); assert.equal(result.verificationRecommendations.length, 8);
});

test('scenario G: all non-applicable stays scoreless, has no correction priority and reports critical applicability limits', () => {
  const result = buildDiagnosticResult(answers('E'));
  assert.equal(result.evaluation.score, null); assert.equal(result.improvementRecommendations.length, 0); assert.equal(result.verificationRecommendations.length, 0);
  assert.ok(result.evaluation.limitations.some((item) => item.code === 'CRITICAL_DIMENSION_NOT_APPLICABLE'));
});

test('scenario H: equal priorities and the 90-day plan are deterministic and personalized', () => {
  const input: CompleteDiagnosticResponses = { D1: 'B', D2: 'B', D3: 'B', D4: 'B', D5: 'B', D6: 'B', D7: 'B', D8: 'B' };
  const first = buildDiagnosticResult(input); const second = buildDiagnosticResult(input);
  assert.deepEqual(first, second); assert.deepEqual(first.plan.map((item) => item.dimensionId), ['D5', 'D4', 'D2']);
  assert.deepEqual(first.plan.map((item) => item.period), ['0-30', '30-60', '60-90']);
});

test('result modules use recommendation registry references and never invent destinations', () => {
  const result = buildDiagnosticResult({ D1: 'C', D2: 'C', D3: 'A', D4: 'D', D5: 'B', D6: 'A', D7: 'E', D8: 'A' });
  assert.ok(result.relevantModules.length > 0);
  for (const moduleItem of result.relevantModules) if (!moduleItem.publicPath) assert.notEqual(moduleItem.availability, 'available');
});
