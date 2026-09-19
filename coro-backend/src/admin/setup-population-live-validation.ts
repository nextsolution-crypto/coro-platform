import { PrismaClient } from '@prisma/client';
import { setupPopulationLiveValidation } from './population-live-setup';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await setupPopulationLiveValidation(prisma, {
      allowSetup: process.env.ALLOW_POPULATION_LIVE_SETUP,
      buildingId: process.env.BUILDING_ID,
      publicSlug: process.env.PUBLIC_SLUG,
      programNameFR: process.env.PROGRAM_NAME_FR,
      programNameEN: process.env.PROGRAM_NAME_EN,
      dryRun: process.env.DRY_RUN,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erreur inconnue';
  process.stderr.write(`Setup Population refuse: ${message}\n`);
  process.exitCode = 1;
});
