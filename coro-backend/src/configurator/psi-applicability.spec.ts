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

const freq = (config: any) => (new RulesEngineService() as any).computeFrequenceExercices(config);

describe('PSI — CNPI 2020 mod. Québec art. 2.8.1.1 a) à f)', () => {
  it('exige le PSI pour une RPA, une école ou garderie, un restaurant ou bar, sans seuil de personnes', () => {
    expect(psi({ usagePrincipal: 'C - Etablissements d habitation', residencePriveeAines: true }).code).toBe('PSI-RPA');
    expect(psi({ usagePrincipal: 'A2 - Etablissements de reunion', ecoleGarderie: true, capaciteMaxReglementaire: 12 }).code).toBe('PSI-ECOLE-GARDERIE');
    expect(psi({ usagePrincipal: 'A2 - Etablissements de reunion', restaurantBar: true, capaciteMaxReglementaire: 20 }).code).toBe('PSI-RESTAURANT-BAR');
  });
  it('exempte un petit établissement de réunion ordinaire, mais pas s\'il a un système d\'alarme', () => {
    expect(psi({ usagePrincipal: 'A2 - Etablissements de reunion', capaciteMaxReglementaire: 25 }).statut).toBe('EXEMPTE');
    expect(psi({ usagePrincipal: 'A2 - Etablissements de reunion', capaciteMaxReglementaire: 25, panneauAlarme: true }).code).toBe('PSI-ALARME');
    expect(psi({ usagePrincipal: 'A2 - Etablissements de reunion', capaciteMaxReglementaire: 80 }).statut).toBe('OUI');
  });
});

describe('Fréquence des exercices — CNPI 2020 mod. Québec art. 2.8.3.2', () => {
  it('applique la règle officielle', () => {
    expect(freq({ usagePrincipal: 'C - Etablissements d habitation', lieuSommeil: true }).frequence).toBe('Tous les 12 mois');
    expect(freq({ usagePrincipal: 'C - Etablissements d habitation', residencePriveeAines: true }).frequence).toBe('Tous les 6 mois');
    expect(freq({ usagePrincipal: 'A2 - Etablissements de reunion', restaurantBar: true }).frequence).toBe('Tous les 12 mois');
    expect(freq({ usagePrincipal: 'A2 - Etablissements de reunion', ecoleGarderie: true }).frequence).toBe('2 fois par an (automne et printemps)');
    expect(freq({ usagePrincipal: 'A2 - Etablissements de reunion', ecoleGarderie: true, laboratoirePresent: true }).frequence).toBe('2 fois par an (automne et printemps)');
    expect(freq({ usagePrincipal: 'D - Etablissements d affaires', laboratoirePresent: true }).frequence).toBe('Tous les 3 mois');
    expect(freq({ usagePrincipal: 'A1 - Etablissements de reunion - Spectacle' }).frequence).toBe('Tous les 3 mois');
    expect(freq({ usagePrincipal: 'B2 - Etablissements de traitement' }).frequence).toBe('Tous les 6 mois');
  });
});
