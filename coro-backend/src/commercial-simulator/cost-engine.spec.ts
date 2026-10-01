import {
  calculateDirectCost,
  calculateRoleBasedDirectCost,
  costAtBillingCadence,
  deriveMargin,
} from './cost-engine';

describe('commercial simulator direct cost engine', () => {
  it('calculates delivery and senior review from independent role authorities', () => {
    expect(
      calculateRoleBasedDirectCost([
        {
          roleCode: 'DELIVERY_PROFESSIONAL',
          hours: '2.5',
          roleCostMinor: '10000',
          chargeType: 'ONE_TIME',
        },
        {
          roleCode: 'SENIOR_REVIEWER',
          hours: '1',
          roleCostMinor: '15000',
          chargeType: 'ONE_TIME',
        },
      ]),
    ).toEqual({
      oneTimeDirectCostMinor: '40000',
      recurringMonthlyCostMinor: '0',
      recurringAnnualCostMinor: '0',
      firstYearCostMinor: '40000',
      breakdown: [
        {
          roleCode: 'DELIVERY_PROFESSIONAL',
          hours: '2.5',
          roleCostMinor: '10000',
          chargeType: 'ONE_TIME',
          calculatedCostMinor: '25000',
        },
        {
          roleCode: 'SENIOR_REVIEWER',
          hours: '1',
          roleCostMinor: '15000',
          chargeType: 'ONE_TIME',
          calculatedCostMinor: '15000',
        },
      ],
    });
  });

  it('keeps one-time, monthly and annual costs distinct', () => {
    const result = calculateDirectCost([
      { quantity: '2.000000', unitCostMinor: '125', chargeType: 'ONE_TIME' },
      {
        quantity: '3.000000',
        unitCostMinor: '100',
        chargeType: 'RECURRING',
        billingPeriod: 'MONTH',
      },
      {
        quantity: '1.000000',
        unitCostMinor: '900',
        chargeType: 'RECURRING',
        billingPeriod: 'YEAR',
      },
    ]);
    expect(result).toEqual({
      oneTimeDirectCostMinor: '250',
      recurringMonthlyCostMinor: '300',
      recurringAnnualCostMinor: '900',
      firstYearCostMinor: '4750',
    });
    expect(costAtBillingCadence(result, 'RECURRING', 'MONTH')).toBe('300');
    expect(costAtBillingCadence(result, 'RECURRING', 'YEAR')).toBe('900');
    expect(costAtBillingCadence(result, 'ONE_TIME')).toBe('250');
  });

  it('does not disguise a zero-revenue margin and preserves negative contribution', () => {
    expect(deriveMargin('0', '1')).toEqual({
      contributionMinor: '-1',
      marginBasisPoints: null,
    });
    expect(deriveMargin('100', '150')).toEqual({
      contributionMinor: '-50',
      marginBasisPoints: -5000,
    });
  });
});
