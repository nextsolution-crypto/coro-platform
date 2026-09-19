import { PopulationProgramStatus, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { setupPopulationLiveValidation } from '../src/admin/population-live-setup';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Population LIVE setup PostgreSQL', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const suffix = randomUUID();
  const ids = {
    organization: `live-setup-org-${suffix}`,
    client: `live-setup-client-${suffix}`,
    building: `live-setup-building-${suffix}`,
  };
  const publicSlug = `live-setup-${suffix}`;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: { id: ids.organization, name: 'LIVE setup PostgreSQL test' },
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        name: 'LIVE setup PostgreSQL test',
        organizationId: ids.organization,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        name: 'LIVE setup PostgreSQL test',
        address: 'Adresse publique de test',
        city: 'Boucherville',
        province: 'QC',
        latitude: 45.5,
        longitude: -73.4,
        organizationId: ids.organization,
        clientId: ids.client,
      },
    });
  });

  afterAll(async () => {
    const profile = await prisma.rueFacilityProfile.findUnique({
      where: { buildingId: ids.building },
      select: { id: true },
    });
    if (profile) {
      await prisma.populationProgram.deleteMany({
        where: { rueFacilityProfileId: profile.id },
      });
      await prisma.rueImpactZone.deleteMany({
        where: { scenario: { facilityProfileId: profile.id } },
      });
      await prisma.rueEmergencyScenario.deleteMany({
        where: { facilityProfileId: profile.id },
      });
      await prisma.rueFacilityProfile.delete({ where: { id: profile.id } });
    }
    await prisma.building.deleteMany({ where: { id: ids.building } });
    await prisma.client.deleteMany({ where: { id: ids.client } });
    await prisma.organization.deleteMany({ where: { id: ids.organization } });
    await prisma.$disconnect();
  });

  it('dry-run sans ecriture, puis creation idempotente sans subscriber', async () => {
    const commonInput = {
      allowSetup: 'true',
      buildingId: ids.building,
      publicSlug,
    };
    const dryRun = await setupPopulationLiveValidation(prisma, {
      ...commonInput,
      dryRun: 'true',
    });
    expect(
      await prisma.rueFacilityProfile.findUnique({
        where: { buildingId: ids.building },
      }),
    ).toBeNull();

    const first = await setupPopulationLiveValidation(prisma, commonInput);
    const second = await setupPopulationLiveValidation(prisma, commonInput);
    expect(first).toEqual(dryRun);
    expect(second).toEqual(first);

    const program = await prisma.populationProgram.findUniqueOrThrow({
      where: { id: first.programId },
      include: {
        subscribers: true,
        rueFacilityProfile: {
          include: {
            emergencyScenarios: { include: { impactZones: true } },
          },
        },
      },
    });
    expect(program.status).toBe(PopulationProgramStatus.CONFIGURING);
    expect(program.deliveryMode).toBe('LIVE');
    expect(program.governanceMode).toBe('STANDARD');
    expect(program.emailEnabled).toBe(true);
    expect(program.smsEnabled).toBe(false);
    expect(program.subscribers).toHaveLength(0);
    expect(program.rueFacilityProfile.emergencyScenarios).toHaveLength(1);
    expect(
      program.rueFacilityProfile.emergencyScenarios[0].impactZones,
    ).toHaveLength(1);
  });
});
