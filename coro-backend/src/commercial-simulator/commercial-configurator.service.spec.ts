import { BadRequestException } from '@nestjs/common';
import { CommercialSimulatorService } from './commercial-simulator.service';

const serviceWith = (prisma: Record<string, unknown>) =>
  new CommercialSimulatorService(prisma as never, {} as never, {} as never);

describe('Commercial Configurator projections', () => {
  it('returns deterministic metadata and readiness without assumption values', async () => {
    const prisma = {
      $transaction: jest.fn((calls: Promise<number>[]) => Promise.all(calls)),
      priceBookVersion: {
        count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0),
      },
      commercialCostAssumptionVersion: {
        count: jest.fn(() => Promise.resolve(0)),
      },
      commercialValuationAssumptionVersion: {
        count: jest.fn(() => Promise.resolve(1)),
      },
    };
    const result = await serviceWith(prisma).configuratorBootstrap();
    expect(result.families.map((item) => item.code)).toHaveLength(8);
    expect(result.drivers).toHaveLength(18);
    expect(result.readiness).toEqual({
      catalog: 'READY',
      semanticClassification: 'COMPLETE',
      cost: 'NOT_CONFIGURED',
      value: 'AVAILABLE',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /moneyMinorValue|margin|roleCost/i,
    );
  });

  it('projects converted prospects as visible but not selectable', async () => {
    const rows = [
      {
        id: 'p',
        reference: 'PROS-1',
        legalName: 'Acme Inc.',
        displayName: 'Acme',
        status: 'CONVERTED',
        convertedOrganizationId: 'o',
        preferredLanguage: 'FR',
      },
    ];
    const prisma = {
      $transaction: jest.fn(() => Promise.resolve([1, rows])),
      commercialProspect: { count: jest.fn(), findMany: jest.fn() },
    };
    const result = await serviceWith(prisma).configuratorProspects({
      page: 1,
      pageSize: 10,
    });
    expect(result.items[0]).toMatchObject({
      status: 'CONVERTED',
      selectable: false,
      convertedOrganizationId: 'o',
    });
    expect(result.items[0]).not.toHaveProperty('contactEmail');
  });

  it('includes legacy organizations without a relationship and redacts unrelated fields', async () => {
    const rows = [
      {
        id: 'o',
        name: 'Legacy customer',
        isActive: true,
        commercialRelationship: null,
        sector: 'INDUSTRIAL',
      },
    ];
    const findMany = jest.fn((query: unknown) => {
      void query;
      return Promise.resolve(rows);
    });
    const prisma = {
      $transaction: jest.fn(() => Promise.resolve([1, rows])),
      organization: {
        count: jest.fn(),
        findMany,
      },
    };
    const result = await serviceWith(prisma).configuratorOrganizations({
      page: 1,
      pageSize: 10,
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    const request = findMany.mock.calls[0][0] as {
      where: { isInternal: boolean; OR: unknown[] };
    };
    expect(request.where).toMatchObject({
      isInternal: false,
      OR: [
        { commercialRelationship: null },
        { commercialRelationship: { not: 'INTERNAL' } },
      ],
    });
    expect(result.items[0]).toMatchObject({
      displayName: 'Legacy customer',
      selectable: true,
      commercialRelationship: null,
    });
    expect(result.items[0]).not.toHaveProperty('licenseType');
  });

  it('resolves only current ACTIVE catalogs and reports ambiguity', async () => {
    const version = {
      id: 'v1',
      priceBookId: 'b1',
      versionNumber: 2,
      status: 'ACTIVE',
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
      effectiveUntil: null,
      priceBook: { name: 'Direct Canada' },
      components: [{ revenueCategory: 'SAAS' }],
    };
    const prisma = {
      organization: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            isActive: true,
            isInternal: false,
            commercialRelationship: 'DIRECT',
          }),
        ),
      },
      $transaction: jest.fn(() =>
        Promise.resolve([
          [version, { ...version, id: 'v2', priceBookId: 'b2' }],
          1,
        ]),
      ),
      priceBookVersion: { findMany: jest.fn(), count: jest.fn() },
    };
    const result = await serviceWith(prisma).configuratorPriceBooks({
      targetType: 'ORGANIZATION',
      targetId: 'target',
      currency: 'CAD',
    });
    expect(result).toMatchObject({
      readiness: 'READY',
      requiresSelection: true,
    });
    expect(result.candidates.every((item) => item.status === 'ACTIVE')).toBe(
      true,
    );
    expect(result.warnings).toContain(
      'SCHEDULED_PRICEBOOK_EFFECTIVE_DATE_PASSED',
    );
  });

  it('requires explicit audience for an active prospect', async () => {
    const prisma = {
      commercialProspect: {
        findUnique: jest.fn(() => Promise.resolve({ status: 'ACTIVE' })),
      },
    };
    await expect(
      serviceWith(prisma).configuratorPriceBooks({
        targetType: 'PROSPECT',
        targetId: 'target',
        currency: 'CAD',
      }),
    ).rejects.toEqual(
      new BadRequestException('CONFIGURATOR_AUDIENCE_REQUIRED'),
    );
  });
});
