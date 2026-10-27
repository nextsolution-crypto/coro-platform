import { DIAGNOSTIC_ENGINE_VERSION, DIAGNOSTIC_MINIMUM_COVERAGE_PERCENT, DIAGNOSTIC_QUESTION_COUNT, DIAGNOSTIC_VERSION, diagnosticCriticalDimensions, diagnosticLevelThresholds, diagnosticPoints, diagnosticQuestions, diagnosticTieBreakOrder } from './config.ts';
import { diagnosticAnswerIds, type CompleteDiagnosticResponses, type DiagnosticAnswerId, type DiagnosticDimensionId, type DiagnosticEvaluation, type DiagnosticEvaluationInput, type DiagnosticLevelId } from './types.ts';

export class DiagnosticValidationError extends Error {
  readonly code: 'INVALID_INPUT' | 'INVALID_VERSION' | 'INVALID_DIMENSION' | 'INVALID_ANSWER';
  constructor(code: 'INVALID_INPUT' | 'INVALID_VERSION' | 'INVALID_DIMENSION' | 'INVALID_ANSWER') { super(code); this.code = code; this.name = 'DiagnosticValidationError'; }
}

const dimensionIds = diagnosticQuestions.map((question) => question.id);
const tieRank = new Map<DiagnosticDimensionId, number>(diagnosticTieBreakOrder.map((id, index) => [id, index]));
const byTieBreak = (a: DiagnosticDimensionId, b: DiagnosticDimensionId) => tieRank.get(a)! - tieRank.get(b)!;

export function validateDiagnosticInput(input: unknown): DiagnosticEvaluationInput {
  if (!input || typeof input !== 'object') throw new DiagnosticValidationError('INVALID_INPUT');
  const candidate = input as { version?: unknown; responses?: unknown };
  if (candidate.version !== 1) throw new DiagnosticValidationError('INVALID_VERSION');
  if (!candidate.responses || typeof candidate.responses !== 'object' || Array.isArray(candidate.responses)) throw new DiagnosticValidationError('INVALID_INPUT');
  const entries = Object.entries(candidate.responses);
  const responses = {} as CompleteDiagnosticResponses;
  for (const [dimension, answer] of entries) {
    if (!dimensionIds.includes(dimension as DiagnosticDimensionId)) throw new DiagnosticValidationError('INVALID_DIMENSION');
    if (!diagnosticAnswerIds.includes(answer as DiagnosticAnswerId)) throw new DiagnosticValidationError('INVALID_ANSWER');
    responses[dimension as DiagnosticDimensionId] = answer as DiagnosticAnswerId;
  }
  if (entries.length !== DIAGNOSTIC_QUESTION_COUNT) throw new DiagnosticValidationError('INVALID_INPUT');
  return { version: 1, responses };
}

function levelFor(score: number): DiagnosticLevelId {
  return diagnosticLevelThresholds.find(({ minimum, maximum }) => score >= minimum && score <= maximum)!.id;
}

export function evaluateDiagnostic(rawInput: unknown): DiagnosticEvaluation {
  const { responses } = validateDiagnosticInput(rawInput);
  const answered = dimensionIds.flatMap((id) => responses[id] ? [[id, responses[id]!] as const] : []);
  const evaluable = answered.filter((entry): entry is readonly [DiagnosticDimensionId, keyof typeof diagnosticPoints] => entry[1] in diagnosticPoints);
  const unknown = answered.filter(([, answer]) => answer === 'D').map(([id]) => id);
  const notApplicable = answered.filter(([, answer]) => answer === 'E').map(([id]) => id);
  const evaluableCount = evaluable.length;
  const coveragePercent = Math.round((evaluableCount / DIAGNOSTIC_QUESTION_COUNT) * 100);
  const score = evaluableCount === 0 ? null : Math.round((evaluable.reduce((sum, [, answer]) => sum + diagnosticPoints[answer], 0) / (evaluableCount * diagnosticPoints.A)) * 100);
  const isDefinitive = coveragePercent >= DIAGNOSTIC_MINIMUM_COVERAGE_PERCENT;
  const improvementPriorities = ([
    ...answered.filter(([, answer]) => answer === 'C').map(([id]) => id).sort(byTieBreak),
    ...answered.filter(([, answer]) => answer === 'B').map(([id]) => id).sort(byTieBreak),
  ]);
  const verificationPriorities = unknown.slice().sort(byTieBreak);
  const strengths = answered.filter(([, answer]) => answer === 'A').map(([id]) => id).sort(byTieBreak);
  const criticalNotApplicable = notApplicable.filter((id) => diagnosticCriticalDimensions.includes(id as typeof diagnosticCriticalDimensions[number]));
  const limitations: Array<DiagnosticEvaluation['limitations'][number]> = [];
  if (evaluableCount === 0) limitations.push({ code: 'NO_EVALUABLE_DIMENSION', dimensions: dimensionIds });
  if (!isDefinitive) limitations.push({ code: 'INSUFFICIENT_COVERAGE', dimensions: [...unknown, ...notApplicable].sort(byTieBreak) });
  if (unknown.length) limitations.push({ code: 'UNKNOWN_INFORMATION', dimensions: unknown.sort(byTieBreak) });
  if (notApplicable.length) limitations.push({ code: 'NON_APPLICABLE_DECLARED', dimensions: notApplicable.sort(byTieBreak) });
  if (criticalNotApplicable.length) limitations.push({ code: 'CRITICAL_DIMENSION_NOT_APPLICABLE', dimensions: criticalNotApplicable.sort(byTieBreak) });
  return {
    engineVersion: DIAGNOSTIC_ENGINE_VERSION, questionnaireVersion: DIAGNOSTIC_VERSION,
    score, coveragePercent, evaluableCount, unknownCount: unknown.length, notApplicableCount: notApplicable.length,
    isDefinitive, level: isDefinitive && score !== null ? levelFor(score) : null,
    improvementPriorities, verificationPriorities, strengths, limitations,
  };
}
