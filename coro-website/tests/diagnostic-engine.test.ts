import assert from 'node:assert/strict';
import test from 'node:test';
import { DIAGNOSTIC_ENGINE_VERSION, DIAGNOSTIC_MINIMUM_COVERAGE_PERCENT, DIAGNOSTIC_VERSION, diagnosticLevelThresholds, diagnosticTieBreakOrder } from '../lib/diagnostic/config.ts';
import { DiagnosticValidationError, evaluateDiagnostic } from '../lib/diagnostic/engine.ts';
import type { CompleteDiagnosticResponses, DiagnosticAnswerId, DiagnosticDimensionId } from '../lib/diagnostic/types.ts';

const ids: DiagnosticDimensionId[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
const all = (answer: DiagnosticAnswerId): CompleteDiagnosticResponses => Object.fromEntries(ids.map((id) => [id, answer])) as CompleteDiagnosticResponses;
const evaluate = (responses: CompleteDiagnosticResponses) => evaluateDiagnostic({ version: 1, responses });

test('DX-02 configuration is explicit and versioned', () => {
  assert.equal(DIAGNOSTIC_VERSION, '1.0');
  assert.equal(DIAGNOSTIC_ENGINE_VERSION, '1.0');
  assert.equal(DIAGNOSTIC_MINIMUM_COVERAGE_PERCENT, 75);
  assert.deepEqual(diagnosticLevelThresholds, [
    { id: 'reinforce', minimum: 0, maximum: 34 }, { id: 'partial', minimum: 35, maximum: 59 },
    { id: 'structured', minimum: 60, maximum: 79 }, { id: 'advanced', minimum: 80, maximum: 100 },
  ]);
  assert.deepEqual(diagnosticTieBreakOrder, ['D5', 'D4', 'D2', 'D3', 'D7', 'D6', 'D8', 'D1']);
});

test('eight A answers produce 100%, advanced and eight strengths', () => {
  const result = evaluate(all('A'));
  assert.equal(result.score, 100); assert.equal(result.coveragePercent, 100); assert.equal(result.level, 'advanced'); assert.equal(result.isDefinitive, true);
  assert.deepEqual(result.strengths, diagnosticTieBreakOrder); assert.deepEqual(result.improvementPriorities, []); assert.deepEqual(result.verificationPriorities, []);
});

test('eight B answers produce rounded 67%, structured and partial improvements—not missing capabilities', () => {
  const result = evaluate(all('B'));
  assert.equal(result.score, 67); assert.equal(result.level, 'structured'); assert.deepEqual(result.improvementPriorities, diagnosticTieBreakOrder);
  assert.deepEqual(result.strengths, []); assert.deepEqual(result.verificationPriorities, []);
});

test('eight C answers produce 0%, reinforce and deterministic correction priorities', () => {
  const result = evaluate(all('C'));
  assert.equal(result.score, 0); assert.equal(result.level, 'reinforce'); assert.deepEqual(result.improvementPriorities, diagnosticTieBreakOrder);
});

test('19 points out of 24 produce 79% without a special case', () => {
  const result = evaluate({ D1: 'A', D2: 'A', D3: 'A', D4: 'A', D5: 'A', D6: 'B', D7: 'B', D8: 'C' });
  assert.equal(result.score, 79); assert.equal(result.level, 'structured'); assert.equal(result.coveragePercent, 100);
});

test('coverage at exactly 75% permits a level while unknowns remain separate', () => {
  const result = evaluate({ D1: 'A', D2: 'B', D3: 'C', D4: 'A', D5: 'B', D6: 'C', D7: 'D', D8: 'D' });
  assert.equal(result.evaluableCount, 6); assert.equal(result.coveragePercent, 75); assert.equal(result.isDefinitive, true); assert.notEqual(result.level, null);
  assert.deepEqual(result.verificationPriorities, ['D7', 'D8']);
  assert.ok(result.limitations.some((item) => item.code === 'UNKNOWN_INFORMATION'));
});

test('coverage below 75% yields a provisional result without a definitive level', () => {
  const result = evaluate({ D1: 'A', D2: 'A', D3: 'B', D4: 'C', D5: 'B', D6: 'D', D7: 'E', D8: 'D' });
  assert.equal(result.evaluableCount, 5); assert.equal(result.coveragePercent, 63); assert.equal(result.isDefinitive, false); assert.equal(result.level, null); assert.notEqual(result.score, null);
  assert.ok(result.limitations.some((item) => item.code === 'INSUFFICIENT_COVERAGE'));
});

test('all unknown answers yield no denominator, no score and verification—not improvement—priorities', () => {
  const result = evaluate(all('D'));
  assert.equal(result.score, null); assert.equal(result.coveragePercent, 0); assert.equal(result.level, null); assert.deepEqual(result.improvementPriorities, []);
  assert.deepEqual(result.verificationPriorities, diagnosticTieBreakOrder);
  assert.ok(result.limitations.some((item) => item.code === 'NO_EVALUABLE_DIMENSION'));
});

test('all non-applicable answers yield no denominator and explicit applicability limitations', () => {
  const result = evaluate(all('E'));
  assert.equal(result.score, null); assert.equal(result.notApplicableCount, 8); assert.deepEqual(result.improvementPriorities, []); assert.deepEqual(result.verificationPriorities, []);
  assert.deepEqual(result.limitations.find((item) => item.code === 'CRITICAL_DIMENSION_NOT_APPLICABLE')?.dimensions, ['D5', 'D4', 'D2']);
});

test('C priorities always precede B priorities and ties follow the approved business order', () => {
  const result = evaluate({ D1: 'C', D8: 'C', D5: 'C', D4: 'B', D2: 'B', D3: 'A', D6: 'D', D7: 'E' });
  assert.deepEqual(result.improvementPriorities, ['D5', 'D8', 'D1', 'D4', 'D2']);
  assert.deepEqual(result.verificationPriorities, ['D6']);
  assert.deepEqual(result.strengths, ['D3']);
});

test('invalid input, versions, dimensions and answer values fail closed', () => {
  const cases: Array<[unknown, DiagnosticValidationError['code']]> = [
    [null, 'INVALID_INPUT'], [{ version: 1 }, 'INVALID_INPUT'], [{ version: 1, responses: {} }, 'INVALID_INPUT'], [{ version: 2, responses: {} }, 'INVALID_VERSION'],
    [{ version: 1, responses: { D9: 'A' } }, 'INVALID_DIMENSION'], [{ version: 1, responses: { D1: 'X' } }, 'INVALID_ANSWER'],
  ];
  for (const [input, code] of cases) assert.throws(() => evaluateDiagnostic(input), (error: unknown) => error instanceof DiagnosticValidationError && error.code === code);
});

test('evaluation is deterministic and does not mutate the supplied responses', () => {
  const responses: CompleteDiagnosticResponses = { D1: 'A', D2: 'B', D3: 'C', D4: 'D', D5: 'E', D6: 'A', D7: 'B', D8: 'C' };
  const before = structuredClone(responses);
  const first = evaluate(responses); const second = evaluate(responses);
  assert.deepEqual(first, second); assert.deepEqual(responses, before);
});
