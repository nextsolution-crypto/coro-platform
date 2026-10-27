export const PUBLIC_KNOWLEDGE_ENGINE_VERSION = 'PUBLIC_KNOWLEDGE_V1';
export const PUBLIC_KNOWLEDGE_CORPUS_VERSION = '2026-10-27';

export type PublicKnowledgeLanguageCode = 'fr-CA' | 'en-CA';
export type PublicKnowledgeLanguageDb = 'FR_CA' | 'EN_CA';

export type PublicKnowledgeSourceTypeCode =
  | 'SITE_PAGE'
  | 'MODULE_PAGE'
  | 'BLOG_ARTICLE'
  | 'FAQ'
  | 'PRODUCT_CAPABILITY'
  | 'COMMERCIAL_INFORMATION'
  | 'PUBLIC_DOCUMENTATION';

export type PublicKnowledgeCapabilityStatusCode =
  | 'AVAILABLE'
  | 'PILOT'
  | 'IN_DEVELOPMENT'
  | 'PLANNED'
  | 'RETIRED'
  | 'UNKNOWN';

export interface PublicKnowledgeSeed {
  sourceKey: string;
  sourceType: PublicKnowledgeSourceTypeCode;
  canonicalUrl: string;
  title: string;
  language: PublicKnowledgeLanguageCode;
  content: string;
  authorityRank: number;
  publishedAt?: Date;
  sourceUpdatedAt?: Date;
  expiresAt?: Date;
  capability?: {
    capabilityKey: string;
    name: string;
    description: string;
    status: PublicKnowledgeCapabilityStatusCode;
    approvedBy?: string;
    approvedAt?: Date;
  };
}

export interface PublicKnowledgeSearchResult {
  sourceId: string;
  sourceKey: string;
  title: string;
  canonicalUrl: string;
  language: PublicKnowledgeLanguageCode;
  excerpt: string;
  version: number;
  relevance: number;
  authorityRank: number;
  capabilityKey?: string;
  capabilityStatus?: PublicKnowledgeCapabilityStatusCode;
  citation: {
    sourceId: string;
    sourceKey: string;
    version: number;
    canonicalUrl: string;
    language: PublicKnowledgeLanguageCode;
    chunkId: string;
  };
}

export interface PublicKnowledgeAnswerContext {
  question: string;
  language: PublicKnowledgeLanguageCode;
  sources: PublicKnowledgeSearchResult[];
  status:
    | 'SUPPORTED'
    | 'PARTIALLY_SUPPORTED'
    | 'INSUFFICIENT_INFORMATION'
    | 'CONFLICTING_SOURCES'
    | 'BLOCKED';
}

export function toDbLanguage(
  language: PublicKnowledgeLanguageCode,
): PublicKnowledgeLanguageDb {
  return language === 'fr-CA' ? 'FR_CA' : 'EN_CA';
}

export function fromDbLanguage(
  language: PublicKnowledgeLanguageDb,
): PublicKnowledgeLanguageCode {
  return language === 'FR_CA' ? 'fr-CA' : 'en-CA';
}
