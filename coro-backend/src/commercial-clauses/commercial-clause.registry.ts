import { CommercialClauseCategory } from '@prisma/client';

export const CLAUSE_PARAMETER_TYPES = [
  'DURATION_DAYS',
  'DURATION_MONTHS',
  'MONEY_MINOR',
  'DECIMAL',
  'TEXT',
  'JURISDICTION',
] as const;

export type ClauseParameterType = (typeof CLAUSE_PARAMETER_TYPES)[number];
export type ClauseParameterDefinition = {
  key: string;
  type: ClauseParameterType;
  required: boolean;
};

const allowedParameters: Partial<
  Record<CommercialClauseCategory, Record<string, ClauseParameterType>>
> = {
  OFFER_VALIDITY: { offerValidityDays: 'DURATION_DAYS' },
  PAYMENT_TERMS: { paymentDeadlineDays: 'DURATION_DAYS' },
  SAAS_SUBSCRIPTION: { subscriptionTermMonths: 'DURATION_MONTHS' },
  RENEWAL: { renewalNoticeDays: 'DURATION_DAYS' },
  IMPLEMENTATION: { implementationSchedule: 'TEXT' },
  ADDITIONAL_FEES: { additionalServiceRateMinor: 'MONEY_MINOR' },
  DELAYS: { delayThresholdDays: 'DURATION_DAYS' },
  PENALTIES: { penaltyAmountMinor: 'MONEY_MINOR' },
  GOVERNING_LAW: { applicableJurisdiction: 'JURISDICTION' },
};

export function allowedClauseParameterType(
  category: CommercialClauseCategory,
  key: string,
) {
  return allowedParameters[category]?.[key] ?? null;
}

const categoryLabels: Record<
  CommercialClauseCategory,
  { titleFR: string; titleEN: string }
> = {
  OFFER_VALIDITY: { titleFR: 'Validité de l’offre', titleEN: 'Offer validity' },
  CURRENCY_AND_TAXES: {
    titleFR: 'Devise et taxes',
    titleEN: 'Currency and taxes',
  },
  PAYMENT_TERMS: { titleFR: 'Modalités de paiement', titleEN: 'Payment terms' },
  INVOICING: { titleFR: 'Facturation', titleEN: 'Invoicing' },
  SAAS_SUBSCRIPTION: {
    titleFR: 'Abonnement SaaS',
    titleEN: 'SaaS subscription',
  },
  RENEWAL: { titleFR: 'Renouvellement', titleEN: 'Renewal' },
  TERMINATION: { titleFR: 'Résiliation', titleEN: 'Termination' },
  SUSPENSION: { titleFR: 'Suspension', titleEN: 'Suspension' },
  SUPPORT_AND_MAINTENANCE: {
    titleFR: 'Soutien et maintenance',
    titleEN: 'Support and maintenance',
  },
  SERVICE_AVAILABILITY: {
    titleFR: 'Disponibilité du service',
    titleEN: 'Service availability',
  },
  IMPLEMENTATION: { titleFR: 'Implantation', titleEN: 'Implementation' },
  PROFESSIONAL_SERVICES: {
    titleFR: 'Services professionnels',
    titleEN: 'Professional services',
  },
  SCOPE_CHANGE: { titleFR: 'Modification de portée', titleEN: 'Scope changes' },
  CUSTOMER_OBLIGATIONS: {
    titleFR: 'Obligations du client',
    titleEN: 'Customer obligations',
  },
  DELAYS: { titleFR: 'Délais', titleEN: 'Delays' },
  ADDITIONAL_FEES: {
    titleFR: 'Frais additionnels',
    titleEN: 'Additional fees',
  },
  PENALTIES: { titleFR: 'Pénalités', titleEN: 'Penalties' },
  CONFIDENTIALITY: { titleFR: 'Confidentialité', titleEN: 'Confidentiality' },
  DATA_PROTECTION: {
    titleFR: 'Protection des données',
    titleEN: 'Data protection',
  },
  DATA_RETENTION_AND_RETURN: {
    titleFR: 'Conservation et retour des données',
    titleEN: 'Data retention and return',
  },
  INTELLECTUAL_PROPERTY: {
    titleFR: 'Propriété intellectuelle',
    titleEN: 'Intellectual property',
  },
  LIABILITY: { titleFR: 'Responsabilité', titleEN: 'Liability' },
  FORCE_MAJEURE: { titleFR: 'Force majeure', titleEN: 'Force majeure' },
  GOVERNING_LAW: { titleFR: 'Droit applicable', titleEN: 'Governing law' },
  ACCEPTANCE: { titleFR: 'Acceptation', titleEN: 'Acceptance' },
};

export const COMMERCIAL_CLAUSE_DRAFT_CATALOG = Object.entries(
  categoryLabels,
).map(([category, labels]) => ({
  code: `${category}_STANDARD`,
  category: category as CommercialClauseCategory,
  ...labels,
  textFR: 'NOT_APPROVED — rédaction juridique requise.',
  textEN: 'NOT_APPROVED — legal drafting required.',
  provenance: 'SOURCE_DOCUMENT_UNAVAILABLE',
}));
