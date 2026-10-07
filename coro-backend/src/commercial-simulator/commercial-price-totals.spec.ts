import {
  commercialPriceTotalsMatch,
  normalizeCommercialPriceTotals,
} from './commercial-price-totals';

describe('normalizeCommercialPriceTotals', () => {
  it('maps absent persisted totals to zero while preserving nullable monthly equivalence', () => {
    expect(
      normalizeCommercialPriceTotals({
        oneTimeTotalMinor: '742500',
        recurringMonthlyCadenceMinor: null,
        recurringAnnualCadenceMinor: '1750000',
        monthlyRecurringEquivalentMinor: null,
        annualRecurringEquivalentMinor: '1750000',
        estimatedUsageTotalMinor: null,
        firstYearCommitmentMinor: '2492500',
      }),
    ).toEqual({
      oneTimeTotalMinor: '742500',
      recurringMonthlyCadenceMinor: '0',
      recurringAnnualCadenceMinor: '1750000',
      monthlyRecurringEquivalentMinor: null,
      annualRecurringEquivalentMinor: '1750000',
      estimatedUsageTotalMinor: '0',
      firstYearCommitmentMinor: '2492500',
    });
  });

  it('preserves every non-null amount and requires first-year commitment', () => {
    expect(
      normalizeCommercialPriceTotals({
        oneTimeTotalMinor: 1n,
        recurringMonthlyCadenceMinor: 2n,
        recurringAnnualCadenceMinor: 3n,
        monthlyRecurringEquivalentMinor: 4n,
        annualRecurringEquivalentMinor: 5n,
        estimatedUsageTotalMinor: 6n,
        firstYearCommitmentMinor: 7n,
      }),
    ).toEqual({
      oneTimeTotalMinor: '1',
      recurringMonthlyCadenceMinor: '2',
      recurringAnnualCadenceMinor: '3',
      monthlyRecurringEquivalentMinor: '4',
      annualRecurringEquivalentMinor: '5',
      estimatedUsageTotalMinor: '6',
      firstYearCommitmentMinor: '7',
    });
    expect(() =>
      normalizeCommercialPriceTotals({
        oneTimeTotalMinor: null,
        recurringMonthlyCadenceMinor: null,
        recurringAnnualCadenceMinor: null,
        monthlyRecurringEquivalentMinor: null,
        annualRecurringEquivalentMinor: null,
        estimatedUsageTotalMinor: null,
        firstYearCommitmentMinor: null,
      }),
    ).toThrow('COMMERCIAL_PRICE_FIRST_YEAR_REQUIRED');
  });

  it('accepts only persistence-sentinel differences and rejects real economics changes', () => {
    const recalculated = {
      oneTimeTotalMinor: '742500',
      recurringMonthlyCadenceMinor: null,
      recurringAnnualCadenceMinor: '1750000',
      monthlyRecurringEquivalentMinor: null,
      annualRecurringEquivalentMinor: '1750000',
      estimatedUsageTotalMinor: null,
      firstYearCommitmentMinor: '2492500',
    };
    expect(
      commercialPriceTotalsMatch(recalculated, {
        ...recalculated,
        recurringMonthlyCadenceMinor: 0n,
        estimatedUsageTotalMinor: 0n,
      }),
    ).toBe(true);
    expect(
      commercialPriceTotalsMatch(recalculated, {
        ...recalculated,
        oneTimeTotalMinor: '742501',
      }),
    ).toBe(false);
    expect(
      commercialPriceTotalsMatch(recalculated, {
        ...recalculated,
        recurringMonthlyCadenceMinor: '1',
      }),
    ).toBe(false);
    expect(
      commercialPriceTotalsMatch(recalculated, {
        ...recalculated,
        recurringAnnualCadenceMinor: '1750001',
      }),
    ).toBe(false);
    expect(
      commercialPriceTotalsMatch(recalculated, {
        ...recalculated,
        monthlyRecurringEquivalentMinor: '145833',
      }),
    ).toBe(false);
    expect(
      commercialPriceTotalsMatch(recalculated, {
        ...recalculated,
        estimatedUsageTotalMinor: '1',
      }),
    ).toBe(false);
    expect(
      commercialPriceTotalsMatch(recalculated, {
        ...recalculated,
        firstYearCommitmentMinor: '2492501',
      }),
    ).toBe(false);
  });
});
