import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AdminAuditService } from '../src/admin-audit/admin-audit.service';
import { ProposalPricingEngine } from '../src/commercial-proposals/proposal-pricing-engine';
import { CommercialSimulatorService } from '../src/commercial-simulator/commercial-simulator.service';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour commercial-scenario-family.postgres-spec',
  );

describe('commercial Scenario family authority PostgreSQL', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new CommercialSimulatorService(
    prisma as never,
    new ProposalPricingEngine(),
    new AdminAuditService(),
  );

  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());

  it('upgrades a uniquely inferred legacy Professional Scenario only on explicit save and preserves it on duplicate', async () => {
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { name: `Family authority ${suffix}` },
    });
    const actor = await prisma.user.create({
      data: {
        email: `family-${suffix}@example.invalid`,
        password: 'test-only',
        firstName: 'Family',
        lastName: 'Authority',
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });
    const capability = await prisma.commercialCapability.findUniqueOrThrow({
      where: { code: 'COMPLIANCE_OPERATIONS' },
    });
    const priceBook = await prisma.priceBook.create({
      data: {
        code: `FAM_${suffix.replace(/-/g, '').slice(0, 16).toUpperCase()}`,
        name: 'Family authority fixture',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    const priceBookVersion = await prisma.priceBookVersion.create({
      data: {
        priceBookId: priceBook.id,
        versionNumber: 1,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const componentDefinitions = [
      ['CORO_PROFESSIONAL_ANNUAL', 'SAAS', 'RECURRING'],
      [
        'CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED',
        'IMPLEMENTATION',
        'ONE_TIME',
      ],
      ['DOCUMENT_COMPLIANCE_DELIVERY_HOUR', 'PROFESSIONAL_SERVICE', 'ONE_TIME'],
      [
        'DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR',
        'PROFESSIONAL_SERVICE',
        'ONE_TIME',
      ],
    ] as const;
    const components = await Promise.all(
      componentDefinitions.map(
        ([code, revenueCategory, chargeType], displayOrder) =>
          prisma.priceComponent.create({
            data: {
              priceBookVersionId: priceBookVersion.id,
              capabilityId: capability.id,
              code,
              nameFr: code,
              nameEn: code,
              pricingModel: displayOrder === 0 ? 'FLAT' : 'PER_UNIT',
              chargeType,
              revenueCategory,
              metric: displayOrder < 2 ? 'FIXED' : 'HOUR',
              amountMinor: 1n,
              displayOrder,
            },
          }),
      ),
    );
    const workspace = await prisma.commercialSimulationWorkspace.create({
      data: {
        reference: `FAM-${suffix}`,
        title: 'Family authority fixture',
        organizationId: organization.id,
        priceBookVersionId: priceBookVersion.id,
        currency: 'CAD',
        scenarios: {
          create: {
            name: 'Legacy Professional',
            capabilities: { create: { capabilityId: capability.id } },
            lines: {
              create: componentDefinitions.map(
                ([componentCode, revenueCategory, chargeType], index) => ({
                  source: 'CATALOG_COMPONENT' as const,
                  componentCode,
                  componentNameFr: componentCode,
                  capabilityId: capability.id,
                  priceComponentId: components[index].id,
                  pricingModel:
                    index === 0 ? ('FLAT' as const) : ('PER_UNIT' as const),
                  chargeType,
                  revenueCategory,
                  displayOrder: index,
                }),
              ),
            },
          },
        },
      },
      include: { scenarios: true },
    });
    const scenario = workspace.scenarios[0];

    const before = await service.getGuidedWorkspace(workspace.id);
    expect(before.scenarios[0]).toMatchObject({
      familyCodes: ['PROFESSIONAL'],
      familyAuthoritySource: 'LEGACY_INFERRED',
    });
    await expect(
      prisma.commercialSimulationScenarioFamily.count({
        where: { scenarioId: scenario.id },
      }),
    ).resolves.toBe(0);

    await expect(
      service.configureScenario(
        workspace.id,
        scenario.id,
        { lockVersion: 0, familyCodes: ['COMPLIANCE'], driverValues: [] },
        { userId: actor.id },
      ),
    ).rejects.toThrow();
    await expect(
      prisma.commercialSimulationScenario.findUniqueOrThrow({
        where: { id: scenario.id },
        include: { families: true },
      }),
    ).resolves.toMatchObject({ lockVersion: 0, families: [] });

    await service.configureScenario(
      workspace.id,
      scenario.id,
      { lockVersion: 0, familyCodes: ['PROFESSIONAL'], driverValues: [] },
      { userId: actor.id },
    );
    const after = await service.getGuidedWorkspace(workspace.id);
    expect(after.scenarios[0]).toMatchObject({
      familyCodes: ['PROFESSIONAL'],
      familyAuthoritySource: 'EXPLICIT',
    });

    const duplicate = await service.duplicateScenario(
      workspace.id,
      scenario.id,
      { userId: actor.id },
    );
    await expect(
      prisma.commercialSimulationScenarioFamily.findMany({
        where: { scenarioId: duplicate.id },
        orderBy: { displayOrder: 'asc' },
        select: { familyCode: true },
      }),
    ).resolves.toEqual([{ familyCode: 'PROFESSIONAL' }]);

    const competing = await Promise.allSettled([
      service.configureScenario(
        workspace.id,
        duplicate.id,
        { lockVersion: 0, familyCodes: ['PROFESSIONAL'], driverValues: [] },
        { userId: actor.id },
      ),
      service.configureScenario(
        workspace.id,
        duplicate.id,
        { lockVersion: 0, familyCodes: ['COMPLIANCE'], driverValues: [] },
        { userId: actor.id },
      ),
    ]);
    expect(
      competing.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      competing.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const savedDuplicate =
      await prisma.commercialSimulationScenario.findUniqueOrThrow({
        where: { id: duplicate.id },
        include: { families: true },
      });
    expect(savedDuplicate.lockVersion).toBe(1);
    expect(savedDuplicate.families).toHaveLength(1);
    expect(['COMPLIANCE', 'PROFESSIONAL']).toContain(
      savedDuplicate.families[0].familyCode,
    );
  });

  it('enforces scenario-scoped uniqueness without seeding or backfilling families', async () => {
    const migration = await prisma.$queryRaw<Array<{ finishedAt: Date }>>`
      SELECT "finished_at" AS "finishedAt" FROM "_prisma_migrations"
      WHERE "migration_name" = '20261014010000_commercial_scenario_family_authority'
        AND "finished_at" IS NOT NULL
    `;
    expect(migration).toHaveLength(1);
    await expect(
      prisma.commercialSimulationScenarioFamily.count({
        where: { createdAt: { lte: migration[0].finishedAt } },
      }),
    ).resolves.toBe(0);
  });
});
