import {
  canonicalSimulatorJson,
  simulatorFingerprint,
} from './calculation-identity';

describe('commercial simulator calculation identity', () => {
  it('canonicalizes object keys recursively and hashes deterministically', () => {
    const left = { z: 1, nested: { b: null, a: ['2.000000', true] } };
    const right = { nested: { a: ['2.000000', true], b: null }, z: 1 };
    expect(canonicalSimulatorJson(left)).toBe(canonicalSimulatorJson(right));
    expect(simulatorFingerprint(left)).toBe(simulatorFingerprint(right));
    expect(simulatorFingerprint(left)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes identity when calculation evidence changes', () => {
    expect(simulatorFingerprint({ quantity: '1.000000' })).not.toBe(
      simulatorFingerprint({ quantity: '2.000000' }),
    );
  });

  it('canonically serializes BigInt, dates, and toJSON values', () => {
    const decimalLike = { toJSON: () => '1.250000' };
    expect(
      canonicalSimulatorJson({
        amount: 12n,
        at: new Date('2026-10-01T00:00:00Z'),
        decimalLike,
      }),
    ).toBe(
      '{"amount":"12","at":"2026-10-01T00:00:00.000Z","decimalLike":"1.250000"}',
    );
  });
});
