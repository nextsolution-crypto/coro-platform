import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { effectiveBookingDate } from './booking-status';

describe('BookingsService security and transitions', () => {
  const project = { id: 'project', organizationId: 'org-a', userId: 'user-a', name: 'Project', user: {}, client: {}, building: {} };
  const booking = {
    id: 'booking', projectId: 'project', organizationId: 'org-a', status: 'DEMANDEE',
    requestedDate: new Date('2026-10-01T13:00:00Z'), reportedDate: null,
    duration: 60, activityType: 'visite',
    project: { name: 'Project', building: null },
    clientUser: { email: 'client@example.com', firstName: 'C', lastName: 'L' },
    assignedUser: { email: 'user@example.com', firstName: 'U', lastName: 'L' },
  };
  let prisma: any;
  let scheduling: any;
  let service: BookingsService;

  beforeEach(() => {
    prisma = {
      project: { findUnique: jest.fn().mockResolvedValue(project), findFirst: jest.fn().mockResolvedValue(null) },
      booking: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), create: jest.fn() },
      bookingAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
      projectActivity: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
      $transaction: jest.fn(async callback => callback(prisma)),
    };
    scheduling = { analyzeUsers: jest.fn().mockResolvedValue(new Map()),
      analyzeUser: jest.fn().mockResolvedValue({ status: 'AVAILABLE', conflicts: [], warnings: [], sourcesChecked: [] }),
      lockBooking: jest.fn(), lockUsers: jest.fn() };
    service = new BookingsService(prisma, scheduling);
    jest.spyOn(service as any, 'sendBookingEmail').mockResolvedValue(undefined);
  });

  it('rejects reading a project outside the adviser organization', async () => {
    await expect(service.getBookingsForProject('project', 'org-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({ where: { id: 'project', organizationId: 'org-b' } });
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  it('rejects modifying a booking outside the adviser organization', async () => {
    await expect(service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'booking', organizationId: 'org-b' } }));
  });

  it('rejects a new adviser from another organization', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'other' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 'other', organizationId: 'org-a', isActive: true } });
  });

  it('rejects an inactive adviser', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'inactive' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 'inactive', organizationId: 'org-a', isActive: true } });
  });

  it('rejects cancelling a booking outside the organization', async () => {
    await expect(service.cancelBooking('booking', 'conseiller', 'org-b')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'booking', organizationId: 'org-b' } }));
  });

  it('accepts a valid transition and rejects terminal reopening', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.booking.update.mockResolvedValue(booking);
    await service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a');
    expect(prisma.booking.update).toHaveBeenCalled();
    prisma.booking.findFirst.mockResolvedValue({ ...booking, status: 'ANNULEE' });
    await expect(service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['CONFIRMEE', undefined],
    ['REPORTEE', new Date('2026-10-02T13:00:00Z')],
  ])('synchronizes a linked %s booking date', async (status, reportedDate) => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, activityId: 'activity' });
    const result = { ...booking, status, activityId: 'activity', reportedDate: reportedDate ?? null };
    prisma.booking.update.mockResolvedValue(result);
    prisma.$transaction = jest.fn(async callback => callback({ booking: prisma.booking, bookingAssignment: prisma.bookingAssignment, projectActivity: prisma.projectActivity }));
    await service.updateBookingStatus('booking', { status, reportedDate }, 'org-a');
    expect(prisma.projectActivity.update).toHaveBeenCalledWith({ where: { id: 'activity' }, data: {
      scheduledDate: reportedDate ?? booking.requestedDate,
      ...(reportedDate ? { reportedDate } : {}),
    } });
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it('does not update the Activity when a linked booking is refused', async () => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, activityId: 'activity' });
    prisma.booking.update.mockResolvedValue({ ...booking, status: 'REFUSEE' });
    await service.updateBookingStatus('booking', { status: 'REFUSEE', refuseReason: 'Indisponible' }, 'org-a');
    expect(prisma.projectActivity.update).not.toHaveBeenCalled();
  });

  it('requires report date and replacement user', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    await expect(service.updateBookingStatus('booking', { status: 'REPORTEE' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE' }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the reported date and a stable ICS UID', () => {
    const reportedDate = new Date('2026-10-02T13:00:00Z');
    expect(effectiveBookingDate({ requestedDate: booking.requestedDate, reportedDate })).toEqual(reportedDate);
    const event = { bookingId: 'booking', sequence: 0, title: 'Visit', description: 'Visit', startDate: booking.requestedDate, durationMinutes: 60, organizerEmail: 'a@example.com', organizerName: 'A', attendeeEmail: 'b@example.com', attendeeName: 'B' };
    const initial = (service as any).generateIcs(event);
    const reported = (service as any).generateIcs({ ...event, sequence: 1, startDate: reportedDate });
    expect(initial).toContain('UID:booking@getcoro.io');
    expect(reported).toContain('UID:booking@getcoro.io');
    expect(reported).toContain('SEQUENCE:1');
  });

  it('creates a legacy Booking with an accepted initial LEAD', async () => {
    prisma.booking.create.mockResolvedValue({ ...booking, assignedUser: booking.assignedUser });
    await service.createBooking({ projectId: 'project', clientUserId: 'client-user', activityType: 'visite', requestedDate: booking.requestedDate, duration: 60 });
    expect(prisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      assignedUserId: 'user-a', assignments: { create: expect.objectContaining({ userId: 'user-a', role: 'LEAD', status: 'ACCEPTED' }) },
    }) }));
  });

  it.each([undefined, 'activity'])('uses the Project Building zone for local Booking time (activity %s)', async activityId => {
    prisma.project.findUnique.mockResolvedValue({ ...project, building: { timeZone: 'America/Vancouver' } });
    if (activityId) prisma.projectActivity.findFirst.mockResolvedValue({ id: activityId });
    prisma.booking.create.mockResolvedValue({ ...booking, assignedUser: booking.assignedUser });
    await service.createBooking({ projectId: 'project', activityId, clientUserId: 'client-user', activityType: 'visite', requestedLocalDateTime: '2026-07-15T09:00', duration: 60 });
    expect(prisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestedDate: new Date('2026-07-15T16:00:00Z') }) }));
    expect((service as any).sendBookingEmail).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('America/Vancouver') }));
  });

  it('continues accepting a Booking for an unverified Building timezone', async () => {
    prisma.project.findUnique.mockResolvedValue({ ...project, building: { timeZone: 'America/Toronto', timeZoneVerified: false } });
    prisma.booking.create.mockResolvedValue({ ...booking, assignedUser: booking.assignedUser });
    await service.createBooking({ projectId: 'project', clientUserId: 'client-user', activityType: 'visite', requestedLocalDateTime: '2026-07-15T09:00', duration: 60 });
    expect(prisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestedDate: new Date('2026-07-15T13:00:00Z') }) }));
  });

  it('reports in the Building zone and stores the resulting UTC instant', async () => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, project: { ...booking.project, building: { timeZone: 'America/Toronto' } } });
    prisma.booking.update.mockImplementation(async ({ data }) => ({ ...booking, ...data }));
    await service.updateBookingStatus('booking', { status: 'REPORTEE', reportedLocalDateTime: '2026-07-15T09:00' }, 'org-a');
    expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reportedDate: new Date('2026-07-15T13:00:00Z') }) }));
    expect((service as any).sendBookingEmail).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('America/Toronto') }));
  });

  it('creates a linked booking and rejects a second open attempt', async () => {
    prisma.projectActivity.findFirst.mockResolvedValue({ id: 'activity', type: 'formation_epi' });
    prisma.booking.create.mockResolvedValue({ ...booking, assignedUser: booking.assignedUser });
    const data = { projectId: 'project', activityId: 'activity', clientUserId: 'client-user', activityType: 'visite', requestedDate: booking.requestedDate, duration: 60 };
    await service.createBooking(data);
    expect(prisma.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ activityId: 'activity', activityType: 'formation_epi' }) }));
    prisma.booking.findFirst.mockResolvedValue({ id: 'open' });
    await expect(service.createBooking(data)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.create).toHaveBeenCalledTimes(1);
  });

  it.each(['REFUSEE', 'ANNULEE'])('allows a new attempt after %s', async () => {
    prisma.projectActivity.findFirst.mockResolvedValue({ id: 'activity' });
    prisma.booking.create.mockResolvedValue({ ...booking, assignedUser: booking.assignedUser });
    await service.createBooking({ projectId: 'project', activityId: 'activity', clientUserId: 'client-user', activityType: 'visite', requestedDate: booking.requestedDate, duration: 60 });
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({ where: { activityId: 'activity', status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } } });
  });

  it('keeps client listing on legacy assignedUser', async () => {
    await service.getBookingsForClient('client-user');
    expect(prisma.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientUserId: 'client-user' },
      include: expect.objectContaining({ assignedUser: expect.anything() }),
    }));
  });

  it('keeps legacy REASSIGNEE while recording the replacement', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    prisma.booking.update.mockResolvedValue({ ...booking, status: 'REASSIGNEE', assignedUserId: 'user-b' });
    const old = { id: 'old', userId: 'user-a' };
    const tx = {
      bookingAssignment: {
        findFirst: jest.fn().mockResolvedValue(old),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'new' }),
      },
      booking: prisma.booking,
    };
    prisma.$transaction = jest.fn(async callback => callback(tx));
    await service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'user-b' }, 'org-a', { userId: 'admin', role: 'ADMIN' });
    expect(tx.bookingAssignment.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: expect.objectContaining({ status: 'REPLACED' }) });
    expect(tx.bookingAssignment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'user-b', role: 'LEAD', status: 'ACCEPTED', assignedByUserId: 'admin' }) });
    expect(prisma.booking.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assignedUserId: 'user-b', status: 'REASSIGNEE' }) }));
  });

  it('prevents an OPERATOR from using legacy reassignment to manage another user', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'user-b' }, 'org-a', { userId: 'user-a', role: 'OPERATOR' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('checks availability on legacy reassignment before modifying assignments', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    scheduling.analyzeUser.mockResolvedValue({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] });
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'user-b' }, 'org-a', { userId: 'admin', role: 'ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('blocks confirmation for an accepted assignment with an external firm conflict', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.bookingAssignment.findMany.mockResolvedValue([{ userId: 'user-a', status: 'ACCEPTED' }]);
    scheduling.analyzeUsers.mockResolvedValue(new Map([['user-a', { status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] }]]));
    await expect(service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a', { userId: 'admin', role: 'ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
    prisma.booking.update.mockResolvedValue({ ...booking, status: 'CONFIRMEE' });
    prisma.notification = { create: jest.fn().mockResolvedValue({}) };
    prisma.$transaction = jest.fn(async callback => callback({ booking: prisma.booking, bookingAssignment: prisma.bookingAssignment, notification: prisma.notification }));
    await service.updateBookingStatus('booking', { status: 'CONFIRMEE', allowConflict: true }, 'org-a', { userId: 'admin', role: 'ADMIN' });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'BOOKING_SCHEDULING_OVERRIDE' }) });
  });

  it('allows confirmation with only a soft conflict and returns a warning', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.bookingAssignment.findMany.mockResolvedValue([{ userId: 'user-a', status: 'ACCEPTED' }]);
    scheduling.analyzeUsers.mockResolvedValue(new Map([['user-a', { status: 'SOFT_CONFLICT',
      conflicts: [{ reason: 'Proposition provisoire' }], warnings: [] }]]));
    prisma.booking.update.mockResolvedValue({ ...booking, status: 'CONFIRMEE' });
    const result = await service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a', { userId: 'admin', role: 'ADMIN' });
    expect(result.schedulingWarnings).toContain('user-a : Proposition provisoire');
  });

  it('rechecks the proposed report interval and denies operator override', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.bookingAssignment.findMany.mockResolvedValue([{ userId: 'user-a', status: 'ACCEPTED' }]);
    scheduling.analyzeUsers.mockResolvedValue(new Map([['user-a', { status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] }]]));
    await expect(service.updateBookingStatus('booking', { status: 'REPORTEE', reportedDate: new Date('2026-10-02T13:00:00Z') }, 'org-a')).rejects.toBeInstanceOf(BadRequestException);
    expect(scheduling.analyzeUsers).toHaveBeenCalledWith(expect.objectContaining({ startUtc: new Date('2026-10-02T13:00:00Z'), excludeBookingId: 'booking' }));
    await expect(service.updateBookingStatus('booking', { status: 'REPORTEE', reportedDate: new Date('2026-10-02T13:00:00Z'), allowConflict: true }, 'org-a', { userId: 'operator', role: 'OPERATOR' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps confirmation unchanged when the locked recheck discovers a conflict', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.bookingAssignment.findMany.mockResolvedValue([{ userId: 'user-a', status: 'ACCEPTED' }]);
    scheduling.analyzeUsers.mockResolvedValueOnce(new Map([['user-a', { status: 'AVAILABLE', conflicts: [], warnings: [] }]]))
      .mockResolvedValueOnce(new Map([['user-a', { status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] }]]));
    await expect(service.updateBookingStatus('booking', { status: 'CONFIRMEE' }, 'org-a', { userId: 'admin', role: 'ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(scheduling.lockBooking).toHaveBeenCalledWith(prisma, 'org-a', 'booking');
    expect(scheduling.lockUsers).toHaveBeenCalledWith(prisma, 'org-a', ['user-a']);
    expect(scheduling.analyzeUsers).toHaveBeenCalledTimes(2);
    expect(scheduling.analyzeUsers).toHaveBeenLastCalledWith(expect.objectContaining({ userIds: ['user-a'] }), prisma);
  });

  it('does not partly update Booking or Activity when report recheck becomes blocked', async () => {
    prisma.booking.findFirst.mockResolvedValue({ ...booking, activityId: 'activity' });
    prisma.bookingAssignment.findMany.mockResolvedValue([{ userId: 'user-a', status: 'ACCEPTED' }]);
    scheduling.analyzeUsers.mockResolvedValueOnce(new Map([['user-a', { status: 'AVAILABLE', conflicts: [], warnings: [] }]]))
      .mockResolvedValueOnce(new Map([['user-a', { status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] }]]));
    await expect(service.updateBookingStatus('booking', { status: 'REPORTEE', reportedDate: new Date('2026-10-02T13:00:00Z') },
      'org-a', { userId: 'admin', role: 'ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
    expect(prisma.projectActivity.update).not.toHaveBeenCalled();
  });

  it('allows admin override after the locked status recheck', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.bookingAssignment.findMany.mockResolvedValue([{ userId: 'user-a', status: 'ACCEPTED' }]);
    scheduling.analyzeUsers.mockResolvedValueOnce(new Map([['user-a', { status: 'AVAILABLE', conflicts: [], warnings: [] }]]))
      .mockResolvedValueOnce(new Map([['user-a', { status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] }]]));
    prisma.booking.update.mockResolvedValue({ ...booking, status: 'CONFIRMEE' });
    prisma.notification = { create: jest.fn().mockResolvedValue({}) };
    await service.updateBookingStatus('booking', { status: 'CONFIRMEE', allowConflict: true }, 'org-a', { userId: 'admin', role: 'ADMIN' });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'BOOKING_SCHEDULING_OVERRIDE' }) });
  });

  it('rechecks legacy reassignment after protection', async () => {
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    scheduling.analyzeUser.mockResolvedValueOnce({ status: 'AVAILABLE', conflicts: [], warnings: [] })
      .mockResolvedValueOnce({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] });
    await expect(service.updateBookingStatus('booking', { status: 'REASSIGNEE', newUserId: 'user-b' },
      'org-a', { userId: 'admin', role: 'ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });
});
