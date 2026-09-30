const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  if (process.argv[2] === 'seed') {
    await prisma.organization.create({
      data: { id: 'phase3c-baseline-org', name: 'Baseline populated' },
    });
    return;
  }
  const [preserved, metering] = await Promise.all([
    prisma.organization.count({ where: { id: 'phase3c-baseline-org' } }),
    prisma.meteringResult.count(),
  ]);
  console.log(`preserved=${preserved} metering=${metering}`);
  if (preserved !== 1 || metering !== 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
