import {
  normalizeCommercialFamilyComposition,
  resolveCommercialFamilyAuthority,
} from './commercial-family-authority';

describe('commercial family authority', () => {
  it('canonicalizes explicit family composition without inferring from capabilities', () => {
    expect(
      normalizeCommercialFamilyComposition(['SENTINELLE', 'PROFESSIONAL']),
    ).toEqual(['PROFESSIONAL', 'SENTINELLE']);
  });

  it('rejects duplicate, unknown and future family codes', () => {
    expect(() =>
      normalizeCommercialFamilyComposition(['PROFESSIONAL', 'PROFESSIONAL']),
    ).toThrow('DUPLICATE_COMMERCIAL_FAMILY');
    expect(() => normalizeCommercialFamilyComposition(['UNKNOWN'])).toThrow(
      'COMMERCIAL_FAMILY_NOT_SELECTABLE',
    );
    expect(() => normalizeCommercialFamilyComposition(['NETWORK'])).toThrow(
      'COMMERCIAL_FAMILY_NOT_SELECTABLE',
    );
  });

  it('infers a pure Professional legacy composition as Professional only', () => {
    expect(
      resolveCommercialFamilyAuthority({
        explicitCodes: [],
        componentCodes: [
          'CORO_PROFESSIONAL_ANNUAL',
          'CORO_PROFESSIONAL_IMPLEMENTATION_ADVANCED',
          'DOCUMENT_COMPLIANCE_DELIVERY_HOUR',
          'DOCUMENT_COMPLIANCE_SENIOR_REVIEW_HOUR',
        ],
      }),
    ).toEqual({ codes: ['PROFESSIONAL'], source: 'LEGACY_INFERRED' });
  });

  it('infers Compliance from its catalog-specific components', () => {
    expect(
      resolveCommercialFamilyAuthority({
        explicitCodes: [],
        componentCodes: [
          'DOCUMENT_COMPLIANCE_SUBSCRIPTION',
          'DOCUMENT_COMPLIANCE_IMPLEMENTATION',
        ],
      }),
    ).toEqual({ codes: ['COMPLIANCE'], source: 'LEGACY_INFERRED' });
  });

  it('requires review when legacy components do not identify exactly one family', () => {
    expect(
      resolveCommercialFamilyAuthority({
        explicitCodes: [],
        componentCodes: ['DOCUMENT_COMPLIANCE_DELIVERY_HOUR'],
      }),
    ).toEqual({ codes: [], source: 'REVIEW_REQUIRED' });
    expect(
      resolveCommercialFamilyAuthority({
        explicitCodes: [],
        componentCodes: [],
      }),
    ).toEqual({ codes: [], source: 'REVIEW_REQUIRED' });
  });
});
