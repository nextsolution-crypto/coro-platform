import { ProjectFilesClientController } from './project-files-client.controller';

describe('ProjectFilesClientController live client perimeter', () => {
  const files = { getFilesForProject: jest.fn() };
  const offline = { issueLease: jest.fn() };
  const prisma: any = {
    clientUser: { findFirst: jest.fn() },
    buildingDocumentGrant: { findMany: jest.fn(async () => []) },
    building: { findMany: jest.fn() },
    customerPortfolioAssignment: { findMany: jest.fn(async () => []) },
    customerPortfolioBuildingMembership: { findMany: jest.fn(async () => []) },
  };
  const controller = new ProjectFilesClientController(
    prisma,
    files as never,
    offline as never,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.buildingDocumentGrant.findMany.mockResolvedValue([]);
  });
  it('preserves corporate access across the authorized organization', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({
      clientId: 'client-a',
      role: 'CLIENT_CORPORATE',
      buildingIds: [],
    });
    prisma.building.findMany.mockResolvedValue([{ id: 'building-a' }]);
    await controller.getFiles(
      'project-a',
      { clientUser: { sub: 'user-a', organizationId: 'org-a' } },
      'shared',
    );
    expect(prisma.building.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-a' },
      }),
    );
    expect(files.getFilesForProject).toHaveBeenCalledWith(
      'project-a',
      'shared',
      'org-a',
      ['building-a'],
    );
  });
  it('uses current manager assignments and explicit grants, ignoring stale token building IDs', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({
      clientId: 'client-a',
      role: 'CLIENT_MANAGER',
      buildingIds: ['building-a'],
    });
    prisma.buildingDocumentGrant.findMany.mockResolvedValue([
      { buildingId: 'building-b' },
    ]);
    prisma.building.findMany.mockResolvedValue([
      { id: 'building-a' },
      { id: 'building-b' },
    ]);
    await controller.issueOfflineLease(
      'file-a',
      { deviceId: 'device-a' },
      {
        clientUser: {
          sub: 'user-a',
          organizationId: 'org-a',
          buildingIds: ['forged'],
        },
      },
    );
    expect(prisma.building.findMany.mock.calls[0][0].where.OR[0].id.in).toEqual(
      ['building-a', 'building-b'],
    );
    expect(offline.issueLease).toHaveBeenCalledWith(
      expect.objectContaining({
        permittedBuildingIds: ['building-a', 'building-b'],
      }),
    );
  });
  it('fails closed for inactive accounts', async () => {
    prisma.clientUser.findFirst.mockResolvedValue(null);
    await controller.getFiles('project-a', {
      clientUser: { sub: 'inactive', organizationId: 'org-a' },
    });
    expect(files.getFilesForProject).toHaveBeenCalledWith(
      'project-a',
      'shared',
      'org-a',
      [],
    );
  });
});
