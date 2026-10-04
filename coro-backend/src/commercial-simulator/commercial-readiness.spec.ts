import { COMMERCIAL_FAMILY_REGISTRY } from './commercial-family.registry';
import { buildFamilyReadiness } from './commercial-readiness';

describe('commercial family readiness', () => {
  const compliance = {
    code: 'DOCUMENT_COMPLIANCE_DELIVERY_HOUR',
    capabilityCode: 'COMPLIANCE_OPERATIONS',
    pricingModel: 'PER_UNIT',
    revenueCategory: 'PROFESSIONAL_SERVICE',
    amountConfigured: true,
    tierCount: 0,
  };

  it('keeps price independent from cost and value', () => {
    const result = buildFamilyReadiness({
      families: COMMERCIAL_FAMILY_REGISTRY,
      components: [compliance],
      publishedCostScopes: [],
      publishedValuationCount: 0,
    }).find((item) => item.familyCode === 'COMPLIANCE');
    expect(result?.price.status).toBe('READY');
    expect(result?.cost.status).toBe('NOT_CONFIGURED');
    expect(result?.value.status).toBe('NOT_CONFIGURED');
  });

  it('keeps NETWORK unavailable for selling', () => {
    const result = buildFamilyReadiness({
      families: COMMERCIAL_FAMILY_REGISTRY,
      components: [],
      publishedCostScopes: [],
      publishedValuationCount: 0,
    }).find((item) => item.familyCode === 'NETWORK');
    expect(result?.price.status).toBe('NOT_APPLICABLE');
    expect(result?.blockers).toContain('FAMILY_NOT_SELLABLE');
  });
});
