import { PrismaClient } from '@prisma/client';
import { BookingAssignmentsService } from '../src/bookings/booking-assignments.service';
import { BookingsService } from '../src/bookings/bookings.service';
import { commitmentFingerprint } from '../src/bookings/booking-commitment';
import { CapacityService } from '../src/mandate/capacity.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SchedulingService } from '../src/scheduling/scheduling.service';
import { createBookingFixture } from './booking-postgres-fixture';

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Booking commitment authority on PostgreSQL', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  let fixture: Awaited<ReturnType<typeof createBookingFixture>>;
  let service: BookingAssignmentsService;
  let slot = 1;

  beforeAll(async () => {
    await prisma.$connect();
    fixture = await createBookingFixture(prisma);
    service = new BookingAssignmentsService(
      prisma as unknown as PrismaService,
      new SchedulingService(prisma as unknown as PrismaService),
      {
        getCapacityPlanning: jest.fn().mockResolvedValue([]),
      } as unknown as CapacityService,
    );
  });
  afterAll(async () => prisma.$disconnect());

  async function governedBooking() {
    const requestedDate = new Date(
      `2027-02-${String(slot++).padStart(2, '0')}T14:00:00.000Z`,
    );
    const booking = await fixture.createBooking({
      status: 'DEMANDEE',
      requestedDate,
    });
    const startAt = booking.requestedDate;
    const canonicalFingerprint = commitmentFingerprint({
      bookingId: booking.id,
      projectId: fixture.project.id,
      activityId: null,
      buildingId: fixture.building.id,
      advisorId: fixture.owner.id,
      startAt,
      durationMinutes: booking.duration,
    });
    const commitment = await prisma.bookingCommitmentVersion.create({
      data: {
        bookingId: booking.id,
        versionNumber: 1,
        changeType: 'INITIAL_REQUEST',
        projectId: fixture.project.id,
        buildingId: fixture.building.id,
        advisorId: fixture.owner.id,
        startAt,
        endAt: new Date(startAt.getTime() + booking.duration * 60_000),
        durationMinutes: booking.duration,
        canonicalFingerprint,
        proposedByActorType: 'CLIENT',
        proposedByActorId: fixture.clientUser.id,
        customerRequested: true,
        customerAgreedAt: new Date(),
        customerAgreedByClientUserId: fixture.clientUser.id,
      },
    });
    const assignment = await prisma.bookingAssignment.create({
      data: {
        bookingId: booking.id,
        userId: fixture.owner.id,
        role: 'LEAD',
        status: 'PENDING',
        commitmentVersionId: commitment.id,
        assignedByUserId: fixture.admin.id,
      },
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        pendingCommitmentVersionId: commitment.id,
        commitmentLockVersion: { increment: 1 },
      },
    });
    return { booking, commitment, assignment };
  }

  it('keeps historical accepted assignments readable without governing evidence', async () => {
    const booking = await fixture.createBooking({ status: 'CONFIRMEE' });
    const assignment = await prisma.bookingAssignment.create({
      data: {
        bookingId: booking.id,
        userId: fixture.owner.id,
        role: 'LEAD',
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });
    expect(
      await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).toMatchObject({
      status: 'CONFIRMEE',
      currentCommitmentVersionId: null,
      pendingCommitmentVersionId: null,
    });
    expect(
      await prisma.bookingAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      }),
    ).toMatchObject({
      status: 'ACCEPTED',
      commitmentVersionId: null,
      responseFingerprint: null,
      respondedByUserId: null,
    });
  });

  it('personally confirms only the exact proposed customer commitment', async () => {
    const { booking, commitment, assignment } = await governedBooking();
    await service.respond(
      booking.id,
      assignment.id,
      'ACCEPTED',
      undefined,
      {
        userId: fixture.owner.id,
        organizationId: fixture.org.id,
        role: 'OPERATOR',
      },
      commitment.id,
      commitment.canonicalFingerprint,
    );
    expect(
      await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).toMatchObject({
      status: 'CONFIRMEE',
      currentCommitmentVersionId: commitment.id,
      pendingCommitmentVersionId: null,
    });
    expect(
      await prisma.bookingAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      }),
    ).toMatchObject({
      status: 'ACCEPTED',
      respondedByUserId: fixture.owner.id,
      responseFingerprint: commitment.canonicalFingerprint,
    });
  });

  it('rejects stale fingerprint and another authenticated actor without mutation', async () => {
    const { booking, commitment, assignment } = await governedBooking();
    await expect(
      service.respond(
        booking.id,
        assignment.id,
        'ACCEPTED',
        undefined,
        {
          userId: fixture.owner.id,
          organizationId: fixture.org.id,
          role: 'OPERATOR',
        },
        commitment.id,
        '0'.repeat(64),
      ),
    ).rejects.toThrow('périmé');
    await expect(
      service.respond(
        booking.id,
        assignment.id,
        'ACCEPTED',
        undefined,
        {
          userId: fixture.admin.id,
          organizationId: fixture.org.id,
          role: 'ADMIN',
        },
        commitment.id,
        commitment.canonicalFingerprint,
      ),
    ).rejects.toThrow('vous-même');
    expect(
      await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
    ).toMatchObject({
      status: 'DEMANDEE',
      pendingCommitmentVersionId: commitment.id,
    });
  });

  it('enforces material immutability in PostgreSQL', async () => {
    const { commitment } = await governedBooking();
    await expect(
      prisma.bookingCommitmentVersion.update({
        where: { id: commitment.id },
        data: { durationMinutes: 120 },
      }),
    ).rejects.toThrow();
    const preserved = await prisma.bookingCommitmentVersion.findUniqueOrThrow({
      where: { id: commitment.id },
    });
    expect(preserved.durationMinutes).toBe(60);
  });

  it('serializes concurrent responses without duplicate confirmation evidence', async () => {
    const { booking, commitment, assignment } = await governedBooking();
    const actor = {
      userId: fixture.owner.id,
      organizationId: fixture.org.id,
      role: 'OPERATOR' as const,
    };
    const results = await Promise.allSettled([
      service.respond(
        booking.id,
        assignment.id,
        'ACCEPTED',
        undefined,
        actor,
        commitment.id,
        commitment.canonicalFingerprint,
      ),
      service.respond(
        booking.id,
        assignment.id,
        'ACCEPTED',
        undefined,
        actor,
        commitment.id,
        commitment.canonicalFingerprint,
      ),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.bookingCommitmentVersion.count({
        where: { bookingId: booking.id, status: 'CONFIRMED' },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({
        where: {
          entityType: 'BookingAssignment',
          entityId: assignment.id,
          action: 'ASSIGNMENT_ACCEPTED',
        },
      }),
    ).toBe(1);
  });

  it('atomically holds one advisor capacity across competing client requests and audits release', async () => {
    const bookings = new BookingsService(
      prisma as unknown as PrismaService,
      new SchedulingService(prisma as unknown as PrismaService),
    );
    jest
      .spyOn(
        bookings as unknown as {
          sendBookingEmail: (data: unknown) => Promise<void>;
        },
        'sendBookingEmail',
      )
      .mockResolvedValue(undefined);
    await prisma.userWorkSchedule.create({
      data: {
        organizationId: fixture.org.id,
        userId: fixture.owner.id,
        timeZone: 'America/Toronto',
        effectiveFrom: new Date('2027-01-01T00:00:00.000Z'),
        verifiedAt: new Date(),
        verifiedByUserId: fixture.admin.id,
        intervals: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            startTime: 0,
            endTime: 1440,
          })),
        },
      },
    });
    const otherClient = await prisma.client.create({
      data: {
        organizationId: fixture.org.id,
        name: 'Competing synthetic client',
        regulatoryRequirements: [],
      },
    });
    const otherBuilding = await prisma.building.create({
      data: {
        organizationId: fixture.org.id,
        clientId: otherClient.id,
        name: 'Competing building',
        address: '2 Test Street',
        city: 'Toronto',
        province: 'ON',
        timeZone: 'America/Toronto',
        timeZoneVerified: true,
      },
    });
    const otherProject = await prisma.project.create({
      data: {
        organizationId: fixture.org.id,
        clientId: otherClient.id,
        buildingId: otherBuilding.id,
        userId: fixture.owner.id,
        name: 'Competing project',
        documentType: 'PMU',
        year: 2027,
      },
    });
    const otherClientUser = await prisma.clientUser.create({
      data: {
        organizationId: fixture.org.id,
        clientId: otherClient.id,
        email: `competing-${Date.now()}@booking-gate.invalid`,
        password: 'test-only',
        firstName: 'Competing',
        lastName: 'Client',
        buildingIds: [otherBuilding.id],
      },
    });
    await prisma.projectAdvisorEligibility.createMany({
      data: [
        {
          organizationId: fixture.org.id,
          projectId: fixture.project.id,
          advisorUserId: fixture.owner.id,
          priority: 10,
          authorizedByUserId: fixture.admin.id,
        },
        {
          organizationId: fixture.org.id,
          projectId: otherProject.id,
          advisorUserId: fixture.owner.id,
          priority: 10,
          authorizedByUserId: fixture.admin.id,
        },
      ],
    });
    const requestedDate = new Date('2027-03-01T15:00:00.000Z');
    const requests = await Promise.allSettled([
      bookings.createBooking({
        projectId: fixture.project.id,
        clientUserId: fixture.clientUser.id,
        activityType: 'visite',
        requestedDate,
        duration: 120,
      }),
      bookings.createBooking({
        projectId: otherProject.id,
        clientUserId: otherClientUser.id,
        activityType: 'visite',
        requestedDate,
        duration: 120,
      }),
    ]);
    expect(
      requests.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      requests.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const held = await prisma.booking.findFirstOrThrow({
      where: {
        assignedUserId: fixture.owner.id,
        requestedDate,
        status: 'DEMANDEE',
      },
      include: { assignments: true },
    });
    expect(held.assignments).toEqual([
      expect.objectContaining({ status: 'PENDING' }),
    ]);
    await bookings.cancelBooking(
      held.id,
      {
        type: 'CLIENT',
        id: held.clientUserId,
        role: 'CLIENT_MANAGER',
        organizationId: fixture.org.id,
      },
      'Synthetic cancellation reason',
    );
    const cancellationAudit = await prisma.auditLog.findFirstOrThrow({
      where: {
        entityType: 'Booking',
        entityId: held.id,
        action: 'BOOKING_CANCELLED',
      },
    });
    expect(cancellationAudit.clientUserId).toBe(held.clientUserId);
    expect(cancellationAudit.userId).toBeNull();
    expect(cancellationAudit.organizationId).toBe(fixture.org.id);
    expect(cancellationAudit.metadata).toEqual(
      expect.objectContaining({
        actorRole: 'CLIENT_MANAGER',
        previousStatus: 'DEMANDEE',
        newStatus: 'ANNULEE',
        reason: 'Synthetic cancellation reason',
        holdReleased: true,
      }),
    );
    await expect(
      bookings.createBooking({
        projectId: otherProject.id,
        clientUserId: otherClientUser.id,
        activityType: 'visite',
        requestedDate,
        duration: 120,
      }),
    ).resolves.toMatchObject({ status: 'DEMANDEE' });
  });

  it('selects distinct explicitly eligible advisors for overlapping customer requests', async () => {
    const bookings = new BookingsService(
      prisma as unknown as PrismaService,
      new SchedulingService(prisma as unknown as PrismaService),
    );
    jest
      .spyOn(
        bookings as unknown as {
          sendBookingEmail: (data: unknown) => Promise<void>;
        },
        'sendBookingEmail',
      )
      .mockResolvedValue(undefined);
    for (const userId of [fixture.owner.id, fixture.colleague.id]) {
      await prisma.userWorkSchedule.create({
        data: {
          organizationId: fixture.org.id,
          userId,
          timeZone: 'America/Toronto',
          effectiveFrom: new Date('2027-01-01T00:00:00.000Z'),
          verifiedAt: new Date(),
          verifiedByUserId: fixture.admin.id,
          intervals: {
            create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
              dayOfWeek,
              startTime: 0,
              endTime: 1440,
            })),
          },
        },
      });
    }
    const projects: Array<{ id: string; clientUserId: string }> = [];
    for (let index = 0; index < 3; index += 1) {
      const client = await prisma.client.create({
        data: {
          organizationId: fixture.org.id,
          name: `Capacity client ${index}`,
          regulatoryRequirements: [],
        },
      });
      const building = await prisma.building.create({
        data: {
          organizationId: fixture.org.id,
          clientId: client.id,
          name: `Capacity building ${index}`,
          address: `${index} Capacity Street`,
          city: 'Toronto',
          province: 'ON',
          timeZone: 'America/Toronto',
          timeZoneVerified: true,
        },
      });
      const project = await prisma.project.create({
        data: {
          organizationId: fixture.org.id,
          clientId: client.id,
          buildingId: building.id,
          userId: fixture.owner.id,
          name: `Capacity project ${index}`,
          documentType: 'PMU',
          year: 2027,
        },
      });
      const clientUser = await prisma.clientUser.create({
        data: {
          organizationId: fixture.org.id,
          clientId: client.id,
          email: `capacity-${index}-${Date.now()}@booking-gate.invalid`,
          password: 'test-only',
          firstName: 'Capacity',
          lastName: `Client ${index}`,
          buildingIds: [building.id],
        },
      });
      await prisma.projectAdvisorEligibility.createMany({
        data: [
          {
            organizationId: fixture.org.id,
            projectId: project.id,
            advisorUserId: fixture.owner.id,
            priority: 10,
            authorizedByUserId: fixture.admin.id,
          },
          {
            organizationId: fixture.org.id,
            projectId: project.id,
            advisorUserId: fixture.colleague.id,
            priority: 20,
            authorizedByUserId: fixture.admin.id,
          },
        ],
      });
      projects.push({ id: project.id, clientUserId: clientUser.id });
    }
    const requestedDate = new Date('2027-04-01T15:00:00.000Z');
    const first = await bookings.createBooking({
      projectId: projects[0].id,
      clientUserId: projects[0].clientUserId,
      activityType: 'visite',
      requestedDate,
      duration: 120,
    });
    const second = await bookings.createBooking({
      projectId: projects[1].id,
      clientUserId: projects[1].clientUserId,
      activityType: 'visite',
      requestedDate,
      duration: 120,
    });
    expect(first.assignedUserId).toBe(fixture.owner.id);
    expect(second.assignedUserId).toBe(fixture.colleague.id);
    expect(first.status).toBe('DEMANDEE');
    expect(second.status).toBe('DEMANDEE');
    await expect(
      bookings.createBooking({
        projectId: projects[2].id,
        clientUserId: projects[2].clientUserId,
        activityType: 'visite',
        requestedDate,
        duration: 120,
      }),
    ).rejects.toThrow('Aucune capacité admissible disponible');
  });

  it('rolls back cancellation and hold release when canonical audit insertion fails', async () => {
    const bookings = new BookingsService(
      prisma as unknown as PrismaService,
      new SchedulingService(prisma as unknown as PrismaService),
    );
    jest
      .spyOn(
        bookings as unknown as {
          sendBookingEmail: (data: unknown) => Promise<void>;
        },
        'sendBookingEmail',
      )
      .mockResolvedValue(undefined);
    if (
      !(await prisma.projectAdvisorEligibility.findFirst({
        where: {
          projectId: fixture.project.id,
          advisorUserId: fixture.owner.id,
          activityId: null,
          status: 'ACTIVE',
        },
      }))
    ) {
      await prisma.projectAdvisorEligibility.create({
        data: {
          organizationId: fixture.org.id,
          projectId: fixture.project.id,
          advisorUserId: fixture.owner.id,
          priority: 10,
          authorizedByUserId: fixture.admin.id,
        },
      });
    }
    const requestedDate = new Date('2027-05-01T15:00:00.000Z');
    const booking = await bookings.createBooking({
      projectId: fixture.project.id,
      clientUserId: fixture.clientUser.id,
      activityType: 'visite',
      requestedDate,
      duration: 60,
    });
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION reject_test_booking_cancellation_audit()
      RETURNS trigger AS $$ BEGIN
        IF NEW."action" = 'BOOKING_CANCELLED' AND NEW."entityId" = '${booking.id}'
        THEN RAISE EXCEPTION 'synthetic audit failure'; END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER reject_test_booking_cancellation_audit
      BEFORE INSERT ON "AuditLog" FOR EACH ROW
      EXECUTE FUNCTION reject_test_booking_cancellation_audit()
    `);
    try {
      await expect(
        bookings.cancelBooking(booking.id, {
          type: 'CLIENT',
          id: fixture.clientUser.id,
          role: 'CLIENT_MANAGER',
          organizationId: fixture.org.id,
        }),
      ).rejects.toThrow('synthetic audit failure');
      expect(
        await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }),
      ).toMatchObject({
        status: 'DEMANDEE',
        pendingCommitmentVersionId: booking.pendingCommitmentVersionId,
      });
      expect(
        await prisma.bookingAssignment.findFirstOrThrow({
          where: { bookingId: booking.id },
        }),
      ).toMatchObject({ status: 'PENDING' });
      expect(
        await prisma.bookingCommitmentVersion.findUniqueOrThrow({
          where: { id: booking.pendingCommitmentVersionId! },
        }),
      ).toMatchObject({ status: 'PROPOSED' });
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS reject_test_booking_cancellation_audit ON "AuditLog"',
      );
      await prisma.$executeRawUnsafe(
        'DROP FUNCTION IF EXISTS reject_test_booking_cancellation_audit()',
      );
    }
  });
});
