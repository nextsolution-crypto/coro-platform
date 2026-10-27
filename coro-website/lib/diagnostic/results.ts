import type { Locale } from '@/lib/site/locale';
import { diagnosticQuestions } from './config.ts';
import { evaluateDiagnostic } from './engine.ts';
import { getDiagnosticRecommendation } from './recommendations.ts';
import type { CompleteDiagnosticResponses, DiagnosticDimensionId, DiagnosticEvaluation, DiagnosticLevelId, DiagnosticRecommendation, LocalizedText } from './types.ts';

export type DiagnosticImprovementStep = {
  period: '0-30' | '30-60' | '60-90';
  dimensionId: DiagnosticDimensionId;
  recommendation: DiagnosticRecommendation;
};

export type DiagnosticResultModel = {
  evaluation: DiagnosticEvaluation;
  strengths: readonly DiagnosticRecommendation[];
  improvementRecommendations: readonly DiagnosticRecommendation[];
  verificationRecommendations: readonly DiagnosticRecommendation[];
  detailedRecommendations: readonly DiagnosticRecommendation[];
  plan: readonly DiagnosticImprovementStep[];
  relevantModules: readonly DiagnosticRecommendation['modules'][number][];
};

const dimensionRank = new Map(diagnosticQuestions.map((question, index) => [question.id, index]));

function uniqueModules(recommendations: readonly DiagnosticRecommendation[]) {
  const modules = new Map<string, DiagnosticRecommendation['modules'][number]>();
  for (const recommendation of recommendations) for (const moduleItem of recommendation.modules) modules.set(moduleItem.id, moduleItem);
  return [...modules.values()];
}

export function buildDiagnosticResult(responses: CompleteDiagnosticResponses): DiagnosticResultModel {
  const evaluation = evaluateDiagnostic({ version: 1, responses });
  const recommendationFor = (dimensionId: DiagnosticDimensionId) => getDiagnosticRecommendation(dimensionId, responses[dimensionId]);
  const strengths = evaluation.strengths.slice(0, 3).map(recommendationFor);
  const improvementRecommendations = evaluation.improvementPriorities.slice(0, 3).map(recommendationFor);
  const verificationRecommendations = evaluation.verificationPriorities.map(recommendationFor);
  const detailedRecommendations = diagnosticQuestions.map(({ id }) => recommendationFor(id));
  const planSource = [...improvementRecommendations, ...verificationRecommendations];
  const fallback = strengths.length ? strengths : detailedRecommendations;
  const plan = (['0-30', '30-60', '60-90'] as const).map((period, index) => {
    const recommendation = planSource[index] ?? fallback[index % fallback.length];
    return { period, dimensionId: recommendation.dimensionId, recommendation };
  });
  return {
    evaluation,
    strengths,
    improvementRecommendations,
    verificationRecommendations,
    detailedRecommendations,
    plan,
    relevantModules: uniqueModules([...improvementRecommendations, ...verificationRecommendations, ...strengths]),
  };
}

const levelLabels: Record<DiagnosticLevelId, LocalizedText> = {
  reinforce: { fr: 'Préparation à renforcer', en: 'Preparation to reinforce' },
  partial: { fr: 'Préparation partielle', en: 'Partial preparation' },
  structured: { fr: 'Préparation structurée', en: 'Structured preparation' },
  advanced: { fr: 'Préparation avancée', en: 'Advanced preparation' },
};

export function diagnosticLevelLabel(level: DiagnosticLevelId, locale: Locale): string {
  return levelLabels[level][locale];
}

export function diagnosticDimensionLabel(id: DiagnosticDimensionId, locale: Locale): string {
  return diagnosticQuestions[dimensionRank.get(id)!].dimension[locale];
}

export function diagnosticSummary(model: DiagnosticResultModel, locale: Locale): string {
  const { evaluation } = model;
  if (!evaluation.isDefinitive) return locale === 'fr'
    ? `La couverture de ${evaluation.coveragePercent} % ne permet pas encore d’attribuer un niveau définitif. Vérifiez les informations inconnues ou l’applicabilité déclarée avant de conclure.`
    : `Coverage of ${evaluation.coveragePercent}% is not yet sufficient for a definitive level. Verify unknown information or declared applicability before drawing a conclusion.`;
  const level = diagnosticLevelLabel(evaluation.level!, locale);
  const priority = model.improvementRecommendations[0];
  if (!priority) return locale === 'fr'
    ? `${level}. Les réponses déclarées ne font ressortir aucune priorité corrective; maintenez les pratiques et vérifiez-les régulièrement.`
    : `${level}. The declared answers reveal no corrective priority; maintain the practices and verify them regularly.`;
  const dimension = diagnosticDimensionLabel(priority.dimensionId, locale);
  return locale === 'fr'
    ? `${level}. La première priorité déclarée concerne ${dimension.toLocaleLowerCase('fr-CA')}. Le résultat demeure indicatif et dépend de l’exactitude des réponses.`
    : `${level}. The first declared priority concerns ${dimension.toLocaleLowerCase('en-CA')}. The result remains indicative and depends on the accuracy of the answers.`;
}
