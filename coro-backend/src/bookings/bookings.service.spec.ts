import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { effectiveBookingDate } from './booking-status';

describe('BookingsService security and transitions', () => {
  const project = {
    id: 'project',
    organizationId: 'org-a',
    userId: 'user-a',
    buildingId: 'building',
    name: 'Project',
    user: {},
    client: {},
    building: { id: 'building', timeZone: 'America/Toronto' },
  };
  const booking = {
    id: 'booking',
    projectId: 'project',
    organizationId: 'org-a',
    status: 'DEMANDEE',
    requestedDate: new Date('2026-10-01T13:00:00Z'),
    reportedDate: null,
    duration: 60,
    activityType: 'visite',
    project: {
      name: 'Project',
      buildingId: 'building',
      building: { id: 'building', timeZone: 'America/Toronto' },
    },
    clientUser: { email: 'client@example.com', firstName: 'C', lastName: 'L' },
    assignedUser: { email: 'user@example.com', firstName: 'U', lastName: 'L' },
  };
  let prisma: any;
  let scheduling: any;
  let service: BookingsService;

  beforeEach(() => {
    prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue(project),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      booking: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      bookingAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'assignment', ...data })),
        updateMany: jest.fn(),
      },
      bookingCommitmentVersion: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'commitment',
          status: 'PROPOSED',
          ...data,
        })),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      projectAdvisorEligibility: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'eligibility',
            projectId: 'project',
            activityId: null,
            advisorUserId: 'user-a',
            priority: 100,
            status: 'ACTIVE',
          },
        ]),
      },
      auditLog: { create: jest.fn() },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      projectActivity: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'activity' }]),
      $transaction: jest.fn(async (callback) => callback(prisma)),
    };
    scheduling = {
      analyzeUsers: jest.fn().mockResolvedValue(
        new Map([
          [
            'user-a',
            {
              status: 'AVAILABLE',
              conflicts: [],
              warnings: [],
              sourcesChecked: [],
            },
          ],
        ]),
      ),
      analyzeUser: jest.fn().mockResolvedValue({
        status: 'AVAILABLE',
        conflicts: [],
        warnings: [],
        sourcesChecked: [],
      }),
      lockBooking: jest.fn(),
      lockUsers: jest.fn(),
    };
    prisma.booking.create.mockResolvedValue({ ...booking, id: 'booking' });
    prisma.booking.update.mockResolvedValue({
      ...booking,
      assignedUser: booking.assignedUser,
      clientUser: booking.clientUser,
      project: booking.project,
    });
    service = new BookingsService(prisma, scheduling);
    jest.spyOn(service as any, 'sendBookingEmail').mockResolvedValue(undefined);
  });

  it('rejects reading a project outside the adviser organization', async () => {
    await expect(
      service.getBookingsForProject('project', 'org-b', {
        userId: 'admin',
        organizationId: 'org-b',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project', organizationId: 'org-b' },
    });
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('rejects modifying a booking outside the adviser organization', async () => {
    await expect(
      service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-b'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking', organizationId: 'org-b' },
      }),
    );
  });

  it('rejects a new adviser from another organization', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'REASSIGNEE', newUserId: 'other' },
        'org-a',
        { userId: 'admin', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'other', organizationId: 'org-a', isActive: true },
    });
  });

  it('rejects an inactive adviser', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'REASSIGNEE', newUserId: 'inactive' },
        'org-a',
        { userId: 'admin', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'inactive', organizationId: 'org-a', isActive: true },
    });
  });

  it('rejects cancelling a booking outside the organization', async () => {
    await expect(
      service.cancelBooking('booking', {
        type: 'USER',
        id: 'admin',
        role: 'ADMIN',
        organizationId: 'org-b',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking', organizationId: 'org-b' },
      }),
    );
  });

  it('rejects every direct confirmation without governed advisor evidence', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('does not overwrite the linked Activity when proposing a report', async () => {
    const governed = {
      ...booking,
      activityId: 'activity',
      pendingCommitmentVersion: null,
      currentCommitmentVersionId: 'current',
      currentCommitmentVersion: null,
    };
    prisma.booking.findFirst.mockResolvedValue(governed);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
    await service.updateBookingStatus(
      'booking',
      { status: 'REPORTEE', reportedDate: new Date('2026-10-02T13:00:00Z') },
      'org-a',
      { userId: 'admin', role: 'ADMIN' },
    );
    expect(prisma.projectActivity.update).not.toHaveBeenCalled();
    expect(prisma.bookingCommitmentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changeType: 'RESCHEDULE',
          startAt: new Date('2026-10-02T13:00:00Z'),
        }),
      }),
    );
  });

  it('does not update the Activity when a linked booking is refused', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      ...booking,
      activityId: 'activity',
    });
    prisma.booking.update.mockResolvedValue({ ...booking, status: 'REFUSEE' });
    await service.updateBookingStatus(
      'booking',
      { status: 'REFUSEE', refuseReason: 'Indisponible' },
      'org-a',
    );
    expect(prisma.projectActivity.update).not.toHaveBeenCalled();
  });

  it('requires report date and replacement user', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus('booking', { status: 'REPORTEE' }, 'org-a', {
        userId: 'admin',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateBookingStatus('booking', { status: 'REASSIGNEE' }, 'org-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the reported date and a stable ICS UID', () => {
    const reportedDate = new Date('2026-10-02T13:00:00Z');
    expect(
      effectiveBookingDate({
        requestedDate: booking.requestedDate,
        reportedDate,
      }),
    ).toEqual(reportedDate);
    const event = {
      bookingId: 'booking',
      sequence: 0,
      title: 'Visit',
      description: 'Visit',
      startDate: booking.requestedDate,
      durationMinutes: 60,
      organizerEmail: 'a@example.com',
      organizerName: 'A',
      attendeeEmail: 'b@example.com',
      attendeeName: 'B',
    };
    const initial = (service as any).generateIcs(event);
    const reported = (service as any).generateIcs({
      ...event,
      sequence: 1,
      startDate: reportedDate,
    });
    expect(initial).toContain('UID:booking@getcoro.io');
    expect(reported).toContain('UID:booking@getcoro.io');
    expect(reported).toContain('SEQUENCE:1');
  });

  it('creates a governed Booking with a pending initial LEAD', async () => {
    await service.createBooking({
      projectId: 'project',
      clientUserId: 'client-user',
      activityType: 'visite',
      requestedDate: booking.requestedDate,
      duration: 60,
    });
    expect(prisma.bookingAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-a',
        role: 'LEAD',
        status: 'PENDING',
        commitmentVersionId: 'commitment',
      }),
    });
    expect(prisma.bookingCommitmentVersion.create).toHaveBeenCalled();
  });

  it.each([undefined, 'activity'])(
    'uses the Project Building zone for local Booking time (activity %s)',
    async (activityId) => {
      prisma.project.findUnique.mockResolvedValue({
        ...project,
        building: { timeZone: 'America/Vancouver' },
      });
      if (activityId)
        prisma.projectActivity.findFirst.mockResolvedValue({ id: activityId });
      prisma.booking.create.mockResolvedValue({
        ...booking,
        assignedUser: booking.assignedUser,
      });
      await service.createBooking({
        projectId: 'project',
        activityId,
        clientUserId: 'client-user',
        activityType: 'visite',
        requestedLocalDateTime: '2026-07-15T09:00',
        duration: 60,
      });
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            requestedDate: new Date('2026-07-15T16:00:00Z'),
          }),
        }),
      );
      expect((service as any).sendBookingEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('America/Vancouver'),
        }),
      );
    },
  );

  it('continues accepting a Booking for an unverified Building timezone', async () => {
    prisma.project.findUnique.mockResolvedValue({
      ...project,
      building: { timeZone: 'America/Toronto', timeZoneVerified: false },
    });
    prisma.booking.create.mockResolvedValue({
      ...booking,
      assignedUser: booking.assignedUser,
    });
    await service.createBooking({
      projectId: 'project',
      clientUserId: 'client-user',
      activityType: 'visite',
      requestedLocalDateTime: '2026-07-15T09:00',
      duration: 60,
    });
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestedDate: new Date('2026-07-15T13:00:00Z'),
        }),
      }),
    );
  });

  it('reports in the Building zone and stores the resulting UTC instant', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      ...booking,
      project: {
        ...booking.project,
        building: { timeZone: 'America/Toronto' },
      },
    });
    prisma.booking.update.mockImplementation(async ({ data }) => ({
      ...booking,
      ...data,
    }));
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
    await service.updateBookingStatus(
      'booking',
      { status: 'REPORTEE', reportedLocalDateTime: '2026-07-15T09:00' },
      'org-a',
      { userId: 'admin', role: 'ADMIN' },
    );
    expect(prisma.bookingCommitmentVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startAt: new Date('2026-07-15T13:00:00Z'),
        }),
      }),
    );
    expect((service as any).sendBookingEmail).not.toHaveBeenCalled();
  });

  it('creates a linked booking and rejects a second open attempt', async () => {
    prisma.projectActivity.findFirst.mockResolvedValue({
      id: 'activity',
      type: 'formation_epi',
    });
    prisma.booking.create.mockResolvedValue({
      ...booking,
      assignedUser: booking.assignedUser,
    });
    const data = {
      projectId: 'project',
      activityId: 'activity',
      clientUserId: 'client-user',
      activityType: 'visite',
      requestedDate: booking.requestedDate,
      duration: 60,
    };
    await service.createBooking(data);
    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityId: 'activity',
          activityType: 'formation_epi',
        }),
      }),
    );
    prisma.booking.findFirst.mockResolvedValue({ id: 'open' });
    await expect(service.createBooking(data)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.booking.create).toHaveBeenCalledTimes(1);
  });

  it.each(['REFUSEE', 'ANNULEE'])('allows a new attempt after %s', async () => {
    prisma.projectActivity.findFirst.mockResolvedValue({ id: 'activity' });
    prisma.booking.create.mockResolvedValue({
      ...booking,
      assignedUser: booking.assignedUser,
    });
    await service.createBooking({
      projectId: 'project',
      activityId: 'activity',
      clientUserId: 'client-user',
      activityType: 'visite',
      requestedDate: booking.requestedDate,
      duration: 60,
    });
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        activityId: 'activity',
        status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] },
      },
    });
  });

  it('keeps client listing on legacy assignedUser', async () => {
    await service.getBookingsForClient('client-user');
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientUserId: 'client-user' },
        include: expect.objectContaining({ assignedUser: expect.anything() }),
      }),
    );
  });

  it('creates a pending reassignment commitment without changing the confirmed adviser', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      ...booking,
      pendingCommitmentVersion: null,
      currentCommitmentVersionId: 'current',
      currentCommitmentVersion: null,
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    await service.updateBookingStatus(
      'booking',
      { status: 'REASSIGNEE', newUserId: 'user-b' },
      'org-a',
      { userId: 'admin', role: 'ADMIN' },
    );
    expect(prisma.bookingAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-b',
        role: 'LEAD',
        status: 'PENDING',
        commitmentVersionId: 'commitment',
      }),
    });
    expect(prisma.booking.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedUserId: 'user-b' }),
      }),
    );
  });

  it('prevents an OPERATOR from using legacy reassignment to manage another user', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'REASSIGNEE', newUserId: 'user-b' },
        'org-a',
        { userId: 'user-a', role: 'OPERATOR' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('checks availability on legacy reassignment before modifying assignments', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    scheduling.analyzeUser.mockResolvedValue({
      status: 'BLOCKED',
      conflicts: [{ source: 'BOOKING' }],
      warnings: [],
    });
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'REASSIGNEE', newUserId: 'user-b' },
        'org-a',
        { userId: 'admin', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('blocks confirmation for an accepted assignment with an external firm conflict', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a', {
        userId: 'admin',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('does not allow administrative confirmation even with a soft conflict', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a', {
        userId: 'admin',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechecks the proposed report interval and denies operator override', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
    prisma.bookingAssignment.findMany.mockResolvedValue([
      { userId: 'user-a', status: 'ACCEPTED' },
    ]);
    scheduling.analyzeUser.mockResolvedValue({
      status: 'BLOCKED',
      conflicts: [{ source: 'BOOKING' }],
      warnings: [],
    });
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'REPORTEE', reportedDate: new Date('2026-10-02T13:00:00Z') },
        'org-a',
        { userId: 'admin', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(scheduling.analyzeUser).toHaveBeenCalledWith(
      expect.objectContaining({
        startUtc: new Date('2026-10-02T13:00:00Z'),
        excludeBookingId: 'booking',
      }),
      prisma,
    );
    await expect(
      service.updateBookingStatus(
        'booking',
        {
          status: 'REPORTEE',
          reportedDate: new Date('2026-10-02T13:00:00Z'),
          allowConflict: true,
        },
        'org-a',
        { userId: 'operator', role: 'OPERATOR' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps confirmation unchanged when the locked recheck discovers a conflict', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a', {
        userId: 'admin',
        role: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('does not partly update Booking or Activity when report recheck becomes blocked', async () => {
    prisma.booking.findFirst.mockResolvedValue({
      ...booking,
      activityId: 'activity',
    });
    prisma.bookingAssignment.findMany.mockResolvedValue([
      { userId: 'user-a', status: 'ACCEPTED' },
    ]);
    scheduling.analyzeUsers
      .mockResolvedValueOnce(
        new Map([
          ['user-a', { status: 'AVAILABLE', conflicts: [], warnings: [] }],
        ]),
      )
      .mockResolvedValueOnce(
        new Map([
          [
            'user-a',
            {
              status: 'BLOCKED',
              conflicts: [{ source: 'BOOKING' }],
              warnings: [],
            },
          ],
        ]),
      );
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'REPORTEE', reportedDate: new Date('2026-10-02T13:00:00Z') },
        'org-a',
        { userId: 'admin', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(prisma.projectActivity.update).not.toHaveBeenCalled();
  });

  it('does not allow an admin override to forge advisor confirmation', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'CONFIRMEE', allowConflict: true },
        'org-a',
        { userId: 'admin', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('rejects a governed reassignment when the locked availability check is blocked', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    scheduling.analyzeUser.mockResolvedValue({
      status: 'BLOCKED',
      conflicts: [{ source: 'BOOKING' }],
      warnings: [],
    });
    await expect(
      service.updateBookingStatus(
        'booking',
        { status: 'REASSIGNEE', newUserId: 'user-b' },
        'org-a',
        { userId: 'admin', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('routes booking email to the local provider only in an isolated QA runtime', async () => {
    (service as any).sendBookingEmail.mockRestore();
    const previous = {
      nodeEnv: process.env.NODE_ENV,
      isolated: process.env.MFA_QA_NETWORK_ISOLATED,
      provider: process.env.CLIENT_EMAIL_QA_PROVIDER_URL,
    };
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 202 } as Response);
    process.env.NODE_ENV = 'test';
    process.env.MFA_QA_NETWORK_ISOLATED = 'true';
    process.env.CLIENT_EMAIL_QA_PROVIDER_URL =
      'http://provider-fake:34641/v3/smtp/email';
    try {
      await (service as any).sendBookingEmail({
        to: 'portal-corporate-a@global-e2e.test',
        toName: 'Synthetic client',
        subject: 'Synthetic booking',
        content: '<p>QA</p>',
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'http://provider-fake:34641/v3/smtp/email',
        expect.objectContaining({
          headers: expect.objectContaining({ 'api-key': 'qa-provider-fake' }),
        }),
      );
    } finally {
      fetchMock.mockRestore();
      if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous.nodeEnv;
      if (previous.isolated === undefined)
        delete process.env.MFA_QA_NETWORK_ISOLATED;
      else process.env.MFA_QA_NETWORK_ISOLATED = previous.isolated;
      if (previous.provider === undefined)
        delete process.env.CLIENT_EMAIL_QA_PROVIDER_URL;
      else process.env.CLIENT_EMAIL_QA_PROVIDER_URL = previous.provider;
    }
  });
});
