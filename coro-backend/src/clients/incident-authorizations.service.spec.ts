import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IncidentPermission } from '@prisma/client';
import { createHash } from 'crypto';
import { ClientsService } from './clients.service';

describe('ClientsService governed Incident authorizations', () => {
  const actor = { userId: 'admin-1', role: 'ADMIN', organizationId: 'org-1' };
  const user = {
    id: 'client-user-1',
    email: 'reader@example.test',
    firstName: 'QA',
    lastName: 'Reader',
    role: 'CLIENT_MANAGER',
    isActive: true,
    buildingIds: ['building-1'],
    operationalReviewPermissions: [],
    correctiveActionPermissions: [],
    incidentPermissions: [],
  };
  const assignment = {
    id: 'assignment-1',
    organizationId: 'org-1',
    buildingId: 'building-1',
    incidentEventId: null,
    subjectType: 'CLIENT_USER',
    subjectId: user.id,
    operationalRole: 'Lecteur',
    permissions: [IncidentPermission.INCIDENT_READ],
    status: 'ACTIVE',
    lockVersion: 0,
    grantedByType: 'USER',
    grantedById: actor.userId,
    grantReason: 'Recette',
    idempotencyKey: 'incident_1234567890abcdef',
    payloadHash: 'hash',
  };
  const prisma: any = {
    clientUser: { findFirst: jest.fn(), update: jest.fn() },
    building: { findFirst: jest.fn(), findMany: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    incidentAuthorityAssignment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    adminAuditEvent: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const adminAudit = {
    normalizeReason: jest.fn(
      (reason: string) =>
        reason?.trim() ||
        (() => {
          throw new BadRequestException();
        })(),
    ),
    record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  };
  const service = new ClientsService(
    prisma,
    {} as any,
    adminAudit as any,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );
    prisma.clientUser.findFirst.mockResolvedValue(user);
    prisma.clientUser.update.mockResolvedValue({
      incidentPermissions: [IncidentPermission.INCIDENT_READ],
    });
    prisma.building.findFirst.mockResolvedValue({
      id: 'building-1',
      name: 'Bâtiment QA',
    });
    prisma.building.findMany.mockResolvedValue([]);
    prisma.incidentEvent.findFirst.mockResolvedValue({ id: 'incident-1' });
    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValue(null);
    prisma.incidentAuthorityAssignment.findMany.mockResolvedValue([]);
    prisma.incidentAuthorityAssignment.create.mockResolvedValue(assignment);
    prisma.incidentAuthorityAssignment.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.incidentAuthorityAssignment.findUniqueOrThrow.mockResolvedValue({
      ...assignment,
      status: 'REVOKED',
      lockVersion: 1,
    });
  });

  it('refuse la délégation par un OPERATOR même détenteur de COMMAND', async () => {
    await expect(
      service.grantClientUserIncidentAuthorization(
        'client-1',
        user.id,
        {
          buildingId: 'building-1',
          operationalRole: 'Commandant',
          permissions: [IncidentPermission.INCIDENT_COMMAND],
          reason: 'Test',
        },
        {
          ...actor,
          role: 'OPERATOR',
          incidentPermissions: [IncidentPermission.INCIDENT_COMMAND],
        },
        'incident_1234567890abcdef',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('attribue atomiquement la permission individuelle et une affectation scoped', async () => {
    const result = await service.grantClientUserIncidentAuthorization(
      'client-1',
      user.id,
      {
        buildingId: 'building-1',
        incidentEventId: 'incident-1',
        operationalRole: 'Lecteur',
        permissions: [IncidentPermission.INCIDENT_READ],
        reason: 'Besoin de lecture',
      },
      actor,
      'incident_1234567890abcdef',
    );
    expect(result).toMatchObject({
      assignment: { id: 'assignment-1' },
      replayed: false,
    });
    expect(prisma.clientUser.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { incidentPermissions: [IncidentPermission.INCIDENT_READ] },
    });
    expect(prisma.incidentAuthorityAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        buildingId: 'building-1',
        incidentEventId: 'incident-1',
        subjectType: 'CLIENT_USER',
        subjectId: user.id,
      }),
    });
    expect(adminAudit.record).toHaveBeenCalledTimes(1);
  });

  it('refuse une permission hors matrice administrable', async () => {
    await expect(
      service.grantClientUserIncidentAuthorization(
        'client-1',
        user.id,
        {
          buildingId: 'building-1',
          operationalRole: 'Technique',
          permissions: [IncidentPermission.PCA_ACTIVATE],
          reason: 'Test',
        },
        actor,
        'incident_1234567890abcdef',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse un bâtiment hors client ou tenant sans effet', async () => {
    prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      service.grantClientUserIncidentAuthorization(
        'client-1',
        user.id,
        {
          buildingId: 'building-other',
          operationalRole: 'Lecteur',
          permissions: [IncidentPermission.INCIDENT_READ],
          reason: 'Test',
        },
        actor,
        'incident_1234567890abcdef',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.incidentAuthorityAssignment.create).not.toHaveBeenCalled();
    expect(adminAudit.record).not.toHaveBeenCalled();
  });

  it('rejette une portée non affectée au CLIENT_MANAGER', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({ ...user, buildingIds: [] });
    await expect(
      service.grantClientUserIncidentAuthorization(
        'client-1',
        user.id,
        {
          buildingId: 'building-1',
          operationalRole: 'Lecteur',
          permissions: [IncidentPermission.INCIDENT_READ],
          reason: 'Test',
        },
        actor,
        'incident_1234567890abcdef',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejoue une attribution idempotente sans écriture ni audit dupliqué', async () => {
    const payload = {
      clientId: 'client-1',
      clientUserId: user.id,
      buildingId: 'building-1',
      incidentEventId: null,
      permissions: [IncidentPermission.INCIDENT_READ],
      operationalRole: 'Lecteur',
      reason: 'Test',
    };
    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValue({
      ...assignment,
      payloadHash: createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex'),
    });
    const result = await service.grantClientUserIncidentAuthorization(
      'client-1',
      user.id,
      {
        buildingId: 'building-1',
        operationalRole: 'Lecteur',
        permissions: [IncidentPermission.INCIDENT_READ],
        reason: 'Test',
      },
      actor,
      'incident_1234567890abcdef',
    );
    expect(result.replayed).toBe(true);
    expect(prisma.clientUser.update).not.toHaveBeenCalled();
    expect(prisma.incidentAuthorityAssignment.create).not.toHaveBeenCalled();
    expect(adminAudit.record).not.toHaveBeenCalled();
  });

  it('refuse une modification concurrente des permissions individuelles', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({
      ...user,
      incidentPermissions: [IncidentPermission.INCIDENT_READ],
    });
    await expect(
      service.setClientUserIncidentPermissions(
        'client-1',
        user.id,
        {
          permissions: [IncidentPermission.INCIDENT_COMMAND],
          expectedPermissions: [],
          reason: 'Élévation',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.clientUser.update).not.toHaveBeenCalled();
  });

  it('révoque avec verrou optimiste et conserve une trace exacte', async () => {
    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValue(assignment);
    const result = await service.revokeClientUserIncidentAuthorization(
      'client-1',
      user.id,
      assignment.id,
      { reason: 'Fin de mandat', lockVersion: 0 },
      actor,
    );
    expect(result).toEqual({ revoked: true, replayed: false });
    expect(prisma.incidentAuthorityAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lockVersion: 0, status: 'ACTIVE' }),
        data: expect.objectContaining({ status: 'REVOKED' }),
      }),
    );
    expect(adminAudit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'CLIENT_USER_INCIDENT_AUTHORITY_REVOKED',
        reason: 'Fin de mandat',
      }),
    );
  });

  it('ne produit aucun audit si la transaction d attribution échoue', async () => {
    prisma.incidentAuthorityAssignment.create.mockRejectedValue(
      new Error('injected failure'),
    );
    await expect(
      service.grantClientUserIncidentAuthorization(
        'client-1',
        user.id,
        {
          buildingId: 'building-1',
          operationalRole: 'Lecteur',
          permissions: [IncidentPermission.INCIDENT_READ],
          reason: 'Test',
        },
        actor,
        'incident_1234567890abcdef',
      ),
    ).rejects.toThrow('injected failure');
    expect(adminAudit.record).not.toHaveBeenCalled();
  });
});
