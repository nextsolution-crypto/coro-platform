import { ForbiddenException } from '@nestjs/common';
import { KnowledgeAuthorizationService } from './knowledge-authorization.service';

function harness() {
  const prisma: any = {
    user: { findFirst: jest.fn() },
    clientUser: { findFirst: jest.fn() },
    customerPortfolioAssignment: { findMany: jest.fn() },
    customerPortfolioBuildingMembership: { findMany: jest.fn() },
    buildingDocumentGrant: { findMany: jest.fn(async () => []) },
    project: { findFirst: jest.fn() },
  };
  return { prisma, service: new KnowledgeAuthorizationService(prisma) };
}

describe('KnowledgeAuthorizationService', () => {
  it('reapplies canonical project access to internal retrieval', async () => {
    const { prisma, service } = harness();
    prisma.user.findFirst.mockResolvedValue({ id: 'advisor-a' });
    const scope = await service.scope({
      type: 'INTERNAL_USER',
      id: 'advisor-a',
      organizationId: 'org-a',
      role: 'OPERATOR',
    });
    expect(scope.internalProjectAccess).toBeDefined();
    const where = service.where(scope);
    expect(where.organizationId).toBe('org-a');
    expect(where.AND).toEqual(expect.arrayContaining([expect.objectContaining({ OR: expect.any(Array) })]));
    expect(JSON.stringify(where)).toContain('building');
    expect(JSON.stringify(where)).toContain('advisor-a');
  });

  it('keeps CLIENT_MANAGER empty scope fail-closed', async () => {
    const { prisma, service } = harness();
    prisma.clientUser.findFirst.mockResolvedValue({
      role: 'CLIENT_MANAGER',
      buildingIds: [],
    });
    prisma.customerPortfolioAssignment.findMany.mockResolvedValue([]);
    await expect(
      service.scope({
        type: 'CLIENT_USER',
        id: 'client-a',
        organizationId: 'org-a',
        role: 'CLIENT_MANAGER',
        buildingIds: [],
      }),
    ).resolves.toEqual({
      organizationId: 'org-a',
      buildingIds: [],
      visibility: 'shared',
    });
  });

  it('unions explicit local and Network building scope', async () => {
    const { prisma, service } = harness();
    prisma.clientUser.findFirst.mockResolvedValue({
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-local'],
    });
    prisma.customerPortfolioAssignment.findMany.mockResolvedValue([
      { scope: 'REGION', regionId: 'region-a' },
      { scope: 'BUILDING', buildingId: 'building-direct' },
    ]);
    prisma.customerPortfolioBuildingMembership.findMany.mockResolvedValue([
      { buildingId: 'building-region' },
    ]);
    const scope = await service.scope({
      type: 'CLIENT_USER',
      id: 'client-a',
      organizationId: 'org-a',
      role: 'CLIENT_MANAGER',
      buildingIds: ['ignored-token-scope'],
    });
    expect(scope.buildingIds).toEqual([
      'building-local',
      'building-direct',
      'building-region',
    ]);
  });

  it('preserves CLIENT_CORPORATE organization scope and denies inactive identities', async () => {
    const first = harness();
    first.prisma.clientUser.findFirst.mockResolvedValue({
      role: 'CLIENT_CORPORATE',
      buildingIds: [],
    });
    await expect(
      first.service.scope({
        type: 'CLIENT_USER',
        id: 'corporate-a',
        organizationId: 'org-a',
        role: 'CLIENT_CORPORATE',
        buildingIds: [],
      }),
    ).resolves.toEqual({ organizationId: 'org-a', visibility: 'shared' });

    const second = harness();
    second.prisma.clientUser.findFirst.mockResolvedValue(null);
    await expect(
      second.service.scope({
        type: 'CLIENT_USER',
        id: 'revoked-a',
        organizationId: 'org-a',
        role: 'CLIENT_MANAGER',
        buildingIds: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
