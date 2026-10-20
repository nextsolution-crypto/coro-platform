import { ConflictException, NotFoundException } from '@nestjs/common';
import { IncidentService } from './incident.service';

describe('IncidentService P-4.1 governance', () => {
  const task = {
    id: 'task-1',
    incidentEventId: 'incident-1',
    title: 'Confirmer le poste',
    status: 'PENDING',
    ackToken: 'token-1',
    ackExpiresAt: new Date(Date.now() + 60_000),
    ackRevokedAt: null,
    ackUsedAt: null,
    acknowledgedAt: null,
    lockVersion: 0,
    incidentEvent: { organizationId: 'org-1', buildingId: 'building-1' },
  };

  const prisma = {
    incidentTask: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    incidentLog: { create: jest.fn() },
    buildingEmployee: { findFirst: jest.fn() },
    project: { findFirst: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    pcaActivation: { findFirst: jest.fn(), create: jest.fn() },
    clientUser: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    incidentAuthorityAssignment: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    incidentAuditEvent: { findFirst: jest.fn(), create: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((callback: any) => callback(prisma)),
  } as any;

  let service: IncidentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentService(prisma);
  });

  it('claims a public acknowledgment token exactly once', async () => {
    prisma.incidentTask.findUnique.mockResolvedValue(task);
    prisma.incidentTask.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.acknowledgeByToken('token-1')).resolves.toMatchObject({ acknowledged: true });
    expect(prisma.incidentTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ackUsedAt: null, ackRevokedAt: null }),
      data: expect.objectContaining({ status: 'ACKNOWLEDGED', ackUsedAt: expect.any(Date) }),
    }));
  });

  it.each([
    { ackUsedAt: new Date() },
    { ackRevokedAt: new Date() },
    { ackExpiresAt: new Date(Date.now() - 1) },
  ])('rejects used, revoked, or expired public tokens', async (override) => {
    prisma.incidentTask.findUnique.mockResolvedValue({ ...task, ...override });
    await expect(service.acknowledgeByToken('token-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('separates task acknowledgment from task completion', async () => {
    prisma.incidentTask.findFirst.mockResolvedValue(task);
    prisma.incidentTask.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentTask.findUniqueOrThrow.mockResolvedValue({ ...task, status: 'ACKNOWLEDGED', lockVersion: 1 });
    await expect(service.acknowledgeTask('task-1', 'org-1')).resolves.toMatchObject({ status: 'ACKNOWLEDGED' });
  });

  it('denies completion before acknowledgment', async () => {
    prisma.incidentTask.findFirst.mockResolvedValue(task);
    await expect(service.completeTask('task-1', 'org-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires an explicit PCA activation reason', async () => {
    await expect(service.activatePca({ buildingId: 'b-1', projectId: 'p-1', reason: '' }, 'org-1', 'actor-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates one explicit PCA activation transactionally', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: 'p-1' });
    prisma.pcaActivation.findFirst.mockResolvedValue(null);
    prisma.pcaActivation.create.mockResolvedValue({ id: 'pca-1', status: 'ACTIVE' });
    await expect(service.activatePca({ buildingId: 'b-1', projectId: 'p-1', reason: 'Activation test' }, 'org-1', 'actor-1')).resolves.toMatchObject({ id: 'pca-1' });
  });

  it('requires both an active identity permission and exact incident assignment', async () => {
    prisma.incidentEvent.findFirst.mockResolvedValue({ buildingId: 'b-1', status: 'ACTIVE', isActive: true });
    prisma.clientUser.findFirst.mockResolvedValue({ id: 'client-user-1' });
    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValue({ id: 'assignment-1', operationalRole: 'COMMANDER' });
    await expect(service.requireIncidentAuthority({ actorType: 'CLIENT_USER', actorId: 'client-user-1', organizationId: 'org-1', incidentEventId: 'incident-1', permission: 'INCIDENT_COMMAND' as any })).resolves.toMatchObject({ id: 'assignment-1' });
    expect(prisma.incidentAuthorityAssignment.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ incidentEventId: 'incident-1', buildingId: 'b-1', status: 'ACTIVE' }) });
  });

  it('fails closed when exact incident assignment is missing', async () => {
    prisma.incidentEvent.findFirst.mockResolvedValue({ buildingId: 'b-1', status: 'ACTIVE', isActive: true });
    prisma.clientUser.findFirst.mockResolvedValue({ id: 'client-user-1' });
    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValue(null);
    await expect(service.requireIncidentAuthority({ actorType: 'CLIENT_USER', actorId: 'client-user-1', organizationId: 'org-1', incidentEventId: 'incident-1', permission: 'INCIDENT_COMMAND' as any })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('revokes an assignment atomically using its lock version', async () => {
    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValue({ id: 'assignment-1', organizationId: 'org-1', buildingId: 'building-1', incidentEventId: null, status: 'ACTIVE', lockVersion: 2 });
    prisma.incidentAuthorityAssignment.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentAuthorityAssignment.findUniqueOrThrow.mockResolvedValue({ id: 'assignment-1', status: 'REVOKED', lockVersion: 3 });
    await expect(service.revokeIncidentAuthority('assignment-1', 'org-1', 'CLIENT_USER', 'actor-1', 'Rotation', 2)).resolves.toEqual({ revoked: true });
    expect(prisma.incidentAuthorityAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ lockVersion: 2, status: 'ACTIVE' }), data: expect.objectContaining({ status: 'REVOKED' }) }));
  });
});
