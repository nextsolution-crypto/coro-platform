import type { PublicAssistantLanguage } from './public-assistant.types';

export const WEB_AI_CLASSIFIER_VERSION = 'web-ai-intent-v1';

export type WebAIIntent =
  | 'GENERAL_INFORMATION'
  | 'MODULE_UNDERSTANDING'
  | 'COMPLIANCE_NEED'
  | 'DOCUMENT_CENTRALIZATION'
  | 'BUILDING_MANAGEMENT'
  | 'PEOPLE_MANAGEMENT'
  | 'INCIDENT_MANAGEMENT'
  | 'EMERGENCY_PREPAREDNESS'
  | 'EXERCISES_SIMULATIONS'
  | 'BUSINESS_CONTINUITY'
  | 'TERRITORIAL_RESILIENCE'
  | 'TECHNICAL_INTEGRATION'
  | 'PRICING'
  | 'COMMERCIAL_REQUEST'
  | 'TECHNICAL_SUPPORT'
  | 'OUT_OF_SCOPE';

export interface WebAIIntentClassification {
  intent: WebAIIntent;
  commercial: boolean;
  confidence: 'EXPLICIT' | 'RULE_MATCH' | 'FALLBACK';
  classifierVersion: typeof WEB_AI_CLASSIFIER_VERSION;
}

const RULES: Array<{ intent: WebAIIntent; commercial?: boolean; terms: RegExp }> = [
  { intent: 'COMMERCIAL_REQUEST', commercial: true, terms: /\b(demo|demonstration|devis|quote|partenariat|partnership|contact(?:ez)?|essai|trial)\b/i },
  { intent: 'PRICING', commercial: true, terms: /\b(prix|tarif|co[uû]t|combien|pricing|price|cost)\b/i },
  { intent: 'TECHNICAL_SUPPORT', terms: /\b(soutien|support|probl[eè]me technique|technical issue)\b/i },
  { intent: 'TECHNICAL_INTEGRATION', terms: /\b(int[ée]gration|api|connecteur|connector|sso|sharepoint)\b/i },
  { intent: 'COMPLIANCE_NEED', terms: /\b(conformit[ée]|compliance|r[eè]glement|regulation)\b/i },
  { intent: 'DOCUMENT_CENTRALIZATION', terms: /\b(document|knowledge|proc[ée]dure|plan technique)\b/i },
  { intent: 'INCIDENT_MANAGEMENT', terms: /\b(incident|urgence|emergency|alerte)\b/i },
  { intent: 'PEOPLE_MANAGEMENT', terms: /\b(sentinelle|occupant|employ[ée]|visiteur|visitor)\b/i },
  { intent: 'EXERCISES_SIMULATIONS', terms: /\b(exercice|simulation|rex|corrective)\b/i },
  { intent: 'BUSINESS_CONTINUITY', terms: /\b(continuit[ée]|pca|business continuity|recovery)\b/i },
  { intent: 'TERRITORIAL_RESILIENCE', terms: /\b(municipalit[ée]|territorial|r[ée]gion|regional)\b/i },
  { intent: 'BUILDING_MANAGEMENT', terms: /\b(batiments?|immeubles?|buildings?|multisite|multi-site)\b/i },
  { intent: 'MODULE_UNDERSTANDING', terms: /\b(module|coro ai|coro knowledge|fonctionnalit[ée]|feature)\b/i },
];

export function classifyWebAIIntent(message: string): WebAIIntentClassification {
  const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 2_000);
  const match = RULES.find((rule) => rule.terms.test(normalized));
  return {
    intent: match?.intent ?? 'GENERAL_INFORMATION',
    commercial: match?.commercial ?? false,
    confidence: match ? (match.commercial ? 'EXPLICIT' : 'RULE_MATCH') : 'FALLBACK',
    classifierVersion: WEB_AI_CLASSIFIER_VERSION,
  };
}

export function commercialPrompt(intent: WebAIIntent, language: PublicAssistantLanguage): string | undefined {
  if (!['COMMERCIAL_REQUEST', 'PRICING'].includes(intent)) return undefined;
  return language === 'fr-CA'
    ? 'Souhaitez-vous transmettre volontairement une demande à notre équipe? Vous pouvez continuer à consulter CORO sans fournir vos coordonnées.'
    : 'Would you like to voluntarily send a request to our team? You may continue exploring CORO without providing contact details.';
}
