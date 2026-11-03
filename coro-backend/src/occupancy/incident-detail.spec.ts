import { BadRequestException } from '@nestjs/common';
import { IncidentStatus } from '@prisma/client';
import { IncidentService } from './incident.service';

describe('IncidentService detail integrity', () => {
  const baseIncident = {
    id: 'incident-1',
    organizationId: 'org-1',
    buildingId: 'building-1',
    status: IncidentStatus.ACTIVE,
    isActive: true,
    lockVersion: 4,
    occupantsSnapshot: { malformed: true },
    teamSnapshot: [{ id: 'member-1', firstName: 'QA', lastName: 'Member', email: 'private@example.invalid', roles: [{ role: 'COORDINATOR', secret: 'hidden' }] }],
    publicAccessToken: 'must-not-leak',
    interventionSheet: { private: true },
  };
  const prisma: any = {
    incidentEvent: {
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    clientUser: { findFirst: jest.fn() },
    incidentAuthorityAssignment: { findFirst: jest.fn(), findMany: jest.fn() },
    incidentLog: { create: jest.fn() },
    incidentTask: { updateMany: jest.fn() },
    incidentAuditEvent: { findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn((callback: any) => callback(prisma)),
  };
  let service: IncidentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentService(prisma);
  });

  it('returns an explicit detail projection and minimizes snapshot identities', async () => {
    prisma.incidentEvent.findFirst.mockResolvedValue(baseIncident);
    const detail = await service.getIncidentDetail('incident-1', 'org-1');
    expect(prisma.incidentEvent.findFirst).toHaveBeenCalledWith(expect.objectContaining({ select: expect.any(Object) }));
    expect(detail).not.toHaveProperty('publicAccessToken');
    expect(detail).not.toHaveProperty('interventionSheet');
    expect(detail.occupantsSnapshot).toEqual([]);
    expect(detail.teamSnapshot).toEqual([{ id: 'member-1', firstName: 'QA', lastName: 'Member', roles: [{ role: 'COORDINATOR' }] }]);
    expect(detail.snapshotWarnings).toContain('occupantsSnapshot');
  });

  it('owns the journal actor on the server', async () => {
    prisma.incidentEvent.findFirst.mockResolvedValue(baseIncident);
    prisma.incidentLog.create.mockResolvedValue({ id: 'log-1' });
    await service.addLog('incident-1', { action: ' Decision ', details: ' Detail ' }, 'org-1', { type: 'CLIENT_USER', id: 'actor-1' });
    expect(prisma.incidentLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'Decision', details: 'Detail', actor: 'CLIENT_USER:actor-1' }) });
  });

  it('derives UI capabilities from both individual permission and active incident assignment', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({
      incidentPermissions: ['INCIDENT_READ', 'INCIDENT_SUPERVISE', 'INCIDENT_COMMAND'],
    });
    prisma.incidentAuthorityAssignment.findMany.mockResolvedValue([
      { permissions: ['INCIDENT_READ', 'INCIDENT_SUPERVISE'] },
    ]);

    await expect(service.getIncidentCapabilities({
      actorId: 'client-user-1',
      organizationId: 'org-1',
      incidentEventId: 'incident-1',
    })).resolves.toEqual({
      canRead: true,
      canParticipate: false,
      canSupervise: true,
      canCommand: false,
      canActivatePca: false,
    });
  });

  it('fails closed when the client identity is inactive or has no matching assignment', async () => {
    prisma.clientUser.findFirst.mockResolvedValue(null);
    prisma.incidentAuthorityAssignment.findMany.mockResolvedValue([]);

    await expect(service.getIncidentCapabilities({
      actorId: 'client-user-1',
      organizationId: 'org-1',
      incidentEventId: 'incident-1',
    })).resolves.toEqual({
      canRead: false,
      canParticipate: false,
      canSupervise: false,
      canCommand: false,
      canActivatePca: false,
    });
  });

  it('contains once and treats an identical replay as idempotent', async () => {
    prisma.incidentEvent.findFirst
      .mockResolvedValueOnce(baseIncident)
      .mockResolvedValueOnce({ ...baseIncident, status: IncidentStatus.CONTAINED });
    prisma.incidentEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.incidentEvent.findUniqueOrThrow.mockResolvedValue({ ...baseIncident, status: IncidentStatus.CONTAINED, lockVersion: 5 });
    prisma.incidentLog.create.mockResolvedValue({ id: 'log-1' });
    await service.containIncident('incident-1', 'org-1', { lockVersion: 4 });
    await service.containIncident('incident-1', 'org-1', {});
    expect(prisma.incidentEvent.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.incidentLog.create).toHaveBeenCalledTimes(1);
  });

  it('refuses resolution without a server-validated reason and no write occurs', async () => {
    await expect(service.resolveIncident('incident-1', { closingNotes: '   ' }, 'org-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.incidentEvent.updateMany).not.toHaveBeenCalled();
  });

  it('ignores a browser completion date and stores the server time for REX', async () => {
    prisma.incidentEvent.findFirst.mockResolvedValue(baseIncident);
    prisma.incidentEvent.update.mockResolvedValue({ id: 'incident-1' });
    await service.updateRex('incident-1', { rexWentWell: 'Observed', rexCompletedAt: new Date('2001-01-01') } as any, 'org-1');
    expect(prisma.incidentEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rexCompletedAt: expect.any(Date) }) }));
    const call = prisma.incidentEvent.update.mock.calls[0][0];
    expect(call.data.rexCompletedAt.toISOString()).not.toBe('2001-01-01T00:00:00.000Z');
  });
});
