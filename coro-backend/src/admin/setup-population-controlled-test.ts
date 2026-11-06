import { PrismaClient } from '@prisma/client';
import { setupPopulationControlledTest } from './population-controlled-test-setup';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await setupPopulationControlledTest(prisma, {
      allowSetup: process.env.ALLOW_POPULATION_CONTROLLED_TEST_SETUP,
      environment: process.env.POPULATION_CONTROLLED_TEST_SETUP_ENVIRONMENT,
      organizationId:
        process.env.POPULATION_CONTROLLED_TEST_SETUP_ORGANIZATION_ID,
      clientId: process.env.POPULATION_CONTROLLED_TEST_SETUP_CLIENT_ID,
      allowedClientId:
        process.env.POPULATION_CONTROLLED_TEST_SETUP_ALLOWED_CLIENT_ID,
      buildingId: process.env.POPULATION_CONTROLLED_TEST_SETUP_BUILDING_ID,
      publicSlug: process.env.POPULATION_CONTROLLED_TEST_SETUP_PUBLIC_SLUG,
      actorUserId: process.env.POPULATION_CONTROLLED_TEST_SETUP_ACTOR_USER_ID,
      dryRun: process.env.DRY_RUN,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur inconnue';
  process.stderr.write(`Setup controle refuse: ${message}\n`);
  process.exitCode = 1;
});
