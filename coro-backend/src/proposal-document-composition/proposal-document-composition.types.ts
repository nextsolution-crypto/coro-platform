import {
  ProposalDocumentCompositionReadiness,
  ProposalDocumentTemplateCode,
  ProposalLanguage,
} from '@prisma/client';
import type { CustomerSafeCommercialProjection } from '../commercial-proposals/customer-safe-commercial-projection';
import type { ProposalDocumentSectionCode } from './proposal-document-template.registry';

export type CompositionDiagnostic = Readonly<{
  code: string;
  severity: 'BLOCKING' | 'WARNING';
  subject?: string;
}>;

export type ProposalDocumentCompositionContent = Readonly<{
  schemaVersion: 'proposal-document-composition/v1';
  proposalRevisionId: string;
  proposalReference: string;
  proposalRevisionNumber: number;
  template: {
    code: ProposalDocumentTemplateCode;
    version: string;
  };
  language: ProposalLanguage;
  familyCodes: readonly string[];
  recipient: CustomerSafeCommercialProjection['customer'];
  issuer: null | Record<string, unknown>;
  economics: Pick<
    CustomerSafeCommercialProjection,
    | 'currency'
    | 'lines'
    | 'totals'
    | 'inputs'
    | 'valueAnalysis'
    | 'exclusivities'
    | 'commitments'
    | 'commercialTerms'
    | 'validity'
  >;
  sections: readonly {
    code: ProposalDocumentSectionCode;
    content: unknown;
  }[];
  clauses: readonly Record<string, unknown>[];
  provenance: {
    contentVersionIds: readonly string[];
    legalIssuerVersionId: string | null;
    clauseVersionIds: readonly string[];
  };
}>;

export type CompositionResult = Readonly<{
  content: ProposalDocumentCompositionContent;
  diagnostics: readonly CompositionDiagnostic[];
  readiness: ProposalDocumentCompositionReadiness;
  issuanceReady: boolean;
  canonicalHash: string;
}>;
