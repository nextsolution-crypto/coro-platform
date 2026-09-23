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
    projectActivity: { findFirst: jest.fn().mockResolvedValue(activity), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
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
    auditLog: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), deleteMany: jest.fn() },
    notification: { create: jest.fn() },
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
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'BOOKING_ASSIGNMENT_NEW', title: 'Nouvelle affectation', userId: 'lead' }) });
  });

  it('rejects an already open Booking after locking the Activity', async () => {
    const { service, tx } = setup();
    tx.booking.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(service.planExisting('activity', dto, actor)).rejects.toThrow('planification active');
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
    await expect(service.planExisting('activity', dto, { ...actor, role: 'OPERATOR' })).rejects.toThrow(ForbiddenException);
  });

  it('reassigns a reported Booking without changing its effective slot or Activity identity', async () => {
    const { service, tx, scheduling } = setup();
    const requestedDate = new Date('2026-09-23T17:45:00.000Z');
    const reportedDate = new Date('2026-09-24T17:45:00.000Z');
    tx.booking.findFirst.mockResolvedValue({ id: 'booking', projectId: 'project', organizationId: 'org-a',
      requestedDate, reportedDate, duration: 90, status: 'REPORTEE', activity,
      project: activity.project, assignments: [{ id: 'old-lead', userId: 'lead', role: 'LEAD', status: 'PENDING' }] });
    tx.bookingAssignment.create.mockResolvedValue({ id: 'new-lead', bookingId: 'booking', userId: 'replacement', role: 'LEAD' });
    tx.user.findMany.mockResolvedValue([{ id: 'replacement', firstName: 'Steve', lastName: 'Parker' }]);
    scheduling.analyzeUsers.mockResolvedValue(new Map([['replacement', {
      status: 'AVAILABLE', conflicts: [], warnings: [], sourcesChecked: [],
    }]]));
    await service.reassign('booking', { leadUserId: 'replacement', supportUserIds: [] }, actor);
    expect(scheduling.analyzeUsers).toHaveBeenCalledWith(expect.objectContaining({
      startUtc: reportedDate, endUtc: new Date('2026-09-24T19:15:00.000Z'), excludeBookingId: 'booking' }), tx);
    expect(tx.booking.update).toHaveBeenCalledWith({ where: { id: 'booking' },
      data: { assignedUserId: 'replacement', status: 'REASSIGNEE' } });
    expect(tx.booking.update.mock.calls[0][0].data).not.toHaveProperty('requestedDate');
    expect(tx.booking.update.mock.calls[0][0].data).not.toHaveProperty('reportedDate');
    expect(tx.projectActivity.create).not.toHaveBeenCalled();
    expect(tx.booking.create).not.toHaveBeenCalled();
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'BOOKING_ASSIGNMENT_REPLACED', userId: 'lead' }) });
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'BOOKING_ASSIGNMENT_NEW', userId: 'replacement' }) });
  });

  it('notifies every active assignee when the effective slot changes', async () => {
    const { service, tx } = setup();
    tx.booking.findFirst.mockResolvedValue({ id: 'booking', projectId: 'project', organizationId: 'org-a',
      requestedDate: new Date('2026-09-23T13:30:00.000Z'), reportedDate: null, duration: 90,
      status: 'CONFIRMEE', activity, project: activity.project, assignments: [
        { id: 'lead-a', userId: 'lead', role: 'LEAD', status: 'ACCEPTED' },
        { id: 'support-a', userId: 'support', role: 'SUPPORT', status: 'PENDING' },
      ] });
    await service.updateSlot('booking', { startUtc: '2026-09-24T13:30:00.000Z',
      durationMinutes: 90, reschedule: true, confirmUnknown: true }, actor);
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'BOOKING_ASSIGNMENT_SCHEDULE_CHANGED', userId: 'lead' }) });
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'BOOKING_ASSIGNMENT_SCHEDULE_CHANGED', userId: 'support' }) });
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
      status: 'CONFIRMEE', assignments: [{ userId: 'lead' }, { userId: 'support' }] });
    const result = await service.cancelSchedule('booking', actor);
    expect(result).toEqual({ activityId: 'activity', bookingId: 'booking' });
    expect(tx.booking.update).toHaveBeenCalledWith({ where: { id: 'booking' }, data: { status: 'ANNULEE' } });
    expect(tx.bookingAssignment.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'REMOVED', endedAt: expect.any(Date) });
    expect(tx.projectActivity.update).toHaveBeenCalledWith({ where: { id: 'activity' }, data: { scheduledDate: null, reportedDate: null } });
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe('SCHEDULE_CANCELLED');
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
    expect(tx.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'BOOKING_ASSIGNMENT_SCHEDULE_CANCELLED', userId: 'lead' }) });
  });

  it('deletes a dependency-free Activity with only its intrinsic creation audit', async () => {
    const { service, tx } = setup();
    tx.projectActivity.findFirst.mockResolvedValue({ id: 'activity', projectId: 'project', bookings: [], exerciseReport: null });
    await expect(service.deleteUnplannedActivity('activity', actor)).resolves.toEqual({ activityId: 'activity', deleted: true });
    expect(tx.auditLog.findFirst.mock.calls[0][0].where.action).toEqual({ notIn: ['PLANNING_ACTIVITY_CREATED'] });
    expect(tx.auditLog.deleteMany).toHaveBeenCalledWith({ where: { organizationId: 'org-a',
      entityType: 'ProjectActivity', entityId: 'activity', action: { in: ['PLANNING_ACTIVITY_CREATED'] } } });
    expect(tx.projectActivity.delete).toHaveBeenCalledWith({ where: { id: 'activity' } });
    expect(tx.auditLog.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(tx.projectActivity.delete.mock.invocationCallOrder[0]);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('refuses physical deletion with history and cancels the Activity without changing old Booking data', async () => {
    const { service, tx } = setup();
    tx.projectActivity.findFirst
      .mockResolvedValueOnce({ id: 'activity', projectId: 'project', bookings: [{ id: 'old' }], exerciseReport: null })
      .mockResolvedValueOnce({ id: 'activity', projectId: 'project', status: 'a_faire', bookings: [] });
    await expect(service.deleteUnplannedActivity('activity', actor)).rejects.toThrow('historique');
    expect(tx.projectActivity.delete).not.toHaveBeenCalled();
    await expect(service.cancelActivity('activity', actor)).resolves.toEqual({ activityId: 'activity', status: 'annule' });
    expect(tx.projectActivity.update).toHaveBeenCalledWith({ where: { id: 'activity' }, data: {
      status: 'annule', scheduledDate: null, reportedDate: null } });
    expect(tx.booking.update).not.toHaveBeenCalled();
    expect(tx.bookingAssignment.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create.mock.calls.at(-1)[0].data).toMatchObject({ action: 'PLANNING_ACTIVITY_CANCELLED',
      metadata: { previousStatus: 'a_faire', finalStatus: 'annule' } });
  });

  it('refuses physical deletion when an operational audit exists', async () => {
    const { service, tx } = setup();
    tx.projectActivity.findFirst.mockResolvedValue({
      id: 'activity', projectId: 'project', bookings: [], exerciseReport: null,
    });
    tx.auditLog.findFirst.mockResolvedValue({ id: 'planned-audit' });
    await expect(service.deleteUnplannedActivity('activity', actor)).rejects.toThrow('historique');
    expect(tx.auditLog.deleteMany).not.toHaveBeenCalled();
    expect(tx.projectActivity.delete).not.toHaveBeenCalled();
  });

  it('enforces tenant and manager permissions for backlog removal', async () => {
    const { service, tx } = setup();
    tx.projectActivity.findFirst.mockResolvedValue(null);
    await expect(service.cancelActivity('other-tenant', actor)).rejects.toThrow('introuvable');
    await expect(service.cancelActivity('activity', { ...actor, role: 'OPERATOR' })).rejects.toThrow(ForbiddenException);
  });
});
