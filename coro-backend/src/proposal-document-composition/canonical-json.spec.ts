import { canonicalJson, canonicalSha256 } from './canonical-json';

describe('proposal document canonical JSON', () => {
  it('sorts object keys recursively while preserving array order', () => {
    expect(
      canonicalJson({ z: 1, nested: { b: 2, a: 1 }, items: [{ y: 2, x: 1 }] }),
    ).toBe('{"items":[{"x":1,"y":2}],"nested":{"a":1,"b":2},"z":1}');
  });

  it('produces the same identity for semantically identical objects', () => {
    expect(canonicalSha256({ b: 2, a: 1 })).toBe(
      canonicalSha256({ a: 1, b: 2 }),
    );
  });
});
