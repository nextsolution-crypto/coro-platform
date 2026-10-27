import { DeterministicEmbeddingService } from '../knowledge/deterministic-embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_KNOWLEDGE_CATALOG } from './public-knowledge.catalog';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeIngestionService } from './public-knowledge-ingestion.service';
import { PublicKnowledgeSecurity } from './public-knowledge-security';
import { PUBLIC_KNOWLEDGE_CORPUS_VERSION } from './public-knowledge.types';

async function main() {
  if (
    process.env.PUBLIC_KNOWLEDGE_SYNC_CONFIRMATION !== 'SYNC_PUBLIC_KNOWLEDGE'
  )
    throw new Error('PUBLIC_KNOWLEDGE_SYNC_CONFIRMATION_REQUIRED');

  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const service = new PublicKnowledgeIngestionService(
      prisma,
      new DeterministicEmbeddingService(),
      new PublicKnowledgeSecurity(),
      new PublicKnowledgeConfig(),
    );
    const result = await service.synchronize(PUBLIC_KNOWLEDGE_CATALOG, {
      reconcile: true,
    });
    process.stdout.write(
      `${JSON.stringify({
        status: 'SUCCESS',
        corpusVersion: PUBLIC_KNOWLEDGE_CORPUS_VERSION,
        sourceCount: result.sourceCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        unchangedCount: result.unchangedCount,
        withdrawnCount: result.withdrawnCount,
      })}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      status: 'FAILED',
      errorCode: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
    })}\n`,
  );
  process.exitCode = 1;
});
