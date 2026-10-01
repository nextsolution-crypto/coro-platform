export type CostLine = Readonly<{
  quantity: string;
  unitCostMinor: string;
  chargeType: 'ONE_TIME' | 'RECURRING';
  billingPeriod?: 'MONTH' | 'YEAR';
}>;

export type RoleEffortCost = Readonly<{
  roleCode: 'DELIVERY_PROFESSIONAL' | 'SENIOR_REVIEWER';
  hours: string;
  roleCostMinor: string;
  chargeType: 'ONE_TIME' | 'RECURRING';
  billingPeriod?: 'MONTH' | 'YEAR';
}>;

const decimal6 = (value: string) => {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) throw new Error('INVALID_DECIMAL');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
};

const halfUp = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / 2n) / denominator;

export function calculateDirectCost(lines: readonly CostLine[]) {
  let oneTime = 0n;
  let monthly = 0n;
  let annual = 0n;
  for (const line of lines) {
    const amount = halfUp(
      decimal6(line.quantity) * BigInt(line.unitCostMinor),
      1_000_000n,
    );
    if (line.chargeType === 'ONE_TIME') oneTime += amount;
    else if (line.billingPeriod === 'MONTH') monthly += amount;
    else if (line.billingPeriod === 'YEAR') annual += amount;
    else throw new Error('COST_BILLING_PERIOD_REQUIRED');
  }
  return {
    oneTimeDirectCostMinor: oneTime.toString(),
    recurringMonthlyCostMinor: monthly.toString(),
    recurringAnnualCostMinor: annual.toString(),
    firstYearCostMinor: (oneTime + monthly * 12n + annual).toString(),
  };
}

export function costAtBillingCadence(
  costs: ReturnType<typeof calculateDirectCost>,
  chargeType: 'ONE_TIME' | 'RECURRING',
  billingPeriod?: 'MONTH' | 'YEAR',
): string {
  if (chargeType === 'ONE_TIME') return costs.oneTimeDirectCostMinor;
  if (billingPeriod === 'MONTH') return costs.recurringMonthlyCostMinor;
  if (billingPeriod === 'YEAR') return costs.recurringAnnualCostMinor;
  throw new Error('COST_BILLING_PERIOD_REQUIRED');
}

export function calculateRoleBasedDirectCost(
  efforts: readonly RoleEffortCost[],
) {
  const breakdown = efforts.map((effort) => {
    const calculatedCostMinor = halfUp(
      decimal6(effort.hours) * BigInt(effort.roleCostMinor),
      1_000_000n,
    );
    return { ...effort, calculatedCostMinor: calculatedCostMinor.toString() };
  });
  const totals = calculateDirectCost(
    breakdown.map((item) => ({
      quantity: '1',
      unitCostMinor: item.calculatedCostMinor,
      chargeType: item.chargeType,
      billingPeriod: item.billingPeriod,
    })),
  );
  return { breakdown, ...totals };
}

export function deriveMargin(revenueMinor: string, costMinor: string) {
  const revenue = BigInt(revenueMinor);
  const cost = BigInt(costMinor);
  return {
    contributionMinor: (revenue - cost).toString(),
    marginBasisPoints:
      revenue === 0n ? null : Number(((revenue - cost) * 10_000n) / revenue),
  };
}
