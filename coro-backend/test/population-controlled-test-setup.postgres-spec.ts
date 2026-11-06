import {
  PopulationDeliveryMode,
  PopulationGovernanceMode,
  PopulationProgramStatus,
  PrismaClient,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  CONTROLLED_TEST_BUILDING_ID,
  CONTROLLED_TEST_ENVIRONMENT,
  CONTROLLED_TEST_ORGANIZATION_ID,
  CONTROLLED_TEST_PUBLIC_SLUG,
  setupPopulationControlledTest,
} from '../src/admin/population-controlled-test-setup';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('controlled Population setup PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const clientId = `sp-ops-04b-client-${randomUUID()}`;
  const actorEmail = `sp-ops-04b-${randomUUID()}@example.invalid`;
  let actorUserId = '';
  let programId = '';

  beforeAll(async () => {
    await prisma.$connect();
    const collision = await prisma.organization.findUnique({
      where: { id: CONTROLLED_TEST_ORGANIZATION_ID },
    });
    if (collision) throw new Error('TEST_DATABASE_NOT_ISOLATED');
    await prisma.organization.create({
      data: {
        id: CONTROLLED_TEST_ORGANIZATION_ID,
        name: 'CORO Demo - test PostgreSQL isole',
        isActive: true,
        isInternal: false,
      },
    });
    await prisma.client.create({
      data: {
        id: clientId,
        organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
        name: 'Client QA fictif SP-OPS-04B',
        regulatoryRequirements: [],
      },
    });
    const actor = await prisma.user.create({
      data: {
        email: actorEmail,
        password: 'not-used-by-this-test',
        firstName: 'QA',
        lastName: 'Provisioning Admin',
        role: 'ADMIN',
        organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
        isActive: true,
      },
      select: { id: true },
    });
    actorUserId = actor.id;
  });

  afterAll(async () => {
    if (programId) {
      await prisma.auditLog.deleteMany({
        where: { organizationId: CONTROLLED_TEST_ORGANIZATION_ID },
      });
      await prisma.populationProgram.deleteMany({ where: { id: programId } });
      const profile = await prisma.rueFacilityProfile.findUnique({
        where: { buildingId: CONTROLLED_TEST_BUILDING_ID },
        select: { id: true },
      });
      if (profile) {
        await prisma.rueImpactZone.deleteMany({
          where: { scenario: { facilityProfileId: profile.id } },
        });
        await prisma.rueEmergencyScenario.deleteMany({
          where: { facilityProfileId: profile.id },
        });
        await prisma.rueFacilityProfile.delete({ where: { id: profile.id } });
      }
    }
    await prisma.building.deleteMany({
      where: { id: CONTROLLED_TEST_BUILDING_ID },
    });
    await prisma.user.deleteMany({ where: { id: actorUserId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.organization.deleteMany({
      where: { id: CONTROLLED_TEST_ORGANIZATION_ID },
    });
    await prisma.$disconnect();
  });

  it('dry-run, provisionnement atomique et reprise idempotente', async () => {
    const common = {
      allowSetup: 'true',
      environment: CONTROLLED_TEST_ENVIRONMENT,
      organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
      clientId,
      allowedClientId: clientId,
      buildingId: CONTROLLED_TEST_BUILDING_ID,
      publicSlug: CONTROLLED_TEST_PUBLIC_SLUG,
      actorUserId,
    };
    const dryRun = await setupPopulationControlledTest(prisma, {
      ...common,
      dryRun: 'true',
    });
    expect(
      await prisma.building.findUnique({
        where: { id: CONTROLLED_TEST_BUILDING_ID },
      }),
    ).toBeNull();

    const first = await setupPopulationControlledTest(prisma, common);
    const second = await setupPopulationControlledTest(prisma, common);
    const [concurrentA, concurrentB] = await Promise.all([
      setupPopulationControlledTest(prisma, common),
      setupPopulationControlledTest(prisma, common),
    ]);
    programId = first.programId;
    expect({ ...first, dryRun: true }).toEqual(dryRun);
    expect(second).toEqual(first);
    expect(concurrentA).toEqual(first);
    expect(concurrentB).toEqual(first);

    const program = await prisma.populationProgram.findUniqueOrThrow({
      where: { id: first.programId },
      include: {
        subscribers: true,
        rueFacilityProfile: {
          include: {
            building: true,
            emergencyScenarios: { include: { impactZones: true } },
          },
        },
      },
    });
    expect(program.status).toBe(PopulationProgramStatus.CONFIGURING);
    expect(program.deliveryMode).toBe(PopulationDeliveryMode.SANDBOX);
    expect(program.governanceMode).toBe(PopulationGovernanceMode.DUAL_CONTROL);
    expect(program.registrationEnabled).toBe(false);
    expect(program.smsEnabled).toBe(false);
    expect(program.emailEnabled).toBe(false);
    expect(program.subscribers).toHaveLength(0);
    expect(program.rueFacilityProfile.building.buildingType).toBe(
      'QA_FICTITIOUS_SENTINELLE_POPULATION',
    );
    expect(program.rueFacilityProfile.emergencyScenarios).toHaveLength(1);
    expect(
      program.rueFacilityProfile.emergencyScenarios[0].impactZones,
    ).toHaveLength(1);
    expect(
      await prisma.auditLog.count({
        where: {
          organizationId: CONTROLLED_TEST_ORGANIZATION_ID,
          action: 'POPULATION_CONTROLLED_TEST_PROVISIONED',
        },
      }),
    ).toBe(1);
  });
});
