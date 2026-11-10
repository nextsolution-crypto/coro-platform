import { DisplayPdfMaintenanceService } from './display-pdf-maintenance.service';

describe('DisplayPdfMaintenanceService', () => {
  const prisma = {
    displayPdfRenderJob: { findMany: jest.fn() },
    displayPlanPublication: { findMany: jest.fn() },
  };
  const service = new DisplayPdfMaintenanceService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('prévisualise la rétention sans mutation et protège les publications actives', async () => {
    prisma.displayPdfRenderJob.findMany.mockResolvedValue([
      { id: 'old-failed' },
    ]);
    const result = await service.previewJobRetention(
      new Date('2026-11-10T00:00:00Z'),
    );
    expect(result.dryRun).toBe(true);
    expect(result.candidates).toEqual([{ id: 'old-failed' }]);
    expect(prisma.displayPdfRenderJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest asymmetric matchers are typed as any by @types/jest.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          publication: {
            status: { notIn: ['REVIEW', 'APPROVED', 'PUBLISHED', 'SUSPENDED'] },
          },
        }),
      }),
    );
  });

  it('ne signale que les objets anciens, non référencés et non protégés', async () => {
    prisma.displayPdfRenderJob.findMany.mockResolvedValue([
      {
        outputStorageKey:
          'tenant-o/display-plan-publications/draft/pdf-raster-kept.png',
      },
    ]);
    prisma.displayPlanPublication.findMany.mockResolvedValue([
      {
        id: 'approved',
        organizationId: 'o',
        status: 'APPROVED',
        variantStorageKey:
          'tenant-o/display-plan-publications/approved/variant-kept.svg',
      },
      {
        id: 'draft',
        organizationId: 'o',
        status: 'DRAFT',
        variantStorageKey: null,
      },
    ]);
    const old = new Date('2026-10-01T00:00:00Z');
    const result = await service.previewOrphanPrivateObjects(
      [
        {
          key: 'tenant-o/display-plan-publications/draft/pdf-raster-kept.png',
          sizeBytes: 10,
          lastModified: old,
        },
        {
          key: 'tenant-o/display-plan-publications/approved/pdf-raster-unreferenced.png',
          sizeBytes: 20,
          lastModified: old,
        },
        {
          key: 'tenant-o/display-plan-publications/draft/pdf-raster-orphan.png',
          sizeBytes: 30,
          lastModified: old,
        },
        { key: 'unrelated/private.txt', sizeBytes: 40, lastModified: old },
      ],
      new Date('2026-11-10T00:00:00Z'),
    );
    expect(result).toEqual(
      expect.objectContaining({
        dryRun: true,
        candidateCount: 1,
        candidateBytes: 30,
      }),
    );
    expect(result.candidates.map((item) => item.key)).toEqual([
      'tenant-o/display-plan-publications/draft/pdf-raster-orphan.png',
    ]);
  });
});
