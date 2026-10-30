import { BuildingsService } from './buildings.service';
import { BuildingDocumentsService } from '../building-documents/building-documents.service';

describe('Organization buildings audit characterizations', () => {
  it('reproduces the unscoped direct project lookup for a known building id', async () => {
    const prisma: any = { project: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new BuildingsService(prisma, {} as any);

    await service.findProjects('building-from-another-tenant');

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { buildingId: 'building-from-another-tenant' } }),
    );
    expect(prisma.project.findMany.mock.calls[0][0].where.organizationId).toBeUndefined();
  });

  it('reproduces assignment of a foreign existing ClientUser by email', async () => {
    const foreign = {
      id: 'foreign-user',
      email: 'manager@example.test',
      organizationId: 'org-b',
      clientId: 'client-b',
      buildingIds: [],
    };
    const prisma: any = {
      clientUser: {
        findUnique: jest.fn().mockResolvedValue(foreign),
        update: jest.fn().mockResolvedValue({ ...foreign, buildingIds: ['building-a'] }),
      },
    };
    const service = new BuildingsService(prisma, {} as any);

    await service.createManagerAccess(
      'building-a',
      'client-a',
      'org-a',
      foreign.email,
      'Synthetic',
      'Manager',
    );

    expect(prisma.clientUser.update).toHaveBeenCalledWith({
      where: { email: foreign.email },
      data: { buildingIds: { push: 'building-a' } },
    });
  });

  it('shows that inherited project documents are listed but excluded by the content query', async () => {
    const prisma: any = {
      projectFile: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const files: any = { getAuthorizedContent: jest.fn() };
    const service = new BuildingDocumentsService(prisma, files);
    jest.spyOn(service, 'access').mockResolvedValue({
      building: { id: 'building-a', name: 'A', clientId: 'client-a', responsableEmail: null },
      canUpload: false,
      canManage: false,
    } as any);

    await expect(
      service.content(
        { type: 'CLIENT_USER', id: 'client-user-a', organizationId: 'org-a' } as any,
        'building-a',
        'project-file-with-null-building-id',
      ),
    ).rejects.toThrow();

    expect(prisma.projectFile.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'project-file-with-null-building-id',
        organizationId: 'org-a',
        buildingId: 'building-a',
        visibility: 'shared',
      }),
      select: expect.any(Object),
    });
  });
});
