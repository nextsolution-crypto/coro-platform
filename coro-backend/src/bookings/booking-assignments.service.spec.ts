import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingAssignmentsService, BookingActor } from './booking-assignments.service';

describe('BookingAssignmentsService', () => {
  const admin: BookingActor = { userId: 'admin', organizationId: 'org-a', role: 'ADMIN' };
  const operator: BookingActor = { userId: 'user-a', organizationId: 'org-a', role: 'OPERATOR' };
  let rows: any[];
  let prisma: any;
  let scheduling: any;
  let capacity: any;
  let service: BookingAssignmentsService;

  beforeEach(() => {
    rows = [];
    prisma = {
      booking: {
        findFirst: jest.fn(({ where }) => where.organizationId === 'org-a' && where.id === 'booking' ? { id: 'booking', projectId: 'project', activityId: 'activity', organizationId: 'org-a', status: 'CONFIRMEE', assignedUserId: 'user-a', requestedDate: new Date('2026-10-01T13:00:00Z'), reportedDate: null, duration: 60, project: { buildingId: 'building', building: { timeZone: 'America/Toronto', timeZoneVerified: true } } } : null),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findFirst: jest.fn(({ where }) => ['admin', 'user-a', 'user-b', 'user-c'].includes(where.id) && where.organizationId === 'org-a' && where.isActive ? { id: where.id } : null),
      },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      bookingAssignment: {
        findFirst: jest.fn(({ where }) => rows.find(row =>
          (where.id === undefined || row.id === where.id) && row.bookingId === where.bookingId &&
          (where.userId === undefined || row.userId === where.userId) &&
          (where.role === undefined || row.role === where.role) &&
          (where.status === undefined || (where.status.in ? where.status.in.includes(row.status) : row.status === where.status))) || null),
        findMany: jest.fn(({ where }) => rows.filter(row => row.bookingId === where.bookingId && (!where.status || where.status.in.includes(row.status)))),
        findUniqueOrThrow: jest.fn(({ where }) => rows.find(row => row.id === where.id)),
        create: jest.fn(({ data }) => { const row = { id: `assignment-${rows.length + 1}`, ...data }; rows.push(row); return row; }),
        update: jest.fn(({ where, data }) => { const row = rows.find(item => item.id === where.id); Object.assign(row, data); return row; }),
        updateMany: jest.fn(({ where, data }) => { const row = rows.find(item => item.id === where.id && item.bookingId === where.bookingId && item.status === where.status); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 }; }),
      },
      $transaction: jest.fn(async callback => callback(prisma)),
    };
    scheduling = { analyzeUser: jest.fn().mockResolvedValue({ status: 'AVAILABLE', conflicts: [], warnings: [], sourcesChecked: [] }),
      analyzeUsers: jest.fn().mockResolvedValue(new Map()), lockBooking: jest.fn(), lockUsers: jest.fn() };
    capacity = { getCapacityPlanning: jest.fn().mockResolvedValue([]) };
    service = new BookingAssignmentsService(prisma, scheduling, capacity);
  });

  it('adds several SUPPORT assignments and lists active team members', async () => {
    await service.add('booking', 'user-a', 'SUPPORT', admin);
    await service.add('booking', 'user-b', 'SUPPORT', admin);
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.status === 'PENDING')).toBe(true);
    expect(await service.list('booking', operator)).toHaveLength(2);
  });

  it('creates a LEAD and synchronizes legacy assignedUserId', async () => {
    await service.add('booking', 'user-a', 'LEAD', admin);
    expect(rows[0].role).toBe('LEAD');
    expect(prisma.booking.update).toHaveBeenCalledWith({ where: { id: 'booking' }, data: { assignedUserId: 'user-a' } });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'BOOKING_ASSIGNMENT_NEW', userId: 'user-a' }) });
  });

  it('rejects a second active LEAD', async () => {
    await service.add('booking', 'user-a', 'LEAD', admin);
    await expect(service.add('booking', 'user-b', 'LEAD', admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate active person and role', async () => {
    await service.add('booking', 'user-a', 'SUPPORT', admin);
    await expect(service.add('booking', 'user-a', 'SUPPORT', admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['foreign', 'inactive'])('rejects an ineligible %s user', async userId => {
    await expect(service.add('booking', userId, 'SUPPORT', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(rows).toHaveLength(0);
  });

  it('rejects cross-tenant access', async () => {
    await expect(service.list('booking', { ...admin, organizationId: 'org-b' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.add('booking', 'user-a', 'SUPPORT', { ...admin, organizationId: 'org-b' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.list('booking', { ...operator, organizationId: 'org-b' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.add('booking', 'user-a', 'SUPPORT', { ...admin, role: 'SUPER_ADMIN', organizationId: 'org-b' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows an ADMIN to manage but not an OPERATOR', async () => {
    await expect(service.add('booking', 'user-a', 'SUPPORT', operator)).rejects.toBeInstanceOf(ForbiddenException);
    await service.add('booking', 'user-a', 'SUPPORT', admin);
    expect(rows).toHaveLength(1);
  });

  it('allows an ADMIN to replace and remove within the organization', async () => {
    const lead = await service.add('booking', 'user-a', 'LEAD', admin);
    await service.replace('booking', lead.id, 'user-b', admin);
    const support = await service.add('booking', 'user-c', 'SUPPORT', admin);
    await service.remove('booking', support.id, admin);
    expect(support.status).toBe('REMOVED');
  });

  it('accepts only the concerned user response', async () => {
    const assignment = await service.add('booking', 'user-a', 'SUPPORT', admin);
    await expect(service.respond('booking', assignment.id, 'ACCEPTED', undefined, { ...operator, userId: 'user-b' })).rejects.toBeInstanceOf(ForbiddenException);
    const accepted = await service.respond('booking', assignment.id, 'ACCEPTED', undefined, operator);
    expect(accepted.status).toBe('ACCEPTED');
    expect(accepted.respondedAt).toBeInstanceOf(Date);
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'BOOKING_ASSIGNMENT_ACCEPTED', userId: 'admin' }) });
  });

  it.each(['ADMIN', 'SUPER_ADMIN'] as const)('%s can accept and decline only personal LEAD and SUPPORT assignments', async role => {
    const personalActor: BookingActor = { userId: 'admin', organizationId: 'org-a', role };
    const lead = await service.add('booking', 'admin', 'LEAD', admin);
    await expect(service.respond('booking', lead.id, 'ACCEPTED', undefined, personalActor))
      .resolves.toMatchObject({ id: lead.id, status: 'ACCEPTED' });

    const support = await service.add('booking', 'admin', 'SUPPORT', admin);
    await expect(service.respond('booking', support.id, 'DECLINED', 'Unavailable', personalActor))
      .resolves.toMatchObject({ id: support.id, status: 'DECLINED' });

    const other = await service.add('booking', 'user-b', 'SUPPORT', admin);
    await expect(service.respond('booking', other.id, 'ACCEPTED', undefined, personalActor))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('records decline reason and response time without deletion', async () => {
    const assignment = await service.add('booking', 'user-a', 'SUPPORT', admin);
    const declined = await service.respond('booking', assignment.id, 'DECLINED', 'Unavailable', operator);
    expect(declined).toMatchObject({ status: 'DECLINED', declineReason: 'Unavailable' });
    expect(declined.respondedAt).toBeInstanceOf(Date);
    expect(await service.list('booking', operator)).toHaveLength(0);
    expect(await service.list('booking', operator, true)).toHaveLength(1);
    await expect(service.respond('booking', assignment.id, 'ACCEPTED', undefined, operator)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent for the same response and audits only the first transition', async () => {
    const accepted = await service.add('booking', 'user-a', 'LEAD', admin);
    prisma.notification.create.mockClear();
    await service.respond('booking', accepted.id, 'ACCEPTED', undefined, operator);
    const respondedAt = accepted.respondedAt;
    await expect(service.respond('booking', accepted.id, 'ACCEPTED', undefined, operator)).resolves.toBe(accepted);
    expect(accepted.respondedAt).toBe(respondedAt);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'ASSIGNMENT_ACCEPTED', entityType: 'BookingAssignment', entityId: accepted.id,
      metadata: expect.objectContaining({ bookingId: 'booking', activityId: 'activity', role: 'LEAD',
        previousStatus: 'PENDING', newStatus: 'ACCEPTED' }),
    }) });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);

    const declined = await service.add('booking', 'user-b', 'SUPPORT', admin);
    prisma.auditLog.create.mockClear(); prisma.notification.create.mockClear();
    await service.respond('booking', declined.id, 'DECLINED', undefined, { ...operator, userId: 'user-b' });
    const declinedAt = declined.respondedAt;
    await expect(service.respond('booking', declined.id, 'DECLINED', undefined,
      { ...operator, userId: 'user-b' })).resolves.toBe(declined);
    expect(declined.respondedAt).toBe(declinedAt);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a contradictory or terminal response', async () => {
    const assignment = await service.add('booking', 'user-a', 'SUPPORT', admin);
    await service.respond('booking', assignment.id, 'ACCEPTED', undefined, operator);
    await expect(service.respond('booking', assignment.id, 'DECLINED', undefined, operator))
      .rejects.toThrow('réponse différente');
    assignment.status = 'REPLACED';
    await expect(service.respond('booking', assignment.id, 'ACCEPTED', undefined, operator))
      .rejects.toThrow('ne peut plus');
  });

  it('checks acceptance against the effective reported slot', async () => {
    const assignment = await service.add('booking', 'user-a', 'SUPPORT', admin);
    const reportedDate = new Date('2026-10-02T15:00:00.000Z');
    prisma.booking.findFirst.mockResolvedValue({ id: 'booking', projectId: 'project', activityId: 'activity',
      organizationId: 'org-a', status: 'REPORTEE', requestedDate: new Date('2026-10-01T13:00:00.000Z'),
      reportedDate, duration: 60, project: { buildingId: 'building',
        building: { timeZone: 'America/Toronto', timeZoneVerified: true } } });
    scheduling.analyzeUser.mockClear();
    await service.respond('booking', assignment.id, 'ACCEPTED', undefined, operator);
    expect(scheduling.analyzeUser).toHaveBeenCalledWith(expect.objectContaining({
      startUtc: reportedDate, endUtc: new Date('2026-10-02T16:00:00.000Z'), excludeBookingId: 'booking',
    }), prisma);
  });

  it('refuses a response after Booking cancellation or Assignment removal', async () => {
    const cancelled = await service.add('booking', 'user-a', 'SUPPORT', admin);
    prisma.booking.findFirst.mockResolvedValue({ id: 'booking', projectId: 'project', activityId: 'activity',
      organizationId: 'org-a', status: 'ANNULEE' });
    await expect(service.respond('booking', cancelled.id, 'DECLINED', undefined, operator))
      .rejects.toThrow('ne permet plus');
    expect(cancelled.status).toBe('PENDING');
    cancelled.status = 'REMOVED';
    await expect(service.respond('booking', cancelled.id, 'DECLINED', undefined, operator))
      .rejects.toThrow('ne peut plus');
  });

  it('replaces a LEAD atomically, preserves history and synchronizes legacy field', async () => {
    const old = await service.add('booking', 'user-a', 'LEAD', admin);
    const next = await service.replace('booking', old.id, 'user-b', admin);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(old).toMatchObject({ status: 'REPLACED', replacedByAssignmentId: next.id });
    expect(old.endedAt).toBeInstanceOf(Date);
    expect(next).toMatchObject({ role: 'LEAD', status: 'PENDING', assignedByUserId: 'admin' });
    expect(prisma.booking.update).toHaveBeenLastCalledWith({ where: { id: 'booking' }, data: { assignedUserId: 'user-b' } });
    expect(await service.list('booking', operator)).toHaveLength(1);
    expect(await service.list('booking', operator, true)).toHaveLength(2);
  });

  it('allows a new LEAD after a pending LEAD declines while legacy keeps the last proposal', async () => {
    let legacyAssignedUserId = 'user-a';
    prisma.booking.update.mockImplementation(({ data }) => { legacyAssignedUserId = data.assignedUserId; return { assignedUserId: legacyAssignedUserId }; });
    const first = await service.add('booking', 'user-a', 'LEAD', admin);
    await service.respond('booking', first.id, 'DECLINED', 'Unavailable', operator);
    expect(first.status).toBe('DECLINED');
    expect(await service.list('booking', operator)).toEqual([]);
    expect(legacyAssignedUserId).toBe('user-a');
    const next = await service.add('booking', 'user-b', 'LEAD', admin);
    expect(next.status).toBe('PENDING');
    expect(legacyAssignedUserId).toBe('user-b');
    expect(await service.list('booking', operator)).toEqual([next]);
  });

  it('preserves A → B declines → C and synchronizes legacy on each proposal', async () => {
    let legacyAssignedUserId = 'user-a';
    prisma.booking.update.mockImplementation(({ data }) => { legacyAssignedUserId = data.assignedUserId; return { assignedUserId: legacyAssignedUserId }; });
    const a = await service.add('booking', 'user-a', 'LEAD', admin);
    await service.respond('booking', a.id, 'ACCEPTED', undefined, operator);
    const b = await service.replace('booking', a.id, 'user-b', admin);
    expect(a).toMatchObject({ status: 'REPLACED', replacedByAssignmentId: b.id });
    expect(b.status).toBe('PENDING');
    expect(legacyAssignedUserId).toBe('user-b');
    await service.respond('booking', b.id, 'DECLINED', 'Unavailable', { ...operator, userId: 'user-b' });
    expect(b.status).toBe('DECLINED');
    expect(a.status).toBe('REPLACED');
    expect(await service.list('booking', operator)).toEqual([]);
    expect(legacyAssignedUserId).toBe('user-b');
    const c = await service.add('booking', 'user-c', 'LEAD', admin);
    expect(c.status).toBe('PENDING');
    expect(legacyAssignedUserId).toBe('user-c');
    expect(await service.list('booking', operator, true)).toHaveLength(3);
  });

  it('does not begin replacement when the new user is ineligible', async () => {
    const old = await service.add('booking', 'user-a', 'LEAD', admin);
    await expect(service.replace('booking', old.id, 'foreign', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(old.status).toBe('PENDING');
    expect(rows).toHaveLength(1);
  });

  it('removes SUPPORT without deleting its history', async () => {
    const support = await service.add('booking', 'user-a', 'SUPPORT', admin);
    await service.remove('booking', support.id, admin);
    expect(support.status).toBe('REMOVED');
    expect(support.endedAt).toBeInstanceOf(Date);
    expect(rows).toHaveLength(1);
  });

  it('returns candidate availability and workload with one batched scheduling and capacity call', async () => {
    prisma.user.findMany = jest.fn().mockResolvedValue([{ id: 'user-a', firstName: 'A', lastName: 'B', email: 'a@example.com' }]);
    scheduling.analyzeUsers.mockResolvedValue(new Map([['user-a', { status: 'SOFT_CONFLICT', conflicts: [{ source: 'BOOKING' }], warnings: [], sourcesChecked: ['BOOKING'] }]]));
    capacity.getCapacityPlanning.mockResolvedValue([{ userId: 'user-a', chargeConfirmee: 8, chargeProvisoire: 2, tauxUtilisationConfirmee: 20 }]);
    const result = await service.availableUsers('booking', admin);
    expect(result[0]).toMatchObject({ id: 'user-a', availabilityStatus: 'SOFT_CONFLICT', confirmedWorkload: 8, pendingWorkload: 2, utilizationConfirmed: 20 });
    expect(scheduling.analyzeUsers).toHaveBeenCalledTimes(1);
    expect(capacity.getCapacityPlanning).toHaveBeenCalledTimes(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a', isActive: true }) }));
  });

  it('keeps schedule and absence decisions separate from workload in available-users', async () => {
    const users = ['marco', 'solange', 'amel', 'juan'].map(id => ({ id, firstName: id, lastName: 'Test', email: `${id}@example.com` }));
    prisma.user.findMany = jest.fn().mockResolvedValue(users);
    scheduling.analyzeUsers.mockResolvedValue(new Map([
      ['marco', { status: 'AVAILABLE', conflicts: [], warnings: [], sourcesChecked: ['WORK_SCHEDULE'] }],
      ['solange', { status: 'BLOCKED', conflicts: [{ source: 'USER_UNAVAILABILITY', label: 'Indisponible' }], warnings: [], sourcesChecked: ['WORK_SCHEDULE', 'USER_UNAVAILABILITY'] }],
      ['amel', { status: 'UNKNOWN', conflicts: [], warnings: ['Horaire non configuré'], sourcesChecked: ['USER_UNAVAILABILITY'] }],
      ['juan', { status: 'BLOCKED', conflicts: [{ source: 'WORK_SCHEDULE', label: 'Hors horaire de travail' }], warnings: [], sourcesChecked: ['WORK_SCHEDULE'] }],
    ]));
    capacity.getCapacityPlanning.mockResolvedValue(users.map((row, i) => ({ userId: row.id,
      chargeConfirmee: i + 1, chargeProvisoire: 0, tauxUtilisationConfirmee: 40 + i })));
    const result = await service.availableUsers('booking', admin);
    expect(result.map(row => row.availabilityStatus)).toEqual(['AVAILABLE', 'BLOCKED', 'UNKNOWN', 'BLOCKED']);
    expect(result.map(row => row.utilizationConfirmed)).toEqual([40, 41, 42, 43]);
    expect(JSON.stringify(result)).not.toMatch(/SICK|VACATION|privateNote/);
  });

  it('does not expose candidates across tenants or to an operator', async () => {
    await expect(service.availableUsers('booking', { ...admin, organizationId: 'org-b' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.availableUsers('booking', operator)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows soft and unknown availability with an explanatory response', async () => {
    scheduling.analyzeUser.mockResolvedValueOnce({ status: 'SOFT_CONFLICT', conflicts: [{ source: 'BOOKING' }], warnings: [], sourcesChecked: ['BOOKING'] })
      .mockResolvedValueOnce({ status: 'SOFT_CONFLICT', conflicts: [{ source: 'BOOKING' }], warnings: [], sourcesChecked: ['BOOKING'] })
      .mockResolvedValueOnce({ status: 'UNKNOWN', conflicts: [], warnings: ['Fuseau à confirmer'], sourcesChecked: ['BOOKING'] })
      .mockResolvedValueOnce({ status: 'UNKNOWN', conflicts: [], warnings: ['Fuseau à confirmer'], sourcesChecked: ['BOOKING'] });
    expect((await service.add('booking', 'user-a', 'SUPPORT', admin)).availability.status).toBe('SOFT_CONFLICT');
    expect((await service.add('booking', 'user-b', 'SUPPORT', admin)).availability.warnings).toContain('Fuseau à confirmer');
  });

  it('rejects a blocked add without override and records an admin override', async () => {
    scheduling.analyzeUser.mockResolvedValue({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [], sourcesChecked: ['BOOKING'] });
    await expect(service.add('booking', 'user-a', 'SUPPORT', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(rows).toHaveLength(0);
    await service.add('booking', 'user-a', 'SUPPORT', admin, true);
    expect(rows).toHaveLength(1);
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'BOOKING_SCHEDULING_OVERRIDE' }) });
    await expect(service.add('booking', 'user-b', 'SUPPORT', operator, true)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validates a replacement before beginning its transaction', async () => {
    const old = await service.add('booking', 'user-a', 'LEAD', admin);
    scheduling.analyzeUser.mockResolvedValue({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [], sourcesChecked: ['BOOKING'] });
    const transactionCalls = prisma.$transaction.mock.calls.length;
    await expect(service.replace('booking', old.id, 'user-b', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(transactionCalls);
    expect(old.status).toBe('PENDING');
    await service.replace('booking', old.id, 'user-b', admin, true);
    expect(old.status).toBe('REPLACED');
  });

  it('rechecks conflicts when a pending proposal is accepted', async () => {
    const proposal = await service.add('booking', 'user-a', 'SUPPORT', admin);
    scheduling.analyzeUser.mockResolvedValue({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [], sourcesChecked: ['BOOKING'] });
    await expect(service.respond('booking', proposal.id, 'ACCEPTED', undefined, operator)).rejects.toBeInstanceOf(BadRequestException);
    expect(proposal.status).toBe('PENDING');
  });

  it('does not add when a firm conflict appears after the first check', async () => {
    scheduling.analyzeUser.mockResolvedValueOnce({ status: 'AVAILABLE', conflicts: [], warnings: [] })
      .mockResolvedValueOnce({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] });
    await expect(service.add('booking', 'user-a', 'SUPPORT', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(rows).toHaveLength(0);
    expect(scheduling.lockBooking).toHaveBeenCalledWith(prisma, 'org-a', 'booking');
    expect(scheduling.lockUsers).toHaveBeenCalledWith(prisma, 'org-a', ['user-a']);
    expect(scheduling.analyzeUser).toHaveBeenCalledTimes(2);
    expect(scheduling.analyzeUser).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'user-a' }), prisma);
  });

  it('keeps the old assignment and legacy LEAD when replacement recheck becomes blocked', async () => {
    const old = await service.add('booking', 'user-a', 'LEAD', admin);
    prisma.booking.update.mockClear();
    scheduling.analyzeUser.mockResolvedValueOnce({ status: 'AVAILABLE', conflicts: [], warnings: [] })
      .mockResolvedValueOnce({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] });
    await expect(service.replace('booking', old.id, 'user-b', admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(old.status).toBe('PENDING');
    expect(rows).toHaveLength(1);
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('keeps a proposal pending when acceptance recheck becomes blocked', async () => {
    const proposal = await service.add('booking', 'user-a', 'SUPPORT', admin);
    scheduling.analyzeUser.mockResolvedValueOnce({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] });
    await expect(service.respond('booking', proposal.id, 'ACCEPTED', undefined, operator)).rejects.toBeInstanceOf(BadRequestException);
    expect(proposal.status).toBe('PENDING');
  });

  it('lets an admin override a conflict discovered at the second check', async () => {
    scheduling.analyzeUser.mockResolvedValueOnce({ status: 'AVAILABLE', conflicts: [], warnings: [] })
      .mockResolvedValueOnce({ status: 'BLOCKED', conflicts: [{ source: 'BOOKING' }], warnings: [] });
    const result = await service.add('booking', 'user-a', 'SUPPORT', admin, true);
    expect(result.status).toBe('PENDING');
    expect(result.availability.status).toBe('BLOCKED');
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'BOOKING_SCHEDULING_OVERRIDE' }) });
  });
});
