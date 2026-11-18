import { CoroActorType, PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : new PrismaClient();

describePostgres('INC-RP-02A PostgreSQL constraints', () => {
  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: 'oplog-org-a', name: 'Operational Log Org A' },
        { id: 'oplog-org-b', name: 'Operational Log Org B' },
      ],
      skipDuplicates: true,
    });
    await prisma.client.createMany({
      data: [
        {
          id: 'oplog-client-a',
          name: 'Client A',
          regulatoryRequirements: [],
          organizationId: 'oplog-org-a',
        },
        {
          id: 'oplog-client-b',
          name: 'Client B',
          regulatoryRequirements: [],
          organizationId: 'oplog-org-b',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.building.createMany({
      data: [
        {
          id: 'oplog-building-a',
          name: 'Building A',
          address: '1 Test',
          city: 'Montréal',
          province: 'QC',
          organizationId: 'oplog-org-a',
          clientId: 'oplog-client-a',
        },
        {
          id: 'oplog-building-b',
          name: 'Building B',
          address: '2 Test',
          city: 'Montréal',
          province: 'QC',
          organizationId: 'oplog-org-b',
          clientId: 'oplog-client-b',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.user.createMany({
      data: [
        {
          id: 'oplog-user-a',
          email: 'oplog-a@example.invalid',
          password: 'synthetic-not-a-login',
          firstName: 'Agent',
          lastName: 'A',
          organizationId: 'oplog-org-a',
          isActive: false,
        },
      ],
      skipDuplicates: true,
    });
    await prisma.coroActorIdentity.createMany({
      data: [
        {
          organizationId: 'oplog-org-a',
          actorType: CoroActorType.USER,
          actorId: 'oplog-user-a',
          userId: 'oplog-user-a',
        },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => prisma.$disconnect());

  it('accepts an autonomous same-tenant entry without IncidentEvent', async () => {
    const entry = await prisma.operationalLogEntry.upsert({
      where: {
        organizationId_creationIdempotencyKey: {
          organizationId: 'oplog-org-a',
          creationIdempotencyKey: 'oplog-create-a',
        },
      },
      update: {},
      create: {
        organizationId: 'oplog-org-a',
        buildingId: 'oplog-building-a',
        eventAt: new Date('2026-11-17T12:00:00Z'),
        authorUserId: 'oplog-user-a',
        authorActorId: 'oplog-user-a',
        activityType: 'PATROL',
        category: 'SECURITY',
        description: 'Ronde synthétique terminée.',
        creationIdempotencyKey: 'oplog-create-a',
      },
    });
    expect(entry.incidentEventId).toBeNull();
  });

  it('rejects a cross-tenant building reference', async () => {
    await expect(
      prisma.operationalLogEntry.create({
        data: {
          organizationId: 'oplog-org-a',
          buildingId: 'oplog-building-b',
          eventAt: new Date(),
          authorUserId: 'oplog-user-a',
          authorActorId: 'oplog-user-a',
          activityType: 'PATROL',
          category: 'SECURITY',
          description: 'Must fail.',
          creationIdempotencyKey: 'oplog-cross-tenant',
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate creation idempotency keys', async () => {
    await expect(
      prisma.operationalLogEntry.create({
        data: {
          organizationId: 'oplog-org-a',
          buildingId: 'oplog-building-a',
          eventAt: new Date(),
          authorUserId: 'oplog-user-a',
          authorActorId: 'oplog-user-a',
          activityType: 'OTHER',
          category: 'OTHER',
          description: 'Duplicate.',
          creationIdempotencyKey: 'oplog-create-a',
        },
      }),
    ).rejects.toThrow();
  });
});
