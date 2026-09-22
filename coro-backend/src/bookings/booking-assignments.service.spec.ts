import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingAssignmentsService, BookingActor } from './booking-assignments.service';

describe('BookingAssignmentsService', () => {
  const admin: BookingActor = { userId: 'admin', organizationId: 'org-a', role: 'ADMIN' };
  const operator: BookingActor = { userId: 'user-a', organizationId: 'org-a', role: 'OPERATOR' };
  let rows: any[];
  let prisma: any;
  let service: BookingAssignmentsService;

  beforeEach(() => {
    rows = [];
    prisma = {
      booking: {
        findFirst: jest.fn(({ where }) => where.organizationId === 'org-a' && where.id === 'booking' ? { id: 'booking', projectId: 'project', organizationId: 'org-a', assignedUserId: 'user-a' } : null),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findFirst: jest.fn(({ where }) => ['user-a', 'user-b', 'user-c'].includes(where.id) && where.organizationId === 'org-a' && where.isActive ? { id: where.id } : null),
      },
      notification: { create: jest.fn().mockResolvedValue({}) },
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
    service = new BookingAssignmentsService(prisma);
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

  it('records decline reason and response time without deletion', async () => {
    const assignment = await service.add('booking', 'user-a', 'SUPPORT', admin);
    const declined = await service.respond('booking', assignment.id, 'DECLINED', 'Unavailable', operator);
    expect(declined).toMatchObject({ status: 'DECLINED', declineReason: 'Unavailable' });
    expect(declined.respondedAt).toBeInstanceOf(Date);
    expect(await service.list('booking', operator)).toHaveLength(0);
    expect(await service.list('booking', operator, true)).toHaveLength(1);
    await expect(service.respond('booking', assignment.id, 'ACCEPTED', undefined, operator)).rejects.toBeInstanceOf(BadRequestException);
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
});
