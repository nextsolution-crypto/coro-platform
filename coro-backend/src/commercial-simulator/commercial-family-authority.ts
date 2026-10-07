import { COMMERCIAL_FAMILY_REGISTRY } from './commercial-family.registry';
import { COMMERCIAL_PACKAGING_POLICY } from './commercial-packaging.registry';
import { validatePackagingSelection } from './commercial-packaging';

export type FamilyAuthority = {
  codes: string[];
  source: 'EXPLICIT' | 'LEGACY_INFERRED' | 'REVIEW_REQUIRED';
};

export function normalizeCommercialFamilyComposition(codes: readonly string[]) {
  const unique = [...new Set(codes)].sort();
  if (unique.length !== codes.length)
    throw new Error('DUPLICATE_COMMERCIAL_FAMILY');
  for (const code of unique) {
    const family = COMMERCIAL_FAMILY_REGISTRY.find(
      (item) => item.code === code,
    );
    if (!family || family.availability === 'FUTURE')
      throw new Error('COMMERCIAL_FAMILY_NOT_SELECTABLE');
  }
  return unique;
}

export function resolveCommercialFamilyAuthority(input: {
  explicitCodes: readonly string[];
  componentCodes: readonly string[];
}): FamilyAuthority {
  if (input.explicitCodes.length)
    return {
      codes: normalizeCommercialFamilyComposition(input.explicitCodes),
      source: 'EXPLICIT',
    };
  const readyCodes = COMMERCIAL_PACKAGING_POLICY.filter(
    (policy) => policy.status === 'READY',
  ).map((policy) => policy.familyCode);
  const candidates: string[][] = [];
  for (let mask = 1; mask < 1 << readyCodes.length; mask += 1) {
    const codes = readyCodes.filter((_, index) => mask & (1 << index));
    const result = validatePackagingSelection({
      familyCodes: codes,
      components: input.componentCodes.map((componentCode) => ({
        componentCode,
        revenueCategory: null,
      })),
    });
    if (result.status === 'READY') candidates.push(codes.sort());
  }
  const minimumSize = Math.min(
    ...candidates.map((candidate) => candidate.length),
  );
  const minimal = candidates.filter(
    (candidate) => candidate.length === minimumSize,
  );
  return minimal.length === 1
    ? { codes: minimal[0], source: 'LEGACY_INFERRED' }
    : { codes: [], source: 'REVIEW_REQUIRED' };
}
