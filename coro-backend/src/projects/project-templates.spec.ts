import {
  configForNextYear,
  configFromTemplate,
  nextYearName,
  ProjectsService,
} from './projects.service';

describe('Modèles et duplication de projet', () => {
  it('un modèle retire les réponses propres au document d’origine', () => {
    const config = configFromTemplate({
      projectConfig: {
        province: 'Quebec',
        responsableNom: 'Jean',
        dateReleve: '2026-01-10',
        versionDocument: '3',
        historiqueList: [{ date: '2025-01-01' }],
        floors: 12,
      },
    });
    expect(config).toEqual({ province: 'Quebec', floors: 12 });
  });

  it('un modèle sans configuration ne produit rien', () => {
    expect(configFromTemplate({ projectConfig: null })).toBeNull();
    expect(configFromTemplate(null)).toBeNull();
  });

  it('la copie pour l’année suivante garde tout sauf la date du relevé', () => {
    expect(
      configForNextYear({ dateReleve: '2026-01-10', historiqueList: [1], floors: 3 }),
    ).toEqual({ historiqueList: [1], floors: 3 });
  });

  it('le nom passe à l’année suivante', () => {
    expect(nextYearName('PMU Tour ABC 2026', 2026)).toBe('PMU Tour ABC 2027');
    expect(nextYearName('PMU Tour ABC', 2026)).toBe('PMU Tour ABC 2027');
  });

  it('refuse un modèle d’un autre type de document', async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ licenseType: 'ENTERPRISE' }) },
      project: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      building: { findFirst: jest.fn().mockResolvedValue({ id: 'b1', clientId: 'c1' }) },
      projectTemplate: {
        findFirst: jest.fn().mockResolvedValue({ documentType: 'PSI', configData: {} }),
      },
    };
    const service = new ProjectsService(prisma);
    const actor: any = { userId: 'u1', organizationId: 'o1', role: 'OPERATOR' };
    await expect(
      service.create(
        { name: 'P', documentType: 'PMU', year: 2027, buildingId: 'b1', userId: 'u1', organizationId: 'o1', templateId: 't1' },
        actor,
      ),
    ).rejects.toThrow('autre type de document');
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it('applique la configuration du modèle à la création', async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ licenseType: 'ENTERPRISE' }) },
      project: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ id: 'p2' }) },
      building: { findFirst: jest.fn().mockResolvedValue({ id: 'b1', clientId: 'c1' }) },
      projectTemplate: {
        findFirst: jest.fn().mockResolvedValue({
          documentType: 'PMU',
          configData: { projectConfig: { floors: 5, responsableNom: 'X' } },
        }),
      },
    };
    const service = new ProjectsService(prisma);
    await service.create(
      { name: 'P', documentType: 'PMU', year: 2027, buildingId: 'b1', userId: 'u1', organizationId: 'o1', templateId: 't1' },
      { userId: 'u1', organizationId: 'o1', role: 'OPERATOR' } as any,
    );
    expect(prisma.project.create.mock.calls[0][0].data.configData).toEqual({ floors: 5 });
  });
});
