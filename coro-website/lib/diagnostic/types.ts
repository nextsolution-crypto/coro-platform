import type { Locale } from '@/lib/site/locale';

export const diagnosticAnswerIds = ['A', 'B', 'C', 'D', 'E'] as const;
export type DiagnosticAnswerId = (typeof diagnosticAnswerIds)[number];
export type DiagnosticDimensionId = `D${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export type LocalizedText = Record<Locale, string>;
export type DiagnosticAnswer = { id: DiagnosticAnswerId; label: LocalizedText };
export type DiagnosticQuestion = {
  id: DiagnosticDimensionId;
  dimension: LocalizedText;
  question: LocalizedText;
  answers: readonly DiagnosticAnswer[];
};
export type DiagnosticResponses = Partial<Record<DiagnosticDimensionId, DiagnosticAnswerId>>;
export type CompleteDiagnosticResponses = Record<DiagnosticDimensionId, DiagnosticAnswerId>;
export type DiagnosticStoredState = { version: 1; step: number; responses: DiagnosticResponses };

export type DiagnosticLevelId = 'reinforce' | 'partial' | 'structured' | 'advanced';
export type DiagnosticLimitationCode = 'INSUFFICIENT_COVERAGE' | 'NO_EVALUABLE_DIMENSION' | 'UNKNOWN_INFORMATION' | 'NON_APPLICABLE_DECLARED' | 'CRITICAL_DIMENSION_NOT_APPLICABLE';
export type DiagnosticEvaluationInput = { version: 1; responses: CompleteDiagnosticResponses };
export type DiagnosticEvaluation = {
  engineVersion: string;
  questionnaireVersion: string;
  score: number | null;
  coveragePercent: number;
  evaluableCount: number;
  unknownCount: number;
  notApplicableCount: number;
  isDefinitive: boolean;
  level: DiagnosticLevelId | null;
  improvementPriorities: readonly DiagnosticDimensionId[];
  verificationPriorities: readonly DiagnosticDimensionId[];
  strengths: readonly DiagnosticDimensionId[];
  limitations: readonly { code: DiagnosticLimitationCode; dimensions: readonly DiagnosticDimensionId[] }[];
};

export type ModuleAvailability = 'available' | 'conditional' | 'development' | 'planned';
export type DiagnosticModuleId = 'buildings' | 'documents' | 'knowledge' | 'ai' | 'sentinelle' | 'incident' | 'exercises-rex-actions' | 'ops' | 'network' | 'audit' | 'coro-index';
export type DiagnosticModule = {
  id: DiagnosticModuleId;
  name: LocalizedText;
  availability: ModuleAvailability;
  availabilityLabel: LocalizedText;
  publicPath?: string;
  qualification: LocalizedText;
};

export type DiagnosticRecommendation = {
  dimensionId: DiagnosticDimensionId;
  answerId: DiagnosticAnswerId;
  observation: LocalizedText;
  operationalIssue: LocalizedText;
  goodPractice: LocalizedText;
  action: LocalizedText;
  modules: readonly DiagnosticModule[];
};
