import { BadRequestException, NotFoundException } from '@nestjs/common';
import { bookingAssignmentSeverity, bookingInterval, overlaps, SchedulingService } from './scheduling.service';

const date = (hour: number, minute = 0) => new Date(Date.UTC(2026, 9, 1, hour, minute));
const target = { organizationId: 'org-a', userId: 'user-a', startUtc: date(9), endUtc: date(12), targetBuildingId: 'building' };
const booking = (status: string, requestedDate = date(10)) => ({ id: 'booking-b', status, requestedDate,
  reportedDate: null, duration: 60, project: { name: 'Projet B', building: { timeZone: 'America/Toronto', timeZoneVerified: true } } });

describe('Scheduling interval', () => {
  it.each(['DECLINED', 'REPLACED', 'REMOVED'])('ignores %s assignments', status => {
    expect(bookingAssignmentSeverity(status, 'CONFIRMEE')).toBeNull();
  });

  it.each(['ANNULEE', 'REFUSEE', 'COMPLETEE'])('ignores closed %s bookings', status => {
    expect(bookingAssignmentSeverity('ACCEPTED', status)).toBeNull();
  });
  it('uses half-open overlap semantics', () => {
    const a = { startUtc: date(9), endUtc: date(12) };
    expect(overlaps(a, { startUtc: date(12), endUtc: date(14) })).toBe(false);
    expect(overlaps(a, { startUtc: date(11, 59), endUtc: date(13) })).toBe(true);
    expect(overlaps(a, { ...a })).toBe(true);
    expect(overlaps(a, { startUtc: date(10), endUtc: date(11) })).toBe(true);
    expect(() => overlaps(a, { startUtc: date(12), endUtc: date(12) })).toThrow(BadRequestException);
  });

  it('uses reportedDate and validates duration', () => {
    expect(bookingInterval({ ...booking('REPORTEE'), reportedDate: date(11) }).startUtc).toEqual(date(11));
    expect(() => bookingInterval({ ...booking('DEMANDEE'), duration: 0 })).toThrow(BadRequestException);
    expect(() => bookingInterval({ ...booking('DEMANDEE'), duration: 1441 })).toThrow(BadRequestException);
  });
});

describe('SchedulingService', () => {
  let prisma: any;
  let service: SchedulingService;
  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-a', email: 'a@example.com' }]) },
      building: { findFirst: jest.fn().mockResolvedValue({ timeZone: 'America/Toronto', timeZoneVerified: true }) },
      bookingAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      projectActivity: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new SchedulingService(prisma);
  });

  it('locks users once each in deterministic order after the Booking', async () => {
    const keys: string[] = [];
    const tx = { $queryRaw: jest.fn(async sql => { keys.push(sql.values[0]); return [{ id: sql.values[0] }]; }) } as any;
    await service.lockBooking(tx, 'org-a', 'booking-a');
    await service.lockUsers(tx, 'org-a', ['user-z', 'user-a', 'user-z']);
    expect(keys).toEqual(['booking-a', 'user-a', 'user-z']);
    expect(tx.$queryRaw.mock.calls.every(([sql]) => sql.values[1] === 'org-a')).toBe(true);
  });

  it('runs the protected recheck through the transaction client', async () => {
    const tx = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-a', email: 'a@example.com' }]) },
      building: { findFirst: jest.fn().mockResolvedValue({ timeZone: 'America/Toronto', timeZoneVerified: true }) },
      bookingAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      projectActivity: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    expect((await service.analyzeUser(target, tx)).status).toBe('AVAILABLE');
    expect(tx.bookingAssignment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.bookingAssignment.findMany).not.toHaveBeenCalled();
  });

  const assignment = (assignmentStatus: string, bookingStatus: string) => ({ id: 'assignment', userId: 'user-a',
    status: assignmentStatus, booking: booking(bookingStatus) });

  it('returns AVAILABLE with checked sources when timezone is verified', async () => {
    expect(await service.analyzeUser(target)).toEqual({ status: 'AVAILABLE', conflicts: [], warnings: [],
      sourcesChecked: ['BOOKING', 'LEGACY_ACTIVITY'] });
  });

  it.each(['CONFIRMEE', 'REPORTEE', 'REASSIGNEE'])('blocks accepted %s bookings', async status => {
    prisma.bookingAssignment.findMany.mockResolvedValue([assignment('ACCEPTED', status)]);
    const result = await service.analyzeUser(target);
    expect(result.status).toBe('BLOCKED');
    expect(result.conflicts[0]).toMatchObject({ severity: 'BLOCKED', source: 'BOOKING', bookingId: 'booking-b' });
  });

  it.each([['PENDING', 'CONFIRMEE'], ['ACCEPTED', 'DEMANDEE']])('returns SOFT for %s on %s', async (assignmentStatus, bookingStatus) => {
    prisma.bookingAssignment.findMany.mockResolvedValue([assignment(assignmentStatus, bookingStatus)]);
    expect((await service.analyzeUser(target)).status).toBe('SOFT_CONFLICT');
  });

  it('ignores excluded, closed, and inactive assignments in the scoped query', async () => {
    await service.analyzeUser({ ...target, excludeBookingId: 'booking-a' });
    expect(prisma.bookingAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      userId: { in: ['user-a'] }, status: { in: ['PENDING', 'ACCEPTED'] },
      booking: expect.objectContaining({ organizationId: 'org-a', id: { not: 'booking-a' },
        status: { in: ['DEMANDEE', 'CONFIRMEE', 'REPORTEE', 'REASSIGNEE'] } }),
    }) }));
  });

  it('returns UNKNOWN for an unverified target unless a firm conflict is shown', async () => {
    prisma.building.findFirst.mockResolvedValue({ timeZone: 'America/Toronto', timeZoneVerified: false });
    expect((await service.analyzeUser(target)).status).toBe('UNKNOWN');
    prisma.bookingAssignment.findMany.mockResolvedValue([assignment('ACCEPTED', 'CONFIRMEE')]);
    const result = await service.analyzeUser(target);
    expect(result.status).toBe('BLOCKED');
    expect(result.warnings).toContain('Fuseau horaire du bâtiment à confirmer');
  });

  it('treats precise legacy activities as potential conflicts and imprecise ones as warnings', async () => {
    const activity = { id: 'activity', label: 'Exercice', customLabel: null, assigneeEmail: 'A@example.com',
      scheduledDate: date(10), duration: '2h00', customDuration: null, project: { building: { timeZone: 'America/Toronto' } } };
    prisma.projectActivity.findMany.mockResolvedValue([activity]);
    expect((await service.analyzeUser(target)).conflicts[0]).toMatchObject({ source: 'LEGACY_ACTIVITY', severity: 'SOFT_CONFLICT' });
    prisma.projectActivity.findMany.mockResolvedValue([{ ...activity, scheduledDate: date(0) }]);
    const result = await service.analyzeUser(target);
    expect(result.conflicts).toEqual([]);
    expect(result.status).toBe('UNKNOWN');
  });

  it('excludes legacy activities already linked to any Booking', async () => {
    await service.analyzeUser(target);
    expect(prisma.projectActivity.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organizationId: 'org-a', bookings: { none: {} },
    }) }));
  });

  it('does not return foreign or inactive users', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await expect(service.analyzeUser(target)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organizationId: 'org-a', isActive: true,
    }) }));
  });
});
