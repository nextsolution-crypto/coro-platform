import type { Locale } from '@/lib/site/locale';
import { diagnosticDimensionLabel, diagnosticLevelLabel, type DiagnosticResultModel } from './results.ts';

export type DiagnosticCommercialSummary = {
  diagnosticVersion: string;
  diagnosticScore: string;
  diagnosticLevel: string;
  diagnosticCoverage: string;
  diagnosticPriorities: string;
};

export function buildDiagnosticCommercialSummary(model: DiagnosticResultModel, locale: Locale): DiagnosticCommercialSummary {
  const { evaluation } = model;
  return {
    diagnosticVersion: evaluation.questionnaireVersion,
    diagnosticScore: evaluation.score === null ? (locale === 'fr' ? 'Non calculable' : 'Not calculable') : `${evaluation.score} %`,
    diagnosticLevel: evaluation.level ? diagnosticLevelLabel(evaluation.level, locale) : (locale === 'fr' ? 'Non attribué — résultat provisoire' : 'Not assigned — provisional result'),
    diagnosticCoverage: `${evaluation.coveragePercent} % (${evaluation.evaluableCount}/8)`,
    diagnosticPriorities: model.improvementRecommendations.slice(0, 3).map((item) => `${item.dimensionId} — ${diagnosticDimensionLabel(item.dimensionId, locale)}`).join(' | ') || (locale === 'fr' ? 'Aucune priorité corrective déclarée' : 'No declared corrective priority'),
  };
}
