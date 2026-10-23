import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const since = new Date(Date.now() - 86400000);
    const [ingestions, failures, interactions] = await Promise.all([
      prisma.projectFileKnowledgeIngestion.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.projectFileKnowledgeIngestion.groupBy({ by: ['lastErrorCode'], where: { status: 'FAILED' }, _count: { _all: true } }),
      prisma.coroKnowledgeInteraction.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    ]);
    console.log(JSON.stringify({ status: 'PASS', windowHours: 24,
      ingestions: ingestions.map(value => ({ status: value.status, count: value._count._all })),
      failures: failures.map(value => ({ code: /^[A-Z_]{3,100}$/.test(value.lastErrorCode ?? '') ? value.lastErrorCode : 'EXTRACTION_FAILED', count: value._count._all })),
      interactions: interactions.map(value => ({ status: value.status, count: value._count._all })),
    }));
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('KNOWLEDGE_HEALTH_UNAVAILABLE'); process.exitCode = 1; });
