import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requireJwtSecret } from '../auth/auth-security.config';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectFilesModule } from '../project-files/project-files.module';
import { CoroAiService } from './coro-ai.service';
import { DeterministicEmbeddingService } from './deterministic-embedding.service';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';
import { KnowledgeChunkerService } from './knowledge-chunker.service';
import { KnowledgeClientController, KnowledgeInternalController } from './knowledge.controller';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeExtractorService } from './knowledge-extractor.service';
import { KnowledgeGroundingService } from './knowledge-grounding.service';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';
import { KnowledgeNormalizer } from './knowledge-normalizer';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { KnowledgeReconciliationService } from './knowledge-reconciliation.service';
import { BedrockProviderAdapter } from './bedrock-provider.adapter';
import { CoroAiProviderGateway } from './coro-ai-provider.gateway';

@Module({
  imports: [
    PrismaModule,
    ProjectFilesModule,
    JwtModule.register({ secret: requireJwtSecret() }),
  ],
  controllers: [KnowledgeInternalController, KnowledgeClientController],
  providers: [
    ClientJwtGuard,
    KnowledgeConfig,
    KnowledgeNormalizer,
    KnowledgeExtractorService,
    KnowledgeChunkerService,
    DeterministicEmbeddingService,
    KnowledgeAuthorizationService,
    KnowledgeIngestionService,
    KnowledgeRetrievalService,
    KnowledgeGroundingService,
    BedrockProviderAdapter,
    CoroAiProviderGateway,
    CoroAiService,
    KnowledgeReconciliationService,
  ],
  exports: [KnowledgeRetrievalService, CoroAiService],
})
export class KnowledgeModule {}
