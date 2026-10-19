import { ForbiddenException } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { PlatformAuthorityService } from '../auth/platform-authority.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerNetworkService } from './customer-network.service';

describe('CustomerNetworkService', () => {
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const responsibleUserId = '22222222-2222-4222-8222-222222222222';
  const portfolioId = '33333333-3333-4333-8333-333333333333';

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
      customerPortfolioBuildingMembership: { findMany: jest.fn() },
      customerPortfolio: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      organization: { findUnique: jest.fn() },
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
      clientUser: { findFirst: jest.fn() },
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
});
