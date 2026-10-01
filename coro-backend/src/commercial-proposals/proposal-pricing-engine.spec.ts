import { ProposalPricingEngine } from './proposal-pricing-engine';

const engine = new ProposalPricingEngine();
const base = {
  currency: 'CAD' as const,
  calculationVersion: 'proposal-pricing/v1',
};
const tiers = [
  { minimumQuantity: '1', maximumQuantity: '6', amountMinor: '100' },
  { minimumQuantity: '6', maximumQuantity: '21', amountMinor: '90' },
  { minimumQuantity: '21', maximumQuantity: '51', amountMinor: '80' },
  { minimumQuantity: '51', maximumQuantity: null, amountMinor: '70' },
];

describe('ProposalPricingEngine', () => {
  it.each([
    ['2', '12500', '25000'],
    ['1.5', '12500', '18750'],
    ['0.333333', '3', '1'],
  ])(
    'calculates honest hourly PER_UNIT pricing at %s hours',
    (quantity, amountMinor, total) => {
      const result = engine.calculate({
        ...base,
        lines: [
          {
            code: 'DELIVERY_HOUR',
            pricingModel: 'PER_UNIT',
            metric: 'HOUR',
            quantityUnit: 'HOUR',
            chargeType: 'ONE_TIME',
            quantity,
            amountMinor,
          },
        ],
      });
      expect(result.lines[0].proposedExtendedAmountMinor).toBe(total);
      expect(result.lines[0].calculationFormula).toContain('HOUR');
    },
  );

  it.each(['0', '-1', '1.0000001'])(
    'rejects invalid hourly quantity %s',
    (quantity) => {
      expect(() =>
        engine.calculate({
          ...base,
          lines: [
            {
              code: 'DELIVERY_HOUR',
              pricingModel: 'PER_UNIT',
              metric: 'HOUR',
              chargeType: 'ONE_TIME',
              quantity,
              amountMinor: '10000',
            },
          ],
        }),
      ).toThrow();
    },
  );

  it.each([
    ['1', '100'],
    ['5', '500'],
    ['6', '540'],
    ['20', '1800'],
    ['21', '1680'],
    ['50', '4000'],
    ['51', '3570'],
  ])('calculates VOLUME at q=%s', (quantity, total) => {
    const r = engine.calculate({
      ...base,
      lines: [
        {
          code: 'V',
          pricingModel: 'TIERED',
          chargeType: 'RECURRING',
          billingPeriod: 'MONTH',
          quantity,
          tierMode: 'VOLUME',
          tiers,
        },
      ],
    });
    expect(r.lines[0].proposedExtendedAmountMinor).toBe(total);
  });
  it('calculates GRADUATED and snapshots each used tier', () => {
    const r = engine.calculate({
      ...base,
      lines: [
        {
          code: 'G',
          pricingModel: 'TIERED',
          chargeType: 'RECURRING',
          billingPeriod: 'MONTH',
          quantity: '51',
          tierMode: 'GRADUATED',
          tiers,
        },
      ],
    });
    expect(r.lines[0].tiersUsed.map((x) => x.quantityApplied)).toEqual([
      '5',
      '15',
      '30',
      '1',
    ]);
    expect(r.lines[0].proposedExtendedAmountMinor).toBe('4320');
  });
  it.each([
    ['1', ['1'], '100'],
    ['5', ['5'], '500'],
    ['6', ['5', '1'], '590'],
    ['20', ['5', '15'], '1850'],
    ['21', ['5', '15', '1'], '1930'],
    ['50', ['5', '15', '30'], '4250'],
    ['51', ['5', '15', '30', '1'], '4320'],
  ])(
    'uses inclusive quantities for GRADUATED at q=%s',
    (quantity, distribution, total) => {
      const r = engine.calculate({
        ...base,
        lines: [
          {
            code: 'G',
            pricingModel: 'TIERED',
            chargeType: 'RECURRING',
            billingPeriod: 'MONTH',
            quantity,
            tierMode: 'GRADUATED',
            tiers,
          },
        ],
      });
      expect(r.lines[0].tiersUsed.map((x) => x.quantityApplied)).toEqual(
        distribution,
      );
      expect(r.lines[0].proposedExtendedAmountMinor).toBe(total);
    },
  );
  it('separates one-time/month/year/estimated usage totals', () => {
    const r = engine.calculate({
      ...base,
      includeEstimatedUsageInFirstYear: true,
      lines: [
        {
          code: 'O',
          pricingModel: 'FLAT',
          chargeType: 'ONE_TIME',
          amountMinor: '1000',
        },
        {
          code: 'M',
          pricingModel: 'PER_SEAT',
          chargeType: 'RECURRING',
          billingPeriod: 'MONTH',
          quantity: '2',
          amountMinor: '100',
        },
        {
          code: 'Y',
          pricingModel: 'FLAT',
          chargeType: 'RECURRING',
          billingPeriod: 'YEAR',
          amountMinor: '1200',
        },
        {
          code: 'U',
          pricingModel: 'USAGE',
          chargeType: 'RECURRING',
          quantity: '10',
          amountMinor: '3',
          requestedStatus: 'ESTIMATED',
        },
      ],
    });
    expect(r.totals).toEqual({
      oneTimeTotalMinor: '1000',
      recurringMonthlyCadenceMinor: '200',
      recurringAnnualCadenceMinor: '1200',
      monthlyRecurringEquivalentMinor: '300',
      annualRecurringEquivalentMinor: '3600',
      estimatedUsageTotalMinor: '30',
      firstYearCommitmentMinor: '4630',
      firstYearIncludesEstimate: true,
    });
  });
  it('rejects fractional minor-unit discounts', () => {
    expect(() =>
      engine.calculate({
        ...base,
        lines: [
          {
            code: 'X',
            pricingModel: 'FLAT',
            chargeType: 'ONE_TIME',
            amountMinor: '101',
            adjustments: [
              {
                scope: 'COMPONENT',
                type: 'PERCENT_DISCOUNT',
                basisPoints: 1000,
                justification: 'test',
              },
            ],
          },
        ],
      }),
    ).toThrow('fractional minor units');
  });
  it.each([
    ['PER_SITE', 'CALCULATED', '4', '250', '1000'],
    ['USAGE', 'ESTIMATED', '4', '250', '1000'],
  ] as const)(
    'calculates %s without changing its semantic status',
    (pricingModel, requestedStatus, quantity, amountMinor, total) => {
      const r = engine.calculate({
        ...base,
        lines: [
          {
            code: pricingModel,
            pricingModel,
            chargeType: 'RECURRING',
            billingPeriod: 'MONTH',
            quantity,
            amountMinor,
            requestedStatus,
          },
        ],
      });
      expect(r.lines[0].proposedExtendedAmountMinor).toBe(total);
      expect(r.lines[0].status).toBe(requestedStatus);
    },
  );
  it.each(['USAGE', 'COMPLEXITY'] as const)(
    'keeps incomplete %s pricing explicitly TBD',
    (pricingModel) => {
      const r = engine.calculate({
        ...base,
        lines: [
          {
            code: pricingModel,
            pricingModel,
            chargeType: 'RECURRING',
            billingPeriod: 'MONTH',
            requestedStatus: 'TBD',
          },
        ],
      });
      expect(r.lines[0].status).toBe('TBD');
      expect(r.lines[0].proposedExtendedAmountMinor).toBeNull();
      expect(r.totals.firstYearCommitmentMinor).toBeNull();
    },
  );
  it('accepts justified explicit COMPLEXITY and CUSTOM amounts', () => {
    const r = engine.calculate({
      ...base,
      lines: [
        {
          code: 'COMPLEXITY',
          pricingModel: 'COMPLEXITY',
          chargeType: 'ONE_TIME',
          amountMinor: '700',
          requestedStatus: 'MANUAL',
        },
        {
          code: 'CUSTOM',
          pricingModel: 'CUSTOM',
          chargeType: 'ONE_TIME',
          amountMinor: '900',
          requestedStatus: 'MANUAL',
          justification: 'Negotiated custom scope',
        },
      ],
    });
    expect(r.lines.map((line) => line.status)).toEqual(['MANUAL', 'MANUAL']);
    expect(r.totals.oneTimeTotalMinor).toBe('1600');
  });
  it('rejects tier gaps and CUSTOM amounts without justification', () => {
    expect(() =>
      engine.calculate({
        ...base,
        lines: [
          {
            code: 'GAP',
            pricingModel: 'TIERED',
            chargeType: 'RECURRING',
            billingPeriod: 'MONTH',
            quantity: '8',
            tierMode: 'VOLUME',
            tiers: [
              {
                minimumQuantity: '1',
                maximumQuantity: '6',
                amountMinor: '100',
              },
              {
                minimumQuantity: '7',
                maximumQuantity: null,
                amountMinor: '90',
              },
            ],
          },
        ],
      }),
    ).toThrow('gap or overlap');
    expect(() =>
      engine.calculate({
        ...base,
        lines: [
          {
            code: 'CUSTOM',
            pricingModel: 'CUSTOM',
            chargeType: 'ONE_TIME',
            amountMinor: '1000',
            requestedStatus: 'MANUAL',
          },
        ],
      }),
    ).toThrow('requires justification');
  });
  it('keeps value analysis entirely outside pricing', () => {
    expect(
      JSON.stringify(engine.calculate({ ...base, lines: [] })),
    ).not.toContain('estimatedHoursSaved');
  });
});
