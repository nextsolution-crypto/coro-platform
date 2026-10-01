import { CapabilityCode } from '@prisma/client';
import { PROPOSAL_INPUT_REGISTRY } from '../commercial-proposals/proposal-input-registry';
import { COMMERCIAL_FAMILY_REGISTRY } from './commercial-family.registry';

describe('commercial family registry', () => {
  it('defines the eight localized families once and in deterministic order', () => {
    expect(COMMERCIAL_FAMILY_REGISTRY).toHaveLength(8);
    expect(
      new Set(COMMERCIAL_FAMILY_REGISTRY.map((item) => item.code)).size,
    ).toBe(8);
    expect(COMMERCIAL_FAMILY_REGISTRY.map((item) => item.displayOrder)).toEqual(
      [10, 20, 30, 40, 50, 60, 70, 80],
    );
    expect(
      COMMERCIAL_FAMILY_REGISTRY.every((item) => item.labelFr && item.labelEn),
    ).toBe(true);
  });

  it('references only canonical capabilities and drivers', () => {
    const capabilities = new Set(Object.values(CapabilityCode));
    const drivers = new Set(Object.keys(PROPOSAL_INPUT_REGISTRY));
    for (const item of COMMERCIAL_FAMILY_REGISTRY) {
      expect(item.capabilityCodes.every((code) => capabilities.has(code))).toBe(
        true,
      );
      expect(
        [...item.applicableDriverCodes, ...item.optionalDriverCodes].every(
          (code) => drivers.has(code),
        ),
      ).toBe(true);
    }
  });

  it('keeps future Network unavailable and creates no fake capability for presentation families', () => {
    expect(
      COMMERCIAL_FAMILY_REGISTRY.find((item) => item.code === 'NETWORK')
        ?.availability,
    ).toBe('FUTURE');
    expect(
      COMMERCIAL_FAMILY_REGISTRY.find((item) => item.code === 'BUILDING_BRIDGE')
        ?.capabilityCodes,
    ).toEqual([]);
    expect(
      COMMERCIAL_FAMILY_REGISTRY.find(
        (item) => item.code === 'PROFESSIONAL_SERVICES',
      )?.capabilityCodes,
    ).toEqual([]);
  });
});
