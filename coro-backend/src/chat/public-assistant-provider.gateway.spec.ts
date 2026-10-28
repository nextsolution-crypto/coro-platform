import { BedrockWebPublicProvider } from './bedrock-web-public.provider';
import { DocumentaryPublicAssistantProvider } from './documentary-public-assistant.provider';
import { PublicAssistantConfig } from './public-assistant.config';
import { PublicAssistantProviderGateway } from './public-assistant-provider.gateway';
import { SimulatedPublicAssistantProvider } from './simulated-public-assistant.provider';

const input = {
  question: 'Question',
  language: 'fr-CA' as const,
  history: [],
  sources: [
    {
      sourceId: 'public-1',
      title: 'Public',
      canonicalUrl: 'https://getcoro.io',
      version: 1,
      language: 'fr-CA' as const,
      excerpt: 'Contenu public.',
    },
  ],
};

describe('PublicAssistantProviderGateway', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('uses documentary mode by default without calling Bedrock', async () => {
    delete process.env.WEB_AI_PROVIDER;
    const config = new PublicAssistantConfig();
    const bedrock = new BedrockWebPublicProvider(config);
    const spy = jest.spyOn(bedrock, 'generate');
    const gateway = new PublicAssistantProviderGateway(
      config,
      new DocumentaryPublicAssistantProvider(),
      new SimulatedPublicAssistantProvider(),
      bedrock,
    );
    await expect(gateway.generate(input)).resolves.toMatchObject({
      mode: 'DOCUMENTARY',
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('enforces the campaign request ceiling before a provider call', async () => {
    process.env.WEB_AI_PROVIDER = 'bedrock';
    process.env.WEB_AI_BEDROCK_INVOCATION_ENABLED = 'true';
    process.env.WEB_AI_BEDROCK_CAMPAIGN_REQUEST_LIMIT = '1';
    const config = new PublicAssistantConfig();
    const bedrock = new BedrockWebPublicProvider(config);
    jest.spyOn(bedrock, 'generate').mockResolvedValue({
      message: 'Réponse',
      supportingSourceIds: ['public-1'],
      suggestedRouteKeys: [],
      suggestedQuestions: [],
    });
    const gateway = new PublicAssistantProviderGateway(
      config,
      new DocumentaryPublicAssistantProvider(),
      new SimulatedPublicAssistantProvider(),
      bedrock,
    );
    await expect(gateway.generate(input)).resolves.toMatchObject({
      mode: 'BEDROCK',
    });
    await expect(gateway.generate(input)).rejects.toThrow(
      'WEB_AI_CAMPAIGN_LIMIT_REACHED',
    );
  });

  it('opens the circuit after the configured failures', async () => {
    process.env.WEB_AI_PROVIDER = 'bedrock';
    process.env.WEB_AI_BEDROCK_INVOCATION_ENABLED = 'true';
    process.env.WEB_AI_BEDROCK_CIRCUIT_FAILURE_THRESHOLD = '1';
    const config = new PublicAssistantConfig();
    const bedrock = new BedrockWebPublicProvider(config);
    jest.spyOn(bedrock, 'generate').mockRejectedValue(new Error('quota'));
    const gateway = new PublicAssistantProviderGateway(
      config,
      new DocumentaryPublicAssistantProvider(),
      new SimulatedPublicAssistantProvider(),
      bedrock,
    );
    await expect(gateway.generate(input)).rejects.toThrow('quota');
    await expect(gateway.generate(input)).rejects.toThrow(
      'WEB_AI_CIRCUIT_OPEN',
    );
  });
});
