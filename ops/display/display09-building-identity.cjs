'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

const ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const CLIENT_NAME = 'Groupe Immobilier Prémont';
const BUILDING_NAME = 'Tour Prémont';
const BUILDING_ADDRESS = '1200 boulevard Robert-Bourassa';

const fingerprint = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');

async function inspect(tx) {
  const clients = await tx.client.findMany({
    where: { organizationId: ORGANIZATION_ID, name: CLIENT_NAME },
    select: { id: true, name: true, isActive: true },
  });
  const buildings = await tx.building.findMany({
    where: { organizationId: ORGANIZATION_ID, clientId: { in: clients.map((c) => c.id) } },
    select: {
      id: true, clientId: true, name: true, address: true, city: true, province: true, isActive: true,
    },
    orderBy: { id: 'asc' },
  });
  const matches = buildings.filter((building) =>
    normalize(building.name) === normalize(BUILDING_NAME) &&
    normalize(building.address) === normalize(BUILDING_ADDRESS) &&
    normalize(building.city) === 'montreal',
  );
  const building = matches.length === 1 ? matches[0] : null;
  const [organization, demoFixtures] = await Promise.all([
    tx.organization.findUnique({
      where: { id: ORGANIZATION_ID },
      select: {
        id: true, name: true, isActive: true, isInternal: true, licenseType: true,
        demoEnvironment: { select: { status: true, communicationMode: true, externalProvidersDisabled: true } },
      },
    }),
    building ? tx.demoFixtureRecord.findMany({
      where: { organizationId: ORGANIZATION_ID, entityType: 'BUILDING', entityId: building.id, state: 'ACTIVE' },
      select: { id: true },
    }) : [],
  ]);
  const result = { organization, clients, matches, demoFixtureCount: demoFixtures.length };
  return result;
}

async function run(prisma, secureEvidencePath) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const readOnlyRows = await tx.$queryRawUnsafe('SHOW transaction_read_only');
    const transactionReadOnly = readOnlyRows?.[0]?.transaction_read_only === 'on';
    if (!transactionReadOnly) throw new Error('READ_ONLY_TRANSACTION_NOT_CONFIRMED');
    const result = await inspect(tx);
    const unique = result.clients.length === 1 && result.matches.length === 1;
    const building = unique ? result.matches[0] : null;
    const demo = result.organization?.id === ORGANIZATION_ID && normalize(result.organization?.name) === normalize('CORO Démo') && result.organization?.isActive === true && result.organization?.isInternal === false && result.organization?.demoEnvironment?.status === 'ACTIVE' && result.organization?.demoEnvironment?.communicationMode === 'SIMULATE' && result.organization?.demoEnvironment?.externalProvidersDisabled === true;
    const clientActive = unique && result.clients[0].isActive === true;
    const buildingActive = building?.isActive === true;
    const buildingFictitious = result.demoFixtureCount === 1;
    const accepted = unique && demo && clientActive && buildingActive && buildingFictitious;
    const secure = {
      schemaVersion: 1, readOnly: transactionReadOnly, organizationId: ORGANIZATION_ID,
      clientId: unique ? result.clients[0].id : null,
      buildingId: building?.id ?? null, name: building?.name ?? null,
      address: building ? `${building.address}, ${building.city}, ${building.province}` : null,
      active: building?.isActive ?? null, demoFixtureCount: result.demoFixtureCount,
      buildingFictitious, demo, clientActive, buildingActive,
    };
    fs.writeFileSync(secureEvidencePath, `${JSON.stringify(secure)}\n`, { mode: 0o600 });
    return {
      schemaVersion: 1, execution: accepted ? 'PASS' : 'FAILED', readOnly: transactionReadOnly,
      organizationFingerprint: fingerprint(ORGANIZATION_ID), clientCardinality: result.clients.length,
      buildingCardinality: result.matches.length, buildingFingerprint: building ? fingerprint(building.id) : null,
      nameMatches: building ? normalize(building.name) === normalize(BUILDING_NAME) : false,
      addressMatches: building ? normalize(building.address) === normalize(BUILDING_ADDRESS) : false,
      cityMatches: building ? normalize(building.city) === 'montreal' : false,
      clientActive, active: building?.isActive ?? null, demo,
      buildingFictitious, demoFixtureCount: result.demoFixtureCount,
      postMigrationDisplayGate: 'REQUIRED',
    };
  }, { timeout: 60_000 });
}

async function main() {
  if (process.env.DISPLAY09_BUILDING_INVENTORY_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  if (!process.env.DISPLAY09_SECURE_EVIDENCE_PATH) throw new Error('SECURE_EVIDENCE_PATH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try { process.stdout.write(`${JSON.stringify(await run(prisma, process.env.DISPLAY09_SECURE_EVIDENCE_PATH))}\n`); }
  finally { await prisma.$disconnect(); }
}

function failureCode(error) {
  if (error?.message === 'READ_ONLY_TRANSACTION_NOT_CONFIRMED') return error.message;
  if (/^P\d{4}$/.test(error?.code ?? '')) return `PRISMA_${error.code}`;
  return `UNEXPECTED_${String(error?.name ?? 'ERROR').replace(/[^A-Z0-9_]/gi, '_').toUpperCase()}`;
}

module.exports = { ORGANIZATION_ID, CLIENT_NAME, BUILDING_NAME, BUILDING_ADDRESS, fingerprint, normalize, inspect, run, failureCode };
if (require.main === module || process.env.DISPLAY09_BUILDING_INVENTORY_RUN === 'true') main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', readOnly: true, failureCode: failureCode(error) })}\n`);
  process.exitCode = 1;
});
