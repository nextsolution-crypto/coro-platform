import { CoroAiProviderGateway } from './coro-ai-provider.gateway';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeGroundingService } from './knowledge-grounding.service';
import { BedrockProviderAdapter } from './bedrock-provider.adapter';
import { KnowledgeSearchHit } from './knowledge.types';

describe('CoroAiProviderGateway provider boundary', () => {
  const original = { ...process.env };
  const hit = {
    citationId: 'authorized-citation',
    text: 'Approved evidence',
    score: 0.9,
  } as KnowledgeSearchHit;

  beforeEach(() => {
    process.env.CORO_AI_PROVIDER = 'bedrock';
    process.env.CORO_AI_BEDROCK_INVOCATION_ENABLED = 'true';
  });

  afterEach(() => {
    process.env = { ...original };
  });

  function harness() {
    const abstention = {
      answer: null,
      uncertainty: 'Insufficient authorized evidence',
      missingInformation: [],
      conflicts: [],
      usedCitationIds: [],
    };
    const deterministic = {
      suspicious: jest.fn((text: string) => text === 'untrusted'),
      answer: jest.fn().mockReturnValue(abstention),
    };
    const bedrock = {
      answer: jest.fn().mockResolvedValue({
        ...abstention,
        answer: 'Grounded answer',
        usedCitationIds: [hit.citationId],
      }),
    };
    const gateway = new CoroAiProviderGateway(
      new KnowledgeConfig(),
      deterministic as unknown as KnowledgeGroundingService,
      bedrock as unknown as BedrockProviderAdapter,
    );
    return { gateway, deterministic, bedrock };
  }

  it.each([
    ['no sources', []],
    ['suspicious sources', [{ ...hit, text: 'untrusted' }]],
    ['low confidence sources', [{ ...hit, score: 0.24 }]],
  ])('abstains without invoking Bedrock for %s', async (_name, hits) => {
    const h = harness();
    const result = await h.gateway.answer('Question', hits as KnowledgeSearchHit[]);
    expect(result.grounded.answer).toBeNull();
    expect(h.bedrock.answer).not.toHaveBeenCalled();
    expect(h.deterministic.answer).toHaveBeenCalled();
  });

  it('sends only eligible sources to Bedrock', async () => {
    const h = harness();
    await h.gateway.answer('Question', [
      hit,
      { ...hit, citationId: 'unsafe', text: 'untrusted' },
      { ...hit, citationId: 'weak', score: 0.01 },
    ]);
    expect(h.bedrock.answer).toHaveBeenCalledWith('Question', [hit]);
  });

  it('blocks a suspicious question before calling Bedrock', async () => {
    const h = harness();
    const result = await h.gateway.answer('untrusted', [hit]);
    expect(result.provider).toBe('SECURITY_POLICY');
    expect(h.bedrock.answer).not.toHaveBeenCalled();
  });

  it('keeps the deterministic provider selected when Bedrock is inactive', async () => {
    process.env.CORO_AI_PROVIDER = 'deterministic-simulated';
    const h = harness();
    const result = await h.gateway.answer('Question', [hit]);
    expect(result.provider).toBe('DETERMINISTIC_SIMULATED');
    expect(h.bedrock.answer).not.toHaveBeenCalled();
  });
});
