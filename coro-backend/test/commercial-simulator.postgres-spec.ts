import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'TEST_DATABASE_URL jetable est obligatoire pour commercial-simulator.postgres-spec',
  );

describe('Commercial Simulator V1 PostgreSQL invariants', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const suffix = randomUUID();
  let organizationId = '';
  let prospectId = '';
  let priceBookVersionId = '';
  let workspaceId = '';
  let scenarioId = '';
  let runId = '';

  beforeAll(async () => {
    await prisma.$connect();
    organizationId = `sim-org-${suffix}`;
    await prisma.organization.create({
      data: { id: organizationId, name: 'Simulator PostgreSQL fixture' },
    });
    prospectId = (
      await prisma.commercialProspect.create({
        data: {
          reference: `PROS-${suffix}`,
          legalName: 'Simulator Prospect',
          displayName: 'Simulator Prospect',
          country: 'CA',
        },
      })
    ).id;
    const book = await prisma.priceBook.create({
      data: {
        code: `SIM_${suffix.replace(/-/g, '').slice(0, 16).toUpperCase()}`,
        name: 'Simulator fixture',
        audience: 'DIRECT',
        currency: 'CAD',
      },
    });
    priceBookVersionId = (
      await prisma.priceBookVersion.create({
        data: {
          priceBookId: book.id,
          versionNumber: 1,
          effectiveFrom: new Date('2026-01-01'),
        },
      })
    ).id;
    const workspace = await prisma.commercialSimulationWorkspace.create({
      data: {
        reference: `SIM-${suffix}`,
        title: 'PostgreSQL fixture',
        organizationId,
        priceBookVersionId,
        currency: 'CAD',
      },
    });
    workspaceId = workspace.id;
    scenarioId = (
      await prisma.commercialSimulationScenario.create({
        data: { workspaceId, name: 'Baseline' },
      })
    ).id;
    runId = (
      await prisma.commercialSimulationCalculationRun.create({
        data: {
          scenarioId,
          workspaceId,
          priceBookVersionId,
          sequence: 1,
          calculationKey: 'a'.repeat(64),
          fingerprintVersion: 'simulator-input/v1',
          inputFingerprint: 'a'.repeat(64),
          workspaceLockVersion: 0,
          scenarioLockVersion: 0,
          currency: 'CAD',
          pricingMethodologyCode: 'proposal-pricing',
          pricingMethodologyVersion: 'v1',
          priceStatus: 'COMPLETE',
          costStatus: 'UNAVAILABLE',
          valueStatus: 'NOT_APPLICABLE',
        },
      })
    ).id;
  });

  afterAll(() => prisma.$disconnect());

  it('creates no Simulator business rows in the migration', async () => {
    const migration = await prisma.$queryRaw<Array<{ finishedAt: Date }>>`
      SELECT "finished_at" AS "finishedAt" FROM "_prisma_migrations"
      WHERE "migration_name" = '20261004010000_super_admin_v2_commercial_simulator_v1_foundation'
        AND "finished_at" IS NOT NULL
    `;
    expect(migration).toHaveLength(1);
    await expect(
      prisma.commercialSimulationWorkspace.count({
        where: { createdAt: { lte: migration[0].finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.commercialCostAssumptionSet.count({
        where: { createdAt: { lte: migration[0].finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.commercialValuationAssumptionSet.count({
        where: { createdAt: { lte: migration[0].finishedAt } },
      }),
    ).resolves.toBe(0);
  });

  it('adds first-wave structure without seeding pricing, cost, or effort data', async () => {
    const migration = await prisma.$queryRaw<Array<{ finishedAt: Date }>>`
      SELECT "finished_at" AS "finishedAt" FROM "_prisma_migrations"
      WHERE "migration_name" = '20261005010000_commercial_simulator_first_wave_structure'
        AND "finished_at" IS NOT NULL
    `;
    expect(migration).toHaveLength(1);
    await expect(
      prisma.commercialSimulationScenarioLineCostEffort.count({
        where: { createdAt: { lte: migration[0].finishedAt } },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.commercialSimulationRunLineCostEffort.count({
        where: { createdAt: { lte: migration[0].finishedAt } },
      }),
    ).resolves.toBe(0);
  });

  it('enforces approved roles, positive hours, and immutable run snapshots', async () => {
    const scenarioLine = await prisma.commercialSimulationScenarioLine.create({
      data: {
        scenarioId,
        source: 'CUSTOM_COMPONENT',
        componentCode: `HOURS_${suffix}`,
        componentNameFr: 'Heures de livraison',
        pricingModel: 'PER_UNIT',
        chargeType: 'ONE_TIME',
        revenueCategory: 'PROFESSIONAL_SERVICE',
        metric: 'HOUR',
        quantity: '1.5',
        quantityUnit: 'HOUR',
        commercialQuantityBasis: 'DECLARED',
      },
    });
    await expect(
      prisma.commercialSimulationScenarioLineCostEffort.create({
        data: {
          scenarioLineId: scenarioLine.id,
          roleCode: 'UNAPPROVED_ROLE',
          hours: '1',
          source: 'USER_INPUT',
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialSimulationScenarioLineCostEffort.create({
        data: {
          scenarioLineId: scenarioLine.id,
          roleCode: 'DELIVERY_PROFESSIONAL',
          hours: '0',
          source: 'USER_INPUT',
        },
      }),
    ).rejects.toThrow();

    const runLine = await prisma.commercialSimulationRunLine.create({
      data: {
        runId,
        componentCode: `HOURS_${suffix}`,
        componentNameFr: 'Heures de livraison',
        pricingModel: 'PER_UNIT',
        chargeType: 'ONE_TIME',
        revenueCategory: 'PROFESSIONAL_SERVICE',
        metric: 'HOUR',
        quantity: '1.5',
        quantityUnit: 'HOUR',
        proposedUnitAmountMinor: 1n,
        proposedExtendedAmountMinor: 2n,
        calculationStatus: 'CALCULATED',
        calculationExplanationFr: 'fixture',
        internalUse: false,
        distributable: false,
        commercialQuantityBasis: 'DECLARED',
        displayOrder: 0,
      },
    });
    const snapshot = await prisma.commercialSimulationRunLineCostEffort.create({
      data: {
        runLineId: runLine.id,
        roleCode: 'DELIVERY_PROFESSIONAL',
        hours: '1.5',
        roleCostMinor: 100n,
        calculatedCostMinor: 150n,
        assumptionCode: 'LOADED_DIRECT_DELIVERY_COST',
        assumptionVersion: 'v1',
        scopeKey: 'ROLE:DELIVERY_PROFESSIONAL',
      },
    });
    await expect(
      prisma.commercialSimulationRunLine.update({
        where: { id: runLine.id },
        data: { revenueCategory: 'OTHER_ONE_TIME' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialSimulationRunLineCostEffort.update({
        where: { id: snapshot.id },
        data: { hours: '2' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialSimulationRunLineCostEffort.delete({
        where: { id: snapshot.id },
      }),
    ).rejects.toThrow();
  });

  it('enforces organization XOR prospect targets', async () => {
    await expect(
      prisma.commercialSimulationWorkspace.create({
        data: {
          reference: `BAD-${suffix}`,
          title: 'Invalid',
          organizationId,
          prospectId,
          priceBookVersionId,
          currency: 'CAD',
        },
      }),
    ).rejects.toThrow();
  });

  it('enforces typed driver storage', async () => {
    await expect(
      prisma.commercialSimulationDriverValue.create({
        data: {
          scenarioId,
          driverCode: 'SITES',
          driverVersion: 'v1',
          valueType: 'INTEGER',
          source: 'USER_INPUT',
          integerValue: 1n,
          textValue: 'invalid',
        },
      }),
    ).rejects.toThrow();
  });

  it('makes runs and evidence append-only at DB level', async () => {
    const input = await prisma.commercialSimulationRunInput.create({
      data: {
        runId,
        driverCode: 'SITES',
        driverVersion: 'v1',
        scopeKey: 'GLOBAL',
        valueType: 'INTEGER',
        source: 'USER_INPUT',
        integerValue: 1n,
        labelFr: 'SITES',
      },
    });
    await expect(
      prisma.commercialSimulationCalculationRun.update({
        where: { id: runId },
        data: { warningCodes: ['MUTATED'] },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialSimulationRunInput.delete({ where: { id: input.id } }),
    ).rejects.toThrow();
  });

  it('allows draft assumption editing and protects published cost history', async () => {
    const set = await prisma.commercialCostAssumptionSet.create({
      data: { code: `COST_${suffix}`, name: 'Cost fixture' },
    });
    const version = await prisma.commercialCostAssumptionVersion.create({
      data: {
        setId: set.id,
        versionNumber: 1,
        currency: 'CAD',
        methodologyCode: 'direct-cost',
        methodologyVersion: 'v1',
        values: {
          create: {
            assumptionCode: 'LINE_UNIT_COST_MINOR',
            assumptionVersion: 'v1',
            scopeKey: 'FIXTURE',
            valueType: 'MONEY',
            moneyMinorValue: 100n,
            currency: 'CAD',
          },
        },
      },
      include: { values: true },
    });
    await expect(
      prisma.commercialCostAssumptionValue.update({
        where: { id: version.values[0].id },
        data: { moneyMinorValue: 101n },
      }),
    ).resolves.toMatchObject({ moneyMinorValue: 101n });
    await prisma.commercialCostAssumptionVersion.update({
      where: { id: version.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        contentHash: 'b'.repeat(64),
      },
    });
    await expect(
      prisma.commercialCostAssumptionValue.update({
        where: { id: version.values[0].id },
        data: { moneyMinorValue: 102n },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialCostAssumptionVersion.update({
        where: { id: version.id },
        data: { methodologyVersion: 'v2' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialCostAssumptionVersion.update({
        where: { id: version.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      }),
    ).resolves.toMatchObject({ status: 'ARCHIVED' });
  });

  it('protects published valuation history while keeping it readable', async () => {
    const set = await prisma.commercialValuationAssumptionSet.create({
      data: {
        code: `VALUE_${suffix}`,
        name: 'Valuation fixture',
        methodologyCode: 'proposal-value',
      },
    });
    const version = await prisma.commercialValuationAssumptionVersion.create({
      data: {
        setId: set.id,
        versionNumber: 1,
        methodologyVersion: 'v1',
        values: {
          create: {
            assumptionCode: 'REFERENCE_NOTE',
            assumptionVersion: 'v1',
            scopeKey: 'GLOBAL',
            valueType: 'TEXT',
            textValue: 'fixture only',
          },
        },
      },
      include: { values: true },
    });
    await prisma.commercialValuationAssumptionVersion.update({
      where: { id: version.id },
      data: {
        publishedAt: new Date(),
        contentHash: 'c'.repeat(64),
        status: 'PUBLISHED',
      },
    });
    await expect(
      prisma.commercialValuationAssumptionValue.delete({
        where: { id: version.values[0].id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.commercialValuationAssumptionVersion.findUnique({
        where: { id: version.id },
        include: { values: true },
      }),
    ).resolves.toMatchObject({ status: 'PUBLISHED' });
  });
});
