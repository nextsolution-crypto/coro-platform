'use strict';

const crypto = require('node:crypto');

const ORGANIZATION_ID = '916f54ec-af22-45e0-99db-a369d9630002';
const EXPECTED_BUILDING_FINGERPRINT = '5ba4072e9e0027d5b74ff469e5424463f671eb76b9c052db8f024b2450b0f3ec';
const FIXTURE_NAMESPACE = 'display-09-demo-pilot';
const FIXTURE_KEY = 'tour-premont-building';
const OWNER_DECISION = 'DISPLAY-09-TOUR-PREMONT-DEMO-OWNER-DECISION-2026-11-13';

const fingerprint = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');

async function resolveCanonical(tx, expectedBuildingFingerprint = EXPECTED_BUILDING_FINGERPRINT) {
  const organization = await tx.organization.findUnique({
    where: { id: ORGANIZATION_ID },
    select: { id: true, name: true, isActive: true, demoEnvironment: { select: { status: true, communicationMode: true, externalProvidersDisabled: true } } },
  });
  if (!organization || normalize(organization.name) !== normalize('CORO Demo') || !organization.isActive || organization.demoEnvironment?.status !== 'ACTIVE' || organization.demoEnvironment?.communicationMode !== 'SIMULATE' || organization.demoEnvironment?.externalProvidersDisabled !== true) {
    throw new Error('CANONICAL_DEMO_ORGANIZATION_NOT_ADMISSIBLE');
  }
  const allClients = await tx.client.findMany({ where: { organizationId: ORGANIZATION_ID, isActive: true }, select: { id: true, name: true } });
  const clients = allClients.filter((client) => normalize(client.name) === normalize('Groupe Immobilier Premont'));
  if (clients.length !== 1) throw new Error('CANONICAL_CLIENT_CARDINALITY_INVALID');
  const buildings = await tx.building.findMany({
    where: { organizationId: ORGANIZATION_ID, clientId: clients[0].id, isActive: true },
    select: { id: true, name: true },
  });
  const matches = buildings.filter((building) => normalize(building.name) === normalize('Tour Premont'));
  if (matches.length !== 1 || fingerprint(matches[0].id) !== expectedBuildingFingerprint) throw new Error('CANONICAL_BUILDING_MISMATCH');
  return { organization, clientId: clients[0].id, buildingId: matches[0].id };
}

async function register(prisma, runId = 'manual', expectedBuildingFingerprint = EXPECTED_BUILDING_FINGERPRINT) {
  return prisma.$transaction(async (tx) => {
    const target = await resolveCanonical(tx, expectedBuildingFingerprint);
    const entityRecord = await tx.demoFixtureRecord.findUnique({
      where: { organizationId_entityType_entityId: { organizationId: ORGANIZATION_ID, entityType: 'BUILDING', entityId: target.buildingId } },
      select: { id: true, fixtureNamespace: true, fixtureKey: true, state: true },
    });
    if (entityRecord && (entityRecord.fixtureNamespace !== FIXTURE_NAMESPACE || entityRecord.fixtureKey !== FIXTURE_KEY)) throw new Error('BUILDING_ALREADY_REGISTERED_BY_OTHER_FIXTURE');
    const keyRecord = await tx.demoFixtureRecord.findUnique({
      where: { organizationId_fixtureNamespace_fixtureKey: { organizationId: ORGANIZATION_ID, fixtureNamespace: FIXTURE_NAMESPACE, fixtureKey: FIXTURE_KEY } },
      select: { entityType: true, entityId: true },
    });
    if (keyRecord && (keyRecord.entityType !== 'BUILDING' || keyRecord.entityId !== target.buildingId)) throw new Error('FIXTURE_KEY_COLLISION');
    const created = !entityRecord;
    const record = await tx.demoFixtureRecord.upsert({
      where: { organizationId_fixtureNamespace_fixtureKey: { organizationId: ORGANIZATION_ID, fixtureNamespace: FIXTURE_NAMESPACE, fixtureKey: FIXTURE_KEY } },
      create: {
        organizationId: ORGANIZATION_ID, fixtureNamespace: FIXTURE_NAMESPACE, fixtureKey: FIXTURE_KEY,
        entityType: 'BUILDING', entityId: target.buildingId, state: 'ACTIVE',
        baseline: { ownerDecision: OWNER_DECISION, reversible: true, mutationScope: 'REGISTRY_ONLY', runId: String(runId) },
      },
      update: { state: 'ACTIVE' },
      select: { id: true, entityId: true, state: true },
    });
    const count = await tx.demoFixtureRecord.count({ where: { organizationId: ORGANIZATION_ID, entityType: 'BUILDING', entityId: target.buildingId, state: 'ACTIVE' } });
    if (count !== 1) throw new Error('FIXTURE_REGISTRATION_POSTCONDITION_FAILED');
    return { schemaVersion: 1, execution: 'PASS', created, registryOnly: true, reversible: true, buildingFingerprint: fingerprint(record.entityId), activeFixtureCount: count, state: record.state, postMigrationDisplayGate: 'REQUIRED' };
  }, { isolationLevel: 'Serializable', timeout: 60_000 });
}

async function unregister(prisma, expectedBuildingFingerprint = EXPECTED_BUILDING_FINGERPRINT) {
  return prisma.$transaction(async (tx) => {
    const target = await resolveCanonical(tx, expectedBuildingFingerprint);
    const record = await tx.demoFixtureRecord.findUnique({
      where: { organizationId_fixtureNamespace_fixtureKey: { organizationId: ORGANIZATION_ID, fixtureNamespace: FIXTURE_NAMESPACE, fixtureKey: FIXTURE_KEY } },
      select: { id: true, entityType: true, entityId: true },
    });
    if (!record) return { schemaVersion: 1, execution: 'PASS', removed: false, registryOnly: true };
    if (record.entityType !== 'BUILDING' || record.entityId !== target.buildingId) throw new Error('FIXTURE_KEY_COLLISION');
    await tx.demoFixtureRecord.delete({ where: { id: record.id } });
    return { schemaVersion: 1, execution: 'PASS', removed: true, registryOnly: true };
  }, { isolationLevel: 'Serializable', timeout: 60_000 });
}

async function main() {
  if (process.env.DISPLAY09_FIXTURE_REGISTRATION_RUN !== 'true') throw new Error('EXPLICIT_RUNTIME_SWITCH_REQUIRED');
  const { PrismaClient } = require('/app/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  try { process.stdout.write(`${JSON.stringify(await register(prisma, process.env.GITHUB_RUN_ID))}\n`); }
  finally { await prisma.$disconnect(); }
}

module.exports = { ORGANIZATION_ID, EXPECTED_BUILDING_FINGERPRINT, FIXTURE_NAMESPACE, FIXTURE_KEY, fingerprint, normalize, resolveCanonical, register, unregister };
if (require.main === module) main().catch((error) => { process.stdout.write(`${JSON.stringify({ schemaVersion: 1, execution: 'FAILED', failureCode: error.message })}\n`); process.exitCode = 1; });
