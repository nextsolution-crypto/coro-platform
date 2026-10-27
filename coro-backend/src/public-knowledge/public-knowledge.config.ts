import { Injectable } from '@nestjs/common';

@Injectable()
export class PublicKnowledgeConfig {
  readonly enabled = process.env.WEB_AI_PUBLIC_KNOWLEDGE_ENABLED === 'true';
  readonly maxResults = 5;
  readonly maxQuestionLength = 2_000;
  readonly chunkCharacters = 1_200;
  readonly searchThreshold = 0.16;
}
