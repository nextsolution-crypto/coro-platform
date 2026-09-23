import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlanningActionsService } from './planning-actions.service';

const actor = { userId: 'admin', organizationId: 'org-a', role: 'ADMIN' };
const dto = { startUtc: '2026-09-23T13:30:00.000Z', durationMinutes: 90,
  leadUserId: 'lead', supportUserIds: ['support'] };
const activity = { id: 'activity', projectId: 'project', organizationId: 'org-a', type: 'inspection',
  status: 'a_faire', project: { id: 'project', clientId: 'client', buildingId: 'building',
    building: { id: 'building' }, client: { id: 'client' } } };

function setup(status: 'AVAILABLE' | 'BLOCKED' | 'UNKNOWN' = 'AVAILABLE') {
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'activity' }]),
    projectActivity: { findFirst: jest.fn().mockResolvedValue(activity), create: jest.fn(), update: jest.fn() },
    project: { findFirst: jest.fn() }, activityType: { findFirst: jest.fn() },
    clientUser: { findFirst: jest.fn().mockResolvedValue({ id: 'client-user' }) },
    user: { findMany: jest.fn().mockResolvedValue([
      { id: 'lead', firstName: 'Lead', lastName: 'User' },
      { id: 'support', firstName: 'Support', lastName: 'User' },
    ]) },
    booking: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'booking' }),
      update: jest.fn() },
    bookingAssignment: { createMany: jest.fn(), updateMany: jest.fn(),
      create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
  const result = { status, conflicts: status === 'BLOCKED' ? [{ severity: 'BLOCKED' }] : [], warnings: [], sourcesChecked: [] };
  const scheduling = { lockUsers: jest.fn(), lockBooking: jest.fn(),
    analyzeUsers: jest.fn().mockResolvedValue(new Map([['lead', result], ['support', result]])) };
  return { tx, prisma, scheduling, service: new PlanningActionsService(prisma as any, scheduling as any) };
}

describe('PlanningActionsService', () => {
  it('plans the same Activity atomically with one Booking and PENDING LEAD/SUPPORT', async () => {
    const { service, tx, prisma, scheduling } = setup();
    const result = await service.planExisting('activity', dto, actor);
    expect(result).toEqual({ activityId: 'activity', bookingId: 'booking' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(scheduling.lockUsers).toHaveBeenCalledWith(tx, 'org-a', ['lead', 'support']);
    expect(tx.booking.create.mock.calls[0][0].data).toMatchObject({ activityId: 'activity', assignedUserId: 'lead',
      clientUserId: 'client-user', status: 'CONFIRMEE' });
    expect(tx.bookingAssignment.createMany.mock.calls[0][0].data).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: 'lead', role: 'LEAD', status: 'PENDING' }),
      expect.objectContaining({ userId: 'support', role: 'SUPPORT', status: 'PENDING' }),
    ]));
    expect(tx.projectActivity.update.mock.calls[0][0]).toMatchObject({ where: { id: 'activity' } });
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe('PLANNED');
  });

  it('rejects an already open Booking after locking the Activity', async () => {
    const { service, tx } = setup();
    tx.booking.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.planExisting('activity', dto, actor)).rejects.toThrow('deja une planification active');
    expect(tx.booking.create).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('rejects a final BLOCKED recheck without leaking conflict details', async () => {
    const { service, tx } = setup('BLOCKED');
    await expect(service.planExisting('activity', dto, actor)).rejects.toThrow("Lead User n'est plus disponible");
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation for UNKNOWN and accepts it when confirmed', async () => {
    const { service, tx } = setup('UNKNOWN');
    await expect(service.planExisting('activity', dto, actor)).rejects.toThrow('confirme explicitement');
    expect(tx.booking.create).not.toHaveBeenCalled();
    await expect(service.planExisting('activity', { ...dto, confirmUnknown: true }, actor)).resolves.toMatchObject({ activityId: 'activity' });
  });

  it('refuses duplicate/support-as-lead and client actors', async () => {
    const { service } = setup();
    await expect(service.planExisting('activity', { ...dto, supportUserIds: ['lead'] }, actor)).rejects.toThrow(BadRequestException);
    await expect(service.planExisting('activity', dto, { ...actor, role: 'CLIENT' })).rejects.toThrow(ForbiddenException);
  });

  it('links replaced LEAD and retained SUPPORT without crossing the Booking', async () => {
    const { service, tx } = setup();
    tx.booking.findFirst.mockResolvedValue({ id: 'booking', projectId: 'project', organizationId: 'org-a',
      requestedDate: new Date('2026-09-23T13:30:00.000Z'), reportedDate: null, duration: 90,
      activity, project: activity.project, assignments: [
        { id: 'old-lead', userId: 'lead', role: 'LEAD', status: 'ACCEPTED' },
        { id: 'old-support', userId: 'support', role: 'SUPPORT', status: 'ACCEPTED' },
      ] });
    tx.bookingAssignment.create
      .mockResolvedValueOnce({ id: 'new-lead', bookingId: 'booking', userId: 'lead', role: 'LEAD' })
      .mockResolvedValueOnce({ id: 'new-support', bookingId: 'booking', userId: 'support', role: 'SUPPORT' });
    await service.reassign('booking', { leadUserId: 'lead', supportUserIds: ['support'], confirmUnknown: true }, actor);
    expect(tx.bookingAssignment.update).toHaveBeenCalledWith({ where: { id: 'old-lead' },
      data: { replacedByAssignmentId: 'new-lead' } });
    expect(tx.bookingAssignment.update).toHaveBeenCalledWith({ where: { id: 'old-support' },
      data: { replacedByAssignmentId: 'new-support' } });
  });
  it('cancels only the schedule, keeps the Activity, and terminates assignments', async () => {
    const { service, tx } = setup();
    tx.booking.findFirst.mockResolvedValue({ id: 'booking', projectId: 'project', activity,
      status: 'CONFIRMEE' });
    const result = await service.cancelSchedule('booking', actor);
    expect(result).toEqual({ activityId: 'activity', bookingId: 'booking' });
    expect(tx.booking.update).toHaveBeenCalledWith({ where: { id: 'booking' }, data: { status: 'ANNULEE' } });
    expect(tx.bookingAssignment.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'REMOVED', endedAt: expect.any(Date) });
    expect(tx.projectActivity.update).toHaveBeenCalledWith({ where: { id: 'activity' }, data: { scheduledDate: null, reportedDate: null } });
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe('SCHEDULE_CANCELLED');
  });
});
