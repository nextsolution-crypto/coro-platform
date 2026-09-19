import {
  CoroActorType,
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationOperationalEventStatus,
  PopulationProgramStatus,
  Prisma,
  PrismaClient,
  RueAssessmentStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

const databaseUrl = process.env.TEST_DATABASE_URL;

if (process.env.CI && !databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL est obligatoire en CI pour les tests PostgreSQL',
  );
}

const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Population operational event PostgreSQL invariants', () => {
  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();
  const suffix = randomUUID();
  const ids = {
    organization: `event-org-${suffix}`,
    client: `event-client-${suffix}`,
    building: `event-building-${suffix}`,
    profile: `event-profile-${suffix}`,
    program: `event-program-${suffix}`,
    scenario: `event-scenario-${suffix}`,
  };

  const createEvent = (data: Record<string, unknown> = {}) =>
    prisma.populationOperationalEvent.create({
      data: {
        organizationId: ids.organization,
        programId: ids.program,
        emergencyScenarioId: ids.scenario,
        startedByType: CoroActorType.SYSTEM,
        startedById: 'postgres-tests',
        ...data,
      },
    });

  const createAlert = (id: string, data: Record<string, unknown> = {}) =>
    prisma.populationAlert.create({
      data: {
        id,
        programId: ids.program,
        emergencyScenarioId: ids.scenario,
        type: PopulationAlertType.TEST,
        status: PopulationAlertStatus.DRAFT,
        titleFR: 'Test PostgreSQL',
        messageFR: 'Test PostgreSQL',
        createdByType: CoroActorType.SYSTEM,
        createdById: 'postgres-tests',
        ...data,
      },
    });

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: { id: ids.organization, name: 'Operational event tests' },
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        name: 'Operational event tests',
        organizationId: ids.organization,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        name: 'Operational event tests',
        address: 'Test only',
        city: 'Test',
        province: 'QC',
        organizationId: ids.organization,
        clientId: ids.client,
      },
    });
    await prisma.rueFacilityProfile.create({
      data: {
        id: ids.profile,
        buildingId: ids.building,
        assessmentStatus: RueAssessmentStatus.CONFIRMED_SUBJECT,
        populationEnabled: true,
      },
    });
    await prisma.populationProgram.create({
      data: {
        id: ids.program,
        rueFacilityProfileId: ids.profile,
        status: PopulationProgramStatus.ACTIVE,
        publicSlug: `event-${suffix}`,
        nameFR: 'Operational event tests',
      },
    });
    await prisma.rueEmergencyScenario.create({
      data: {
        id: ids.scenario,
        facilityProfileId: ids.profile,
        nameFR: 'Operational event tests',
      },
    });
  });

  afterEach(async () => {
    await prisma.populationAlert.deleteMany({
      where: { programId: ids.program },
    });
    await prisma.populationOperationalEvent.deleteMany({
      where: { programId: ids.program },
    });
  });

  afterAll(async () => {
    await prisma.rueEmergencyScenario.deleteMany({
      where: { id: ids.scenario },
    });
    await prisma.populationProgram.deleteMany({ where: { id: ids.program } });
    await prisma.rueFacilityProfile.deleteMany({ where: { id: ids.profile } });
    await prisma.building.deleteMany({ where: { id: ids.building } });
    await prisma.client.deleteMany({ where: { id: ids.client } });
    await prisma.organization.deleteMany({ where: { id: ids.organization } });
    await prisma.$disconnect();
  });

  it('A: une seule de deux créations ACTIVE simultanées réussit', async () => {
    const results = await Promise.allSettled([createEvent(), createEvent()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });

  it('B/C: conserve plusieurs ENDED puis autorise un nouvel ACTIVE', async () => {
    await createEvent({ status: PopulationOperationalEventStatus.ENDED });
    await createEvent({ status: PopulationOperationalEventStatus.ENDED });
    await expect(createEvent()).resolves.toMatchObject({
      status: PopulationOperationalEventStatus.ACTIVE,
    });
  });

  it('D: impose une séquence unique dans un événement', async () => {
    const event = await createEvent();
    await createAlert(`event-alert-1-${suffix}`, {
      operationalEventId: event.id,
      cycleSequence: 1,
    });
    await expect(
      createAlert(`event-alert-2-${suffix}`, {
        operationalEventId: event.id,
        cycleSequence: 1,
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it('E/G: accepte plusieurs alertes historiques NULL sans les modifier', async () => {
    const first = await createAlert(`historical-alert-1-${suffix}`);
    const second = await createAlert(`historical-alert-2-${suffix}`);
    expect(first.operationalEventId).toBeNull();
    expect(first.cycleSequence).toBeNull();
    expect(second.operationalEventId).toBeNull();
    expect(second.cycleSequence).toBeNull();
  });

  it('F: protège programme/scénario et empêche la suppression d’un event référencé', async () => {
    const event = await createEvent();
    await createAlert(`restricted-alert-${suffix}`, {
      operationalEventId: event.id,
      cycleSequence: 1,
    });
    await expect(
      prisma.populationOperationalEvent.delete({ where: { id: event.id } }),
    ).rejects.toThrow();
    await expect(
      prisma.rueEmergencyScenario.delete({ where: { id: ids.scenario } }),
    ).rejects.toThrow();
    await expect(
      prisma.populationProgram.delete({ where: { id: ids.program } }),
    ).rejects.toThrow();
  });
});
