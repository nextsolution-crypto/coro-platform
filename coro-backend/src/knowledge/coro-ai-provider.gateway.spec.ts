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
      admissibleHits: jest.fn((_question: string, hits: KnowledgeSearchHit[]) => hits),
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
  it.each(['Orme', 'orme'])('abstains for the observed unrelated-code regression (%s) before invoking the model', async (subject) => {
    const bedrock = { answer: jest.fn().mockResolvedValue({ answer: 'CORO-KNOWLEDGE-2026' }) };
    const gateway = new CoroAiProviderGateway(new KnowledgeConfig(), new KnowledgeGroundingService(), bedrock as any);
    const result = await gateway.answer(`Quel est le code de recette de l'objet fictif ${subject} ?`, [{
      ...hit, text: 'DOCUMENT FICTIF. Le code de validation technique est CORO-KNOWLEDGE-2026.',
    }]);
    expect(result).toMatchObject({ provider: 'DOCUMENTARY_POLICY', grounded: { answer: null, usedCitationIds: [] } });
    expect(bedrock.answer).not.toHaveBeenCalled();
  });

  it('allows a subject and value explicitly present in the approved evidence', async () => {
    const bedrock = { answer: jest.fn().mockResolvedValue({ answer: 'CODE-ORME-031' }) };
    const gateway = new CoroAiProviderGateway(new KnowledgeConfig(), new KnowledgeGroundingService(), bedrock as any);
    const relevant = { ...hit, text: 'Orme | CODE-ORME-031 | Echantillon de recette' };
    await gateway.answer("Quel est le code de recette de l'objet fictif Orme ?", [relevant, { ...hit, citationId: 'unrelated', text: 'Le code de validation technique est CORO-KNOWLEDGE-2026.' }]);
    expect(bedrock.answer).toHaveBeenCalledWith(expect.any(String), [relevant]);
  });

  it('abstains on contradictory numeric facts before the model can choose a value', async () => {
    const bedrock = { answer: jest.fn() };
    const gateway = new CoroAiProviderGateway(new KnowledgeConfig(), new KnowledgeGroundingService(), bedrock as any);
    const result = await gateway.answer('Quel est le code Orme ?', [
      { ...hit, citationId: 'v1', text: 'Orme | CODE-ORME-031 | Recette' },
      { ...hit, citationId: 'other', text: 'Orme | CODE-ORME-055 | Recette' },
    ]);
    expect(result.grounded).toMatchObject({ answer: null, usedCitationIds: ['v1','other'] });
    expect(result.grounded.conflicts).toHaveLength(1);
    expect(bedrock.answer).not.toHaveBeenCalled();
  });

  it('does not substitute the current version when the question explicitly requests an unavailable version', async () => {
    const bedrock = { answer: jest.fn() };
    const gateway = new CoroAiProviderGateway(new KnowledgeConfig(), new KnowledgeGroundingService(), bedrock as any);
    const result = await gateway.answer('Quel est le code Orme de la version 2 ?', [
      { ...hit, projectFileVersion: 1, text: 'Orme | CODE-ORME-031 | Recette' },
    ]);
    expect(result.grounded.answer).toBeNull();
    expect(bedrock.answer).not.toHaveBeenCalled();
  });

});
