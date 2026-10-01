import {
  FIRST_WAVE_COMPONENTS,
  FIRST_WAVE_COST_ASSUMPTIONS,
  PROFESSIONAL_SERVICE_ROLES,
  professionalServiceRoleForComponent,
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
});
