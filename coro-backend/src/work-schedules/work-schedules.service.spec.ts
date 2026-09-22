import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkSchedulesService } from './work-schedules.service';

const admin = { userId: 'admin', organizationId: 'org-a', role: 'ADMIN' };
const operator = { userId: 'user-a', organizationId: 'org-a', role: 'OPERATOR' };
const user = { id: 'user-a', organizationId: 'org-a', timeZone: 'America/Toronto', timeZoneVerified: true };

describe('WorkSchedulesService permissions and atomic writes', () => {
  let prisma: any;
  let scheduling: any;
  let service: WorkSchedulesService;
  beforeEach(() => {
    const tx: any = {
      user: { findFirst: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue(user) },
      userWorkSchedule: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'new' }) },
      userUnavailability: { findFirst: jest.fn().mockResolvedValue({ id: 'absence', userId: 'user-a' }),
        create: jest.fn().mockResolvedValue({ id: 'absence' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'absence', cancelledAt: new Date() }) },
    };
    prisma = { user: { findFirst: jest.fn().mockResolvedValue(user) }, userWorkSchedule: { findMany: jest.fn() },
      userUnavailability: { findMany: jest.fn() }, $transaction: jest.fn((callback: any) => callback(tx)), tx };
    scheduling = { lockUsers: jest.fn().mockResolvedValue(undefined) };
    service = new WorkSchedulesService(prisma, scheduling);
  });

  it('denies operator schedule edits and manager cross-tenant edits', async () => {
    await expect(service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [] }, operator)).rejects.toBeInstanceOf(ForbiddenException);
    prisma.tx.user.findFirst.mockResolvedValue(null);
    await expect(service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [] }, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('closes the old version and creates the new one under the same user lock and transaction', async () => {
    prisma.tx.userWorkSchedule.findMany.mockResolvedValue([{ id: 'old', organizationId: 'org-a', effectiveFrom: new Date('2026-01-01'), effectiveUntil: null }]);
    await service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [
      { dayOfWeek: 1, startTime: 480, endTime: 720 }, { dayOfWeek: 1, startTime: 720, endTime: 1020 },
    ] }, admin);
    expect(scheduling.lockUsers).toHaveBeenCalledWith(prisma.tx, 'org-a', ['user-a']);
    expect(prisma.tx.userWorkSchedule.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { effectiveUntil: new Date('2026-10-01T04:00:00.000Z') } });
    expect(prisma.tx.userWorkSchedule.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      organizationId: 'org-a', timeZone: 'America/Toronto', intervals: { create: [{ dayOfWeek: 1, startTime: 480, endTime: 1020 }] },
    }) }));
  });

  it('validates and saves a changed timezone atomically with the new version', async () => {
    await service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [], timeZone: 'America/Vancouver' }, admin);
    expect(prisma.tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-a' }, data: {
      timeZone: 'America/Vancouver', timeZoneVerified: true,
    } });
    expect(prisma.tx.userWorkSchedule.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      timeZone: 'America/Vancouver', effectiveFrom: new Date('2026-10-01T07:00:00.000Z'),
    }) }));
  });

  it('closes an old timezone version at the exact UTC start of the new timezone version', async () => {
    prisma.tx.user.findFirst.mockResolvedValue({ ...user, timeZone: 'America/Vancouver' });
    prisma.tx.userWorkSchedule.findMany.mockResolvedValue([{ id: 'old', organizationId: 'org-a', timeZone: 'America/Toronto', effectiveFrom: new Date('2026-01-01'), effectiveUntil: null }]);
    await service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [] }, admin);
    const boundary = new Date('2026-10-01T07:00:00.000Z');
    expect(prisma.tx.userWorkSchedule.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { effectiveUntil: boundary } });
    expect(prisma.tx.userWorkSchedule.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      timeZone: 'America/Vancouver', effectiveFrom: boundary,
    }) }));
  });

  it('allows an adjacent historical period and creates the new open version', async () => {
    prisma.tx.userWorkSchedule.findMany.mockResolvedValue([{ id: 'closed', organizationId: 'org-a',
      effectiveFrom: new Date('2026-01-01'), effectiveUntil: new Date('2026-10-01T04:00:00Z') }]);
    await service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [] }, admin);
    expect(prisma.tx.userWorkSchedule.update).not.toHaveBeenCalled();
    expect(prisma.tx.userWorkSchedule.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an open version beginning after the proposed start without closing it', async () => {
    prisma.tx.userWorkSchedule.findMany.mockResolvedValue([{ id: 'future-open', organizationId: 'org-a',
      effectiveFrom: new Date('2026-11-01'), effectiveUntil: null }]);
    await expect(service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [] }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tx.userWorkSchedule.update).not.toHaveBeenCalled();
    expect(prisma.tx.userWorkSchedule.create).not.toHaveBeenCalled();
  });

  it('rechecks after the user lock and rejects a version committed while waiting', async () => {
    const events: string[] = [];
    let releaseLock!: () => void;
    const lock = new Promise<void>(resolve => { releaseLock = resolve; });
    scheduling.lockUsers.mockImplementation(async () => { events.push('lock-start'); await lock; events.push('lock-acquired'); });
    prisma.tx.user.findFirst.mockImplementation(() => { events.push('read-user'); return user; });
    prisma.tx.userWorkSchedule.findMany.mockImplementation(() => { events.push('read-versions'); return [{
      id: 'concurrent', organizationId: 'org-a', effectiveFrom: new Date('2026-11-01'), effectiveUntil: null,
    }]; });
    const pending = service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [] }, admin);
    await Promise.resolve();
    expect(events).toEqual(['lock-start']);
    releaseLock();
    await expect(pending).rejects.toBeInstanceOf(BadRequestException);
    expect(events).toEqual(['lock-start', 'lock-acquired', 'read-user', 'read-versions']);
    expect(prisma.tx.userWorkSchedule.update).not.toHaveBeenCalled();
    expect(prisma.tx.userWorkSchedule.create).not.toHaveBeenCalled();
  });

  it('rejects a mismatched schedule organization instead of trusting the request', async () => {
    prisma.tx.userWorkSchedule.findMany.mockResolvedValue([{ id: 'foreign', organizationId: 'org-b',
      effectiveFrom: new Date('2026-01-01'), effectiveUntil: null }]);
    await expect(service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [] }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.tx.userWorkSchedule.update).not.toHaveBeenCalled();
    expect(prisma.tx.userWorkSchedule.create).not.toHaveBeenCalled();
  });

  it('ignores a client supplied organizationId when creating a version', async () => {
    await service.replace('user-a', { effectiveFrom: '2026-10-01', intervals: [], organizationId: 'org-b' } as any, admin);
    expect(prisma.tx.userWorkSchedule.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-a' }) }));
  });

  it('allows own immediate unavailability but denies a colleague', async () => {
    await service.createUnavailability('user-a', { type: 'SICK', startAt: '2026-10-01T09:00:00Z', endAt: '2026-10-01T12:00:00Z' }, operator);
    expect(scheduling.lockUsers).toHaveBeenCalledWith(prisma.tx, 'org-a', ['user-a']);
    expect(prisma.tx.userUnavailability.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      type: 'SICK', createdByUserId: 'user-a', organizationId: 'org-a',
    }) }));
    await expect(service.createUnavailability('user-b', { type: 'SICK' }, operator)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invalid absence intervals and handles all-day DST dates', async () => {
    await expect(service.createUnavailability('user-a', { type: 'VACATION', startAt: '2026-10-01T12:00:00Z', endAt: '2026-10-01T09:00:00Z' }, operator))
      .rejects.toBeInstanceOf(BadRequestException);
    await service.createUnavailability('user-a', { type: 'VACATION', allDay: true,
      localStartDate: '2026-03-08', localEndDate: '2026-03-09' }, operator);
    const data = prisma.tx.userUnavailability.create.mock.calls[0][0].data;
    expect((data.endAt.getTime() - data.startAt.getTime()) / 3600000).toBe(23);
  });

  it('soft-cancels own absence and blocks foreign tenant', async () => {
    await service.cancelUnavailability('absence', operator);
    expect(prisma.tx.userUnavailability.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'absence', organizationId: 'org-a', cancelledAt: null },
    }));
    prisma.tx.userUnavailability.findFirst.mockResolvedValue(null);
    await expect(service.cancelUnavailability('absence', { ...operator, organizationId: 'org-b' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
