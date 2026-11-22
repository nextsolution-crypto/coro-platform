import { multiply2, round2, round2OrNull, sum2 } from './exact-amounts';

describe('M6-03 — montants et heures exacts', () => {
  it('somme sans dérive d’arrondi', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sum2([0.1, 0.2], (x) => x)).toBe(0.3);
    expect(sum2(Array.from({ length: 1000 }, () => 0.1), (x) => x)).toBe(100);
  });
  it('arrondit au centième à l’enregistrement', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2OrNull('12.345')).toBe(12.35);
    expect(round2OrNull('')).toBeNull();
    expect(round2OrNull('abc')).toBeNull();
  });
  it('calcule heures × taux au centième', () => {
    expect(multiply2(7.5, 95.33)).toBe(714.98);
    expect(multiply2(0.1, 0.3)).toBe(0.03);
  });
});
