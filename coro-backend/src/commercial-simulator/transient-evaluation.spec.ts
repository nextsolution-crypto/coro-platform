import { Prisma } from '@prisma/client';
import { ProposalPricingEngine } from '../commercial-proposals/proposal-pricing-engine';
import { CommercialSimulatorService } from './commercial-simulator.service';

const ids = {
  scenario: '00000000-0000-4000-8000-000000000001',
  workspace: '00000000-0000-4000-8000-000000000002',
  capability: '00000000-0000-4000-8000-000000000003',
  annual: '00000000-0000-4000-8000-000000000004',
  standard: '00000000-0000-4000-8000-000000000005',
  advanced: '00000000-0000-4000-8000-000000000006',
  delivery: '00000000-0000-4000-8000-000000000007',
  senior: '00000000-0000-4000-8000-000000000008',
  cost: '00000000-0000-4000-8000-000000000009',
};

const component = (
  id: string,
  code: string,
  input: Partial<Record<string, unknown>>,
) => ({
  id,
  priceBookVersionId: 'version-1',
  capabilityId: ids.capability,
  code,
  nameFr: code,
  nameEn: code,
  descriptionFr: null,
  descriptionEn: null,
  pricingModel: 'FLAT',
  chargeType: 'ONE_TIME',
  revenueCategory: 'IMPLEMENTATION',
  billingPeriod: null,
  metric: 'FIXED',
  amountMinor: null,
  tierMode: null,
  displayOrder: 0,
  internalUse: null,
  distributable: null,
  distributionLimit: null,
  distributionMetric: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tiers: [],
  ...input,
});

