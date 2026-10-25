jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

const { ClientPortalService } = require('./client-portal.service');

describe('ClientPortalService official PDF private storage', () => {
  const project = {
    id: 'project-a',
    organizationId: 'org-a',
    documentType: 'PMU',
    officialPdfFr: null,
    officialPdfEn: null,
  };
  const prisma = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projectVersion: { findFirst: jest.fn() },
    documentSignature: { findFirst: jest.fn() },
  };
  const exportService = { generatePdf: jest.fn() };
  const storageService = {
    storeOfficialPdfImmutable: jest.fn(),
    downloadOfficialPdfReference: jest.fn(),
  };
  const service = new ClientPortalService(
    prisma as any,
    exportService as any,
    storageService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.project.findUnique.mockResolvedValue(project);
    prisma.projectVersion.findFirst.mockResolvedValue({ id: 'version-1' });
    prisma.documentSignature.findFirst.mockResolvedValue({ id: 'signature-1' });
    exportService.generatePdf.mockResolvedValue({
      fr: Buffer.from('%PDF-fr'),
      en: Buffer.from('%PDF-en'),
    });
    storageService.storeOfficialPdfImmutable
      .mockResolvedValueOnce('coro-private:v1:fr')
      .mockResolvedValueOnce('coro-private:v1:en');
    prisma.project.update.mockResolvedValue({});
  });

  it('persiste les deux references uniquement apres les deux stockages prives', async () => {
    const result = await (service as any).generateOfficialPdfs('project-a');

    expect(storageService.storeOfficialPdfImmutable).toHaveBeenNthCalledWith(
      1,
      {
        organizationId: 'org-a',
        projectId: 'project-a',
        projectVersionId: 'version-1',
        language: 'fr',
        bytes: Buffer.from('%PDF-fr'),
      },
    );
    expect(storageService.storeOfficialPdfImmutable).toHaveBeenNthCalledWith(
      2,
      {
        organizationId: 'org-a',
        projectId: 'project-a',
        projectVersionId: 'version-1',
        language: 'en',
        bytes: Buffer.from('%PDF-en'),
      },
    );
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-a' },
      data: {
        officialPdfFr: 'coro-private:v1:fr',
        officialPdfEn: 'coro-private:v1:en',
        exportedAt: expect.any(Date),
        progress: 100,
      },
    });
    expect(result.status).toBe('READY');
  });

  it('ne persiste aucun faux succes si un stockage echoue', async () => {
    storageService.storeOfficialPdfImmutable.mockReset();
    storageService.storeOfficialPdfImmutable
      .mockResolvedValueOnce('coro-private:v1:fr')
      .mockRejectedValueOnce(new Error('PRIVATE_STORAGE_UNAVAILABLE'));

    await expect(
      (service as any).generateOfficialPdfs('project-a'),
    ).rejects.toThrow('PRIVATE_STORAGE_UNAVAILABLE');
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('delegue la recuperation a l autorite de stockage officielle', async () => {
    const bytes = Buffer.from('%PDF-private');
    storageService.downloadOfficialPdfReference.mockResolvedValue(bytes);
    await expect(
      service.downloadOfficialPdf('coro-private:v1:key'),
    ).resolves.toEqual(bytes);
    expect(storageService.downloadOfficialPdfReference).toHaveBeenCalledWith(
      'coro-private:v1:key',
    );
  });
});
