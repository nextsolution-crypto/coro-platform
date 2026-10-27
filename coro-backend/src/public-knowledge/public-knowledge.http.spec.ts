/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeController } from './public-knowledge.controller';
import { PublicKnowledgeSearchService } from './public-knowledge-search.service';

describe('PublicKnowledgeController HTTP contract v1', () => {
  let app: INestApplication;
  const answerContext = jest.fn(async (question, language, limit) => ({
    question,
    language,
    limit,
    status: 'SUPPORTED',
    sources: [],
  }));

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicKnowledgeController],
      providers: [
        { provide: PublicKnowledgeConfig, useValue: { enabled: true } },
        { provide: PublicKnowledgeSearchService, useValue: { answerContext } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('accepts only the versioned public contract', async () => {
    await request(app.getHttpServer())
      .post('/public-knowledge/v1/search')
      .send({ question: 'Que fait CORO ?', language: 'fr-CA', limit: 3 })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ language: 'fr-CA', limit: 3 });
      });
  });

  it.each(['organizationId', 'tenantId', 'buildingId', 'corpus'])(
    'rejects the forbidden private selector %s',
    async (selector) => {
      await request(app.getHttpServer())
        .post('/public-knowledge/v1/search')
        .send({
          question: 'Que fait CORO ?',
          language: 'fr-CA',
          [selector]: 'private-authority',
        })
        .expect(400);
    },
  );
});
