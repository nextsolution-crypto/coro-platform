'use strict';

const ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const LOCATION_CODE = 'E03-DISPLAY-PILOT';
const BUILDING_NAME = 'Tour Prémont';
const PUBLIC_ID = /^[A-Za-z0-9_-]{16,24}$/;

async function inspect(tx) {
  return tx.displayLocation.findMany({
    where: { organizationId: ORGANIZATION_ID, code: LOCATION_CODE },
    select: {
      id: true,
      publicDisplayId: true,
      status: true,
      building: { select: { name: true, isActive: true } },
      planPublications: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ versionNumber: 'desc' }, { id: 'asc' }],
        select: { id: true, versionNumber: true, status: true },
      },
    },
    orderBy: { id: 'asc' },
  });
}

async function run(prisma) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const rows = await tx.$queryRawUnsafe('SHOW transaction_read_only');
    if (rows?.[0]?.transaction_read_only !== 'on')
      throw new Error('READ_ONLY_TRANSACTION_NOT_CONFIRMED');

    const locations = await inspect(tx);
    const location = locations.length === 1 ? locations[0] : null;
    const publication = location?.planPublications?.[0] ?? null;
    const accepted =
      locations.length === 1 &&
      location.status === 'ACTIVE' &&
      location.building?.name === BUILDING_NAME &&
      location.building?.isActive === true &&
      PUBLIC_ID.test(location.publicDisplayId ?? '') &&
      publication?.status === 'PUBLISHED' &&
      publication.versionNumber >= 1;

    return {
      schemaVersion: 1,
      execution: accepted ? 'PASS' : 'FAILED',
      readOnly: true,
      organizationId: ORGANIZATION_ID,
      locationCode: LOCATION_CODE,
      locationCardinality: locations.length,
      locationId: location?.id ?? null,
      publicDisplayId: location?.publicDisplayId ?? null,
      playerPath: location?.publicDisplayId ? `/d/${location.publicDisplayId}` : null,
      locationStatus: location?.status ?? null,
      buildingMatches: location?.building?.name === BUILDING_NAME,
      buildingActive: location?.building?.isActive ?? null,
      publishedVersion: publication?.versionNumber ?? null,
      publicationStatus: publication?.status ?? null,
    };
  }, { timeout: 60_000 });
}

async function main() {
  if (process.env.DISPLAY09_PUBLISHED_LOCATION_RUN !== 'true')
    throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try {
    const result = await run(prisma);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.execution !== 'PASS') process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { ORGANIZATION_ID, LOCATION_CODE, BUILDING_NAME, PUBLIC_ID, inspect, run };
if (require.main === module || process.env.DISPLAY09_PUBLISHED_LOCATION_RUN === 'true')
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', readOnly: true, failureCode: error.message })}\n`);
    process.exitCode = 1;
  });
