import { CoroActorType, PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
const describePg = url ? describe : describe.skip;
const prisma = url
  ? new PrismaClient({ datasources: { db: { url } } })
  : new PrismaClient();

describePg('INC-RP-02B PostgreSQL governance', () => {
  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: 'shift-org-a', name: 'Shift Org A' },
        { id: 'shift-org-b', name: 'Shift Org B' },
      ],
      skipDuplicates: true,
    });
    await prisma.client.createMany({
      data: [
        {
          id: 'shift-client-a',
          name: 'Client A',
          regulatoryRequirements: [],
          organizationId: 'shift-org-a',
        },
        {
          id: 'shift-client-b',
          name: 'Client B',
          regulatoryRequirements: [],
          organizationId: 'shift-org-b',
        },
      ],
      skipDuplicates: true,
    });
    await prisma.building.createMany({
      data: [
        {
          id: 'shift-building-a',
          name: 'Building A',
          address: '1 Test',
          city: 'Montréal',
          province: 'QC',
          organizationId: 'shift-org-a',
          clientId: 'shift-client-a',
          timeZoneVerified: true,
        },
        {
          id: 'shift-building-b',
          name: 'Building B',
          address: '2 Test',
          city: 'Montréal',
          province: 'QC',
          organizationId: 'shift-org-b',
          clientId: 'shift-client-b',
          timeZoneVerified: true,
        },
      ],
      skipDuplicates: true,
    });
    await prisma.user.createMany({
      data: [
        {
          id: 'shift-user-a',
          email: 'shift-a@example.invalid',
          password: 'synthetic',
          firstName: 'Sortant',
          lastName: 'A',
          organizationId: 'shift-org-a',
          isActive: false,
        },
        {
          id: 'shift-user-b',
          email: 'shift-b@example.invalid',
          password: 'synthetic',
          firstName: 'Entrant',
          lastName: 'B',
          organizationId: 'shift-org-a',
          isActive: false,
        },
      ],
      skipDuplicates: true,
    });
    await prisma.coroActorIdentity.createMany({
      data: ['shift-user-a', 'shift-user-b'].map((userId) => ({
        organizationId: 'shift-org-a',
        actorType: CoroActorType.USER,
        actorId: userId,
        userId,
      })),
      skipDuplicates: true,
    });
  });
  afterAll(async () => prisma.$disconnect());

  it('persists a cross-midnight shift with a building timezone snapshot', async () => {
    const shift = await prisma.operationalShift.upsert({
      where: {
        organizationId_creationIdempotencyKey: {
          organizationId: 'shift-org-a',
          creationIdempotencyKey: 'shift-night-1',
        },
      },
      update: {},
      create: {
        organizationId: 'shift-org-a',
        buildingId: 'shift-building-a',
        securityPost: 'Poste principal',
        responsibleUserId: 'shift-user-a',
        responsibleActorId: 'shift-user-a',
        plannedStartAt: new Date('2026-11-01T23:00:00-04:00'),
        plannedEndAt: new Date('2026-11-02T07:00:00-05:00'),
        buildingTimeZone: 'America/Toronto',
        creationIdempotencyKey: 'shift-night-1',
        createdByUserId: 'shift-user-a',
        createdByActorId: 'shift-user-a',
      },
    });
    expect(shift.plannedEndAt.getTime()).toBeGreaterThan(
      shift.plannedStartAt.getTime(),
    );
  });

  it('rejects tenant-crossing buildings', async () => {
    await expect(
      prisma.operationalShift.create({
        data: {
          organizationId: 'shift-org-a',
          buildingId: 'shift-building-b',
          securityPost: 'Invalid',
          responsibleUserId: 'shift-user-a',
          responsibleActorId: 'shift-user-a',
          plannedStartAt: new Date(),
          plannedEndAt: new Date(Date.now() + 3600000),
          buildingTimeZone: 'America/Toronto',
          creationIdempotencyKey: 'shift-cross',
          createdByUserId: 'shift-user-a',
          createdByActorId: 'shift-user-a',
        },
      }),
    ).rejects.toThrow();
  });

  it('keeps a submitted handover snapshot immutable and separates actors', async () => {
    const shift = await prisma.operationalShift.findUniqueOrThrow({
      where: {
        organizationId_creationIdempotencyKey: {
          organizationId: 'shift-org-a',
          creationIdempotencyKey: 'shift-night-1',
        },
      },
    });
    const handover = await prisma.operationalHandover.upsert({
      where: {
        organizationId_creationIdempotencyKey: {
          organizationId: 'shift-org-a',
          creationIdempotencyKey: 'handover-1',
        },
      },
      update: {},
      create: {
        organizationId: 'shift-org-a',
        buildingId: 'shift-building-a',
        outgoingShiftId: shift.id,
        outgoingUserId: 'shift-user-a',
        outgoingActorId: 'shift-user-a',
        incomingUserId: 'shift-user-b',
        incomingActorType: CoroActorType.USER,
        incomingActorId: 'shift-user-b',
        status: 'SUBMITTED',
        snapshot: { unresolved: ['synthetic'] },
        snapshotHash: 'synthetic-hash',
        creationIdempotencyKey: 'handover-1',
        submittedAt: new Date(),
      },
    });
    await expect(
      prisma.operationalHandover.update({
        where: {
          id_organizationId: { id: handover.id, organizationId: 'shift-org-a' },
        },
        data: { snapshotHash: 'changed' },
      }),
    ).rejects.toThrow();
  });
});
