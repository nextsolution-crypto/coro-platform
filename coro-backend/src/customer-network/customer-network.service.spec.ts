import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PlatformAuthorityService } from '../auth/platform-authority.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerNetworkService } from './customer-network.service';

describe('CustomerNetworkService', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const responsibleUserId = '22222222-2222-4222-8222-222222222222';
  const portfolioId = '33333333-3333-4333-8333-333333333333';
  const operatorUserId = '44444444-4444-4444-8444-444444444444';

  const audit = {
    normalizeReason: jest.fn((reason: string) => reason.trim()),
    record: jest.fn(),
  };
  const platformIdentity = { requireFounderAuthority: jest.fn() };

  function createPrisma() {
    const prisma = {
      $executeRaw: jest.fn(),
      $transaction: jest.fn(
        async (callback: (transaction: unknown) => Promise<unknown>) =>
          callback(prisma),
      ),
      customerNetworkAuthorityConfiguration: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      customerPortfolioAssignment: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      customerPortfolioBuildingMembership: { findMany: jest.fn(), findFirst: jest.fn() },
      customerPortfolioRegionLink: { findFirst: jest.fn() },
      customerPortfolio: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      organization: { findUnique: jest.fn() },
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
      clientUser: { findFirst: jest.fn(), findUnique: jest.fn() },
      adminAuditEvent: { findMany: jest.fn() },
    };
    return prisma;
  }

  function service(prisma: ReturnType<typeof createPrisma>) {
    return new CustomerNetworkService(
      prisma as unknown as PrismaService,
      audit as unknown as AdminAuditService,
      platformIdentity as unknown as PlatformAuthorityService,
    );
  }

  beforeEach(() => jest.clearAllMocks());

  it('creates a DRAFT only after canonical operator verification', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue(
      null,
    );
    prisma.organization.findUnique.mockResolvedValue({
      id: organizationId,
      isActive: true,
      isInternal: false,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: responsibleUserId,
      organizationId,
      isActive: true,
    });
    prisma.customerNetworkAuthorityConfiguration.create.mockResolvedValue({
      id: 'authority',
      organizationId,
      responsibleUserId,
      mandateReference: 'MANDATE-001',
      status: 'DRAFT',
      lockVersion: 0,
    });

    const result = await service(prisma).createDraft(
      { userId: 'founder' },
      organizationId,
      {
        responsibleUserId,
        mandateReference: 'MANDATE-001',
        reason: 'Mandat client documente',
      },
    );

    expect(platformIdentity.requireFounderAuthority).toHaveBeenCalledWith({
      userId: 'founder',
    });
    expect(result).toMatchObject({ status: 'DRAFT', lockVersion: 0 });
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'CUSTOMER_NETWORK_AUTHORITY_DRAFT_CREATED',
      }),
    );
  });

  it('rejects a responsible user from another tenant', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue(
      null,
    );
    prisma.organization.findUnique.mockResolvedValue({
      id: organizationId,
      isActive: true,
      isInternal: false,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: responsibleUserId,
      organizationId: 'other-tenant',
      isActive: true,
    });

    await expect(
      service(prisma).createDraft({ userId: 'founder' }, organizationId, {
        responsibleUserId,
        mandateReference: 'MANDATE-001',
        reason: 'Mandat client documente',
      }),
    ).rejects.toThrow('Responsable initial invalide.');
  });

  it('atomically bootstraps the first portfolio and explicit assignment', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({
      id: 'authority',
      organizationId,
      responsibleUserId,
      status: 'ACTIVE',
    });
    prisma.customerPortfolioAssignment.count.mockResolvedValue(0);
    prisma.user.findFirst.mockResolvedValue({ id: responsibleUserId });
    prisma.organization.findUnique.mockResolvedValue({
      id: organizationId,
      isActive: true,
      isInternal: false,
    });
    prisma.customerPortfolio.count.mockResolvedValue(0);
    prisma.customerPortfolio.create.mockResolvedValue({
      id: portfolioId,
      code: 'INITIAL',
      name: 'Portefeuille initial',
    });
    prisma.customerPortfolioAssignment.create.mockResolvedValue({
      id: 'assignment',
      subjectType: 'INTERNAL_USER',
      userId: responsibleUserId,
      clientUserId: null,
      scope: 'PORTFOLIO',
      permissions: ['NETWORK_HIERARCHY_MANAGE', 'NETWORK_ASSIGNMENT_MANAGE'],
    });

    await service(prisma).bootstrapInitialPortfolio(
      { userId: responsibleUserId },
      organizationId,
      {
        code: 'INITIAL',
        name: 'Portefeuille initial',
        permissions: ['NETWORK_HIERARCHY_MANAGE', 'NETWORK_ASSIGNMENT_MANAGE'],
        reason: 'Amorcage explicite Network',
      },
    );

    expect(prisma.customerPortfolioAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: responsibleUserId,
        portfolioId,
        permissions: ['NETWORK_HIERARCHY_MANAGE', 'NETWORK_ASSIGNMENT_MANAGE'],
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'CUSTOMER_NETWORK_INITIAL_PORTFOLIO_BOOTSTRAPPED',
      }),
    );
  });

  it('rejects bootstrap by a non-designated customer administrator', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({
      id: 'authority',
      organizationId,
      responsibleUserId,
      status: 'ACTIVE',
    });
    prisma.organization.findUnique.mockResolvedValue({
      id: organizationId,
      isActive: true,
      isInternal: false,
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'customer-admin' });
    prisma.customerPortfolio.count.mockResolvedValue(0);
    prisma.customerPortfolioAssignment.count.mockResolvedValue(0);

    await expect(
      service(prisma).bootstrapInitialPortfolio(
        { userId: 'customer-admin' },
        organizationId,
        {
          code: 'INITIAL',
          name: 'Portefeuille initial',
          permissions: [
            'NETWORK_HIERARCHY_MANAGE',
            'NETWORK_ASSIGNMENT_MANAGE',
          ],
          reason: 'Tentative implicite refusee',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a second bootstrap permanently', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({
      id: 'authority',
      organizationId,
      responsibleUserId,
      status: 'ACTIVE',
    });
    prisma.organization.findUnique.mockResolvedValue({
      id: organizationId,
      isActive: true,
      isInternal: false,
    });
    prisma.user.findFirst.mockResolvedValue({ id: responsibleUserId });
    prisma.customerPortfolio.count.mockResolvedValue(1);
    prisma.customerPortfolioAssignment.count.mockResolvedValue(1);

    await expect(
      service(prisma).bootstrapInitialPortfolio(
        { userId: responsibleUserId },
        organizationId,
        {
          code: 'SECOND',
          name: 'Second portefeuille',
          permissions: [
            'NETWORK_HIERARCHY_MANAGE',
            'NETWORK_ASSIGNMENT_MANAGE',
          ],
          reason: 'Deuxieme amorcage refuse',
        },
      ),
    ).rejects.toThrow('Amorcage Network deja effectue.');
    expect(prisma.customerPortfolio.create).not.toHaveBeenCalled();
  });

  it('fails closed when a client has no explicit Network assignment', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({
      status: 'ACTIVE',
    });
    prisma.clientUser.findFirst.mockResolvedValue({ id: 'client-user' });
    prisma.customerPortfolioAssignment.findMany.mockResolvedValue([]);

    await expect(
      service(prisma).supervision(
        { sub: 'client-user', organizationId },
        { page: 1, pageSize: 25 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service(prisma).hasClientAccess({
        sub: 'client-user',
        organizationId,
      }),
    ).resolves.toEqual({ enabled: false });
  });

  it('creates an explicit read-only operator assignment under active independent authorities', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({
      id: 'network-authority',
      organizationId,
      status: 'ACTIVE',
    });
    prisma.customerPortfolioAssignment.findFirst.mockResolvedValue({
      id: 'assignment-manager',
    });
    prisma.user.findFirst.mockResolvedValue({
      id: operatorUserId,
      organizationId: 'operator-org',
    });
    prisma.customerPortfolio.findFirst.mockResolvedValue({ id: portfolioId });
    prisma.customerPortfolioAssignment.create.mockResolvedValue({
      id: 'operator-assignment',
      organizationId,
      subjectType: 'OPERATOR_USER',
      userId: null,
      clientUserId: null,
      operatorUserId,
      scope: 'PORTFOLIO',
      portfolioId,
      permissions: ['NETWORK_SUPERVISION_READ'],
    });
    prisma.customerNetworkAuthorityConfiguration.findUnique
      .mockResolvedValueOnce({ status: 'ACTIVE' })
      .mockResolvedValueOnce({ status: 'ACTIVE' });
    (prisma as any).platformAuthorityConfiguration = {
      findUnique: jest.fn().mockResolvedValue({
        status: 'ACTIVE',
        operatorOrganizationId: 'operator-org',
      }),
    };

    const result = await service(prisma).createAssignment(
      { userId: responsibleUserId },
      organizationId,
      {
        subjectType: 'OPERATOR_USER',
        operatorUserId,
        scope: 'PORTFOLIO',
        portfolioId,
        permissions: ['NETWORK_SUPERVISION_READ'],
        reason: 'Supervision explicite du rapport exercice',
      },
    );

    expect(result).toMatchObject({
      subjectType: 'OPERATOR_USER',
      operatorUserId,
    });
    expect(prisma.customerPortfolioAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subjectType: 'OPERATOR_USER',
        operatorUserId,
        userId: null,
        clientUserId: null,
        permissions: ['NETWORK_SUPERVISION_READ'],
      }),
    });
  });

  it('rejects operator assignment management permissions', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({
      status: 'ACTIVE',
    });
    prisma.customerPortfolioAssignment.findFirst.mockResolvedValue({
      id: 'manager',
    });
    prisma.user.findFirst.mockResolvedValue({
      id: operatorUserId,
      organizationId: 'operator-org',
    });
    (prisma as any).platformAuthorityConfiguration = {
      findUnique: jest.fn().mockResolvedValue({
        status: 'ACTIVE',
        operatorOrganizationId: 'operator-org',
      }),
    };

    await expect(
      service(prisma).createAssignment(
        { userId: responsibleUserId },
        organizationId,
        {
          subjectType: 'OPERATOR_USER',
          operatorUserId,
          scope: 'PORTFOLIO',
          portfolioId,
          permissions: ['NETWORK_ASSIGNMENT_MANAGE'],
          reason: 'Tentative de privilege implicite refusee',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.customerPortfolioAssignment.create).not.toHaveBeenCalled();
  });

  it('rejects an operator outside the canonical operating organization', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({
      status: 'ACTIVE',
    });
    prisma.customerPortfolioAssignment.findFirst.mockResolvedValue({
      id: 'manager',
    });
    prisma.user.findFirst.mockResolvedValue(null);
    (prisma as any).platformAuthorityConfiguration = {
      findUnique: jest.fn(),
    };

    await expect(
      service(prisma).createAssignment(
        { userId: responsibleUserId },
        organizationId,
        {
          subjectType: 'OPERATOR_USER',
          operatorUserId,
          scope: 'PORTFOLIO',
          portfolioId,
          permissions: ['NETWORK_SUPERVISION_READ'],
          reason: 'Tentative inter-organisation refusee',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an explicitly scoped client manager to delegate a narrower building scope', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.clientUser.findFirst
      .mockResolvedValueOnce({ id: 'manager' })
      .mockResolvedValueOnce({ id: 'recipient' });
    prisma.customerPortfolioAssignment.findMany.mockResolvedValue([{
      id: 'manager-assignment', scope: 'REGION', portfolioId: null, regionId: 'region-a', buildingId: null,
      permissions: ['NETWORK_ASSIGNMENT_MANAGE', 'NETWORK_SUPERVISION_READ'],
    }]);
    prisma.customerPortfolioBuildingMembership.findFirst.mockResolvedValue({ id: 'membership' });
    (prisma as any).building = { findFirst: jest.fn().mockResolvedValue({ id: 'building-a' }) };
    prisma.customerPortfolioAssignment.create.mockResolvedValue({
      id: 'delegation', subjectType: 'CLIENT_USER', clientUserId: 'recipient', scope: 'BUILDING',
      buildingId: 'building-a', permissions: ['NETWORK_SUPERVISION_READ'], status: 'ACTIVE',
    });

    const result = await service(prisma).createClientAssignment(
      { sub: 'manager', organizationId },
      {
        subjectType: 'CLIENT_USER', clientUserId: 'recipient', scope: 'BUILDING', buildingId: 'building-a',
        permissions: ['NETWORK_SUPERVISION_READ'], reason: 'Delegation locale explicite',
      },
    );

    expect(result).toMatchObject({ id: 'delegation' });
    expect(prisma.customerPortfolioAssignment.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      grantedByActorType: 'CLIENT_USER', grantedByClientUserId: 'manager',
    }) });
    expect(audit.record).toHaveBeenCalledWith(prisma, expect.objectContaining({
      actorType: 'CLIENT_USER', actorClientUserId: 'manager', organizationId,
    }));
  });

  it('denies customer delegation outside the managers scope', async () => {
    const prisma = createPrisma();
    prisma.customerNetworkAuthorityConfiguration.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.clientUser.findFirst.mockResolvedValue({ id: 'manager' });
    prisma.customerPortfolioAssignment.findMany.mockResolvedValue([{
      id: 'manager-assignment', scope: 'BUILDING', portfolioId: null, regionId: null, buildingId: 'building-a',
      permissions: ['NETWORK_ASSIGNMENT_MANAGE', 'NETWORK_SUPERVISION_READ'],
    }]);

    await expect(service(prisma).createClientAssignment(
      { sub: 'manager', organizationId },
      {
        subjectType: 'CLIENT_USER', clientUserId: 'recipient', scope: 'BUILDING', buildingId: 'building-b',
        permissions: ['NETWORK_SUPERVISION_READ'], reason: 'Tentative hors perimetre',
      },
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.customerPortfolioAssignment.create).not.toHaveBeenCalled();
  });
});
