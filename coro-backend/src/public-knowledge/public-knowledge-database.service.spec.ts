import { PublicKnowledgeDatabaseService } from './public-knowledge-database.service';

describe('PublicKnowledgeDatabaseService', () => {
  const previousEnabled = process.env.WEB_AI_PUBLIC_KNOWLEDGE_ENABLED;
  const previousUrl = process.env.PUBLIC_KNOWLEDGE_DATABASE_URL;

  afterEach(() => {
    if (previousEnabled === undefined)
      delete process.env.WEB_AI_PUBLIC_KNOWLEDGE_ENABLED;
    else process.env.WEB_AI_PUBLIC_KNOWLEDGE_ENABLED = previousEnabled;
    if (previousUrl === undefined)
      delete process.env.PUBLIC_KNOWLEDGE_DATABASE_URL;
    else process.env.PUBLIC_KNOWLEDGE_DATABASE_URL = previousUrl;
  });

  it('fails closed when public retrieval is enabled without a dedicated database identity', () => {
    process.env.WEB_AI_PUBLIC_KNOWLEDGE_ENABLED = 'true';
    delete process.env.PUBLIC_KNOWLEDGE_DATABASE_URL;
    expect(() => new PublicKnowledgeDatabaseService()).toThrow(
      'PUBLIC_KNOWLEDGE_DATABASE_URL_REQUIRED',
    );
  });

  it('does not require or initialize the public identity while the feature is disabled', async () => {
    process.env.WEB_AI_PUBLIC_KNOWLEDGE_ENABLED = 'false';
    delete process.env.PUBLIC_KNOWLEDGE_DATABASE_URL;
    const service = new PublicKnowledgeDatabaseService();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    await service.$disconnect();
  });
});
