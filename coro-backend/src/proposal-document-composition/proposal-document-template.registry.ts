import {
  CommercialClauseApplicabilityScope,
  CommercialClauseCategory,
  ProposalDocumentTemplateCode,
} from '@prisma/client';

export const PROPOSAL_DOCUMENT_TEMPLATE_VERSION = 'proposal-document/v1';

export const PROPOSAL_DOCUMENT_SECTION_ORDER = Object.freeze([
  'COVER',
  'INTRODUCTION_LETTER',
  'CORO_PRESENTATION',
  'CLIENT_CONTEXT_OBJECTIVES',
  'PROPOSED_SOLUTION',
  'INCLUDED_FEATURES_EXCLUSIONS',
  'IMPLEMENTATION',
  'PROFESSIONAL_SERVICES',
  'SCHEDULE_DELIVERABLES',
  'INVESTMENT',
  'COMMERCIAL_SAAS_CONDITIONS',
  'DATA_PROTECTION',
  'RESPONSIBILITIES',
  'ACCEPTANCE',
  'ANNEXES',
] as const);

export type ProposalDocumentSectionCode =
  (typeof PROPOSAL_DOCUMENT_SECTION_ORDER)[number];

type TemplateDefinition = Readonly<{
  code: ProposalDocumentTemplateCode;
  familyCodes: readonly string[];
  contentCodes: readonly string[];
  clauseScope: CommercialClauseApplicabilityScope;
  requiredClauseCategories: readonly CommercialClauseCategory[];
  sectionOrder: readonly ProposalDocumentSectionCode[];
}>;

const structural = (
  code: ProposalDocumentTemplateCode,
  familyCodes: readonly string[],
  contentCodes: readonly string[],
  clauseScope: CommercialClauseApplicabilityScope,
  requiredClauseCategories: readonly CommercialClauseCategory[],
): TemplateDefinition =>
  Object.freeze({
    code,
    familyCodes: Object.freeze([...familyCodes]),
    contentCodes: Object.freeze([...contentCodes]),
    clauseScope,
    requiredClauseCategories: Object.freeze([...requiredClauseCategories]),
    sectionOrder: PROPOSAL_DOCUMENT_SECTION_ORDER,
  });

const professionalRequired = Object.freeze([
  'OFFER_VALIDITY',
  'CURRENCY_AND_TAXES',
  'PAYMENT_TERMS',
  'SAAS_SUBSCRIPTION',
  'DATA_PROTECTION',
  'LIABILITY',
  'GOVERNING_LAW',
  'ACCEPTANCE',
] as const satisfies readonly CommercialClauseCategory[]);

export const PROPOSAL_DOCUMENT_TEMPLATES = Object.freeze({
  CORO_PROFESSIONAL: structural(
    'CORO_PROFESSIONAL',
    ['PROFESSIONAL'],
    ['CORO_PROFESSIONAL'],
    'CORO_PROFESSIONAL',
    professionalRequired,
  ),
  SENTINELLE_POPULATION_STANDALONE: structural(
    'SENTINELLE_POPULATION_STANDALONE',
    ['POPULATION_PUE'],
    [],
    'SENTINELLE_POPULATION_STANDALONE',
    [],
  ),
  PROFESSIONAL_SERVICES: structural(
    'PROFESSIONAL_SERVICES',
    ['PROFESSIONAL_SERVICES'],
    [],
    'PROFESSIONAL_SERVICES',
    [],
  ),
  COMBINED_OFFER: structural('COMBINED_OFFER', [], [], 'COMBINED_OFFER', []),
} satisfies Record<ProposalDocumentTemplateCode, TemplateDefinition>);

export function resolveProposalDocumentTemplate(
  code: ProposalDocumentTemplateCode,
) {
  return PROPOSAL_DOCUMENT_TEMPLATES[code];
}