const components = [
  component(ids.annual, 'CORO_PROFESSIONAL_ANNUAL', {
    pricingModel: 'CAPACITY_BAND',
    chargeType: 'RECURRING',
    revenueCategory: 'SAAS',
    billingPeriod: 'YEAR',
    metric: 'SITE',
    tiers: [
      ['1', '101', 1250000n],
      ['101', '126', 1750000n],
      ['126', '151', 1900000n],
      ['151', '201', 2100000n],
    ].map(([minimumQuantity, maximumQuantity, amountMinor], index) => ({
      id: `tier-${index}`,
      priceComponentId: ids.annual,
      minimumQuantity: new Prisma.Decimal(String(minimumQuantity)),
      maximumQuantity: new Prisma.Decimal(String(maximumQuantity)),
      amountMinor,
      displayOrder: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  }),
  component(ids.standard, 'CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD', {
    amountMinor: 250000n,
  }),
  component(ids.advanced, 'CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED', {
    amountMinor: 500000n,
  }),
  component(ids.delivery, 'DOCUMENT_COMPLIANCE_DELIVERY_HOUR', {
    pricingModel: 'PER_UNIT',
    revenueCategory: 'PROFESSIONAL_SERVICE',
    metric: 'HOUR',
    amountMinor: 17500n,
  }),
  component(ids.senior, 'DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR', {
    pricingModel: 'PER_UNIT',
    revenueCategory: 'PROFESSIONAL_SERVICE',
    metric: 'HOUR',
    amountMinor: 22500n,
  }),
];

const baseScenario = {
  id: ids.scenario,
  workspaceId: ids.workspace,
  name: 'Saved base',
  description: null,
  status: 'ACTIVE',
  displayOrder: 0,
  lockVersion: 0,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  workspace: {
    id: ids.workspace,
    priceBookVersionId: 'version-1',
    currency: 'CAD',
    lockVersion: 0,
    priceBookVersion: { components },
  },
  lines: [],
  families: [],
  capabilities: [],
  driverValues: [],
};

const costVersion = {
  id: ids.cost,
  currency: 'CAD',
  methodologyCode: 'direct-cost',
  methodologyVersion: 'v2',
  values: [
    [
      'LOADED_DIRECT_DELIVERY_COST',
      'ROLE:DELIVERY_PROFESSIONAL',
      'MONEY',
      null,
      5000n,
    ],
    [
      'LOADED_DIRECT_DELIVERY_COST',
      'ROLE:SENIOR_REVIEWER',
      'MONEY',
      null,
      7000n,
    ],
    [
      'STANDARD_DELIVERY_EFFORT',
      'COMPONENT:CORO_PROFESSIONAL_IMPLEMENTATION_STANDARD',
      'DECIMAL',
      '16',
      null,
    ],
    [
      'STANDARD_DELIVERY_EFFORT',
      'COMPONENT:CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED',
      'DECIMAL',
      '24',
      null,
    ],
    [
      'STANDARD_SENIOR_REVIEW_EFFORT',
      'COMPONENT:CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED',
      'DECIMAL',
      '4',
      null,
    ],
  ].map(
    ([assumptionCode, scopeKey, valueType, decimalValue, moneyMinorValue]) => ({
      assumptionCode,
      assumptionVersion: 'v1',
      scopeKey,
      valueType,
      decimalValue: decimalValue
        ? new Prisma.Decimal(String(decimalValue))
        : null,
      moneyMinorValue,
      currency: valueType === 'MONEY' ? 'CAD' : null,
    }),
  ),
};

describe('Commercial Simulator transient evaluation', () => {
  const writes = {
    scenario: jest.fn(),
    run: jest.fn(),
    audit: jest.fn(),
  };
  const prisma = {
    commercialSimulationScenario: {
      findFirst: jest.fn(() => Promise.resolve(baseScenario)),
      update: writes.scenario,
    },
    commercialCapability: {
      findMany: jest.fn(() =>
        Promise.resolve([
          {
            id: ids.capability,
            code: 'COMPLIANCE_OPERATIONS',
            isAvailable: true,
            lifecycle: 'CURRENT',
          },
        ]),
      ),
    },
    commercialCostAssumptionVersion: {
      findMany: jest.fn(() => Promise.resolve([costVersion])),
    },
    commercialValuationAssumptionVersion: {
      findMany: jest.fn(() => Promise.resolve([])),
    },
    commercialSimulationCalculationRun: { create: writes.run },
  };
  const service = new CommercialSimulatorService(
    prisma as never,
    new ProposalPricingEngine(),
    { record: writes.audit } as never,
  );

  const draft = (
    sites: string,
    implementation: 'STANDARD' | 'ADVANCED' = 'ADVANCED',
    delivery = '10',
  ) => ({
    scenarioId: ids.scenario,
    familyCodes: ['PROFESSIONAL'],
    catalogLines: [
      { priceComponentId: ids.annual, quantity: sites },
      {
        priceComponentId:
          implementation === 'ADVANCED' ? ids.advanced : ids.standard,
        quantity: '1',
      },
      { priceComponentId: ids.delivery, quantity: delivery },
      { priceComponentId: ids.senior, quantity: '3' },
    ],
    customLines: [],
    driverValues: [{ driverCode: 'ACTIVE_SITES', value: sites }],
  });

  it.each([
    ['125', 'ADVANCED', '10', '2492500', '219000'],
    ['150', 'ADVANCED', '10', '2642500', '219000'],
    ['125', 'STANDARD', '10', '2242500', '151000'],
    ['125', 'ADVANCED', '15', '2580000', '244000'],
  ] as const)(
    'evaluates %s/%s/%s from governed authorities',
    async (sites, implementation, delivery, firstYear, knownCost) => {
      const result = (await service.evaluateGuidedDraft(
        ids.workspace,
        draft(sites, implementation, delivery),
      )) as {
        totals: { firstYearCommitmentMinor: string };
        cost: { knownDirectCostMinor: string };
      };
      expect(result.totals.firstYearCommitmentMinor).toBe(firstYear);
      expect(result.cost.knownDirectCostMinor).toBe(knownCost);
    },
  );

  it('fails closed above the last standard band and performs zero writes over 20 evaluations', async () => {
    const custom = await service.evaluateGuidedDraft(
      ids.workspace,
      draft('201'),
    );
    expect(custom).toMatchObject({
      persisted: false,
      status: 'CUSTOM_PRICING_REQUIRED',
      code: 'ENTERPRISE_CUSTOM_PRICING_REQUIRED',
    });
    for (let index = 0; index < 20; index += 1)
      await service.evaluateGuidedDraft(ids.workspace, draft('125'));
    expect(writes.scenario).not.toHaveBeenCalled();
    expect(writes.run).not.toHaveBeenCalled();
    expect(writes.audit).not.toHaveBeenCalled();
  });

  it.each([
    ['100', '1250000'],
    ['101', '1750000'],
    ['125', '1750000'],
    ['126', '1900000'],
    ['150', '1900000'],
    ['151', '2100000'],
    ['200', '2100000'],
  ])(
    'uses official inclusive-lower/exclusive-upper capacity boundaries at %s',
    async (sites, annualMinor) => {
      const result = (await service.evaluateGuidedDraft(
        ids.workspace,
        draft(sites),
      )) as unknown as {
        lines: Array<{
          componentCode: string;
          offeredExtendedAmountMinor: string;
        }>;
      };
      expect(
        result.lines.find(
          (line) => line.componentCode === 'CORO_PROFESSIONAL_ANNUAL',
        )?.offeredExtendedAmountMinor,
      ).toBe(annualMinor);
    },
  );

  it('does not expose client fields for authoritative prices, methods or rates', () => {
    const serializedDto = JSON.stringify(draft('125'));
    expect(serializedDto).not.toMatch(
      /amountMinor|tier|costRate|standardEffort|pricingMethodology|costMethodology/i,
    );
  });
});
