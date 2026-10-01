import {
  FIRST_WAVE_COMPONENTS,
  FIRST_WAVE_COST_ASSUMPTIONS,
  PROFESSIONAL_SERVICE_ROLES,
  professionalServiceRoleForComponent,
  assertFirstWaveRevenueCategory,
} from './first-wave-commercial.registry';

describe('first-wave commercial structure registry', () => {
  it('contains exactly the two approved professional service roles', () => {
    expect(PROFESSIONAL_SERVICE_ROLES).toEqual([
      'DELIVERY_PROFESSIONAL',
      'SENIOR_REVIEWER',
    ]);
  });

  it('contains only structural definitions and no numeric commercial assumptions', () => {
    expect(Object.keys(FIRST_WAVE_COMPONENTS)).toEqual([
      'DOCUMENT_COMPLIANCE_SUBSCRIPTION',
      'DOCUMENT_COMPLIANCE_IMPLEMENTATION',
      'DOCUMENT_COMPLIANCE_DELIVERY_HOUR',
      'DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR',
    ]);
    expect(JSON.stringify(FIRST_WAVE_COST_ASSUMPTIONS)).not.toMatch(
      /amount|price|rate|productivity/i,
    );
  });

  it('maps hourly components deterministically to cost roles', () => {
    expect(
      professionalServiceRoleForComponent('DOCUMENT_COMPLIANCE_DELIVERY_HOUR'),
    ).toBe('DELIVERY_PROFESSIONAL');
    expect(
      professionalServiceRoleForComponent(
        'DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR',
      ),
    ).toBe('SENIOR_REVIEWER');
    expect(
      professionalServiceRoleForComponent('DOCUMENT_COMPLIANCE_SUBSCRIPTION'),
    ).toBeNull();
  });

  it('owns the approved first-wave revenue semantics without prices', () => {
    expect(
      Object.fromEntries(
        Object.entries(FIRST_WAVE_COMPONENTS).map(([code, value]) => [
          code,
          value.expectedRevenueCategory,
        ]),
      ),
    ).toEqual({
      DOCUMENT_COMPLIANCE_SUBSCRIPTION: 'SAAS',
      DOCUMENT_COMPLIANCE_IMPLEMENTATION: 'IMPLEMENTATION',
      DOCUMENT_COMPLIANCE_DELIVERY_HOUR: 'PROFESSIONAL_SERVICE',
      DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR: 'PROFESSIONAL_SERVICE',
    });
    expect(() =>
      assertFirstWaveRevenueCategory(
        'DOCUMENT_COMPLIANCE_SUBSCRIPTION',
        'IMPLEMENTATION',
      ),
    ).toThrow('REVENUE_CATEGORY_MISMATCH');
  });
});
