import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectFilesService } from './project-files.service';

describe('ProjectFilesService organization project authority', () => {
  const assigned = {
    userId: 'operator-a',
    organizationId: 'org-a',
    role: 'OPERATOR',
  };
  const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };

  const harness = () => {
    const prisma: any = {
      project: { findFirst: jest.fn() },
      building: { findFirst: jest.fn() },
      projectFile: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const storage: any = {
      uploadPrivateImmutable: jest.fn(),
      downloadPrivate: jest.fn(),
    };
    const notifications: any = { create: jest.fn() };
    return {
      prisma,
      storage,
      notifications,
      service: new ProjectFilesService(prisma, storage, notifications),
    };
  };

  it('applies canonical project scope and active state to the document list', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(null);
    await expect(
      h.service.getFilesForProject(
        'project-b',
        undefined,
        'org-a',
        undefined,
        assigned,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'project-b',
          organizationId: 'org-a',
          isActive: true,
          OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }],
        }),
      }),
    );
    expect(h.prisma.projectFile.findMany).not.toHaveBeenCalled();
  });

  it('authorizes before upload storage and denies archived projects', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(null);
    await expect(
      h.service.uploadFile({
        projectId: 'archived-project',
        organizationId: 'org-a',
        actor: admin,
        name: 'plan.pdf',
        category: 'documents_reference',
        buffer: Buffer.from('pdf'),
        mimeType: 'application/pdf',
        size: 3,
        visibility: 'shared',
        uploadedById: 'admin-a',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.project.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'archived-project',
      organizationId: 'org-a',
      isActive: true,
      status: { not: 'ARCHIVED' },
    });
    expect(h.storage.uploadPrivateImmutable).not.toHaveBeenCalled();
    expect(h.notifications.create).not.toHaveBeenCalled();
  });

  it('does not disclose legacy URLs and downloads an allowlisted stored key', async () => {
    const h = harness();
    const row = {
      id: 'legacy',
      organizationId: 'org-a',
      projectId: 'project-a',
      buildingId: 'building-a',
      name: 'legacy.pdf',
      mimeType: 'application/pdf',
      url: 'https://legacy.example.test/documents/legacy.pdf',
      storageKey: 'documents/legacy.pdf',
      lifecycleState: 'APPROVED',
      effectiveAt: new Date('2026-01-01'),
      expiresAt: null,
      supersededEffectiveAt: null,
    };
    h.prisma.projectFile.findFirst.mockResolvedValue(row);
    h.storage.downloadPrivate.mockResolvedValue(Buffer.from('%PDF-synthetic'));
    await expect(
      h.service.getSignedUrl('legacy', 'org-a', admin),
    ).resolves.toEqual({
      url: '/api/project-files/legacy/content',
      name: 'legacy.pdf',
    });
    await expect(
      h.service.downloadPrivateFile('legacy', 'org-a', undefined, false, admin),
    ).resolves.toMatchObject({
      name: 'legacy.pdf',
      buffer: Buffer.from('%PDF-synthetic'),
    });
    expect(h.storage.downloadPrivate).toHaveBeenCalledWith(
      'documents/legacy.pdf',
    );
  });

  it('rejects unsafe historical storage keys before storage access', async () => {
    const h = harness();
    h.prisma.projectFile.findFirst.mockResolvedValue({
      id: 'legacy',
      organizationId: 'org-a',
      projectId: 'project-a',
      buildingId: 'building-a',
      name: 'legacy.pdf',
      mimeType: 'application/pdf',
      url: 'https://legacy.example.test/x',
      storageKey: 'https://attacker.invalid/file',
      lifecycleState: 'APPROVED',
      effectiveAt: new Date('2026-01-01'),
      expiresAt: null,
      supersededEffectiveAt: null,
    });
    await expect(
      h.service.downloadPrivateFile('legacy', 'org-a', undefined, false, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.storage.downloadPrivate).not.toHaveBeenCalled();
  });
});
