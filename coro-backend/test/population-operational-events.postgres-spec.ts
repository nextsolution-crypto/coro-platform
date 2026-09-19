import {
  CoroActorType,
  PopulationAlertStatus,
  PopulationAlertChannel,
  PopulationAlertType,
  PopulationDeliveryStatus,
  PopulationOperationalEventStatus,
  PopulationPreferredLanguage,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
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

  const allocateSequence = (eventId: string) =>
    prisma.$transaction(async (tx) => {
      const claimed = await tx.populationOperationalEvent.updateMany({
        where: {
          id: eventId,
          status: PopulationOperationalEventStatus.ACTIVE,
        },
        data: { nextSequence: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error('EVENT_NOT_ACTIVE');
      const event = await tx.populationOperationalEvent.findUniqueOrThrow({
        where: { id: eventId },
        select: { nextSequence: true },
      });
      return event.nextSequence - 1;
    });

  const createFollowUp = (eventId: string, type: PopulationAlertType) =>
    prisma.$transaction(async (tx) => {
      const claimed = await tx.populationOperationalEvent.updateMany({
        where: {
          id: eventId,
          status: PopulationOperationalEventStatus.ACTIVE,
        },
        data: { nextSequence: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error('EVENT_NOT_ACTIVE');
      const event = await tx.populationOperationalEvent.findUniqueOrThrow({
        where: { id: eventId },
        select: { nextSequence: true },
      });
      const existingAllClear = await tx.populationAlert.findFirst({
        where: {
          operationalEventId: eventId,
          type: PopulationAlertType.ALL_CLEAR,
          status: { not: PopulationAlertStatus.CANCELLED },
        },
      });
      if (existingAllClear) throw new Error('ALL_CLEAR_EXISTS');
      return tx.populationAlert.create({
        data: {
          id: 'follow-up-' + randomUUID(),
          programId: ids.program,
          emergencyScenarioId: ids.scenario,
          operationalEventId: eventId,
          cycleSequence: event.nextSequence - 1,
          type,
          status: PopulationAlertStatus.DRAFT,
          titleFR: 'Test PostgreSQL',
          messageFR: 'Test PostgreSQL',
          createdByType: CoroActorType.SYSTEM,
          createdById: 'postgres-tests',
        },
      });
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
    await prisma.populationAlertDelivery.deleteMany({
      where: { alert: { programId: ids.program } },
    });
    await prisma.populationAlert.deleteMany({
      where: { programId: ids.program },
    });
    await prisma.populationSubscriber.deleteMany({
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

  it('B/C: alloue deux séquences concurrentes distinctes', async () => {
    const event = await createEvent();
    const sequences = await Promise.all([
      allocateSequence(event.id),
      allocateSequence(event.id),
    ]);
    expect(sequences.sort()).toEqual([2, 3]);
  });

  it('D: sérialise UPDATE et ALL_CLEAR concurrents sans UPDATE postérieur', async () => {
    const event = await createEvent();
    await createAlert('initial-race-' + suffix, {
      operationalEventId: event.id,
      cycleSequence: 1,
      status: PopulationAlertStatus.ACTIVE,
    });
    const results = await Promise.allSettled([
      createFollowUp(event.id, PopulationAlertType.UPDATE),
      createFollowUp(event.id, PopulationAlertType.ALL_CLEAR),
    ]);
    const alerts = await prisma.populationAlert.findMany({
      where: { operationalEventId: event.id },
      orderBy: { cycleSequence: 'asc' },
    });
    expect(alerts[0].cycleSequence).toBe(1);
    const allClearIndex = alerts.findIndex(
      (alert) => alert.type === PopulationAlertType.ALL_CLEAR,
    );
    const updateIndex = alerts.findIndex(
      (alert) => alert.type === PopulationAlertType.UPDATE,
    );
    expect(allClearIndex).toBeGreaterThan(0);
    expect(updateIndex === -1 || updateIndex < allClearIndex).toBe(true);
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
  });

  it('E: deux ALL_CLEAR simultanés n’en créent qu’un', async () => {
    const event = await createEvent();
    await createAlert('initial-all-clear-' + suffix, {
      operationalEventId: event.id,
      cycleSequence: 1,
      status: PopulationAlertStatus.ACTIVE,
    });
    const results = await Promise.allSettled([
      createFollowUp(event.id, PopulationAlertType.ALL_CLEAR),
      createFollowUp(event.id, PopulationAlertType.ALL_CLEAR),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await prisma.populationAlert.count({
        where: {
          operationalEventId: event.id,
          type: PopulationAlertType.ALL_CLEAR,
        },
      }),
    ).toBe(1);
  });

  it('F: une clôture concurrente ne gagne qu’une fois', async () => {
    const event = await createEvent();
    const close = () =>
      prisma.populationOperationalEvent.updateMany({
        where: {
          id: event.id,
          status: PopulationOperationalEventStatus.ACTIVE,
        },
        data: {
          status: PopulationOperationalEventStatus.ENDED,
          endedAt: new Date(),
          endedByType: CoroActorType.SYSTEM,
          endedById: 'postgres-tests',
        },
      });
    const results = await Promise.all([close(), close()]);
    expect(results.map((result) => result.count).sort()).toEqual([0, 1]);
  });

  it('H: rejette les clés étrangères inexistantes', async () => {
    await expect(
      createEvent({ organizationId: 'missing-' + suffix }),
    ).rejects.toThrow();
    await expect(
      createEvent({ emergencyScenarioId: 'missing-' + suffix }),
    ).rejects.toThrow();
  });

  it('J: conserve un cycle complet 1/2/3 puis une clôture explicite', async () => {
    const event = await createEvent();
    const initial = await createAlert('full-cycle-initial-' + suffix, {
      operationalEventId: event.id,
      cycleSequence: 1,
      status: PopulationAlertStatus.ACTIVE,
      type: PopulationAlertType.TEST,
    });
    const update = await createFollowUp(event.id, PopulationAlertType.UPDATE);
    await prisma.populationAlert.update({
      where: { id: update.id },
      data: { status: PopulationAlertStatus.ACTIVE },
    });
    const allClear = await createFollowUp(
      event.id,
      PopulationAlertType.ALL_CLEAR,
    );
    await prisma.populationAlert.update({
      where: { id: allClear.id },
      data: { status: PopulationAlertStatus.ACTIVE },
    });

    const beforeClose =
      await prisma.populationOperationalEvent.findUniqueOrThrow({
        where: { id: event.id },
        include: { alerts: { orderBy: { cycleSequence: 'asc' } } },
      });
    expect(beforeClose.status).toBe(PopulationOperationalEventStatus.ACTIVE);
    expect(
      beforeClose.alerts.map((alert) => [
        alert.id,
        alert.type,
        alert.cycleSequence,
      ]),
    ).toEqual([
      [initial.id, PopulationAlertType.TEST, 1],
      [update.id, PopulationAlertType.UPDATE, 2],
      [allClear.id, PopulationAlertType.ALL_CLEAR, 3],
    ]);

    await prisma.populationOperationalEvent.update({
      where: { id: event.id },
      data: {
        status: PopulationOperationalEventStatus.ENDED,
        endedAt: new Date(),
        endedByType: CoroActorType.SYSTEM,
        endedById: 'postgres-tests',
      },
    });
    await expect(
      prisma.populationOperationalEvent.findUniqueOrThrow({
        where: { id: event.id },
      }),
    ).resolves.toMatchObject({
      status: PopulationOperationalEventStatus.ENDED,
      endedById: 'postgres-tests',
    });
  });

  it('K: isole le roster historique ALL_CLEAR aux communications diffusees du meme event', async () => {
    const event = await createEvent();
    const otherEvent = await createEvent({
      status: PopulationOperationalEventStatus.ENDED,
    });
    const subscribers = await Promise.all(
      ['sent', 'failed', 'suppressed', 'other-event', 'all-clear'].map((key) =>
        prisma.populationSubscriber.create({
          data: {
            id: `history-${key}-${suffix}`,
            programId: ids.program,
            status: PopulationSubscriberStatus.ACTIVE,
            preferredLanguage: PopulationPreferredLanguage.FR,
            email: `${key}-${suffix}@example.invalid`,
            emailEnabled: true,
          },
        }),
      ),
    );
    const initial = await createAlert(`history-initial-${suffix}`, {
      operationalEventId: event.id,
      cycleSequence: 1,
      type: PopulationAlertType.TEST,
      status: PopulationAlertStatus.ACTIVE,
    });
    const update = await createAlert(`history-update-${suffix}`, {
      operationalEventId: event.id,
      cycleSequence: 2,
      type: PopulationAlertType.UPDATE,
      status: PopulationAlertStatus.FAILED,
    });
    const allClear = await createAlert(`history-all-clear-${suffix}`, {
      operationalEventId: event.id,
      cycleSequence: 3,
      type: PopulationAlertType.ALL_CLEAR,
      status: PopulationAlertStatus.ACTIVE,
    });
    const other = await createAlert(`history-other-${suffix}`, {
      operationalEventId: otherEvent.id,
      cycleSequence: 1,
      type: PopulationAlertType.TEST,
      status: PopulationAlertStatus.ACTIVE,
    });
    const delivery = (
      alertId: string,
      subscriberId: string,
      status: PopulationDeliveryStatus,
    ) =>
      prisma.populationAlertDelivery.create({
        data: {
          idempotencyKey: `${alertId}:${subscriberId}:EMAIL`,
          alertId,
          subscriberId,
          channel: PopulationAlertChannel.EMAIL,
          status,
          language: PopulationPreferredLanguage.FR,
          messageSnapshot: 'Test PostgreSQL',
          destinationSnapshot: 'masked@example.invalid',
        },
      });
    await Promise.all([
      delivery(initial.id, subscribers[0].id, PopulationDeliveryStatus.SENT),
      delivery(update.id, subscribers[1].id, PopulationDeliveryStatus.FAILED),
      delivery(
        initial.id,
        subscribers[2].id,
        PopulationDeliveryStatus.SUPPRESSED,
      ),
      delivery(other.id, subscribers[3].id, PopulationDeliveryStatus.SENT),
      delivery(allClear.id, subscribers[4].id, PopulationDeliveryStatus.SENT),
    ]);

    const historical = await prisma.populationAlertDelivery.findMany({
      where: {
        subscriberId: { not: null },
        status: {
          in: [
            PopulationDeliveryStatus.SENT,
            PopulationDeliveryStatus.DELIVERED,
            PopulationDeliveryStatus.FAILED,
          ],
        },
        alert: {
          programId: ids.program,
          operationalEventId: event.id,
          type: {
            in: [
              PopulationAlertType.EMERGENCY,
              PopulationAlertType.TEST,
              PopulationAlertType.UPDATE,
            ],
          },
          status: {
            in: [
              PopulationAlertStatus.ACTIVE,
              PopulationAlertStatus.ENDED,
              PopulationAlertStatus.FAILED,
            ],
          },
        },
      },
      select: { subscriberId: true },
    });

    expect(new Set(historical.map((row) => row.subscriberId))).toEqual(
      new Set([subscribers[0].id, subscribers[1].id]),
    );
  });
});
