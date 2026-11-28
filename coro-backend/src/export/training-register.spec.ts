import { renderModule8 } from './templates/modules/simple-modules.template';
import { frozenExportDataSource, FROZEN_EXPORT_DATA_VERSION } from './export-frozen-data';

describe('registre de formation (8.1)', () => {
  const row = { nom: 'Alex Tremblay', formation: 'Formation SST', date: '2026-11-20', formateur: 'Léa Bouchard', resultat: '90 %', reussi: true };

  it('ajoute les participants des questionnaires avant les lignes manuelles', () => {
    const [registre] = renderModule8({}, 'fr', 7, undefined, [row]);
    expect(registre.html).toContain('Alex Tremblay');
    expect(registre.html).toContain('questionnaires post-formation CORO');
    expect(registre.html).toContain('réussi');
  });

  it('reste manuel sans questionnaire', () => {
    const [registre] = renderModule8({}, 'fr', 7);
    expect(registre.html).toContain('À compléter manuellement lors des formations.');
    expect(registre.html).not.toContain('questionnaires post-formation CORO');
  });

  it('un snapshot antérieur garde un registre vide (rendu inchangé)', async () => {
    const source = frozenExportDataSource({
      version: FROZEN_EXPORT_DATA_VERSION,
      procedureDefaults: [],
      organizationOverrides: [],
      projectOverrides: [],
      customProcedures: [],
      module7: null,
    });
    await expect(source.trainingRegister!()).resolves.toEqual([]);
  });
});
