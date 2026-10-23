import { BedrockProviderAdapter } from './bedrock-provider.adapter';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeSearchHit } from './knowledge.types';

const hit: KnowledgeSearchHit = {
  chunkId: 'chunk-1',
  citationId: 'citation-1',
  projectFileId: 'file-1',
  projectFileVersion: 2,
  documentName: 'Plan approuve',
  buildingId: 'building-1',
  pageStart: 4,
  pageEnd: 4,
  sectionPath: 'Evacuation',
  text: 'Le point de rassemblement est situe dans la cour nord.',
  score: 0.92,
  sourceSha256: 'a'.repeat(64),
};

describe('BedrockProviderAdapter', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.CORO_AI_PROVIDER = 'bedrock';
    process.env.CORO_AI_BEDROCK_INVOCATION_ENABLED = 'true';
    process.env.CORO_AI_BEDROCK_REGION = 'ca-central-1';
    process.env.CORO_AI_BEDROCK_MODEL_ID = 'ca.amazon.nova-lite-v1:0';
  });

  afterAll(() => {
    process.env = original;
  });

  it('accepte une reponse simulee strictement fondee sur une citation autorisee', async () => {
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({
      send: jest.fn().mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  answer: 'Le point de rassemblement est dans la cour nord.',
                  uncertainty: null,
                  missingInformation: [],
                  conflicts: [],
                  usedCitationIds: ['citation-1'],
                }),
              },
            ],
          },
        },
      }),
    } as never);

    await expect(adapter.answer('Ou est le point?', [hit])).resolves.toMatchObject({
      usedCitationIds: ['citation-1'],
    });
  });

  it('refuse une citation inventee par le fournisseur', async () => {
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({
      send: jest.fn().mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  answer: 'Reponse non fondee',
                  uncertainty: null,
                  missingInformation: [],
                  conflicts: [],
                  usedCitationIds: ['citation-interdite'],
                }),
              },
            ],
          },
        },
      }),
    } as never);

    await expect(adapter.answer('Question', [hit])).rejects.toThrow(
      'Citation Bedrock non autorisee',
    );
  });

  it('reste desactive sans gate d invocation explicite', async () => {
    process.env.CORO_AI_BEDROCK_INVOCATION_ENABLED = 'false';
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({ send: jest.fn() } as never);
    await expect(adapter.answer('Question', [hit])).rejects.toThrow(
      'Invocation Bedrock non autorisee',
    );
  });
});
