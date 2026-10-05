import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialCatalogService } from '../src/commercial-catalog/commercial-catalog.service';
import { CommercialConfigurationService } from '../src/commercial-configuration/commercial-configuration.service';
import { CommercialSimulatorService } from '../src/commercial-simulator/commercial-simulator.service';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL required');
describe('Governed commercial configuration PostgreSQL acceptance', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const audit = new AdminAuditService();
  const catalog = new CommercialCatalogService(prisma as never, audit);
  const simulator = new CommercialSimulatorService(
    prisma as never,
    new ProposalPricingEngine(),
    audit,
  );
  const service = new CommercialConfigurationService(
    prisma as never,
    catalog,
    simulator,
    audit,
  );
  const suffix = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  const actor = { userId: `bootstrap-${suffix}` };
  let versionId = '';
  beforeAll(async () => {
    await prisma.$connect();
    const organizationId = `bootstrap-org-${suffix}`;
    await prisma.organization.create({
      data: { id: organizationId, name: 'Bootstrap test' },
    });
    await prisma.user.create({
      data: {
        id: actor.userId,
        email: `bootstrap-${suffix}@example.invalid`,
        password: 'unused',
        firstName: 'Bootstrap',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        organizationId,
      },
    });
    const book = await catalog.createPriceBook(
      {
        code: 'CORO_PROFESSIONAL_DIRECT_CAD',
        name: 'CORO Professional — DIRECT — CAD',
        audience: 'DIRECT',
        currency: 'CAD',
      },
      actor,
    );
    versionId = (await catalog.createVersion(book.id, {}, actor)).id;
  });
  afterAll(() => prisma.$disconnect());
  it('analyzes without side effects and recognizes empty DRAFT', async () => {
    const before = {
      components: await prisma.priceComponent.count(),
      costs: await prisma.commercialCostAssumptionSet.count(),
      audits: await prisma.adminAuditEvent.count(),
    };
    const a = await service.analyze('professional-direct');
    expect(a.status).toBe('PARTIALLY_CONFIGURED');
    expect(a.target.priceBookVersionId).toBe(versionId);
    expect(a.missingCount).toBeGreaterThan(0);
    expect({
      components: await prisma.priceComponent.count(),
      costs: await prisma.commercialCostAssumptionSet.count(),
      audits: await prisma.adminAuditEvent.count(),
    }).toEqual(before);
  });
  it('reuses existing v1, applies idempotently, and creates no duplicates', async () => {
    const first = await service.apply('professional-direct', actor);
    expect(first.status).toBe('READY_FOR_REVIEW');
    expect(first.target.priceBookVersionId).toBe(versionId);
    expect(
      await prisma.priceBook.count({
        where: { code: 'CORO_PROFESSIONAL_DIRECT_CAD' },
      }),
    ).toBe(1);
    expect(
      await prisma.priceBookVersion.count({
        where: { priceBookId: first.target.priceBookId },
      }),
    ).toBe(1);
    expect(
      await prisma.priceComponent.count({
        where: { priceBookVersionId: versionId },
      }),
    ).toBe(5);
    expect(
      await prisma.priceTier.count({
        where: { priceComponent: { priceBookVersionId: versionId } },
      }),
    ).toBe(10);
    const counts = [
      await prisma.priceBook.count({
        where: { code: 'CORO_PROFESSIONAL_DIRECT_CAD' },
      }),
      await prisma.priceBookVersion.count({
        where: { priceBookId: first.target.priceBookId },
      }),
      await prisma.priceComponent.count({
        where: { priceBookVersionId: versionId },
      }),
      await prisma.priceTier.count({
        where: { priceComponent: { priceBookVersionId: versionId } },
      }),
      await prisma.commercialCostAssumptionSet.count({
        where: { code: 'CORO_PROFESSIONAL_DIRECT_COST' },
      }),
      await prisma.commercialCostAssumptionVersion.count({
        where: { setId: first.target.costAssumptionSetId },
      }),
    ];
    const concurrent = await Promise.all([
      service.apply('professional-direct', actor),
      service.apply('professional-direct', actor),
    ]);
    expect(concurrent.map((result) => result.status)).toEqual([
      'READY_FOR_REVIEW',
      'READY_FOR_REVIEW',
    ]);
    expect([
      await prisma.priceBook.count({
        where: { code: 'CORO_PROFESSIONAL_DIRECT_CAD' },
      }),
      await prisma.priceBookVersion.count({
        where: { priceBookId: first.target.priceBookId },
      }),
      await prisma.priceComponent.count({
        where: { priceBookVersionId: versionId },
      }),
      await prisma.priceTier.count({
        where: { priceComponent: { priceBookVersionId: versionId } },
      }),
      await prisma.commercialCostAssumptionSet.count({
        where: { code: 'CORO_PROFESSIONAL_DIRECT_COST' },
      }),
      await prisma.commercialCostAssumptionVersion.count({
        where: { setId: first.target.costAssumptionSetId },
      }),
    ]).toEqual(counts);
  });
  it('builds founder review from actual configured authorities', async () => {
    const review = await service.review('professional-direct');
    expect(review.subscription).toHaveLength(10);
    expect(review.subscription[6]).toEqual({
      from: '101',
      through: '125',
      amountMinor: '1750000',
    });
    expect(review.internal.warning).toContain('NOT CUSTOMER VISIBLE');
    expect(review.policies).toMatchObject({
      valueAnalysis: false,
      partner: false,
      standardAbove200: false,
      exactlyOneImplementation: true,
    });
  });
  it('binds approval to fingerprint, rejects staleness, then publishes Cost before PriceBook', async () => {
    const approval = await service.approve(
      'professional-direct',
      'Founder test approval',
      actor,
    );
    const a = await service.analyze('professional-direct');
    expect(approval.configurationFingerprint).toBe(a.configurationFingerprint);
    const standard = await prisma.priceComponent.findFirstOrThrow({
      where: {
        priceBookVersionId: versionId,
        code: 'CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD',
      },
    });
    await catalog.updateComponent(
      versionId,
      standard.id,
      {
        code: standard.code,
        capabilityCode: 'COMPLIANCE_OPERATIONS',
        nameFr: standard.nameFr,
        nameEn: standard.nameEn,
        pricingModel: standard.pricingModel,
        chargeType: standard.chargeType,
        revenueCategory: standard.revenueCategory!,
        metric: standard.metric!,
        amountMinor: '250001',
        displayOrder: standard.displayOrder,
      },
      actor,
    );
    await expect(
      service.apply('professional-direct', actor),
    ).rejects.toMatchObject({ response: { code: 'CONFIGURATION_CONFLICT' } });
    const entitlementCount = await prisma.capabilityEntitlement.count();
    await expect(
      service.publish(
        'professional-direct',
        new Date(Date.now() - 1000).toISOString(),
        'Must reject stale',
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: 'APPROVAL_STALE' } });
    await catalog.updateComponent(
      versionId,
      standard.id,
      {
        code: standard.code,
        capabilityCode: 'COMPLIANCE_OPERATIONS',
        nameFr: standard.nameFr,
        nameEn: standard.nameEn,
        pricingModel: standard.pricingModel,
        chargeType: standard.chargeType,
        revenueCategory: standard.revenueCategory!,
        metric: standard.metric!,
        amountMinor: '250000',
        displayOrder: standard.displayOrder,
      },
      actor,
    );
    await service.approve('professional-direct', 'Founder reapproval', actor);
    const approved = await service.analyze('professional-direct');
    const targetCostVersionId = approved.target.costAssumptionVersionId;
    const targetCostSetId = approved.target.costAssumptionSetId;
    expect(targetCostVersionId).toBeTruthy();
    expect(targetCostSetId).toBeTruthy();
    await expect(
      service.publish(
        'professional-direct',
        new Date(Date.now() - 1000).toISOString(),
        'Founder publication',
        actor,
      ),
    ).resolves.toMatchObject({ status: 'PUBLISHED' });
    await expect(
      prisma.priceBookVersion.findUniqueOrThrow({ where: { id: versionId } }),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(
      prisma.commercialCostAssumptionVersion.findUniqueOrThrow({
        where: { id: targetCostVersionId },
      }),
    ).resolves.toMatchObject({
      id: targetCostVersionId,
      setId: targetCostSetId,
      status: 'PUBLISHED',
      archivedAt: null,
    });
    const deployment =
      await prisma.commercialConfigurationDeployment.findUniqueOrThrow({
        where: {
          definitionCode_definitionVersion_priceBookVersionId: {
            definitionCode: 'professional-direct',
            definitionVersion: 'v1',
            priceBookVersionId: versionId,
          },
        },
      });
    expect(deployment).toMatchObject({
      costAssumptionSetId: targetCostSetId,
      costAssumptionVersionId: targetCostVersionId,
      priceBookVersionId: versionId,
      status: 'PUBLISHED',
    });
    const previousCostVersions =
      await prisma.commercialCostAssumptionVersion.findMany({
        where: { setId: targetCostSetId, id: { not: targetCostVersionId } },
        select: { id: true, status: true },
      });
    expect(
      previousCostVersions.every(({ status }) => status === 'ARCHIVED'),
    ).toBe(true);
    await expect(
      prisma.adminAuditEvent.count({
        where: {
          actorUserId: actor.userId,
          action: 'COMMERCIAL_COST_ASSUMPTION_PUBLISHED',
          targetType: 'CommercialCostAssumptionVersion',
          targetId: targetCostVersionId,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.adminAuditEvent.count({
        where: {
          actorUserId: actor.userId,
          action: 'PRICE_BOOK_VERSION_PUBLISHED',
          targetType: 'PriceBookVersion',
          targetId: versionId,
        },
      }),
    ).resolves.toBe(1);
    expect(await prisma.capabilityEntitlement.count()).toBe(entitlementCount);
    await expect(
      prisma.adminAuditEvent.count({
        where: {
          actorUserId: actor.userId,
          action: {
            in: [
              'COMMERCIAL_CONFIGURATION_APPLIED',
              'COMMERCIAL_CONFIGURATION_APPROVED',
            ],
          },
        },
      }),
    ).resolves.toBeGreaterThanOrEqual(3);
    const authorityCounts = {
      costVersions: await prisma.commercialCostAssumptionVersion.count({
        where: { setId: targetCostSetId },
      }),
      priceBookVersions: await prisma.priceBookVersion.count({
        where: { priceBookId: deployment.priceBookId },
      }),
    };
    await expect(
      service.apply('professional-direct', actor),
    ).resolves.toMatchObject({ status: 'PUBLISHED' });
    expect({
      costVersions: await prisma.commercialCostAssumptionVersion.count({
        where: { setId: targetCostSetId },
      }),
      priceBookVersions: await prisma.priceBookVersion.count({
        where: { priceBookId: deployment.priceBookId },
      }),
    }).toEqual(authorityCounts);
  });
});
