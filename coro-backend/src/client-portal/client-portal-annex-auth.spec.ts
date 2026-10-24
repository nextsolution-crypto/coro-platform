import { NotFoundException } from '@nestjs/common';

jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

const { ClientPortalService } = require('./client-portal.service');

describe('ClientPortalService annex resource authorization', () => {
  const prisma = {
    project: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projectComment: { findMany: jest.fn(), create: jest.fn() },
    projectVersion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    documentEngagement: { findMany: jest.fn(), create: jest.fn() },
    documentSignature: { findFirst: jest.fn(), create: jest.fn() },
  };
  const exportService = { generatePdf: jest.fn() };
  const storageService = { uploadFile: jest.fn() };
  const emailService = { sendDocumentSigned: jest.fn() };
  const notificationsService = { create: jest.fn() };
  const service = new ClientPortalService(
    prisma as any,
    exportService as any,
    storageService as any,
    emailService as any,
    {} as any,
    notificationsService as any,
    {} as any,
    {} as any,
    {} as any,
  );
  const manager = {
    sub: 'manager-a',
    email: 'manager-a@example.invalid',
    clientId: 'client-a',
    organizationId: 'org-a',
    role: 'CLIENT_MANAGER',
    buildingIds: ['building-a'],
  };
  const corporate = {
    ...manager,
    sub: 'corporate-a',
    role: 'CLIENT_CORPORATE',
    buildingIds: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails closed before reading or writing any annex resource', async () => {
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      service.getComments('project-b', manager),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.addComment(
        'project-b',
        manager,
        'Unauthorized comment',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getProjectVersionHistory('project-b', manager),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getEngagement('project-b', manager),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.trackEngagement(
        {
          projectId: 'project-b',
          clientUserId: manager.sub,
          event: 'opened',
        },
        manager,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getSignatureStatus('project-b', manager),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.signDocument('project-b', manager, {
        fullName: 'Unauthorized actor',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.retryOfficialPdfGeneration('project-b', manager),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.projectComment.findMany).not.toHaveBeenCalled();
    expect(prisma.projectComment.create).not.toHaveBeenCalled();
    expect(prisma.projectVersion.findMany).not.toHaveBeenCalled();
    expect(prisma.projectVersion.findFirst).not.toHaveBeenCalled();
    expect(prisma.documentEngagement.findMany).not.toHaveBeenCalled();
    expect(prisma.documentEngagement.create).not.toHaveBeenCalled();
    expect(prisma.documentSignature.findFirst).not.toHaveBeenCalled();
    expect(prisma.documentSignature.create).not.toHaveBeenCalled();
    expect(exportService.generatePdf).not.toHaveBeenCalled();
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(emailService.sendDocumentSigned).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('uses organization, client and assigned buildings for a manager', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
    });
    prisma.projectComment.findMany.mockResolvedValue([]);

    await expect(service.getComments('project-a', manager)).resolves.toEqual(
      [],
    );
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-a',
        organizationId: 'org-a',
        clientId: 'client-a',
        buildingId: { in: ['building-a'] },
      },
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        buildingId: true,
      },
    });
  });

  it('preserves explicit corporate organization scope without client narrowing', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-b',
      organizationId: 'org-a',
      clientId: 'client-b',
      buildingId: 'building-b',
    });
    prisma.projectVersion.findMany.mockResolvedValue([]);

    await expect(
      service.getProjectVersionHistory('project-b', corporate),
    ).resolves.toEqual([]);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-b', organizationId: 'org-a' },
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        buildingId: true,
      },
    });
  });

  it('records the authenticated ClientUser as the typed author and ignores browser authorship', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
    });
    prisma.projectComment.create.mockResolvedValue({ id: 'comment-a' });

    await service.addComment(
      'project-a',
      { ...manager, userId: 'forged-internal-user' },
      'Canonical client comment',
    );

    expect(prisma.projectComment.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-a',
        actorType: 'CLIENT_USER',
        clientUserId: 'manager-a',
        organizationId: 'org-a',
        contenu: '[Portail client] Canonical client comment',
      },
    });
  });

  it('presents internal and client authors through the compatible author view', async () => {
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
    });
    prisma.projectComment.findMany.mockResolvedValue([
      {
        id: 'internal-comment',
        actorType: 'INTERNAL_USER',
        user: { firstName: 'Internal', lastName: 'Author', role: 'ADVISOR' },
        clientUser: null,
      },
      {
        id: 'client-comment',
        actorType: 'CLIENT_USER',
        user: null,
        clientUser: {
          firstName: 'Client',
          lastName: 'Author',
          role: 'CLIENT_MANAGER',
        },
      },
    ]);

    const comments = await service.getComments('project-a', manager);

    expect(comments).toEqual([
      expect.objectContaining({
        id: 'internal-comment',
        user: expect.objectContaining({ firstName: 'Internal' }),
      }),
      expect.objectContaining({
        id: 'client-comment',
        user: expect.objectContaining({ firstName: 'Client' }),
      }),
    ]);
    expect(comments[1]).not.toHaveProperty('clientUser');
  });
});
