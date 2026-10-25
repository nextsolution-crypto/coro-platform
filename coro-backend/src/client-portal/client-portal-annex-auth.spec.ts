import { ForbiddenException, NotFoundException } from '@nestjs/common';

jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

const { ClientPortalService } = require('./client-portal.service');

describe('ClientPortalService annex resource authorization', () => {
  const prisma = {
    $transaction: jest.fn(),
    project: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
  const emailService = {
    sendDocumentSigned: jest.fn(),
    sendDocumentRefused: jest.fn(),
  };
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
    delete process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS;
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));
  });

  afterAll(() => {
    delete process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS;
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
    expect(emailService.sendDocumentRefused).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('denies pilot signature before creating a signature, PDF, email or notification', async () => {
    process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS = 'org-a';
    prisma.project.findFirst.mockResolvedValueOnce({
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
      status: 'VALIDATED',
    });

    await expect(
      service.signDocument('project-a', manager, { fullName: 'Manager A' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.documentSignature.create).not.toHaveBeenCalled();
    expect(prisma.projectVersion.update).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(exportService.generatePdf).not.toHaveBeenCalled();
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(emailService.sendDocumentSigned).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('denies pilot signature status and PDF retry before exposing URLs or scheduling work', async () => {
    process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS = 'org-a';
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
      status: 'VALIDATED',
    });

    await expect(
      service.getSignatureStatus('project-a', manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.retryOfficialPdfGeneration('project-a', manager),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.projectVersion.findFirst).not.toHaveBeenCalled();
    expect(prisma.documentSignature.findFirst).not.toHaveBeenCalled();
    expect(exportService.generatePdf).not.toHaveBeenCalled();
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('keeps archived pilot projects readable but denies comments without writes', async () => {
    process.env.CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS = 'org-a';
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
      status: 'ARCHIVED',
    });
    prisma.projectVersion.findMany.mockResolvedValue([{ id: 'version-a' }]);

    await expect(
      service.getProjectVersionHistory('project-a', manager),
    ).resolves.toHaveLength(1);
    await expect(
      service.addComment('project-a', manager, 'mutation interdite'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.projectComment.create).not.toHaveBeenCalled();
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
        status: true,
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
        status: true,
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

  it('refuses an out-of-scope document before every mutation and side effect', async () => {
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      service.refuseDocument('project-b', manager, 'Wrong building'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.project.updateMany).not.toHaveBeenCalled();
    expect(prisma.projectComment.create).not.toHaveBeenCalled();
    expect(emailService.sendDocumentRefused).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('fails closed on a role without refusal permission before reading the project', async () => {
    await expect(
      service.refuseDocument(
        'project-a',
        { ...manager, role: 'CLIENT_VIEWER' },
        'Unauthorized role',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.project.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(emailService.sendDocumentRefused).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('atomically records one legitimate refusal with canonical client provenance', async () => {
    const project = {
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
      status: 'VALIDATED',
      userId: 'advisor-a',
      name: 'Plan A',
      client: { name: 'Client A' },
      building: { id: 'building-a' },
      user: { firstName: 'Ada', lastName: 'Advisor', email: 'qa@example.invalid' },
    };
    prisma.project.findFirst
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce(project);
    prisma.project.updateMany.mockResolvedValue({ count: 1 });
    prisma.projectComment.create.mockResolvedValue({ id: 'refusal-a' });

    await expect(
      service.refuseDocument('project-a', manager, '  Revoir la section 3  '),
    ).resolves.toEqual({ success: true, alreadyRefused: false });

    expect(prisma.project.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'project-a',
        organizationId: 'org-a',
        status: { in: ['VALIDATED', 'EXPORTED'] },
      },
      data: { status: 'IN_PROGRESS' },
    });
    expect(prisma.projectComment.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-a',
        actorType: 'CLIENT_USER',
        clientUserId: 'manager-a',
        organizationId: 'org-a',
        contenu: '[Refus client] Revoir la section 3',
      },
    });
    expect(emailService.sendDocumentRefused).toHaveBeenCalledTimes(1);
    expect(notificationsService.create).toHaveBeenCalledTimes(1);
  });

  it('makes an already-applied refusal idempotent without duplicate effects', async () => {
    const project = {
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
      status: 'IN_PROGRESS',
      userId: 'advisor-a',
      client: { name: 'Client A' },
      building: { id: 'building-a' },
      user: { email: 'qa@example.invalid' },
    };
    prisma.project.findFirst
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce(project);

    await expect(
      service.refuseDocument('project-a', manager, 'Repeated refusal'),
    ).resolves.toEqual({ success: true, alreadyRefused: true });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.projectComment.create).not.toHaveBeenCalled();
    expect(emailService.sendDocumentRefused).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('emits no side effect when the transactional refusal record fails', async () => {
    const project = {
      id: 'project-a',
      organizationId: 'org-a',
      clientId: 'client-a',
      buildingId: 'building-a',
      status: 'EXPORTED',
      userId: 'advisor-a',
      client: { name: 'Client A' },
      building: { id: 'building-a' },
      user: { email: 'qa@example.invalid' },
    };
    prisma.project.findFirst
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce(project);
    prisma.project.updateMany.mockResolvedValue({ count: 1 });
    prisma.projectComment.create.mockRejectedValue(new Error('write failed'));

    await expect(
      service.refuseDocument('project-a', manager, 'Atomic failure'),
    ).rejects.toThrow('write failed');

    expect(emailService.sendDocumentRefused).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });
});
