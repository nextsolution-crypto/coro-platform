import { refreshEditableRows, refreshExternalRows, refreshSavedModule2 } from './module2-refresh';
import { getActiveProcedures } from './procedures/index';

const officeTemplate = [
  { role: 'Gestionnaire d’immeuble', name: 'Julie Roy', phone: '(450) 555-0100' },
  { role: 'Responsable sécurité', name: '', phone: '' },
  { role: "Coordonnateur d'urgence", name: '', phone: '', isBold: true },
];

describe('refreshEditableRows', () => {
  it('remplace les lignes jamais remplies par le modèle à jour', () => {
    const saved = [
      { id: 'a', role: "Directeur de l'usine", name: '', phone: '' },
      { id: 'b', role: 'Surintendant', name: '', phone: '' },
      { id: 'c', role: "Coordonnateur d'urgence", name: '', phone: '', isBold: true },
    ];
    expect(refreshEditableRows(saved, officeTemplate).map((r) => r.role)).toEqual([
      'Gestionnaire d’immeuble',
      'Responsable sécurité',
      "Coordonnateur d'urgence",
    ]);
  });

  it('garde ce que le conseiller a rempli, sous le même rôle ou en plus', () => {
    const saved = [
      { id: 'c', role: "Coordonnateur d'urgence", name: 'Marc Tremblay', phone: '(450) 555-0111' },
      { id: 'd', role: 'Concierge', name: 'Luc', phone: '(450) 555-0122' },
    ];
    const out = refreshEditableRows(saved, officeTemplate);
    expect(out.find((r) => r.role === "Coordonnateur d'urgence")).toMatchObject({ id: 'c', name: 'Marc Tremblay', isBold: true });
    expect(out[out.length - 1]).toMatchObject({ role: 'Concierge', name: 'Luc' });
    expect(out).toHaveLength(4);
  });

  it('retire l’ancienne ligne GardaWorld codée en dur', () => {
    const saved = [{ role: "Conseillers en prévention incendie et mesures d'urgence", name: 'GardaWorld', phone: '(514) 123-4567', isBold: true }];
    expect(refreshEditableRows(saved, officeTemplate)).toEqual(officeTemplate);
  });
});

describe('refreshExternalRows', () => {
  it('retire l’ancien siège social GardaWorld et ajoute celui de la firme', () => {
    const saved = [
      { role: 'Info-Santé', phone: '8-1-1' },
      { role: 'Siège social de GardaWorld (Montréal)', phone: '(514) 281-2811', isBold: true },
    ];
    const template = [{ role: 'Info-Santé', phone: '8-1-1' }, { role: 'Siège social — Firme Démo', phone: '(514) 555-0000', isBold: true }];
    expect(refreshExternalRows(saved, template).map((r) => r.role)).toEqual(['Info-Santé', 'Siège social — Firme Démo']);
  });
});

describe('refreshSavedModule2', () => {
  it('garde les autres champs enregistrés', () => {
    const out = refreshSavedModule2(
      { section2_1: [{ role: 'Pompier', phone: '9-1-1' }], section2_5Enabled: true, internalEmergencyNumber: 'Poste 2200', section2_2: [] },
      { sections: [{ id: '2.2', entries: officeTemplate }] },
    );
    expect(out).toMatchObject({ section2_5Enabled: true, internalEmergencyNumber: 'Poste 2200', section2_2: officeTemplate });
  });
});

describe('P101 — alerte incendie industrielle', () => {
  it('ne s’ajoute pas à une tour à bureaux à double signal', () => {
    const codes = (config: any) => getActiveProcedures(config, 'PMU', ['ROLE-CU', 'ROLE-EPI', 'ROLE-AS']).map((p) => p.code);
    expect(codes({ buildingType: 'Tour à bureaux', panneauType: 'DOUBLE' })).not.toContain('P101');
    expect(codes({ buildingType: 'Industriel', panneauType: 'DOUBLE' })).toContain('P101');
  });
});
