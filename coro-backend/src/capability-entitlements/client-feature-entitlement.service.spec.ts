import { NotFoundException } from '@nestjs/common';
import type { ClientUserAuthority } from '../auth/coro-authority';
import { ClientFeatureEntitlementService } from './client-feature-entitlement.service';

describe('ClientFeatureEntitlementService', () => {
  const authority: ClientUserAuthority = {
    actorType: 'CLIENT_USER',
    actorId: 'client-user-a',
    clientId: 'client-a',
    organizationId: 'organization-a',
    role: 'CLIENT_MANAGER',
    sessionVersion: 1,
    permissions: ['INCIDENT_REPORT_READ'],
    buildingIds: ['building-a'],
  };
  const prisma = {
    clientUser: { findFirst: jest.fn() },
    clientOperationalBuildingAssignment: { findFirst: jest.fn() },
  };
  const resolver = { resolve: jest.fn() };
  const service = new ClientFeatureEntitlementService(
    prisma as never,
    resolver as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INCIDENT_REPORTS_ENABLED = 'true';
    prisma.clientUser.findFirst.mockResolvedValue({
      clientId: 'client-a',
      operationalPermissions: ['INCIDENT_REPORT_READ'],
    });
    prisma.clientOperationalBuildingAssignment.findFirst.mockResolvedValue({
      id: 'assignment-a',
    });
    resolver.resolve.mockResolvedValue({
      availability: { isAvailable: true },
      licensed: true,
      enabled: true,
      effectiveState: 'EFFECTIVE',
    });
  });

  afterAll(() => delete process.env.INCIDENT_REPORTS_ENABLED);

  it('requires the technical flag, entitlement, individual permission and assignment', async () => {
    await expect(
      service.evaluate({
        authority,
        organizationId: 'organization-a',
        buildingId: 'building-a',
        feature: 'INCIDENT_REPORTS',
      }),
    ).resolves.toMatchObject({ available: true, reason: 'AVAILABLE' });
  });

  it('fails closed when the global stop is not exactly true', async () => {
    process.env.INCIDENT_REPORTS_ENABLED = 'TRUE';
    const result = await service.evaluate({
      authority,
      organizationId: 'organization-a',
      buildingId: 'building-a',
      feature: 'INCIDENT_REPORTS',
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('TECHNICALLY_DISABLED');
  });

  it('refuses another tenant without resolving an entitlement', async () => {
    const result = await service.evaluate({
      authority,
      organizationId: 'organization-b',
      buildingId: 'building-a',
      feature: 'INCIDENT_REPORTS',
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('BUILDING_ASSIGNMENT_REQUIRED');
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it('refuses an expired or revoked entitlement', async () => {
    resolver.resolve.mockResolvedValue({
      availability: { isAvailable: true },
      licensed: false,
      enabled: false,
      effectiveState: 'REVOKED',
    });
    await expect(
      service.require({
        authority,
        organizationId: 'organization-a',
        buildingId: 'building-a',
        feature: 'INCIDENT_REPORTS',
        hiddenMessage: 'Ressource introuvable.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses a user without an active building assignment', async () => {
    prisma.clientOperationalBuildingAssignment.findFirst.mockResolvedValue(
      null,
    );
    const result = await service.evaluate({
      authority,
      organizationId: 'organization-a',
      buildingId: 'building-a',
      feature: 'INCIDENT_REPORTS',
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('BUILDING_ASSIGNMENT_REQUIRED');
  });
});
