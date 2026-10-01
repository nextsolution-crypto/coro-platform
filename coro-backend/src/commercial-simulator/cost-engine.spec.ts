import { calculateDirectCost, deriveMargin } from './cost-engine';

describe('commercial simulator direct cost engine', () => {
  it('keeps one-time, monthly and annual costs distinct', () => {
    expect(
      calculateDirectCost([
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
      ]),
    ).toEqual({
      oneTimeDirectCostMinor: '250',
      recurringMonthlyCostMinor: '300',
      recurringAnnualCostMinor: '900',
      firstYearCostMinor: '4750',
    });
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
