import { BedrockWebPublicProvider } from './bedrock-web-public.provider';
import { PublicAssistantConfig } from './public-assistant.config';

describe('BedrockWebPublicProvider', () => {
  const previous = { ...process.env };
  afterEach(() => {
    process.env = { ...previous };
  });

  it('refuses Bedrock while the independent invocation lock is false', async () => {
    process.env.WEB_AI_PROVIDER = 'bedrock';
    process.env.WEB_AI_BEDROCK_INVOCATION_ENABLED = 'false';
    const provider = new BedrockWebPublicProvider(new PublicAssistantConfig());
    await expect(
      provider.generate({
        question: 'Q',
        language: 'fr-CA',
        history: [],
        sources: [],
      }),
    ).rejects.toThrow('WEB_AI_REAL_PROVIDER_NOT_AUTHORIZED');
  });

  it('parses one strict tool response with public source ids', async () => {
    process.env.WEB_AI_PROVIDER = 'bedrock';
    process.env.WEB_AI_BEDROCK_INVOCATION_ENABLED = 'true';
    const provider = new BedrockWebPublicProvider(new PublicAssistantConfig());
    provider.setClientForTesting({
      send: jest.fn().mockResolvedValue({
        output: {
          message: {
            content: [
              {
                toolUse: {
                  name: 'coro_public_answer',
                  toolUseId: 'tool-1',
                  input: {
                    message: 'Réponse publique.',
                    supportingSourceIds: ['public-1'],
                    suggestedRouteKeys: [],
                    suggestedQuestions: [],
                  },
                },
              },
            ],
          },
        },
      }),
    });
    await expect(
      provider.generate({
        question: 'Q',
        language: 'fr-CA',
        history: [],
        sources: [
          {
            sourceId: 'public-1',
            title: 'Public',
            canonicalUrl: 'https://getcoro.io',
            version: 1,
            language: 'fr-CA',
            excerpt: 'Public.',
          },
        ],
      }),
    ).resolves.toMatchObject({
      message: 'Réponse publique.',
      supportingSourceIds: ['public-1'],
    });
  });

  it('rejects malformed provider output', async () => {
    process.env.WEB_AI_PROVIDER = 'bedrock';
    process.env.WEB_AI_BEDROCK_INVOCATION_ENABLED = 'true';
    const provider = new BedrockWebPublicProvider(new PublicAssistantConfig());
    provider.setClientForTesting({
      send: jest.fn().mockResolvedValue({
        output: { message: { content: [{ text: 'free prose' }] } },
      }),
    });
    await expect(
      provider.generate({
        question: 'Q',
        language: 'en-CA',
        history: [],
        sources: [
          {
            sourceId: 'public-1',
            title: 'Public',
            canonicalUrl: 'https://getcoro.io?lang=en',
            version: 1,
            language: 'en-CA',
            excerpt: 'Public.',
          },
        ],
      }),
    ).rejects.toThrow('WEB_AI_BEDROCK_OUTPUT_INVALID');
  });
});

describe('Sophie — consignes', () => {
  it('fixe la politique commerciale et la langue', () => {
    const { SOPHIE_SYSTEM_PROMPT } = jest.requireActual('./bedrock-web-public.provider');
    expect(SOPHIE_SYSTEM_PROMPT).toContain('never give a price');
    expect(SOPHIE_SYSTEM_PROMPT).toContain('"contact"');
    expect(SOPHIE_SYSTEM_PROMPT).toContain('fr-CA');
    expect(SOPHIE_SYSTEM_PROMPT).toContain('911');
    expect(SOPHIE_SYSTEM_PROMPT).toContain('PUE = plan d’urgence environnementale');
  });
});
