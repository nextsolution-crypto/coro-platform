import { Module } from '@nestjs/common';
import { DeterministicEmbeddingService } from '../knowledge/deterministic-embedding.service';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeController } from './public-knowledge.controller';
import { PublicKnowledgeIngestionService } from './public-knowledge-ingestion.service';
import { PublicKnowledgeSearchService } from './public-knowledge-search.service';
import { PublicKnowledgeSecurity } from './public-knowledge-security';

@Module({
  controllers: [PublicKnowledgeController],
  providers: [
    PublicKnowledgeConfig,
    PublicKnowledgeSecurity,
    DeterministicEmbeddingService,
    PublicKnowledgeIngestionService,
    PublicKnowledgeSearchService,
  ],
  exports: [
    PublicKnowledgeConfig,
    PublicKnowledgeIngestionService,
    PublicKnowledgeSearchService,
  ],
})
export class PublicKnowledgeModule {}
