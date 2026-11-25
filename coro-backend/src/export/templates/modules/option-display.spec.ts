import { displayOption } from './option-display';

describe('displayOption', () => {
  it('accents stored configurator values without changing free text', () => {
    expect(displayOption('D - Etablissements d affaires')).toBe('D - Établissements d’affaires');
    expect(displayOption('F1 - Etablissement industriel a risques tres eleves')).toBe('F1 - Établissement industriel à risques très élevés');
    expect(displayOption('Incombustible - Beton')).toBe('Incombustible - Béton');
    expect(displayOption('DOUBLE')).toBe('Double étape (alerte et alarme)');
    expect(displayOption('Poste de sécurité du hall')).toBe('Poste de sécurité du hall');
  });
});
