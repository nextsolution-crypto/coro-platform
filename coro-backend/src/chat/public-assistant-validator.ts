import { Injectable } from '@nestjs/common';
import { PublicKnowledgeSecurity } from '../public-knowledge/public-knowledge-security';
import { PublicAssistantNavigationRegistry } from './public-assistant-navigation';
import type {
  PublicAssistantContextSource,
  PublicAssistantLanguage,
  PublicAssistantProviderOutput,
} from './public-assistant.types';

const FORBIDDEN_OUTPUT =
  /(?:system prompt|developer message|ignore previous|reveal.{0,30}(?:secret|instruction)|projectfile|tenant[_ -]?id|execute tool)/i;

@Injectable()
export class PublicAssistantValidator {
  constructor(
    private readonly security: PublicKnowledgeSecurity,
    private readonly navigation: PublicAssistantNavigationRegistry,
  ) {}

  validate(
    output: PublicAssistantProviderOutput,
    sources: PublicAssistantContextSource[],
    language: PublicAssistantLanguage,
  ) {
    if (
      !output ||
      typeof output.message !== 'string' ||
      !output.message.trim() ||
      output.message.length > 4_000 ||
      !Array.isArray(output.supportingSourceIds) ||
      output.supportingSourceIds.length === 0 ||
      FORBIDDEN_OUTPUT.test(output.message)
    )
      return;
    const admitted = new Map(
      sources.map((source) => [source.sourceId, source]),
    );
    const citationSources = [...new Set(output.supportingSourceIds)].map((id) =>
      admitted.get(id),
    );
    if (citationSources.some((source) => !source)) return;
    const verified = citationSources as PublicAssistantContextSource[];
    try {
      for (const source of verified)
        this.security.assertCanonicalPublicUrl(source.canonicalUrl);
    } catch {
      return;
    }
    const routeKeys = [
      ...output.suggestedRouteKeys,
      ...verified
        .map((source) => this.navigation.routeKeyForUrl(source.canonicalUrl))
        .filter((value): value is string => Boolean(value)),
    ];
    return {
      message: output.message.trim(),
      citations: verified.map((source) => ({
        sourceId: source.sourceId,
        title: source.title,
        url: this.security.assertCanonicalPublicUrl(source.canonicalUrl),
        version: source.version,
        excerpt: source.excerpt,
      })),
      suggestedLinks: this.navigation.links(routeKeys, language),
      suggestedQuestions: output.suggestedQuestions
        .filter((question) => typeof question === 'string' && question.trim())
        .slice(0, 3)
        .map((question) => question.trim().slice(0, 180)),
    };
  }
}
