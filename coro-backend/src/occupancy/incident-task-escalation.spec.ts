import { ConflictException, NotFoundException } from '@nestjs/common';
import { IncidentService } from './incident.service';

describe('IncidentService P-4.2 governed task escalation', () => {
  const now = new Date('2026-10-20T12:00:00.000Z');
  const task: any = {
    id: 'task-1', incidentEventId: 'incident-1', employeeId: 'primary-1', title: 'Couper alimentation',
    status: 'PENDING', severity: 'CRITICAL', ackPolicySnapshot: { acknowledgmentWindowMs: 120000, alternateWindowMs: 120000 },
    alternateEmployeeIds: ['alternate-1', 'alternate-2'], acknowledgmentSubjectType: 'USER', acknowledgmentSubjectId: 'actor-1',
    escalationStatus: 'PENDING', escalationLevel: 0, escalationCycle: 0, missedAcknowledgmentAt: null,
    nextEscalationAt: new Date(now.getTime() - 1), operatorQueuedAt: null, lockVersion: 4,
    incidentEvent: { organizationId: 'org-1', buildingId: 'building-1', status: 'ACTIVE', isActive: true },
  };
  const prisma: any = {
    incidentTask: { findFirst: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    buildingEmployee: { findFirst: jest.fn(), count: jest.fn() },
    user: { findFirst: jest.fn() }, clientUser: { findFirst: jest.fn() },
    incidentLog: { create: jest.fn() }, incidentAuditEvent: { findFirst: jest.fn(), create: jest.fn() },
    $executeRaw: jest.fn(), $transaction: jest.fn((callback: any) => callback(prisma)),
  };
  const dispatcher: any = { enqueue: jest.fn() };
  let service: IncidentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentService(prisma, dispatcher);
    prisma.incidentAuditEvent.findFirst.mockResolvedValue(null);
    prisma.incidentAuditEvent.create.mockResolvedValue({ id: 'audit-1' });
  });

  it('stores the Founder-approved CRITICAL deadline and at most two explicit alternates', async () => {
    prisma.incidentTask.findFirst.mockResolvedValue(task);
    prisma.buildingEmployee.count.mockResolvedValue(2);
    prisma.user.findFirst.mockResolvedValue({ id: 'actor-1' });
    prisma.incidentTask.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentTask.findUniqueOrThrow.mockResolvedValue({ ...task, ackDeadlineAt: new Date(now.getTime() + 120000), lockVersion: 5 });
    await expect(service.configureTaskEscalation('task-1', { severity: 'CRITICAL', alternateEmployeeIds: ['alternate-1', 'alternate-2'], acknowledgmentSubjectType: 'USER', acknowledgmentSubjectId: 'actor-1', lockVersion: 4, reason: 'Plan intervention' }, 'org-1', { actorType: 'USER', actorId: 'supervisor-1', reason: 'Plan intervention' })).resolves.toBeDefined();
    expect(prisma.incidentTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ severity: 'CRITICAL', alternateEmployeeIds: ['alternate-1', 'alternate-2'], nextEscalationAt: expect.any(Date) }) }));
  });

  it('rejects an implicit or third alternate', async () => {
    await expect(service.configureTaskEscalation('task-1', { severity: 'HIGH', alternateEmployeeIds: ['a', 'b', 'c'], acknowledgmentSubjectType: 'USER', acknowledgmentSubjectId: 'actor-1', lockVersion: 4, reason: 'x' }, 'org-1', { actorType: 'USER', actorId: 's', reason: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate alternate levels instead of silently broadening policy', async () => {
    await expect(service.configureTaskEscalation('task-1', { severity: 'HIGH', alternateEmployeeIds: ['a', 'a'], acknowledgmentSubjectType: 'USER', acknowledgmentSubjectId: 'actor-1', lockVersion: 4, reason: 'x' }, 'org-1', { actorType: 'USER', actorId: 's', reason: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires an explicit acknowledgment identity for every governed policy', async () => {
    await expect(service.configureTaskEscalation('task-1', { severity: 'HIGH', alternateEmployeeIds: [], acknowledgmentSubjectType: undefined as any, acknowledgmentSubjectId: undefined as any, lockVersion: 4, reason: 'x' }, 'org-1', { actorType: 'USER', actorId: 's', reason: 'x' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('notifies only the explicit first alternate and records durable missed evidence', async () => {
    prisma.incidentTask.findUnique.mockResolvedValue(task);
    prisma.buildingEmployee.findFirst.mockResolvedValue({ id: 'alternate-1', email: 'alt@example.test', phone: null, smsConsent: false });
    prisma.incidentTask.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentTask.findUniqueOrThrow.mockResolvedValue({ ...task, escalationStatus: 'LEVEL_1', escalationLevel: 1, missedAcknowledgmentAt: now, lockVersion: 5 });
    await expect(service.processTaskEscalation('task-1', now)).resolves.toMatchObject({ claimed: true, level: 1, alternateNotified: true });
    expect(dispatcher.enqueue).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'TASK_ACK_ESCALATION_LEVEL_1', idempotencyKey: expect.stringContaining(':level:1:email') }), prisma);
    expect(prisma.incidentTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ missedAcknowledgmentAt: now, escalationStatus: 'LEVEL_1' }) }));
  });

  it('escapes task titles before enqueueing HTML notifications', async () => {
    prisma.incidentTask.findUnique.mockResolvedValue({ ...task, title: '<img src=x onerror=alert(1)>' });
    prisma.buildingEmployee.findFirst.mockResolvedValue({ id: 'alternate-1', email: 'alt@example.test', phone: null, smsConsent: false });
    prisma.incidentTask.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentTask.findUniqueOrThrow.mockResolvedValue({ ...task, escalationStatus: 'LEVEL_1', escalationLevel: 1, missedAcknowledgmentAt: now, lockVersion: 5 });
    await service.processTaskEscalation('task-1', now);
    expect(dispatcher.enqueue).toHaveBeenCalledWith(expect.objectContaining({ envelope: expect.objectContaining({ html: expect.stringContaining('&lt;img') }) }), prisma);
  });

  it('is idempotent when another dispatcher already claimed the task', async () => {
    prisma.incidentTask.findUnique.mockResolvedValue(task);
    prisma.buildingEmployee.findFirst.mockResolvedValue({ id: 'alternate-1', email: 'alt@example.test' });
    prisma.incidentTask.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.processTaskEscalation('task-1', now)).resolves.toEqual({ claimed: false });
    expect(dispatcher.enqueue).not.toHaveBeenCalled();
  });

  it('refuses acknowledgment by an actor other than the explicitly assigned identity', async () => {
    prisma.incidentTask.findFirst.mockResolvedValue(task);
    await expect(service.acknowledgeTask('task-1', 'org-1', { actorType: 'USER', actorId: 'wrong-actor', reason: 'ack' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps missed-deadline evidence when a late acknowledgment succeeds', async () => {
    prisma.incidentTask.findFirst.mockResolvedValue({ ...task, missedAcknowledgmentAt: now });
    prisma.incidentTask.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentTask.findUniqueOrThrow.mockResolvedValue({ ...task, status: 'ACKNOWLEDGED', escalationStatus: 'ACKNOWLEDGED', acknowledgedAt: new Date(now.getTime() + 1000), lockVersion: 5 });
    await service.acknowledgeTask('task-1', 'org-1', { actorType: 'USER', actorId: 'actor-1', reason: 'late ack' });
    expect(prisma.incidentAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ operation: 'TASK_ACKNOWLEDGED_LATE' }) }));
  });
});
