import { DocumentaryPublicAssistantProvider } from './documentary-public-assistant.provider';

describe('DocumentaryPublicAssistantProvider', () => {
  it('returns only admitted source identifiers without free synthesis', async () => {
    const provider = new DocumentaryPublicAssistantProvider();
    await expect(
      provider.generate({
        question: 'Comment gérer plusieurs bâtiments ?',
        language: 'fr-CA',
        history: [],
        sources: [
          {
            sourceId: 'public-1',
            title: 'CORO Network',
            canonicalUrl: 'https://getcoro.io/coro-network',
            version: 2,
            language: 'fr-CA',
            excerpt: 'Texte officiel.',
          },
        ],
      }),
    ).resolves.toMatchObject({
      supportingSourceIds: ['public-1'],
      suggestedRouteKeys: [],
    });
  });
});
