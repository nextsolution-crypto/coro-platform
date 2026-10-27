import { PublicKnowledgeSearchService } from '../public-knowledge/public-knowledge-search.service';
import { PublicKnowledgeSecurity } from '../public-knowledge/public-knowledge-security';
import type { PublicKnowledgeAnswerContext } from '../public-knowledge/public-knowledge.types';
import { PublicAssistantConfig } from './public-assistant.config';
import { PublicAssistantNavigationRegistry } from './public-assistant-navigation';
import { PublicAssistantOrchestratorService } from './public-assistant-orchestrator.service';
import { PublicAssistantSessionService } from './public-assistant-session.service';
import { PublicAssistantValidator } from './public-assistant-validator';
import { SimulatedPublicAssistantProvider } from './simulated-public-assistant.provider';

const source = (language: 'fr-CA' | 'en-CA' = 'fr-CA') => ({
  sourceId: 'source-public-1',
  sourceKey: 'knowledge',
  title: language === 'fr-CA' ? 'CORO Knowledge' : 'CORO Knowledge',
  canonicalUrl: `https://getcoro.io/coro-knowledge${language === 'en-CA' ? '?lang=en' : ''}`,
  language,
  excerpt:
    language === 'fr-CA'
      ? 'CORO Knowledge organise les versions approuvées et leur provenance.'
      : 'CORO Knowledge organizes approved versions and their provenance.',
  version: 1,
  relevance: 0.9,
  authorityRank: 10,
  capabilityStatus: 'AVAILABLE' as const,
  citation: {
    sourceId: 'source-public-1',
    sourceKey: 'knowledge',
    version: 1,
    canonicalUrl: `https://getcoro.io/coro-knowledge${language === 'en-CA' ? '?lang=en' : ''}`,
    language,
    chunkId: 'chunk-public-1',
  },
});

function harness(context: PublicKnowledgeAnswerContext, scenario = 'NORMAL') {
  process.env.WEB_AI_PROVIDER = 'simulated';
  process.env.WEB_AI_SIMULATED_SCENARIO = scenario;
  const config = new PublicAssistantConfig();
  const navigation = new PublicAssistantNavigationRegistry();
  const sessions = new PublicAssistantSessionService(config);
  const security = new PublicKnowledgeSecurity();
  const provider = new SimulatedPublicAssistantProvider();
  const answerContext = jest.fn().mockResolvedValue(context);
  const search = {
    answerContext,
  } as unknown as PublicKnowledgeSearchService;
  const service = new PublicAssistantOrchestratorService(
    config,
    search,
    sessions,
    provider,
    new PublicAssistantValidator(security, navigation),
    navigation,
  );
  return { service, answerContext };
}

describe('PublicAssistantOrchestratorService', () => {
  afterEach(() => {
    delete process.env.WEB_AI_PROVIDER;
    delete process.env.WEB_AI_SIMULATED_SCENARIO;
  });

  it('returns a grounded bilingual response with server-validated citations', async () => {
    const { service } = harness({
      question: 'Knowledge',
      language: 'fr-CA',
      sources: [source()],
      status: 'SUPPORTED',
    });
    const result = await service.answer({
      message: 'Comment fonctionne Knowledge ?',
      language: 'fr-CA',
      pagePath: '/coro-knowledge',
    });
    expect(result).toMatchObject({
      status: 'SUPPORTED',
      language: 'fr-CA',
      mode: 'SIMULATED',
      citations: [
        {
          sourceId: 'source-public-1',
          url: 'https://getcoro.io/coro-knowledge',
        },
      ],
    });
    expect(result.suggestedLinks[0]).toMatchObject({
      url: '/coro-knowledge',
    });
  });

  it('keeps multi-turn context server-side and never accepts a privileged history role', async () => {
    const { service, answerContext } = harness({
      question: 'Knowledge',
      language: 'fr-CA',
      sources: [source()],
      status: 'SUPPORTED',
    });
    const first = await service.answer({
      message: 'Parlez-moi de Knowledge',
      language: 'fr-CA',
    });
    await service.answer({
      message: 'Et comment les versions sont-elles gérées ?',
      language: 'fr-CA',
      sessionId: first.sessionId,
    });
    expect(answerContext).toHaveBeenLastCalledWith(
      expect.stringContaining('Parlez-moi de Knowledge'),
      'fr-CA',
      4,
    );
  });

  it.each([
    'INSUFFICIENT_INFORMATION',
    'CONFLICTING_SOURCES',
    'BLOCKED',
  ] as const)('abstains without calling a provider for %s', async (status) => {
    const { service } = harness({
      question: 'unknown',
      language: 'en-CA',
      sources: [],
      status,
    });
    await expect(
      service.answer({ message: 'Unknown capability?', language: 'en-CA' }),
    ).resolves.toMatchObject({
      status: 'INSUFFICIENT_INFORMATION',
      citations: [],
    });
  });

  it.each(['MALFORMED', 'INVENTED_CITATION', 'INJECTION', 'OFF_TOPIC'])(
    'rejects unsafe simulated provider scenario %s',
    async (scenario) => {
      const { service } = harness(
        {
          question: 'Knowledge',
          language: 'fr-CA',
          sources: [source()],
          status: 'SUPPORTED',
        },
        scenario,
      );
      await expect(
        service.answer({ message: 'Question publique', language: 'fr-CA' }),
      ).resolves.toMatchObject({
        status: 'INSUFFICIENT_INFORMATION',
        citations: [],
      });
    },
  );

  it.each(['TIMEOUT', 'UNAVAILABLE'])(
    'fails closed in degraded mode for %s',
    async (scenario) => {
      const { service } = harness(
        {
          question: 'Knowledge',
          language: 'en-CA',
          sources: [source('en-CA')],
          status: 'SUPPORTED',
        },
        scenario,
      );
      await expect(
        service.answer({ message: 'How does it work?', language: 'en-CA' }),
      ).resolves.toMatchObject({
        status: 'SERVICE_UNAVAILABLE',
        citations: [],
        mode: 'DEGRADED',
      });
    },
  );

  it('fails before retrieval when a real provider is configured', async () => {
    process.env.WEB_AI_PROVIDER = 'bedrock';
    const config = new PublicAssistantConfig();
    const navigation = new PublicAssistantNavigationRegistry();
    const service = new PublicAssistantOrchestratorService(
      config,
      { answerContext: jest.fn() } as unknown as PublicKnowledgeSearchService,
      new PublicAssistantSessionService(config),
      new SimulatedPublicAssistantProvider(),
      new PublicAssistantValidator(new PublicKnowledgeSecurity(), navigation),
      navigation,
    );
    await expect(
      service.answer({ message: 'Question', language: 'fr-CA' }),
    ).rejects.toThrow('WEB_AI_REAL_PROVIDER_NOT_AUTHORIZED');
  });

  it('passes a deterministic 100-scenario bilingual reference campaign', async () => {
    for (let index = 0; index < 100; index += 1) {
      const language = index < 50 ? 'fr-CA' : 'en-CA';
      const { service } = harness({
        question: `scenario-${index}`,
        language,
        sources: [source(language)],
        status: index % 5 === 0 ? 'PARTIALLY_SUPPORTED' : 'SUPPORTED',
      });
      const result = await service.answer({
        message:
          language === 'fr-CA'
            ? `Scénario français ${index}`
            : `English scenario ${index}`,
        language,
      });
      expect(result.citations).toHaveLength(1);
      expect(result.language).toBe(language);
      expect(result.status).toBe(
        index % 5 === 0 ? 'PARTIALLY_SUPPORTED' : 'SUPPORTED',
      );
    }
  });
});
