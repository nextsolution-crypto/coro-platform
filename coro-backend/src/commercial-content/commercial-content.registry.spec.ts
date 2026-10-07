import { isKnownCommercialContentTarget } from './commercial-content.registry';
import { PROFESSIONAL_CONTENT_DRAFT } from './professional-content.draft';

describe('commercial content target registry', () => {
  it('accepts stable existing authorities and rejects unknown targets', () => {
    expect(isKnownCommercialContentTarget('FAMILY', 'PROFESSIONAL')).toBe(true);
    expect(isKnownCommercialContentTarget('CAPABILITY', 'NETWORK')).toBe(true);
    expect(
      isKnownCommercialContentTarget('COMPONENT', 'CORO_PROFESSIONAL_ANNUAL'),
    ).toBe(true);
    expect(
      isKnownCommercialContentTarget('FUNCTIONAL_FEATURE', 'BOOKING'),
    ).toBe(true);
    expect(
      isKnownCommercialContentTarget('FUNCTIONAL_FEATURE', 'INVENTED'),
    ).toBe(false);
  });
  it('keeps the founder matrix draft-only and separates intent from maturity', () => {
    expect(PROFESSIONAL_CONTENT_DRAFT.provenance).toBe(
      'FOUNDER_PRODUCT_DECISION',
    );
    expect(PROFESSIONAL_CONTENT_DRAFT.bindings).toHaveLength(20);
    expect(
      PROFESSIONAL_CONTENT_DRAFT.bindings.find(
        (item) => item.targetCode === 'PMU_PSI_PCA',
      ),
    ).toMatchObject({
      commercialIntent: 'INCLUDED',
      deliveryMaturity: 'UNVERIFIED',
    });
    expect(
      PROFESSIONAL_CONTENT_DRAFT.bindings.find(
        (item) => item.targetCode === 'NETWORK',
      ),
    ).toMatchObject({ commercialIntent: 'FUTURE', deliveryMaturity: 'FUTURE' });
  });
});
