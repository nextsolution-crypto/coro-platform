import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { CommercialCatalogService } from '../src/commercial-catalog/commercial-catalog.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'TEST_DATABASE_URL est obligatoire pour commercial-catalog.postgres-spec',
  );

describe('Phase 2A PostgreSQL invariants', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const service = new CommercialCatalogService(
    prisma as never,
    new AdminAuditService(),
  );
  const suffix = randomUUID();
  const actor = { userId: `phase2a-actor-${suffix}` };
  const bookCode = `PHASE2A_${suffix.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  let bookId = '';
  let versionId = '';
  let componentId = '';
  let tierId = '';

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.organization.create({
      data: {
        id: `phase2a-org-${suffix}`,
        name: 'Phase 2A test',
        licenseType: 'STANDARD',
      },
    });
    await prisma.user.create({
      data: {
        id: actor.userId,
        email: `phase2a-${suffix}@example.invalid`,
        password: 'unused',
        firstName: 'Phase',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        organizationId: `phase2a-org-${suffix}`,
      },
    });
  });
  afterAll(() => prisma.$disconnect());

  it('seed exactement 9 capabilities, 27 scopes et aucun prix', async () => {
    await expect(prisma.commercialCapability.count()).resolves.toBe(9);
    await expect(prisma.capabilityScopePolicy.count()).resolves.toBe(27);
    const migrations = await prisma.$queryRaw<Array<{ finishedAt: Date }>>`
      SELECT "finished_at" AS "finishedAt"
      FROM "_prisma_migrations"
      WHERE "migration_name" = '20260929150000_super_admin_v2_phase_2a_commercial_catalog'
        AND "finished_at" IS NOT NULL
    `;
    expect(migrations).toHaveLength(1);
    await expect(
      prisma.priceBook.count({
        where: { createdAt: { lte: migrations[0].finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.priceBook.count({ where: { code: bookCode } }),
    ).resolves.toBe(0);
    const campus = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'CAMPUS' },
      include: { scopePolicies: true },
    });
    expect(campus).toMatchObject({ lifecycle: 'FUTURE', isAvailable: false });
    expect(
      campus.scopePolicies.find((item) => item.scope === 'CLIENT')?.status,
    ).toBe('UNDECIDED');
  });

  it('publie dans le futur en SCHEDULED et audite atomiquement', async () => {
    const book = await service.createPriceBook(
      {
        code: bookCode,
        name: 'Test PriceBook',
        audience: 'DIRECT',
        currency: 'CAD',
      },
      actor,
    );
    bookId = book.id;
    const version = await service.createVersion(book.id, {}, actor);
    versionId = version.id;
    const component = await service.createComponent(
      version.id,
      {
        code: 'BASE',
        capabilityCode: 'COMPLIANCE_OPERATIONS',
        nameFr: 'Base',
        nameEn: 'Base',
        pricingModel: 'TIERED',
        chargeType: 'RECURRING',
        revenueCategory: 'SAAS',
        billingPeriod: 'MONTH',
        metric: 'SEAT',
        tierMode: 'VOLUME',
        displayOrder: 10,
      },
      actor,
    );
    componentId = component.id;
    const first = await service.createTier(
      version.id,
      component.id,
      {
        minimumQuantity: '0',
        maximumQuantity: '10',
        amountMinor: '0',
        displayOrder: 10,
      },
      actor,
    );
    tierId = first.id;
    await service.createTier(
      version.id,
      component.id,
      { minimumQuantity: '10', amountMinor: '0', displayOrder: 20 },
      actor,
    );
    const published = await service.publishVersion(
      version.id,
      {
        effectiveFrom: new Date(Date.now() + 86_400_000).toISOString(),
        reason: 'Publication test',
      },
      actor,
    );
    expect(published.status).toBe('SCHEDULED');
    expect(
      await prisma.adminAuditEvent.count({
        where: { action: 'PRICE_BOOK_VERSION_PUBLISHED', targetId: version.id },
      }),
    ).toBe(1);
  });

  it('protège version, composant et tiers publiés même par Prisma direct', async () => {
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    await expect(
      prisma.priceComponent.create({
        data: {
          priceBookVersionId: versionId,
          capabilityId: capability.id,
          code: 'INJECTED',
          nameFr: 'Injected',
          nameEn: 'Injected',
          pricingModel: 'FLAT',
          chargeType: 'RECURRING',
          billingPeriod: 'MONTH',
          metric: 'FIXED',
          amountMinor: 0n,
          displayOrder: 99,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.priceComponent.update({
        where: { id: componentId },
        data: { nameFr: 'Mutation interdite' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.priceTier.delete({ where: { id: tierId } }),
    ).rejects.toThrow();
    await expect(
      prisma.priceBookVersion.delete({ where: { id: versionId } }),
    ).rejects.toThrow();
  });

  it('interdit archivage du PriceBook et permet seulement annulation explicite', async () => {
    await expect(
      service.archivePriceBook(bookId, 'Archive test', actor),
    ).rejects.toThrow('ACTIVE ou SCHEDULED');
    await expect(
      service.transitionVersion(versionId, 'cancel', 'Annulation test', actor),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
  });

  it('refuse de publier NETWORK tant que la capability est indisponible', async () => {
    const version = await service.createVersion(bookId, {}, actor);
    await service.createComponent(
      version.id,
      {
        code: 'NETWORK',
        capabilityCode: 'NETWORK',
        nameFr: 'Network',
        nameEn: 'Network',
        pricingModel: 'FLAT',
        chargeType: 'RECURRING',
        revenueCategory: 'OTHER_RECURRING',
        billingPeriod: 'MONTH',
        metric: 'FIXED',
        amountMinor: '0',
        displayOrder: 10,
      },
      actor,
    );
    await expect(
      service.publishVersion(
        version.id,
        { effectiveFrom: new Date().toISOString(), reason: 'Publication test' },
        actor,
      ),
    ).rejects.toThrow('indisponible');
  });
});
