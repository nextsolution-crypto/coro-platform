/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { ServiceUnavailableException } from '@nestjs/common';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeController } from './public-knowledge.controller';

describe('PublicKnowledgeController', () => {
  it('fails closed while the production-default feature flag is disabled', async () => {
    const config = new PublicKnowledgeConfig();
    const search = { answerContext: jest.fn() } as any;
    const controller = new PublicKnowledgeController(config, search);
    expect(() =>
      controller.query({ question: 'CORO', language: 'fr-CA', limit: 5 }),
    ).toThrow(ServiceUnavailableException);
    expect(search.answerContext).not.toHaveBeenCalled();
  });

  it('exposes only the versioned public query contract when explicitly enabled', async () => {
    const config = Object.assign(new PublicKnowledgeConfig(), {
      enabled: true,
    });
    const search = {
      answerContext: jest.fn(async () => ({
        status: 'SUPPORTED',
        sources: [],
      })),
    } as any;
    const controller = new PublicKnowledgeController(config, search);
    await expect(
      controller.query({ question: 'CORO', language: 'fr-CA', limit: 3 }),
    ).resolves.toMatchObject({ status: 'SUPPORTED' });
    expect(search.answerContext).toHaveBeenCalledWith('CORO', 'fr-CA', 3);
  });
});
