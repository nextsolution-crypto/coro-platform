jest.mock('./export.service', () => ({
  ExportService: class ExportService {},
}));

const { ExportController } = require('./export.controller');

describe('ExportController official PDF private retrieval', () => {
  const prisma = { project: { findFirst: jest.fn() } };
  const storage = { downloadOfficialPdfReference: jest.fn() };
  const controller = new ExportController(
    {} as any,
    {} as any,
    prisma as any,
    storage as any,
  );
  const response = () => {
    const res: any = {
      status: jest.fn(),
      json: jest.fn(),
      set: jest.fn(),
      send: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.set.mockReturnValue(res);
    res.send.mockReturnValue(res);
    return res;
  };
  const request = {
    user: {
      id: 'user-a',
      userId: 'user-a',
      organizationId: 'org-a',
      role: 'ADMIN',
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('autorise la recuperation privee seulement apres resolution du projet', async () => {
    const bytes = Buffer.from('%PDF-private');
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-a',
      documentType: 'PMU',
      name: 'Projet A',
      year: 2026,
      building: { name: 'Bâtiment A' },
      officialPdfFr: 'coro-private:v1:key',
      officialPdfEn: null,
    });
    storage.downloadOfficialPdfReference.mockResolvedValue(bytes);
    const res = response();

    await controller.downloadOfficialPdf(
      'project-a',
      'fr',
      res,
      request,
    );

    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'project-a' }) }),
    );
    expect(storage.downloadOfficialPdfReference).toHaveBeenCalledWith(
      'coro-private:v1:key',
    );
    expect(res.send).toHaveBeenCalledWith(bytes);
  });

  it('ne contacte pas le stockage lorsque le projet est hors perimetre', async () => {
    prisma.project.findFirst.mockResolvedValue(null);
    const res = response();

    await controller.downloadOfficialPdf(
      'project-b',
      'fr',
      res,
      request,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(storage.downloadOfficialPdfReference).not.toHaveBeenCalled();
  });
});
