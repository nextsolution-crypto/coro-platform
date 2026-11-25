import { renderModule8 } from './simple-modules.template';

describe('Module 8 PDF — sections applicables', () => {
  it('retire les sections non applicables et numérote dans l’ordre réel', () => {
    const sections = renderModule8({}, 'fr', 7, (id) => id !== '8.7' && id !== '8.11');
    expect(sections.map((s) => s.id)).toEqual(['8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.8', '8.9', '8.10']);
    const permit = sections.find((s) => s.id === '8.8')!;
    expect(permit.html).toContain('>7.7<');
    expect(sections.find((s) => s.id === '8.10')!.html).toContain('>7.9<');
  });

  it('garde les 11 sections sans filtre (anciens appels)', () => {
    expect(renderModule8({}, 'fr', 8)).toHaveLength(11);
  });
});
