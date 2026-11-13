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
      _count: { select: { displayLocations: true } },
    },
    orderBy: { id: 'asc' },
  });
  const matches = buildings.filter((building) =>
    normalize(building.name) === normalize(BUILDING_NAME) &&
    normalize(building.address) === normalize(BUILDING_ADDRESS) &&
    normalize(building.city) === 'montreal',
  );
  const building = matches.length === 1 ? matches[0] : null;
  const [organization, internalAuthorities, clientAuthorities] = await Promise.all([
    tx.organization.findUnique({ where: { id: ORGANIZATION_ID }, select: { id: true, name: true, isActive: true, isInternal: true, licenseType: true } }),
    building ? tx.user.findMany({
      where: { organizationId: ORGANIZATION_ID, isActive: true, displayBuildingIds: { has: building.id } },
      select: { id: true, displayPermissions: true },
    }) : [],
    building ? tx.clientUser.findMany({
      where: { organizationId: ORGANIZATION_ID, clientId: building.clientId, isActive: true, displayBuildingIds: { has: building.id } },
      select: { id: true, displayPermissions: true },
    }) : [],
  ]);
  const hasDisplayRead = (entry) => entry.displayPermissions.includes('DISPLAY_CLIENT_PLAN_READ') || entry.displayPermissions.includes('DISPLAY_READ');
  const result = {
    organization, clients, matches,
    displayAuthorityCount: [...internalAuthorities, ...clientAuthorities].filter(hasDisplayRead).length,
  };
  return result;
}

async function run(prisma, secureEvidencePath) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const result = await inspect(tx);
    const unique = result.clients.length === 1 && result.matches.length === 1;
    const building = unique ? result.matches[0] : null;
    const demo = result.organization?.id === ORGANIZATION_ID && result.organization?.name === 'CORO Démo' && result.organization?.isActive === true && result.organization?.isInternal === false;
    const secure = {
      schemaVersion: 1, readOnly: true, organizationId: ORGANIZATION_ID,
      clientId: unique ? result.clients[0].id : null,
      buildingId: building?.id ?? null, name: building?.name ?? null,
      address: building ? `${building.address}, ${building.city}, ${building.province}` : null,
      active: building?.isActive ?? null, displayLocationCount: building?._count.displayLocations ?? null,
      displayAuthorityCount: result.displayAuthorityCount, demo,
    };
    fs.writeFileSync(secureEvidencePath, `${JSON.stringify(secure)}\n`, { mode: 0o600 });
    return {
      schemaVersion: 1, execution: unique && demo ? 'PASS' : 'FAILED', readOnly: true,
      organizationFingerprint: fingerprint(ORGANIZATION_ID), clientCardinality: result.clients.length,
      buildingCardinality: result.matches.length, buildingFingerprint: building ? fingerprint(building.id) : null,
      nameMatches: building?.name === BUILDING_NAME, addressMatches: building ? normalize(building.address) === normalize(BUILDING_ADDRESS) : false,
      active: building?.isActive ?? null, demo, displayAuthorityCount: result.displayAuthorityCount,
      displayLocationCount: building?._count.displayLocations ?? null,
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

module.exports = { ORGANIZATION_ID, CLIENT_NAME, BUILDING_NAME, BUILDING_ADDRESS, fingerprint, normalize, inspect, run };
if (require.main === module) main().catch(() => { process.stdout.write('{"schemaVersion":1,"execution":"FAILED","readOnly":true}\n'); process.exitCode = 1; });
