import { defaultModuleOrder } from './module-order';

describe('Ordre opérationnel CORO des modules', () => {
  it('PMU : téléphone, plans, rôles, procédures, site, introduction, registres', () => {
    expect(defaultModuleOrder('PMU')).toEqual([2, 6, 3, 4, 7, 1, 8]);
  });
  it('PSI : même ordre, sans le module des rôles', () => {
    expect(defaultModuleOrder('PSI')).toEqual([2, 6, 4, 7, 1, 8]);
  });
  it('PCA : ordre méthodologique conservé', () => {
    expect(defaultModuleOrder('PCA')).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
