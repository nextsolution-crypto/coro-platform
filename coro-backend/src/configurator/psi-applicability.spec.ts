import { RulesEngineService } from './rules-engine.service';

const psi = (config: any) => (new RulesEngineService() as any).computePsiRequis(config);

describe('PSI applicability (CNPI 2020 art. 2.8.1.1)', () => {
  it('requires a PSI for a high-rise office building', () => {
    expect(psi({ usagePrincipal: 'D - Etablissements d affaires', hauteurBatiment: true, panneauAlarme: true })).toMatchObject({ statut: 'OUI', code: 'PSI-D-ALARME' });
  });
  it('requires a PSI for an office building with a fire alarm system', () => {
    expect(psi({ usagePrincipal: 'D - Etablissements d affaires', panneauAlarme: true }).statut).toBe('OUI');
  });
  it('still asks to verify a small office building without alarm', () => {
    expect(psi({ usagePrincipal: 'D - Etablissements d affaires', panneauAlarme: false }).statut).toBe('VERIFICATION_REQUISE');
  });
});
