import { NotFoundException } from '@nestjs/common';
import { PlatformPermission } from '@prisma/client';
import { IncidentReportAccessService } from './incident-report-access.service';

describe('IncidentReportAccessService', () => {
  const actor = { userId: 'user-a', organizationId: 'org-a' } as never;
  const prisma = {
    user: { findFirst: jest.fn() },
    building: { findFirst: jest.fn() },
    platformPermissionGrant: { findFirst: jest.fn() },
    incidentAuthorityAssignment: { findFirst: jest.fn() },
  };
  const service = new IncidentReportAccessService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({ id: 'user-a' });
    prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    prisma.platformPermissionGrant.findFirst.mockResolvedValue({
      id: 'grant-a',
    });
    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValue({
      id: 'assignment-a',
    });
  });

  it('exige simultanément permission individuelle et affectation bâtiment', async () => {
    await expect(
      service.require(
        actor,
        'org-a',
        'building-a',
        PlatformPermission.INCIDENT_REPORT_READ,
      ),
    ).resolves.toBeUndefined();

    prisma.incidentAuthorityAssignment.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.require(
        actor,
        'org-a',
        'building-a',
        PlatformPermission.INCIDENT_REPORT_READ,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse avant toute requête un acteur inter-tenant', async () => {
    await expect(
      service.require(
        actor,
        'org-b',
        'building-b',
        PlatformPermission.INCIDENT_REPORT_READ,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
