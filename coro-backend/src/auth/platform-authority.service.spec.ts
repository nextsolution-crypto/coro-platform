import { ForbiddenException } from '@nestjs/common';
import { PlatformPermission, UserRole } from '@prisma/client';
import { PlatformAuthorityService } from './platform-authority.service';

const activeAuthority = {
  id: 'PRIMARY',
  status: 'ACTIVE',
  operatorOrganizationId: 'operator-org',
  founderUserId: 'founder',
  operatorOrganization: {
    id: 'operator-org',
    isActive: true,
    isInternal: true,
  },
  founder: {
    id: 'founder',
    role: UserRole.SUPER_ADMIN,
    organizationId: 'operator-org',
    isActive: true,
  },
};

describe('PlatformAuthorityService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    platformAuthorityConfiguration: { findUnique: jest.fn() },
    platformPermissionGrant: { findFirst: jest.fn(), findMany: jest.fn() },
    commercialSimulationWorkspace: { findUnique: jest.fn() },
    commercialSimulationScenario: { findUnique: jest.fn() },
    commercialProposal: { findUnique: jest.fn() },
    commercialProposalRevision: { findUnique: jest.fn() },
    organizationContract: { findUnique: jest.fn() },
    organizationContractRevision: { findUnique: jest.fn() },
    proposalDocumentCompositionSnapshot: { findUnique: jest.fn() },
    capabilityEntitlement: { findUnique: jest.fn() },
  };
  const service = new PlatformAuthorityService(prisma as never, {} as never);

  beforeEach(() => jest.clearAllMocks());

  it('resolves the canonical organization from a commercial resource', async () => {
    prisma.commercialProposalRevision.findUnique.mockResolvedValue({
      proposal: { organizationId: 'customer-org' },
    });
    await expect(
      service.resolveTargetOrganization('PROPOSAL_REVISION', 'revision-1'),
    ).resolves.toBe('customer-org');
    expect(prisma.commercialProposalRevision.findUnique).toHaveBeenCalledWith({
      where: { id: 'revision-1' },
      select: { proposal: { select: { organizationId: true } } },
    });
  });

  it('fails closed for a missing resource organization', async () => {
    prisma.commercialSimulationWorkspace.findUnique.mockResolvedValue({
      organizationId: null,
    });
    await expect(
      service.resolveTargetOrganization('WORKSPACE', 'prospect-workspace'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('préserve uniquement le SUPER_ADMIN persistant avant activation', async () => {
    prisma.platformAuthorityConfiguration.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'founder',
      role: UserRole.SUPER_ADMIN,
      organizationId: 'operator-org',
      isActive: true,
      organization: { isActive: true, isInternal: true },
    });
    await expect(
      service.requirePermission(
        { userId: 'founder' },
        PlatformPermission.COMMERCIAL_CATALOG_MANAGE,
      ),
    ).resolves.toMatchObject({ kind: 'LEGACY_SUPER_ADMIN' });
  });

  it('refuse un customer ADMIN même avant activation', async () => {
    prisma.platformAuthorityConfiguration.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'customer-admin',
      role: UserRole.ADMIN,
      organizationId: 'customer-org',
      isActive: true,
      organization: { isActive: true, isInternal: false },
    });
    await expect(
      service.requirePermission(
        { userId: 'customer-admin' },
        PlatformPermission.FINANCIAL_RENDEMENT_READ,
        'customer-org',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('préserve le Founder après activation sans fallback de rôle générique', async () => {
    prisma.platformAuthorityConfiguration.findUnique.mockResolvedValue(
      activeAuthority,
    );
    prisma.user.findUnique.mockResolvedValue({
      id: 'founder',
      role: UserRole.SUPER_ADMIN,
      organizationId: 'operator-org',
      isActive: true,
      organization: { isActive: true, isInternal: true },
    });
    await expect(
      service.requirePermission(
        { userId: 'founder' },
        PlatformPermission.COMMERCIAL_CATALOG_MANAGE,
      ),
    ).resolves.toMatchObject({ kind: 'FOUNDER' });
  });

  it('autorise un employé CORO uniquement avec un grant actif de bon scope', async () => {
    prisma.platformAuthorityConfiguration.findUnique.mockResolvedValue(
      activeAuthority,
    );
    prisma.user.findUnique.mockResolvedValue({
      id: 'employee',
      role: UserRole.ADMIN,
      organizationId: 'operator-org',
      isActive: true,
      organization: { isActive: true, isInternal: true },
    });
    prisma.platformPermissionGrant.findFirst.mockResolvedValue({
      id: 'grant',
      scope: 'ORGANIZATION',
      targetOrganizationId: 'customer-org',
    });
    await expect(
      service.requirePermission(
        { userId: 'employee' },
        PlatformPermission.FINANCIAL_RENDEMENT_READ,
        'customer-org',
      ),
    ).resolves.toMatchObject({ kind: 'DELEGATED' });
    expect(prisma.platformPermissionGrant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are intentionally dynamic at this boundary.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it.each([
    ['revoked grant', null, true, true],
    ['disabled user', { id: 'grant' }, false, true],
    ['suspended operator', { id: 'grant' }, true, false],
  ])('refuse %s', async (_label, grant, userActive, organizationActive) => {
    prisma.platformAuthorityConfiguration.findUnique.mockResolvedValue(
      activeAuthority,
    );
    prisma.user.findUnique.mockResolvedValue({
      id: 'employee',
      role: UserRole.ADMIN,
      organizationId: 'operator-org',
      isActive: userActive,
      organization: { isActive: organizationActive, isInternal: true },
    });
    prisma.platformPermissionGrant.findFirst.mockResolvedValue(grant);
    await expect(
      service.requirePermission(
        { userId: 'employee' },
        PlatformPermission.FINANCIAL_RENDEMENT_READ,
        'customer-org',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('échoue fermé si l’autorité active devient incohérente', async () => {
    prisma.platformAuthorityConfiguration.findUnique.mockResolvedValue({
      ...activeAuthority,
      operatorOrganization: {
        ...activeAuthority.operatorOrganization,
        isActive: false,
      },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'founder',
      role: UserRole.SUPER_ADMIN,
      organizationId: 'operator-org',
      isActive: true,
      organization: { isActive: false, isInternal: true },
    });
    await expect(
      service.requirePermission(
        { userId: 'founder' },
        PlatformPermission.COMMERCIAL_CATALOG_MANAGE,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
