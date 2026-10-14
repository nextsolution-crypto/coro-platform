import {
  calculationRunResponse,
  configuredScenarioResponse,
  proposalConversionResponse,
} from './commercial-simulator-response';

const source = (amount: bigint) =>
  ({
    id: 'run-1',
    inputs: [
      {
        integerValue: amount,
        moneyMinorValue: amount,
      },
    ],
    lines: [
      {
        catalogUnitAmountMinor: amount,
        proposedUnitAmountMinor: amount,
        catalogExtendedAmountMinor: amount,
        proposedExtendedAmountMinor: amount,
        estimatedCostMinor: amount,
      },
    ],
    priceResult: {
      oneTimeTotalMinor: amount,
      recurringMonthlyCadenceMinor: amount,
      recurringAnnualCadenceMinor: amount,
      monthlyRecurringEquivalentMinor: amount,
      annualRecurringEquivalentMinor: amount,
      estimatedUsageTotalMinor: amount,
      firstYearCommitmentMinor: amount,
    },
  }) as never;

const containsBigInt = (value: unknown): boolean => {
  if (typeof value === 'bigint') return true;
  if (Array.isArray(value)) return value.some(containsBigInt);
  if (value && typeof value === 'object')
    return Object.values(value).some(containsBigInt);
  return false;
};

describe('configuredScenarioResponse', () => {
  it('projects exact and nullable Scenario BigInts without mutating the Prisma graph', () => {
    const beyondSafeInteger = 9_007_199_254_740_993n;
    const prismaGraph = {
      id: 'scenario-1',
      lockVersion: 2,
      families: [],
      capabilities: [],
      lines: [
        {
          id: 'line-1',
          proposedUnitAmountMinor: beyondSafeInteger,
          costEfforts: [],
        },
        {
          id: 'line-2',
          proposedUnitAmountMinor: null,
          costEfforts: [],
        },
      ],
      driverValues: [
        {
          id: 'driver-1',
          integerValue: beyondSafeInteger,
          moneyMinorValue: null,
        },
        {
          id: 'driver-2',
          integerValue: null,
          moneyMinorValue: beyondSafeInteger,
        },
      ],
    } as never;

    const result = configuredScenarioResponse(prismaGraph);

    expect(containsBigInt(result)).toBe(false);
    expect(result.lockVersion).toBe(2);
    expect(result.lines[0].proposedUnitAmountMinor).toBe('9007199254740993');
    expect(result.lines[1].proposedUnitAmountMinor).toBeNull();
    expect(result.driverValues[0].integerValue).toBe('9007199254740993');
    expect(result.driverValues[0].moneyMinorValue).toBeNull();
    expect(result.driverValues[1].moneyMinorValue).toBe('9007199254740993');
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(
      (prismaGraph as { driverValues: Array<{ integerValue: bigint }> })
        .driverValues[0].integerValue,
    ).toBe(beyondSafeInteger);
  });
});

describe('calculationRunResponse', () => {
  it('projects every calculation response BigInt to an exact decimal string', () => {
    const beyondSafeInteger = 9_007_199_254_740_993n;
    const result = calculationRunResponse(source(beyondSafeInteger));

    expect(containsBigInt(result)).toBe(false);
    expect(result.priceResult?.firstYearCommitmentMinor).toBe(
      '9007199254740993',
    );
    expect(result.lines[0].proposedExtendedAmountMinor).toBe(
      '9007199254740993',
    );
    expect(result.inputs[0].moneyMinorValue).toBe('9007199254740993');
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

describe('proposalConversionResponse', () => {
  it('projects every reachable Proposal snapshot BigInt exactly', () => {
    const beyondSafeInteger = 9_007_199_254_740_993n;
    const result = proposalConversionResponse({
      id: 'conversion-1',
      proposal: { id: 'proposal-1' },
      proposalRevision: {
        id: 'revision-1',
        oneTimeTotalMinor: beyondSafeInteger,
        recurringMonthlyCadenceMinor: beyondSafeInteger,
        recurringAnnualCadenceMinor: beyondSafeInteger,
        monthlyRecurringEquivalentMinor: beyondSafeInteger,
        annualRecurringEquivalentMinor: beyondSafeInteger,
        estimatedUsageTotalMinor: beyondSafeInteger,
        firstYearCommitmentMinor: beyondSafeInteger,
      },
    } as never);

    expect(containsBigInt(result)).toBe(false);
    expect(result.proposalRevision.annualRecurringEquivalentMinor).toBe(
      '9007199254740993',
    );
    expect(result.proposalRevision.firstYearCommitmentMinor).toBe(
      '9007199254740993',
    );
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
