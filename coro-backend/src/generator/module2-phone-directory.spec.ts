import { generateModule2 } from './module2.templates';

const base: any = {
  clientName: 'Client', buildingName: 'Tour', buildingAddress: '1 rue', city: 'Laval', province: 'QC', year: 2026,
  documentType: 'PMU', responsableNom: 'Patrick Ouellet', responsableTitre: 'Directeur des opérations', dateReleve: '2026-11-24',
  versionDocument: 'Creation initiale', historiqueList: [], floors: 8, hauteurBatiment: true, multiLocataires: true,
  companyName: 'Firme Conseil Démo', companyPhone: '(450) 555-0000', buildingManagerName: 'Patrick Ouellet', responsablePhone: '(450) 555-0177',
  centraleSurveillance: 'Centrale Vigilia', centraleTelephone: '(450) 555-0199', buildingType: 'Tour à bureaux',
};

const section = (m: any, id: string) => m.sections.find((s: any) => s.id === id);
const text = (m: any) => JSON.stringify(m);

describe('Module 2 — liste téléphonique', () => {
  it('uses building-management roles for an office tower and lists the known manager first', () => {
    const m = generateModule2(base).fr;
    const internal = section(m, '2.2').entries;
    expect(internal[0]).toMatchObject({ name: 'Patrick Ouellet', phone: '(450) 555-0177' });
    expect(text(section(m, '2.2'))).not.toMatch(/usine|Surintendant/);
  });

  it('keeps plant roles for an industrial building', () => {
    expect(text(section(generateModule2({ ...base, buildingType: 'Industriel' }).fr, '2.2'))).toMatch(/usine/);
  });

  it('prefills the monitoring station and the advisory firm, never a hard-coded firm', () => {
    const m = generateModule2(base).fr;
    const contractors = section(m, '2.3').entries;
    expect(contractors[0]).toMatchObject({ name: 'Centrale Vigilia', phone: '(450) 555-0199' });
    expect(contractors.at(-1)).toMatchObject({ name: 'Firme Conseil Démo', phone: '(450) 555-0000' });
    expect(text(m)).not.toMatch(/GardaWorld|123-4567|281-2811/);
    expect(text(section(m, '2.4'))).toMatch(/Siège social — Firme Conseil Démo/);
    expect(text(generateModule2(base).en)).not.toMatch(/GardaWorld/);
  });
});
