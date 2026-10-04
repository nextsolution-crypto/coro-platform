import { BadRequestException } from '@nestjs/common';
import { ProposalPricingEngine } from '../commercial-proposals/proposal-pricing-engine';
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

  it('projects only the workspace catalog with decimal money strings and no internal cost', async () => {
    const prisma = {
      $transaction: jest.fn((calls: Promise<unknown>[]) => Promise.all(calls)),
      commercialCostAssumptionVersion: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      commercialValuationAssumptionVersion: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      commercialSimulationWorkspace: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            currency: 'CAD',
            priceBookVersion: {
              id: 'version-a',
              status: 'ACTIVE',
              components: [
                {
                  id: 'component-a',
                  code: 'DOCUMENT_COMPLIANCE_SUBSCRIPTION',
                  nameFr: 'Conformité',
                  nameEn: 'Compliance',
                  descriptionFr: null,
                  capability: { code: 'COMPLIANCE_OPERATIONS' },
                  revenueCategory: 'SAAS',
                  chargeType: 'RECURRING',
                  billingPeriod: 'YEAR',
                  pricingModel: 'FLAT',
                  metric: 'FIXED',
                  amountMinor: 12345n,
                  displayOrder: 1,
                  tiers: [],
                },
              ],
            },
          }),
        ),
      },
    };
    const result = await serviceWith(prisma).guidedCatalog('workspace-a');
    expect(result.components[0]).toMatchObject({
      catalogAmountCad: '123.45',
      capabilityCode: 'COMPLIANCE_OPERATIONS',
      revenueCategory: 'SAAS',
    });
    expect(JSON.stringify(result)).not.toMatch(/moneyMinorValue|roleCost/i);
    expect(
      prisma.commercialSimulationWorkspace.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'workspace-a' } }),
    );
  });

  it('offers only structurally compatible published cost authorities', async () => {
    const base = {
      versionNumber: 1,
      methodologyCode: 'direct-cost',
      publishedAt: new Date(),
      set: { name: 'Direct cost', code: 'DIRECT_COST' },
    };
    const prisma = {
      $transaction: jest.fn((calls: Promise<unknown>[]) => Promise.all(calls)),
      commercialCostAssumptionVersion: {
        findMany: jest.fn(() =>
          Promise.resolve([
            {
              ...base,
              id: 'compatible-v2',
              methodologyVersion: 'v2',
              values: [
                {
                  assumptionCode: 'LOADED_DIRECT_DELIVERY_COST',
                  assumptionVersion: 'v1',
                  scopeKey: 'ROLE:DELIVERY_PROFESSIONAL',
                  valueType: 'MONEY',
                  currency: 'CAD',
                },
              ],
            },
            {
              ...base,
              id: 'legacy-incompatible-v1',
              methodologyVersion: 'v1',
              values: [
                {
                  assumptionCode: 'LOADED_DIRECT_DELIVERY_COST',
                  assumptionVersion: 'v1',
                  scopeKey: 'ROLE:DELIVERY_PROFESSIONAL',
                  valueType: 'MONEY',
                  currency: 'CAD',
                },
              ],
            },
          ]),
        ),
      },
      commercialValuationAssumptionVersion: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      commercialSimulationWorkspace: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            currency: 'CAD',
            priceBookVersion: {
              id: 'version-a',
              status: 'ACTIVE',
              components: [
                {
                  id: 'component-a',
                  code: 'DOCUMENT_COMPLIANCE_DELIVERY_HOUR',
                  nameFr: 'Livraison',
                  nameEn: 'Delivery',
                  descriptionFr: null,
                  capability: { code: 'COMPLIANCE_OPERATIONS' },
                  revenueCategory: 'PROFESSIONAL_SERVICE',
                  chargeType: 'ONE_TIME',
                  billingPeriod: null,
                  pricingModel: 'PER_UNIT',
                  metric: 'HOUR',
                  amountMinor: 10000n,
                  displayOrder: 1,
                  tiers: [],
                },
              ],
            },
          }),
        ),
      },
    };
    const result = await serviceWith(prisma).guidedCatalog('workspace-a');
    expect(result.assumptions.cost.map((item) => item.id)).toEqual([
      'compatible-v2',
    ]);
    expect(result.assumptions.costCompatibilityWarnings).toEqual([
      expect.objectContaining({ id: 'legacy-incompatible-v1' }),
    ]);
    const compliance = result.readiness.find(
      (item) => item.familyCode === 'COMPLIANCE',
    );
    expect(compliance?.price.status).toBe('READY');
    expect(compliance?.cost.status).toBe('READY');
    expect(compliance?.warnings.join(' ')).toMatch(/incompatible/i);
  });

  it('rejects a future commercial family before persisting a guided scenario', async () => {
    const prisma = {
      commercialSimulationWorkspace: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            currency: 'CAD',
            priceBookVersionId: 'version-a',
            scenarios: [{ lines: [] }],
          }),
        ),
      },
    };
    await expect(
      serviceWith(prisma).configureGuidedScenario(
        'workspace-a',
        'scenario-a',
        {
          lockVersion: 0,
          familyCodes: ['NETWORK'],
          catalogLines: [],
          customLines: [],
          driverValues: [],
        },
        { userId: 'super-admin' },
      ),
    ).rejects.toEqual(
      new BadRequestException('COMMERCIAL_FAMILY_NOT_SELECTABLE'),
    );
  });

  it('rejects a catalog component outside the workspace PriceBookVersion', async () => {
    const prisma = {
      commercialSimulationWorkspace: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            currency: 'CAD',
            priceBookVersionId: 'version-a',
            scenarios: [{ lines: [] }],
          }),
        ),
      },
      commercialCapability: {
        findMany: jest.fn(() =>
          Promise.resolve([
            { id: 'capability-a', code: 'COMPLIANCE_OPERATIONS' },
          ]),
        ),
      },
      priceComponent: { findMany: jest.fn(() => Promise.resolve([])) },
    };
    await expect(
      serviceWith(prisma).configureGuidedScenario(
        'workspace-a',
        'scenario-a',
        {
          lockVersion: 0,
          familyCodes: ['COMPLIANCE'],
          catalogLines: [{ priceComponentId: 'foreign-component' }],
          customLines: [],
          driverValues: [],
        },
        { userId: 'super-admin' },
      ),
    ).rejects.toEqual(new BadRequestException('CATALOG_COMPONENT_INVALID'));
    expect(prisma.priceComponent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['foreign-component'] },
          priceBookVersionId: 'version-a',
        },
      }),
    );
  });

  it('refuses to archive the selected scenario without deleting evidence', async () => {
    const tx = {
      commercialSimulationWorkspace: {
        findUnique: jest.fn(() =>
          Promise.resolve({ selectedScenarioId: 'scenario-a' }),
        ),
      },
      commercialSimulationScenario: { updateMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    await expect(
      serviceWith(prisma).archiveScenario(
        'workspace-a',
        'scenario-a',
        { lockVersion: 0 },
        { userId: 'super-admin' },
      ),
    ).rejects.toThrow('SELECTED_SCENARIO_CANNOT_BE_ARCHIVED');
    expect(tx.commercialSimulationScenario.updateMany).not.toHaveBeenCalled();
  });

  it('requires structured custom-line semantics and a non-blank justification', async () => {
    const prisma = {
      commercialSimulationWorkspace: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            currency: 'CAD',
            priceBookVersionId: 'version-a',
            scenarios: [{ lines: [] }],
          }),
        ),
      },
      commercialCapability: {
        findMany: jest.fn(() =>
          Promise.resolve([
            { id: 'capability-a', code: 'COMPLIANCE_OPERATIONS' },
          ]),
        ),
      },
    };
    await expect(
      serviceWith(prisma).configureGuidedScenario(
        'workspace-a',
        'scenario-a',
        {
          lockVersion: 0,
          familyCodes: ['COMPLIANCE'],
          catalogLines: [],
          customLines: [
            {
              name: 'Specialized integration support',
              source: 'CUSTOM_COMPONENT',
              pricingModel: 'FLAT',
              chargeType: 'ONE_TIME',
              revenueCategory: 'OTHER_ONE_TIME',
              unitAmountCad: '1200.00',
              justification: '   ',
            },
          ],
          driverValues: [],
        },
        { userId: 'super-admin' },
      ),
    ).rejects.toEqual(
      new BadRequestException('CUSTOM_LINE_JUSTIFICATION_REQUIRED'),
    );
  });

  it('does not reuse a stale run when capability-dependent value applicability changes', async () => {
    const runs = new Map<string, Record<string, unknown>>();
    const scenario = {
      id: 'scenario-a',
      lockVersion: 1,
      workspace: {
        id: 'workspace-a',
        lockVersion: 1,
        priceBookVersionId: 'price-book-version-a',
        currency: 'CAD',
        priceBookVersion: { components: [] },
      },
      lines: [
        {
          id: 'line-a',
          source: 'CUSTOM_COMPONENT',
          componentCode: 'CUSTOM-A',
          componentNameFr: 'Service personnalisé',
          componentNameEn: null,
          capability: null,
          priceComponentId: null,
          pricingModel: 'FLAT',
          chargeType: 'ONE_TIME',
          revenueCategory: 'OTHER_ONE_TIME',
          billingPeriod: null,
          metric: 'FIXED',
          tierMode: null,
          quantity: null,
          quantityUnit: null,
          proposedUnitAmountMinor: 100n,
          internalUse: false,
          distributable: false,
          distributionLimit: null,
          distributionMetric: null,
          commercialQuantityBasis: null,
          commercialRuleCode: null,
          commercialRuleVersion: null,
          justification: 'Test fixture',
          displayOrder: 0,
          costEfforts: [],
        },
      ],
      capabilities: [] as Array<{ capability: { code: string } }>,
      driverValues: [],
    };
    const findRun = jest.fn(
      ({
        where,
      }: {
        where: { scenarioId_calculationKey: { calculationKey: string } };
      }) =>
        Promise.resolve(
          runs.get(where.scenarioId_calculationKey.calculationKey) ?? null,
        ),
    );
    const tx = {
      $executeRaw: jest.fn(() => Promise.resolve(0)),
      commercialSimulationCalculationRun: {
        findUnique: findRun,
        aggregate: jest.fn(() => Promise.resolve({ _max: { sequence: null } })),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          const run = {
            id: `run-${runs.size + 1}`,
            calculationKey: data.calculationKey,
            fingerprintVersion: data.fingerprintVersion,
            scenarioLockVersion: data.scenarioLockVersion,
            valueStatus: data.valueStatus,
            priceResult: {},
            lines: [],
            inputs: [],
          };
          runs.set(String(data.calculationKey), run);
          return Promise.resolve(run);
        }),
      },
    };
    const prisma = {
      commercialSimulationScenario: {
        findFirst: jest.fn(() => Promise.resolve(scenario)),
      },
      commercialSimulationCalculationRun: { findUnique: findRun },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new CommercialSimulatorService(
      prisma as never,
      new ProposalPricingEngine(),
      {} as never,
    );

    const first = (await service.calculate(
      'workspace-a',
      'scenario-a',
      {},
      { userId: 'super-admin' },
    )) as unknown as Record<string, unknown>;
    expect(first.valueStatus).toBe('NOT_APPLICABLE');

    scenario.capabilities = [{ capability: { code: 'COMPLIANCE_OPERATIONS' } }];
    scenario.lockVersion = 2;
    const second = (await service.calculate(
      'workspace-a',
      'scenario-a',
      {},
      { userId: 'super-admin' },
    )) as unknown as Record<string, unknown>;

    expect(first.scenarioLockVersion).toBe(1);
    expect(first.scenarioLockVersion).not.toBe(scenario.lockVersion);
    expect(second.id).not.toBe(first.id);
    expect(second.calculationKey).not.toBe(first.calculationKey);
    expect(second.scenarioLockVersion).toBe(2);
    expect(second.valueStatus).toBe('UNAVAILABLE');
    expect(runs).toHaveProperty('size', 2);
  });
});
