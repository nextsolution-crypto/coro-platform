import type {
  PublicKnowledgeCapabilityStatusCode,
  PublicKnowledgeLanguageCode,
  PublicKnowledgeSearchResult,
} from '../public-knowledge/public-knowledge.types';

export type PublicAssistantLanguage = PublicKnowledgeLanguageCode;

export type PublicAssistantStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'INSUFFICIENT_INFORMATION'
  | 'SERVICE_UNAVAILABLE';

export interface PublicAssistantCitation {
  sourceId: string;
  title: string;
  url: string;
  version: number;
}

export interface PublicAssistantSuggestedLink {
  label: string;
  url: string;
}

export interface PublicAssistantResponse {
  requestId: string;
  sessionId: string;
  message: string;
  language: PublicAssistantLanguage;
  status: PublicAssistantStatus;
  citations: PublicAssistantCitation[];
  suggestedLinks: PublicAssistantSuggestedLink[];
  suggestedQuestions: string[];
  mode: 'SIMULATED' | 'DEGRADED';
}

export interface PublicAssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface PublicAssistantContextSource {
  sourceId: string;
  title: string;
  canonicalUrl: string;
  version: number;
  language: PublicAssistantLanguage;
  excerpt: string;
  capabilityStatus?: PublicKnowledgeCapabilityStatusCode;
}

export interface PublicAssistantProviderInput {
  question: string;
  language: PublicAssistantLanguage;
  history: PublicAssistantTurn[];
  pagePath?: string;
  sources: PublicAssistantContextSource[];
}

export interface PublicAssistantProviderOutput {
  message: string;
  supportingSourceIds: string[];
  suggestedRouteKeys: string[];
  suggestedQuestions: string[];
}

export interface PublicAssistantProvider {
  generate(
    input: PublicAssistantProviderInput,
  ): Promise<PublicAssistantProviderOutput>;
}

export function toAssistantContextSource(
  result: PublicKnowledgeSearchResult,
): PublicAssistantContextSource {
  return {
    sourceId: result.sourceId,
    title: result.title,
    canonicalUrl: result.canonicalUrl,
    version: result.version,
    language: result.language,
    excerpt: result.excerpt,
    capabilityStatus: result.capabilityStatus,
  };
}
