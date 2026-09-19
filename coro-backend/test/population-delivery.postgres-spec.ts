import {
  PopulationAlertChannel,
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationDeliveryMode,
  PopulationDeliveryProviderEventType,
  PopulationDeliveryStatus,
  PopulationGovernanceMode,
  PopulationPreferredLanguage,
  PopulationProgramStatus,
  PopulationSubscriberStatus,
  Prisma,
  PrismaClient,
  RueAssessmentStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Population delivery PostgreSQL invariants', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const suffix = randomUUID();
  const ids = {
    organization: `pg-org-${suffix}`,
    client: `pg-client-${suffix}`,
    building: `pg-building-${suffix}`,
    profile: `pg-profile-${suffix}`,
    program: `pg-program-${suffix}`,
    subscriber: `pg-subscriber-${suffix}`,
    alert: `pg-alert-${suffix}`,
  };

  const createDelivery = (data: Record<string, unknown> = {}) =>
    prisma.populationAlertDelivery.create({
      data: {
        idempotencyKey: randomUUID(),
        alertId: ids.alert,
        subscriberId: ids.subscriber,
        channel: PopulationAlertChannel.EMAIL,
        status: PopulationDeliveryStatus.QUEUED,
        language: PopulationPreferredLanguage.FR,
        messageSnapshot: 'TEST CORO',
        destinationSnapshot: 'postgres-test@example.invalid',
        ...data,
      },
    });

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: { id: ids.organization, name: 'Population PostgreSQL tests' },
    });
    await prisma.client.create({
      data: {
        id: ids.client,
        name: 'Population PostgreSQL tests',
        organizationId: ids.organization,
        regulatoryRequirements: [],
      },
    });
    await prisma.building.create({
      data: {
        id: ids.building,
        name: 'Population PostgreSQL tests',
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
        deliveryMode: PopulationDeliveryMode.LIVE,
        governanceMode: PopulationGovernanceMode.STANDARD,
        publicSlug: `postgres-${suffix}`,
        nameFR: 'Validation PostgreSQL',
        registrationEnabled: true,
        smsEnabled: false,
        emailEnabled: true,
      },
    });
    await prisma.populationSubscriber.create({
      data: {
        id: ids.subscriber,
        programId: ids.program,
        status: PopulationSubscriberStatus.ACTIVE,
        email: 'postgres-test@example.invalid',
        emailEnabled: true,
        smsEnabled: false,
      },
    });
    await prisma.populationAlert.create({
      data: {
        id: ids.alert,
        programId: ids.program,
        type: PopulationAlertType.TEST,
        status: PopulationAlertStatus.SENDING,
        titleFR: 'TEST CORO',
        messageFR: 'TEST CORO',
        createdByType: 'SYSTEM',
        createdById: 'postgres-tests',
        approvedByType: 'SYSTEM',
        approvedById: 'postgres-tests',
        approvedAt: new Date(),
        recipientsFrozenAt: new Date(),
        deliveryModeSnapshot: PopulationDeliveryMode.LIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.populationDeliveryProviderEvent.deleteMany({
      where: { delivery: { alertId: ids.alert } },
    });
    await prisma.populationAlertDelivery.deleteMany({
      where: { alertId: ids.alert },
    });
    await prisma.populationAlert.deleteMany({ where: { id: ids.alert } });
    await prisma.populationSubscriber.deleteMany({
      where: { programId: ids.program },
    });
    await prisma.populationProgram.deleteMany({ where: { id: ids.program } });
    await prisma.rueFacilityProfile.deleteMany({ where: { id: ids.profile } });
    await prisma.building.deleteMany({ where: { id: ids.building } });
    await prisma.client.deleteMany({ where: { id: ids.client } });
    await prisma.organization.deleteMany({ where: { id: ids.organization } });
    await prisma.$disconnect();
  });

  it('A: accorde un seul claim concurrent sur une delivery', async () => {
    const delivery = await createDelivery();
    const claimedAt = new Date();
    const claim = () =>
      prisma.populationAlertDelivery.updateMany({
        where: { id: delivery.id, status: PopulationDeliveryStatus.QUEUED },
        data: {
          status: PopulationDeliveryStatus.SENDING,
          claimedAt,
          leaseExpiresAt: new Date(claimedAt.getTime() + 60_000),
        },
      });
    const results = await Promise.all([claim(), claim()]);
    expect(results.map((result) => result.count).sort()).toEqual([0, 1]);
  });

  it('B: deux recoveries simultanées ne reprennent qu’une fois', async () => {
    const claimedAt = new Date(Date.now() - 120_000);
    const delivery = await createDelivery({
      status: PopulationDeliveryStatus.SENDING,
      claimedAt,
      leaseExpiresAt: new Date(Date.now() - 60_000),
    });
    const recover = () =>
      prisma.populationAlertDelivery.updateMany({
        where: {
          id: delivery.id,
          status: PopulationDeliveryStatus.SENDING,
          claimedAt,
          outcomeUnknownAt: null,
        },
        data: {
          status: PopulationDeliveryStatus.QUEUED,
          claimedAt: null,
          leaseExpiresAt: null,
        },
      });
    const results = await Promise.all([recover(), recover()]);
    expect(results.map((result) => result.count).sort()).toEqual([0, 1]);
  });

  it('C: impose providerIdempotencyKey UNIQUE', async () => {
    const providerIdempotencyKey = randomUUID();
    await createDelivery({ providerIdempotencyKey });
    await expect(
      createDelivery({ providerIdempotencyKey }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('D: ne reprend pas une lease encore valide', async () => {
    const delivery = await createDelivery({
      status: PopulationDeliveryStatus.SENDING,
      claimedAt: new Date(),
      leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    const result = await prisma.populationAlertDelivery.updateMany({
      where: {
        id: delivery.id,
        status: PopulationDeliveryStatus.SENDING,
        leaseExpiresAt: { lte: new Date() },
      },
      data: { status: PopulationDeliveryStatus.QUEUED },
    });
    expect(result.count).toBe(0);
  });

  it('E: reprend une lease expirée avant tentative fournisseur', async () => {
    const delivery = await createDelivery({
      status: PopulationDeliveryStatus.SENDING,
      claimedAt: new Date(Date.now() - 120_000),
      leaseExpiresAt: new Date(Date.now() - 60_000),
      lastAttemptAt: null,
    });
    const result = await prisma.populationAlertDelivery.updateMany({
      where: {
        id: delivery.id,
        status: PopulationDeliveryStatus.SENDING,
        leaseExpiresAt: { lte: new Date() },
        lastAttemptAt: null,
      },
      data: {
        status: PopulationDeliveryStatus.QUEUED,
        claimedAt: null,
        leaseExpiresAt: null,
      },
    });
    expect(result.count).toBe(1);
  });

  it('F: refuse un webhook duplicate par empreinte réelle', async () => {
    const delivery = await createDelivery({
      status: PopulationDeliveryStatus.SENT,
    });
    const fingerprint = randomUUID().replace(/-/g, '');
    const event = {
      deliveryId: delivery.id,
      provider: 'BREVO',
      providerMessageId: 'postgres-message',
      eventType: PopulationDeliveryProviderEventType.DELIVERED,
      providerOccurredAt: new Date(),
      eventFingerprint: fingerprint,
      payloadFingerprint: fingerprint,
    };
    await prisma.populationDeliveryProviderEvent.create({ data: event });
    await expect(
      prisma.populationDeliveryProviderEvent.create({ data: event }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it('G: deux webhooks concurrents identiques créent un seul événement', async () => {
    const delivery = await createDelivery({
      status: PopulationDeliveryStatus.SENT,
    });
    const fingerprint = randomUUID().replace(/-/g, '');
    const create = () =>
      prisma.populationDeliveryProviderEvent.create({
        data: {
          deliveryId: delivery.id,
          provider: 'BREVO',
          providerMessageId: 'postgres-concurrent-message',
          eventType: PopulationDeliveryProviderEventType.DELIVERED,
          providerOccurredAt: new Date(),
          eventFingerprint: fingerprint,
          payloadFingerprint: fingerprint,
        },
      });
    const results = await Promise.allSettled([create(), create()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await prisma.populationDeliveryProviderEvent.count({
        where: { eventFingerprint: fingerprint },
      }),
    ).toBe(1);
  });

  it('H: une delivery DELIVERED ne régresse pas', async () => {
    const delivery = await createDelivery({
      status: PopulationDeliveryStatus.DELIVERED,
      deliveredAt: new Date(),
    });
    const result = await prisma.populationAlertDelivery.updateMany({
      where: {
        id: delivery.id,
        status: {
          in: [
            PopulationDeliveryStatus.QUEUED,
            PopulationDeliveryStatus.SENDING,
            PopulationDeliveryStatus.SENT,
          ],
        },
      },
      data: { status: PopulationDeliveryStatus.FAILED },
    });
    expect(result.count).toBe(0);
    await expect(
      prisma.populationAlertDelivery.findUnique({ where: { id: delivery.id } }),
    ).resolves.toMatchObject({ status: PopulationDeliveryStatus.DELIVERED });
  });
});
