import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { PlatformAuthorityService } from '../src/auth/platform-authority.service';
import { CustomerNetworkService } from '../src/customer-network/customer-network.service';
import { PrismaService } from '../src/prisma/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('Customer Network authority on PostgreSQL 16', () => {
  const prisma = databaseUrl
    ? new PrismaService({ datasources: { db: { url: databaseUrl } } })
    : new PrismaService();
  const platformIdentity = {
    requireFounderAuthority: jest.fn().mockResolvedValue(undefined),
  };
  const service = new CustomerNetworkService(
    prisma,
    new AdminAuditService(),
    platformIdentity as unknown as PlatformAuthorityService,
  );

  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());

  async function fixture(label: string, buildingCount = 0) {
    const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const operator = await prisma.organization.create({
      data: { name: `CORO ${suffix}`, isInternal: true },
    });
    const organization = await prisma.organization.create({
      data: { name: `Client ${suffix}`, isInternal: false },
    });
    const founder = await prisma.user.create({
      data: {
        email: `founder-${suffix}@example.invalid`,
        password: 'synthetic-qa-only',
        firstName: 'QA',
        lastName: 'Founder',
        role: 'SUPER_ADMIN',
        organizationId: operator.id,
      },
    });
    const responsible = await prisma.user.create({
      data: {
        email: `network-${suffix}@example.invalid`,
        password: 'synthetic-qa-only',
        firstName: 'QA',
        lastName: 'Network',
        role: 'ADMIN',
        organizationId: organization.id,
      },
    });
    const otherAdmin = await prisma.user.create({
      data: {
        email: `admin-${suffix}@example.invalid`,
        password: 'synthetic-qa-only',
        firstName: 'QA',
        lastName: 'Admin',
        role: 'ADMIN',
        organizationId: organization.id,
      },
    });
    const client = await prisma.client.create({
      data: {
        name: `Client ${suffix}`,
        regulatoryRequirements: [],
        organizationId: organization.id,
      },
    });
    const portalUser = await prisma.clientUser.create({
      data: {
        email: `portal-${suffix}@example.invalid`,
        password: 'synthetic-qa-only',
        firstName: 'QA',
        lastName: 'Portal',
        role: 'CLIENT_CORPORATE',
        buildingIds: [],
        clientId: client.id,
        organizationId: organization.id,
      },
    });
    const buildings = buildingCount
      ? await prisma.$transaction(
          Array.from({ length: buildingCount }, (_, index) =>
            prisma.building.create({
              data: {
                name: `Building ${index.toString().padStart(3, '0')}`,
                address: `${index + 1} QA Street`,
                city: 'Montreal',
                province: 'QC',
                clientId: client.id,
                organizationId: organization.id,
              },
            }),
          ),
        )
      : [];
    return {
      organization,
      founder,
      responsible,
      otherAdmin,
      portalUser,
      buildings,
    };
  }

  async function activateAuthority(data: Awaited<ReturnType<typeof fixture>>) {
    const draft = await service.createDraft(
      { userId: data.founder.id },
      data.organization.id,
      {
        responsibleUserId: data.responsible.id,
        mandateReference: 'QA-NETWORK-MANDATE',
        reason: 'Mandat QA explicite et documente',
      },
    );
    return service.activate(
      { userId: data.founder.id },
      data.organization.id,
      draft.lockVersion,
      'Activation QA gouvernee distincte',
    );
  }

  const bootstrapInput = {
    code: 'INITIAL',
    name: 'Portefeuille initial',
    permissions: [
      'NETWORK_SUPERVISION_READ',
      'NETWORK_HIERARCHY_MANAGE',
      'NETWORK_ASSIGNMENT_MANAGE',
    ] as const,
    reason: 'Amorcage atomique approuve par le Founder',
  };

  it('bootstraps once, atomically, with audit provenance and no role fallback', async () => {
    const data = await fixture('bootstrap');
    await activateAuthority(data);

    await expect(
      service.bootstrapInitialPortfolio(
        { userId: data.otherAdmin.id },
        data.organization.id,
        { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const result = await service.bootstrapInitialPortfolio(
      { userId: data.responsible.id },
      data.organization.id,
      { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
    );
    expect(result.assignment).toMatchObject({
      userId: data.responsible.id,
      portfolioId: result.portfolio.id,
      scope: 'PORTFOLIO',
      status: 'ACTIVE',
    });
    expect(
      await prisma.adminAuditEvent.count({
        where: {
          action: 'CUSTOMER_NETWORK_INITIAL_PORTFOLIO_BOOTSTRAPPED',
          targetId: result.authority.id,
        },
      }),
    ).toBe(1);
    await expect(
      service.bootstrapInitialPortfolio(
        { userId: data.responsible.id },
        data.organization.id,
        {
          ...bootstrapInput,
          code: 'SECOND',
          permissions: [...bootstrapInput.permissions],
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails closed for DRAFT, revoked, disabled, and unjustified bootstrap attempts', async () => {
    const draftData = await fixture('draft-denial');
    await service.createDraft(
      { userId: draftData.founder.id },
      draftData.organization.id,
      {
        responsibleUserId: draftData.responsible.id,
        mandateReference: 'QA-NETWORK-DRAFT-DENIAL',
        reason: 'Mandat QA pour refus DRAFT',
      },
    );
    await expect(
      service.bootstrapInitialPortfolio(
        { userId: draftData.responsible.id },
        draftData.organization.id,
        { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const disabledData = await fixture('disabled-denial');
    await activateAuthority(disabledData);
    await prisma.user.update({
      where: { id: disabledData.responsible.id },
      data: { isActive: false },
    });
    await expect(
      service.bootstrapInitialPortfolio(
        { userId: disabledData.responsible.id },
        disabledData.organization.id,
        { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const reasonData = await fixture('reason-denial');
    await activateAuthority(reasonData);
    await expect(
      service.bootstrapInitialPortfolio(
        { userId: reasonData.responsible.id },
        reasonData.organization.id,
        {
          ...bootstrapInput,
          reason: '   ',
          permissions: [...bootstrapInput.permissions],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const revokedData = await fixture('revoked-denial');
    const authority = await activateAuthority(revokedData);
    await service.revokeAuthority(
      { userId: revokedData.founder.id },
      revokedData.organization.id,
      authority.lockVersion,
      'Revocation QA explicite avant amorcage',
    );
    await expect(
      service.bootstrapInitialPortfolio(
        { userId: revokedData.responsible.id },
        revokedData.organization.id,
        { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a replacement before revoking the last assignment manager', async () => {
    const data = await fixture('replacement');
    await activateAuthority(data);
    const bootstrapped = await service.bootstrapInitialPortfolio(
      { userId: data.responsible.id },
      data.organization.id,
      { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
    );
    await expect(
      service.revokeAssignment(
        { userId: data.responsible.id },
        data.organization.id,
        bootstrapped.assignment.id,
        bootstrapped.assignment.lockVersion,
        'Tentative sans remplacement',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('serializes concurrent attempts so exactly one succeeds', async () => {
    const data = await fixture('concurrency');
    await activateAuthority(data);
    const attempts = await Promise.allSettled([
      service.bootstrapInitialPortfolio(
        { userId: data.responsible.id },
        data.organization.id,
        { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
      ),
      service.bootstrapInitialPortfolio(
        { userId: data.responsible.id },
        data.organization.id,
        { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
      ),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(
      await prisma.customerPortfolio.count({
        where: { organizationId: data.organization.id },
      }),
    ).toBe(1);
    expect(
      await prisma.customerPortfolioAssignment.count({
        where: { organizationId: data.organization.id },
      }),
    ).toBe(1);
  });

  it('rolls back portfolio and assignment when audit persistence fails', async () => {
    const data = await fixture('rollback');
    await activateAuthority(data);
    const failing = new CustomerNetworkService(
      prisma,
      {
        normalizeReason: (reason: string) => reason,
        record: () => Promise.reject(new Error('synthetic audit failure')),
      },
      platformIdentity as unknown as PlatformAuthorityService,
    );
    await expect(
      failing.bootstrapInitialPortfolio(
        { userId: data.responsible.id },
        data.organization.id,
        { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
      ),
    ).rejects.toThrow('synthetic audit failure');
    expect(
      await prisma.customerPortfolio.count({
        where: { organizationId: data.organization.id },
      }),
    ).toBe(0);
    expect(
      await prisma.customerPortfolioAssignment.count({
        where: { organizationId: data.organization.id },
      }),
    ).toBe(0);
  });

  it('derives a tenant-isolated 100-building supervision read model', async () => {
    const data = await fixture('hundred', 100);
    await activateAuthority(data);
    const bootstrapped = await service.bootstrapInitialPortfolio(
      { userId: data.responsible.id },
      data.organization.id,
      { ...bootstrapInput, permissions: [...bootstrapInput.permissions] },
    );
    const region = await service.createRegion(
      { userId: data.responsible.id },
      data.organization.id,
      { code: 'EAST', name: 'Region Est', reason: 'Region QA explicite' },
    );
    await service.linkRegion(
      { userId: data.responsible.id },
      data.organization.id,
      bootstrapped.portfolio.id,
      { regionId: region.id, reason: 'Lien QA explicite portfolio region' },
    );
    for (const building of data.buildings) {
      await service.addBuilding(
        { userId: data.responsible.id },
        data.organization.id,
        bootstrapped.portfolio.id,
        {
          regionId: region.id,
          buildingId: building.id,
          reason: 'Membership QA explicite du batiment',
        },
      );
    }
    await service.createAssignment(
      { userId: data.responsible.id },
      data.organization.id,
      {
        subjectType: 'CLIENT_USER',
        clientUserId: data.portalUser.id,
        scope: 'PORTFOLIO',
        portfolioId: bootstrapped.portfolio.id,
        permissions: ['NETWORK_SUPERVISION_READ'],
        reason: 'Lecture Network QA explicite',
      },
    );
    const observedBuilding = data.buildings[0];
    const requirement = await prisma.complianceRequirement.create({
      data: {
        scope: 'ORGANIZATION',
        scopeKey: `ORG:${data.organization.id}`,
        organizationId: data.organization.id,
        code: 'QA-DOCUMENT',
        name: 'Document QA',
        type: 'DOCUMENT',
      },
    });
    await prisma.$transaction([
      prisma.incidentEvent.create({
        data: {
          buildingId: observedBuilding.id,
          organizationId: data.organization.id,
          type: 'OTHER',
          triggeredBy: 'QA Network',
          occupantsSnapshot: {},
          teamSnapshot: {},
        },
      }),
      prisma.occupancyRecord.create({
        data: {
          buildingId: observedBuilding.id,
          organizationId: data.organization.id,
          type: 'VISITEUR',
          firstName: 'QA',
          lastName: 'Occupant',
        },
      }),
      prisma.buildingRequirement.create({
        data: {
          buildingId: observedBuilding.id,
          requirementId: requirement.id,
        },
      }),
      prisma.complianceEvidence.create({
        data: {
          organizationId: data.organization.id,
          buildingId: observedBuilding.id,
          requirementId: requirement.id,
          sourceType: 'MANUAL',
          sourceRecordId: `qa-${observedBuilding.id}`,
          occurredAt: new Date(),
          status: 'VALID',
        },
      }),
      prisma.correctiveAction.create({
        data: {
          organizationId: data.organization.id,
          buildingId: observedBuilding.id,
          category: 'GENERAL',
          title: 'Action QA Network',
        },
      }),
    ]);
    const started = performance.now();
    const result = await service.supervision(
      { sub: data.portalUser.id, organizationId: data.organization.id },
      { page: 1, pageSize: 100 },
    );
    expect(result.total).toBe(100);
    expect(result.items).toHaveLength(100);
    expect(result.items[0]).toHaveProperty('incidentSummary.freshness');
    expect(result.items[0]).toHaveProperty('occupancySummary.freshness');
    expect(result.items[0]).toHaveProperty('documentSummary.freshness');
    expect(result.items[0]).toHaveProperty('actionSummary.freshness');
    const observed = result.items.find(({ id }) => id === observedBuilding.id)!;
    expect(observed.incidentSummary).toMatchObject({
      count: 1,
      freshness: 'CURRENT',
    });
    expect(observed.occupancySummary).toMatchObject({
      present: 1,
      freshness: 'CURRENT',
    });
    expect(observed.documentSummary).toMatchObject({
      required: 1,
      evidence: 1,
      freshness: 'CURRENT',
    });
    expect(observed.actionSummary).toMatchObject({
      open: 1,
      freshness: 'CURRENT',
    });
    expect(performance.now() - started).toBeLessThan(2000);

    const other = await fixture('other-tenant', 1);
    await expect(
      service.supervision(
        { sub: other.portalUser.id, organizationId: data.organization.id },
        { page: 1, pageSize: 100 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  }, 30_000);
});
