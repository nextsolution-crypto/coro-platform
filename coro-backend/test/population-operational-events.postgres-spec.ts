import {
  CoroActorType,
  PopulationAlertStatus,
  PopulationAlertChannel,
  PopulationAlertType,
  PopulationDeliveryMode,
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

  const createFollowUp = async (
    eventId: string,
    type: PopulationAlertType,
    clientIntentId = randomUUID(),
  ) => {
    const existing = await prisma.populationAlert.findFirst({
      where: { operationalEventId: eventId, clientIntentId },
    });
    if (existing) return existing;
    try {
      return await prisma.$transaction(async (tx) => {
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
          clientIntentId,
          type,
          status: PopulationAlertStatus.DRAFT,
          titleFR: 'Test PostgreSQL',
          messageFR: 'Test PostgreSQL',
          createdByType: CoroActorType.SYSTEM,
          createdById: 'postgres-tests',
        },
      });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const replay = await prisma.populationAlert.findFirst({
          where: { operationalEventId: eventId, clientIntentId },
        });
        if (replay) return replay;
      }
      throw error;
    }
  };

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

  it('A2: deux INITIAL concurrentes ne laissent qu’un event et une communication #1', async () => {
    const createInitial = (actorId: string) =>
      prisma.$transaction(async (tx) => {
        const event = await tx.populationOperationalEvent.create({
          data: {
            organizationId: ids.organization,
            programId: ids.program,
            emergencyScenarioId: ids.scenario,
            startedByType: CoroActorType.CLIENT_USER,
            startedById: actorId,
          },
        });
        await tx.populationAlert.create({
          data: {
            programId: ids.program,
            emergencyScenarioId: ids.scenario,
            operationalEventId: event.id,
            cycleSequence: 1,
            type: PopulationAlertType.TEST,
            status: PopulationAlertStatus.DRAFT,
            titleFR: 'Initial concurrente',
            messageFR: 'Test PostgreSQL',
            createdByType: CoroActorType.CLIENT_USER,
            createdById: actorId,
          },
        });
      });

    const results = await Promise.allSettled([
      createInitial('operator-a'),
      createInitial('operator-b'),
    ]);
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    const events = await prisma.populationOperationalEvent.findMany({
      where: {
        programId: ids.program,
        status: PopulationOperationalEventStatus.ACTIVE,
      },
      include: { alerts: true },
    });
    expect(events).toHaveLength(1);
    expect(events[0].alerts).toHaveLength(1);
    expect(events[0].alerts[0].cycleSequence).toBe(1);
  });

  it('A3: READY concurrent conserve l’acteur et le timestamp gagnants', async () => {
    const alert = await createAlert(`ready-race-${suffix}`);
    const transition = (actorId: string, readyAt: Date) =>
      prisma.populationAlert.updateMany({
        where: { id: alert.id, status: PopulationAlertStatus.DRAFT },
        data: {
          status: PopulationAlertStatus.READY,
          readyAt,
          readyByType: CoroActorType.CLIENT_USER,
          readyById: actorId,
        },
      });
    const atA = new Date('2026-09-20T10:00:00Z');
    const atB = new Date('2026-09-20T10:00:01Z');
    const results = await Promise.all([
      transition('operator-a', atA),
      transition('operator-b', atB),
    ]);
    expect(results.map((item) => item.count).sort()).toEqual([0, 1]);
    const current = await prisma.populationAlert.findUniqueOrThrow({
      where: { id: alert.id },
    });
    expect([
      ['operator-a', atA.toISOString()],
      ['operator-b', atB.toISOString()],
    ]).toContainEqual([current.readyById, current.readyAt?.toISOString()]);
  });

  it('A4: APPROVE concurrent conserve l’approbateur gagnant', async () => {
    const alert = await createAlert(`approve-race-${suffix}`, {
      status: PopulationAlertStatus.READY,
    });
    const approve = (actorId: string) =>
      prisma.populationAlert.updateMany({
        where: {
          id: alert.id,
          status: PopulationAlertStatus.READY,
          approvedAt: null,
        },
        data: {
          approvedAt: new Date(),
          approvedByType: CoroActorType.CLIENT_USER,
          approvedById: actorId,
        },
      });
    const results = await Promise.all([
      approve('approver-a'),
      approve('approver-b'),
    ]);
    expect(results.map((item) => item.count).sort()).toEqual([0, 1]);
    const current = await prisma.populationAlert.findUniqueOrThrow({
      where: { id: alert.id },
    });
    expect(['approver-a', 'approver-b']).toContain(current.approvedById);
    expect(current.approvedAt).not.toBeNull();
  });

  it('A5/A6: FREEZE et SEND concurrents matérialisent et diffusent une seule fois', async () => {
    const subscriber = await prisma.populationSubscriber.create({
      data: {
        programId: ids.program,
        status: PopulationSubscriberStatus.ACTIVE,
        email: `race-${suffix}@example.invalid`,
        emailEnabled: true,
      },
    });
    const alert = await createAlert(`freeze-send-race-${suffix}`, {
      status: PopulationAlertStatus.READY,
      approvedAt: new Date(),
      approvedByType: CoroActorType.CLIENT_USER,
      approvedById: 'approver',
    });
    const freeze = (actorId: string) =>
      prisma.$transaction(async (tx) => {
        const claimed = await tx.populationAlert.updateMany({
          where: {
            id: alert.id,
            status: PopulationAlertStatus.READY,
            recipientsFrozenAt: null,
          },
          data: {
            recipientsFrozenAt: new Date(),
            frozenByType: CoroActorType.CLIENT_USER,
            frozenById: actorId,
            deliveryModeSnapshot: PopulationDeliveryMode.LIVE,
          },
        });
        if (claimed.count === 1) {
          await tx.populationAlertDelivery.create({
            data: {
              idempotencyKey: `${alert.id}:${subscriber.id}:EMAIL`,
              providerIdempotencyKey: randomUUID(),
              alertId: alert.id,
              subscriberId: subscriber.id,
              channel: PopulationAlertChannel.EMAIL,
              status: PopulationDeliveryStatus.QUEUED,
              language: PopulationPreferredLanguage.FR,
              messageSnapshot: 'Test concurrent',
              destinationSnapshot: subscriber.email,
            },
          });
        }
        return claimed.count;
      });
    expect(
      (await Promise.all([freeze('freezer-a'), freeze('freezer-b')])).sort(),
    ).toEqual([0, 1]);
    expect(
      await prisma.populationAlertDelivery.count({
        where: { alertId: alert.id },
      }),
    ).toBe(1);

    let providerCalls = 0;
    const send = async (actorId: string) => {
      const claimed = await prisma.populationAlert.updateMany({
        where: { id: alert.id, status: PopulationAlertStatus.READY },
        data: {
          status: PopulationAlertStatus.SENDING,
          sendingAt: new Date(),
          sentByType: CoroActorType.CLIENT_USER,
          sentById: actorId,
        },
      });
      if (claimed.count !== 1) return 0;
      const delivery = await prisma.populationAlertDelivery.findFirstOrThrow({
        where: { alertId: alert.id },
      });
      const deliveryClaim = await prisma.populationAlertDelivery.updateMany({
        where: { id: delivery.id, status: PopulationDeliveryStatus.QUEUED },
        data: {
          status: PopulationDeliveryStatus.SENDING,
          claimedAt: new Date(),
        },
      });
      if (deliveryClaim.count === 1) {
        providerCalls += 1;
        await prisma.populationAlertDelivery.update({
          where: { id: delivery.id },
          data: { status: PopulationDeliveryStatus.SENT, sentAt: new Date() },
        });
      }
      return 1;
    };
    expect(
      (await Promise.all([send('sender-a'), send('sender-b')])).sort(),
    ).toEqual([0, 1]);
    expect(providerCalls).toBe(1);
    const sent = await prisma.populationAlert.findUniqueOrThrow({
      where: { id: alert.id },
    });
    expect(['sender-a', 'sender-b']).toContain(sent.sentById);
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

  it('02H: rejoue séquentiellement la même intention sans nouvelle mutation', async () => {
    const event = await createEvent();
    await createAlert('intent-initial-' + suffix, {
      operationalEventId: event.id,
      cycleSequence: 1,
      status: PopulationAlertStatus.ACTIVE,
    });
    const intent = randomUUID();
    const first = await createFollowUp(event.id, PopulationAlertType.UPDATE, intent);
    const replay = await createFollowUp(event.id, PopulationAlertType.UPDATE, intent);
    expect(replay.id).toBe(first.id);
    expect(await prisma.populationAlert.count({ where: { operationalEventId: event.id } })).toBe(2);
  });

  it('02H: sérialise deux requêtes concurrentes de la même intention', async () => {
    const event = await createEvent();
    await createAlert('intent-race-initial-' + suffix, {
      operationalEventId: event.id,
      cycleSequence: 1,
      status: PopulationAlertStatus.ACTIVE,
    });
    const intent = randomUUID();
    const [first, second] = await Promise.all([
      createFollowUp(event.id, PopulationAlertType.UPDATE, intent),
      createFollowUp(event.id, PopulationAlertType.UPDATE, intent),
    ]);
    expect(second.id).toBe(first.id);
    expect(await prisma.populationAlert.count({ where: { operationalEventId: event.id } })).toBe(2);
  });

  it('02H: deux intentions distinctes créent deux UPDATE distinctes', async () => {
    const event = await createEvent();
    await createAlert('intent-distinct-initial-' + suffix, {
      operationalEventId: event.id,
      cycleSequence: 1,
      status: PopulationAlertStatus.ACTIVE,
    });
    const [first, second] = await Promise.all([
      createFollowUp(event.id, PopulationAlertType.UPDATE, randomUUID()),
      createFollowUp(event.id, PopulationAlertType.UPDATE, randomUUID()),
    ]);
    expect(second.id).not.toBe(first.id);
    expect(new Set([first.cycleSequence, second.cycleSequence])).toEqual(new Set([2, 3]));
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
    const close = (actorId: string, endedAt: Date) =>
      prisma.populationOperationalEvent.updateMany({
        where: {
          id: event.id,
          status: PopulationOperationalEventStatus.ACTIVE,
        },
        data: {
          status: PopulationOperationalEventStatus.ENDED,
          endedAt,
          endedByType: CoroActorType.SYSTEM,
          endedById: actorId,
        },
      });
    const closeA = new Date('2026-09-20T12:00:00Z');
    const closeB = new Date('2026-09-20T12:00:01Z');
    const results = await Promise.all([
      close('closer-a', closeA),
      close('closer-b', closeB),
    ]);
    expect(results.map((result) => result.count).sort()).toEqual([0, 1]);
    const current = await prisma.populationOperationalEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect([
      ['closer-a', closeA.toISOString()],
      ['closer-b', closeB.toISOString()],
    ]).toContainEqual([current.endedById, current.endedAt?.toISOString()]);
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
