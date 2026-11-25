import { ProjectsService } from './projects.service';

const actor = { userId: 'u', organizationId: 'org-a', role: 'OPERATOR' } as any;

function serviceWith(content: any) {
  const prisma: any = {
    project: { findFirst: jest.fn().mockResolvedValue({ id: 'p', documentType: 'PMU' }) },
    document: { findFirst: jest.fn().mockResolvedValue({ content }) },
    buildingPlan: { count: jest.fn().mockResolvedValue(0) },
    module7Data: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  return new ProjectsService(prisma);
}

const generated = {
  modules_fr: [{
    moduleNumber: 2,
    sections: [
      { id: '2.1', entries: [{ role: 'Pompier', name: '9-1-1' }, { role: 'Police', name: '9-1-1' }, { role: 'Ambulance', name: '9-1-1' }] },
      { id: '2.2', entries: [{ role: 'Gestionnaire', name: '', phone: '' }] },
      { id: '2.3', entries: [{ role: 'Centrale', name: '', phone: '' }] },
    ],
  }],
};

const contacts = (details: any[]) => details.find((d) => d.label.startsWith('Liste téléphonique'));

describe('Score de qualité — liste téléphonique', () => {
  it('ne compte pas le 9-1-1 ni les lignes vides', async () => {
    const score = await serviceWith(generated).calculateQualityScore('p', actor);
    expect(contacts(score.details)).toMatchObject({ earned: 0, ok: false });
    expect(contacts(score.details).label).toContain('0 contact rempli sur 3 requis');
  });

  it('compte les contacts enregistrés avec nom et téléphone', async () => {
    const content = {
      ...generated,
      module2: {
        section2_2: [{ role: 'Gestionnaire', name: 'Patrick Ouellet', phone: '450 555-0177' }, { role: 'Sécurité', name: 'Léa', phone: '' }],
        section2_3: [{ role: 'Centrale', name: 'Vigilia', phone: '450 555-0199' }, { role: 'Électricien', name: 'Élec Plus', phone: '450 555-0123' }],
      },
    };
    const score = await serviceWith(content).calculateQualityScore('p', actor);
    expect(contacts(score.details)).toMatchObject({ earned: 10, ok: true, label: 'Liste téléphonique (min. 3 contacts)' });
  });
});
