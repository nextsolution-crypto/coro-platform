import { ProjectFilesClientController } from './project-files-client.controller';

describe('ProjectFilesClientController building scope', () => {
  const projectFiles = {
    getFilesForProject: jest.fn(),
  };
  const offlineDocuments = {
    issueLease: jest.fn(),
  };
  const controller = new ProjectFilesClientController(
    projectFiles as never,
    offlineDocuments as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('preserves organization-wide access for CLIENT_CORPORATE', async () => {
    await controller.getFiles(
      'project-1',
      {
        clientUser: {
          role: 'CLIENT_CORPORATE',
          organizationId: 'org-1',
          buildingIds: [],
        },
      },
      'shared',
    );

    expect(projectFiles.getFilesForProject).toHaveBeenCalledWith(
      'project-1',
      'shared',
      'org-1',
      undefined,
    );
  });

  it.each([
    ['zero buildings', []],
    ['one building', ['building-1']],
    ['multiple buildings', ['building-1', 'building-2']],
  ])('preserves CLIENT_MANAGER scope with %s', async (_label, buildingIds) => {
    await controller.getFiles(
      'project-1',
      {
        clientUser: {
          role: 'CLIENT_MANAGER',
          organizationId: 'org-1',
          buildingIds,
        },
      },
      'shared',
    );

    expect(projectFiles.getFilesForProject).toHaveBeenCalledWith(
      'project-1',
      'shared',
      'org-1',
      buildingIds,
    );
  });

  it('applies the same corporate scope to offline lease issuance', async () => {
    await controller.issueOfflineLease(
      'file-1',
      { deviceId: 'device-1' },
      {
        clientUser: {
          sub: 'user-1',
          role: 'CLIENT_CORPORATE',
          organizationId: 'org-1',
          buildingIds: [],
        },
      },
    );

    expect(offlineDocuments.issueLease).toHaveBeenCalledWith({
      clientUserId: 'user-1',
      organizationId: 'org-1',
      permittedBuildingIds: undefined,
      deviceId: 'device-1',
      fileId: 'file-1',
    });
  });
});
