import { delayKindForActivityCode, startMandateDelay } from './mandate-delay';

function db(mandate: any, rules: any = {}) {
  return {
    projectMandate: {
      findFirst: jest.fn().mockResolvedValue(mandate),
      update: jest.fn().mockResolvedValue({}),
    },
    organization: { findUnique: jest.fn().mockResolvedValue(rules) },
  };
}

describe('Délai du mandat démarré par l’activité', () => {
  it('reconnaît relevé technique et inspections', () => {
    expect(delayKindForActivityCode('releve_technique')).toBe('SURVEY');
    expect(delayKindForActivityCode('inspection_code')).toBe('INSPECTION');
    expect(delayKindForActivityCode('inspection_securite_physique')).toBe('INSPECTION');
    expect(delayKindForActivityCode('formation_epi')).toBeNull();
  });

  it('relevé : 21 jours sous le seuil, à partir de la date de la visite', async () => {
    const d = db({ typeMandat: 'FORFAITAIRE', dateDebutDelai: null, heuresBudgetees: 18, typeDelai: 'STANDARD' });
    const visit = new Date('2026-11-02T14:00:00Z');
    const result = await startMandateDelay(d, 'p1', 'o1', 'SURVEY', visit);
    expect(result?.delaiJours).toBe(21);
    expect(result?.dateDebutDelai.toISOString()).toBe(visit.toISOString());
    expect(result?.dateLimite.toISOString().slice(0, 10)).toBe('2026-11-23');
  });

  it('relevé : 90 jours au-delà du seuil', async () => {
    const d = db({ typeMandat: 'FORFAITAIRE', dateDebutDelai: null, heuresBudgetees: 120, typeDelai: 'STANDARD' });
    expect((await startMandateDelay(d, 'p1', 'o1', 'SURVEY', new Date('2026-11-02')))?.delaiJours).toBe(90);
  });

  it('inspection : délai du rapport réglé par l’organisation', async () => {
    const d = db({ typeMandat: 'FORFAITAIRE', dateDebutDelai: null, heuresBudgetees: 10, typeDelai: 'STANDARD' }, { inspectionReportDeliveryDays: 15 });
    expect((await startMandateDelay(d, 'p1', 'o1', 'INSPECTION', new Date('2026-11-02')))?.delaiJours).toBe(15);
  });

  it('ne redémarre pas un délai déjà lancé ni un mandat horaire', async () => {
    const started = db({ typeMandat: 'FORFAITAIRE', dateDebutDelai: new Date(), heuresBudgetees: 10 });
    expect(await startMandateDelay(started, 'p1', 'o1', 'SURVEY')).toBeNull();
    const hourly = db({ typeMandat: 'HORAIRE', dateDebutDelai: null, heuresBudgetees: 10 });
    expect(await startMandateDelay(hourly, 'p1', 'o1', 'SURVEY')).toBeNull();
    expect(started.projectMandate.update).not.toHaveBeenCalled();
  });
});
