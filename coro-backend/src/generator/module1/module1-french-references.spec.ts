import { aRef, duRef, leRef } from './module1.context';

describe('Références réglementaires en français', () => {
  it('accorde le déterminant avec la référence', () => {
    expect(aRef('article 2.8')).toBe("à l'article 2.8");
    expect(aRef('Section 2.8')).toBe('à la Section 2.8');
    expect(aRef('Division B, Section 2.8')).toBe('à la Division B, Section 2.8');
    expect(leRef('article 2.8')).toBe("l'article 2.8");
    expect(duRef('Ontario Fire Code (O. Reg. 213/07)')).toBe("de l'Ontario Fire Code (O. Reg. 213/07)");
    expect(duRef('Code de sécurité du Québec')).toBe('du Code de sécurité du Québec');
  });
});
