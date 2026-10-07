type MinorAmount = string | bigint | null;

export type CommercialPriceTotalsInput = {
  oneTimeTotalMinor: MinorAmount;
  recurringMonthlyCadenceMinor: MinorAmount;
  recurringAnnualCadenceMinor: MinorAmount;
  monthlyRecurringEquivalentMinor: MinorAmount;
  annualRecurringEquivalentMinor: MinorAmount;
  estimatedUsageTotalMinor: MinorAmount;
  firstYearCommitmentMinor: MinorAmount;
};

export type PersistedCommercialPriceTotals = {
  oneTimeTotalMinor: string;
  recurringMonthlyCadenceMinor: string;
  recurringAnnualCadenceMinor: string;
  monthlyRecurringEquivalentMinor: string | null;
  annualRecurringEquivalentMinor: string;
  estimatedUsageTotalMinor: string;
  firstYearCommitmentMinor: string;
};

const persistedMinor = (value: MinorAmount) => value?.toString() ?? '0';
const nullableMinor = (value: MinorAmount) => value?.toString() ?? null;

export function normalizeCommercialPriceTotals(
  totals: CommercialPriceTotalsInput,
): PersistedCommercialPriceTotals {
  if (totals.firstYearCommitmentMinor === null)
    throw new Error('COMMERCIAL_PRICE_FIRST_YEAR_REQUIRED');
  return {
    oneTimeTotalMinor: persistedMinor(totals.oneTimeTotalMinor),
    recurringMonthlyCadenceMinor: persistedMinor(
      totals.recurringMonthlyCadenceMinor,
    ),
    recurringAnnualCadenceMinor: persistedMinor(
      totals.recurringAnnualCadenceMinor,
    ),
    monthlyRecurringEquivalentMinor: nullableMinor(
      totals.monthlyRecurringEquivalentMinor,
    ),
    annualRecurringEquivalentMinor: persistedMinor(
      totals.annualRecurringEquivalentMinor,
    ),
    estimatedUsageTotalMinor: persistedMinor(totals.estimatedUsageTotalMinor),
    firstYearCommitmentMinor: totals.firstYearCommitmentMinor.toString(),
  };
}

export function commercialPriceTotalsMatch(
  actual: CommercialPriceTotalsInput,
  expected: CommercialPriceTotalsInput,
): boolean {
  const normalizedActual = normalizeCommercialPriceTotals(actual);
  const normalizedExpected = normalizeCommercialPriceTotals(expected);
  return Object.keys(normalizedActual).every(
    (field) =>
      normalizedActual[field as keyof PersistedCommercialPriceTotals] ===
      normalizedExpected[field as keyof PersistedCommercialPriceTotals],
  );
}
