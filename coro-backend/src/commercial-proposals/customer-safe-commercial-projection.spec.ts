import {
  assertCustomerSafeProjection,
  customerSafeInputs,
  CUSTOMER_SAFE_INPUT_CODES,
} from './customer-safe-commercial-projection';

describe('customer-safe commercial projection', () => {
  it('uses an explicit customer input allowlist', () => {
    expect(CUSTOMER_SAFE_INPUT_CODES).toEqual([
      'PROFESSIONALS',
      'CLIENTS',
      'SITES',
      'POPULATION_INSTALLATIONS',
    ]);
    expect(
      customerSafeInputs([
        { code: 'PROFESSIONALS', labelFr: 'Professionnels', integerValue: 12n },
        { code: 'BILLABLE_RATE', labelFr: 'Taux', moneyMinorValue: 25000n },
        { code: 'PRODUCTIVITY_GAIN', labelFr: 'Gain', decimalValue: '0.25' },
        { code: 'POPULATION_SITE', labelFr: 'Population', integerValue: 100n },
      ]),
    ).toEqual([
      { labelFr: 'Professionnels', labelEn: null, value: '12', unit: null },
    ]);
  });

  it('rejects internal fields by construction', () => {
    expect(() =>
      assertCustomerSafeProjection({ contribution: '10' } as never),
    ).toThrow('CUSTOMER_SAFE_PROJECTION_LEAK:contribution');
  });
});
