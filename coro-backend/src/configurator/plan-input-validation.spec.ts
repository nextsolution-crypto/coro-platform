import { BadRequestException } from '@nestjs/common';
import { validateBuildingConfig, assertPlainJsonObject } from './config-validation';
import { missingRequiredPlanFields, planRequiresConfiguratorCompleteness } from './plan-completeness';
import { decodeDocxUpload } from './import.service';

jest.mock('mammoth', () => ({}));

const fields = [
  { key: 'responsableNom', label: 'Nom du responsable du plan', type: 'text' },
  { key: 'floors', label: "Nombre d'étages", type: 'number' },
  { key: 'quartsOccupation', label: 'Quarts', type: 'dynamic_list' },
];

describe('schémas serveur (M1-06)', () => {
  it('accepte une configuration existante, champs inconnus compris', () => {
    expect(
      validateBuildingConfig(
        { responsableNom: 'A', floors: '4', quartsOccupation: [], pointRassemblement_coords: { lat: 45.5 } },
        fields,
      ),
    ).toBeTruthy();
  });

  it('nomme le champ dont le type est faux', () => {
    expect(() => validateBuildingConfig({ responsableNom: { x: 1 } }, fields)).toThrow(
      'Le champ « Nom du responsable du plan » doit être une valeur simple.',
    );
    expect(() => validateBuildingConfig({ quartsOccupation: 'non' }, fields)).toThrow('doit être une liste');
    expect(() => validateBuildingConfig({ floors: 'beaucoup' }, fields)).toThrow('doit être un nombre');
  });

  it('refuse les formes dangereuses ou démesurées', () => {
    expect(() => validateBuildingConfig([], fields)).toThrow(BadRequestException);
    expect(() => assertPlainJsonObject(JSON.parse('{"__proto__":{"x":1}}'), 'Configuration')).toThrow(
      'Nom de champ invalide',
    );
    let deep: any = {};
    const root = deep;
    for (let i = 0; i < 12; i++) deep = deep.n = {};
    expect(() => assertPlainJsonObject(root, 'Configuration')).toThrow('trop imbriquées');
    expect(() => assertPlainJsonObject({ big: 'x'.repeat(2048) }, 'Configuration', 1024)).toThrow('trop volumineux');
  });

  it('valide un import Word', () => {
    const docx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2]).toString('base64');
    expect(decodeDocxUpload(`data:application/vnd;base64,${docx}`).subarray(0, 2).toString()).toBe('PK');
    expect(() => decodeDocxUpload(undefined)).toThrow('Fichier Word manquant');
    expect(() => decodeDocxUpload(Buffer.from('%PDF-1.7').toString('base64'))).toThrow('document Word');
    expect(() => decodeDocxUpload('<script>')).toThrow('illisible');
  });
});

describe('complétude bloquante avant soumission (M1-08)', () => {
  it('liste les champs obligatoires manquants', () => {
    const missing = missingRequiredPlanFields({ province: 'Quebec', floors: 0, responsableNom: '  ' });
    expect(missing.map((f) => f.key)).toEqual([
      'responsableNom',
      'dateReleve',
      'buildingType',
      'usagePrincipal',
      'floors',
      'posteCommandement',
      'pointRassemblement',
      'lieuDocument',
    ]);
    expect(missingRequiredPlanFields(null)).toHaveLength(9);
  });

  it('ne vise que PMU et PSI', () => {
    expect(planRequiresConfiguratorCompleteness('PMU')).toBe(true);
    expect(planRequiresConfiguratorCompleteness('PSI')).toBe(true);
    expect(planRequiresConfiguratorCompleteness('PCA')).toBe(false);
  });
});
