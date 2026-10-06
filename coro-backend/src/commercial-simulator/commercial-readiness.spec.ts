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
  const professionalAnnual = {
    code: 'CORO_PROFESSIONAL_ANNUAL',
    capabilityCode: 'COMPLIANCE_OPERATIONS',
    pricingModel: 'CAPACITY_BAND',
    revenueCategory: 'SAAS',
    amountConfigured: false,
    tierCount: 10,
  };
  const professionalAdvanced = {
    code: 'CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED',
    capabilityCode: 'COMPLIANCE_OPERATIONS',
    pricingModel: 'FLAT',
    revenueCategory: 'IMPLEMENTATION',
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

  it('accepts tier-backed Professional CAPACITY_BAND without a parent amount', () => {
    const result = buildFamilyReadiness({
      families: COMMERCIAL_FAMILY_REGISTRY,
      components: [professionalAnnual, professionalAdvanced],
      publishedCostScopes: [],
      publishedValuationCount: 0,
    }).find((item) => item.familyCode === 'PROFESSIONAL');

    expect(result?.price.status).toBe('READY');
    expect(result?.blockers).not.toContain(
      'PRICE_CONFIGURATION_INVALID:CORO_PROFESSIONAL_ANNUAL',
    );
  });

  it('rejects CAPACITY_BAND without tiers when its parent amount is absent', () => {
    const result = buildFamilyReadiness({
      families: COMMERCIAL_FAMILY_REGISTRY,
      components: [{ ...professionalAnnual, tierCount: 0 }],
      publishedCostScopes: [],
      publishedValuationCount: 0,
    }).find((item) => item.familyCode === 'PROFESSIONAL');

    expect(result?.price.status).toBe('BLOCKED');
    expect(result?.blockers).toContain(
      'PRICE_CONFIGURATION_INVALID:CORO_PROFESSIONAL_ANNUAL',
    );
  });

  it('keeps Professional diagnostics off the Compliance family card', () => {
    const readiness = buildFamilyReadiness({
      families: COMMERCIAL_FAMILY_REGISTRY,
      components: [{ ...professionalAnnual, tierCount: 0 }, compliance],
      publishedCostScopes: [],
      publishedValuationCount: 0,
    });
    const professional = readiness.find(
      (item) => item.familyCode === 'PROFESSIONAL',
    );
    const complianceFamily = readiness.find(
      (item) => item.familyCode === 'COMPLIANCE',
    );

    expect(professional?.blockers).toContain(
      'PRICE_CONFIGURATION_INVALID:CORO_PROFESSIONAL_ANNUAL',
    );
    expect(complianceFamily?.price.status).toBe('READY');
    expect(complianceFamily?.blockers).not.toContain(
      'PRICE_CONFIGURATION_INVALID:CORO_PROFESSIONAL_ANNUAL',
    );
  });

  it.each([
    ['FLAT', true, 0, 'READY'],
    ['PER_UNIT', true, 0, 'READY'],
    ['CUSTOM', false, 0, 'READY'],
    ['COMPLEXITY', false, 0, 'READY'],
    ['TIERED', false, 2, 'READY'],
    ['TIERED', false, 0, 'BLOCKED'],
  ])(
    'preserves %s readiness semantics',
    (pricingModel, amountConfigured, tierCount, expected) => {
      const result = buildFamilyReadiness({
        families: COMMERCIAL_FAMILY_REGISTRY,
        components: [
          {
            ...compliance,
            pricingModel,
            amountConfigured,
            tierCount,
          },
        ],
        publishedCostScopes: [],
        publishedValuationCount: 0,
      }).find((item) => item.familyCode === 'COMPLIANCE');

      expect(result?.price.status).toBe(expected);
    },
  );
});
