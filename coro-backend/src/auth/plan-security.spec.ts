import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfiguratorService } from '../configurator/configurator.service';
import { VersionsService } from '../versions/versions.service';
import { ApprovalService } from '../approval/approval.service';
import { ProjectFilesService } from '../project-files/project-files.service';
import { PcaConfiguratorService } from '../pca/pca-configurator/pca-configurator.service';
import { ProjectsService } from '../projects/projects.service';

jest.mock('../export/export.service', () => ({
  ExportService: class ExportService {},
}));

const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };
const operator = {
  userId: 'operator-a',
  organizationId: 'org-a',
  role: 'OPERATOR',
};

describe('plan document security boundaries', () => {
  it('applies canonical assignment scope to project listing and detail reads', async () => {
    const prisma: any = {
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'project-a' }),
      },
    };
    const service = new ProjectsService(prisma);

    await service.findAll(operator);
    await service.findOne('project-a', operator);

    for (const call of [
      prisma.project.findMany.mock.calls[0][0],
      prisma.project.findFirst.mock.calls[0][0],
    ]) {
      expect(call.where).toEqual(
        expect.objectContaining({
          organizationId: 'org-a',
          OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }],
        }),
      );
    }
  });

  it.each(['update', 'delete'] as const)(
    'denies an unassigned same-tenant OPERATOR project %s with zero mutation',
    async (operation) => {
      const prisma: any = {
        project: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      };
      const service = new ProjectsService(prisma);
      const action =
        operation === 'update'
          ? service.update('project-a', { name: 'Blocked' }, operator)
          : service.remove('project-a', operator);
      await expect(action).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.project.update).not.toHaveBeenCalled();
    },
  );

  it('rejects cross-organization project creation before database access', async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn() },
      project: { create: jest.fn() },
    };
    const service = new ProjectsService(prisma);
    await expect(
      service.create(
        {
          name: 'Foreign',
          documentType: 'PMU',
          year: 2026,
          clientId: 'client-b',
          buildingId: 'building-b',
          userId: operator.userId,
          organizationId: 'org-b',
        },
        operator,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it('rejects project reassignment and protected lifecycle updates', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: 'project-a' }),
        update: jest.fn(),
      },
    };
    const service = new ProjectsService(prisma);
    await expect(
      service.update('project-a', { userId: 'operator-c' }, operator),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.update('project-a', { status: 'VALIDATED' }, operator),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('denies unauthorized submission and revision requests before mutation', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const service = new ApprovalService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(service.submit('project-a', operator)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.requestRevision('project-a', operator, 'Blocked'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('allows an ADMIN to request revision for a valid project lifecycle', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'project-a',
          status: 'REVIEW',
          submittedById: 'operator-a',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Admin' }) },
    };
    const notifications: any = { create: jest.fn().mockResolvedValue({}) };
    const service = new ApprovalService(
      prisma,
      notifications,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(
      service.requestRevision('project-a', admin, 'Changes required'),
    ).resolves.toMatchObject({ status: 'IN_PROGRESS' });
    expect(prisma.project.update).toHaveBeenCalledTimes(1);
  });

  it('denies configuration reads and writes before exposing or mutating a foreign project', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const rules: any = { analyzeConfiguration: jest.fn().mockReturnValue({}) };
    const service = new ConfiguratorService(prisma, rules);

    await expect(
      service.getConfiguration('project-b', admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.saveConfiguration('project-b', {} as any, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'project-b',
          organizationId: 'org-a',
        }),
      }),
    );
    expect(prisma.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'project-b',
          organizationId: 'org-a',
        }),
      }),
    );
  });

  it('keeps operator project assignment in the canonical configuration predicate', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn().mockResolvedValue({ configData: {} }) },
    };
    const service = new ConfiguratorService(prisma, {
      analyzeConfiguration: jest.fn(),
    } as any);
    await service.getConfiguration('project-a', operator);
    expect(prisma.project.findFirst.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        organizationId: 'org-a',
        OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }],
      }),
    );
  });

  it('denies PCA reads and writes before accessing nested cross-tenant resources', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      pcaConfig: { upsert: jest.fn() },
      procedureDefault: { findMany: jest.fn() },
      procedureOverride: { findMany: jest.fn(), upsert: jest.fn() },
    };
    const service = new PcaConfiguratorService(prisma);

    await expect(service.getConfig('pca-b', operator)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.saveConfig('pca-b', operator, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getPcaProcedures(operator, 'pca-b'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
          OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }],
        }),
      }),
    );
    expect(prisma.pcaConfig.upsert).not.toHaveBeenCalled();
    expect(prisma.procedureDefault.findMany).not.toHaveBeenCalled();
  });

  it.each(['list', 'restore', 'delete'] as const)(
    'denies cross-tenant version %s with zero version mutation',
    async (operation) => {
      const prisma: any = {
        project: { findFirst: jest.fn().mockResolvedValue(null) },
        projectVersion: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          delete: jest.fn(),
          create: jest.fn(),
        },
        document: { findFirst: jest.fn(), update: jest.fn() },
      };
      const service = new VersionsService(prisma);
      const action =
        operation === 'list'
          ? service.findAll('project-b', admin)
          : operation === 'restore'
            ? service.restore('project-b', 'version-b', admin)
            : service.remove('project-b', 'version-b', admin);
      await expect(action).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.projectVersion.create).not.toHaveBeenCalled();
      expect(prisma.projectVersion.delete).not.toHaveBeenCalled();
      expect(prisma.document.update).not.toHaveBeenCalled();
    },
  );

  it('rejects an OPERATOR approver before reading or mutating the project', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn(), update: jest.fn() },
      projectVersion: { create: jest.fn() },
    };
    const service = new ApprovalService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(
      service.approve(
        'project-a',
        operator.userId,
        operator.organizationId,
        operator.role,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
    expect(prisma.projectVersion.create).not.toHaveBeenCalled();
  });

  it('preserves separation of duties for an authorized approver', async () => {
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'project-a',
          status: 'REVIEW',
          submittedById: 'admin-a',
        }),
      },
      projectVersion: { findFirst: jest.fn(), create: jest.fn() },
    };
    const service = new ApprovalService(
      prisma,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(
      service.approve(
        'project-a',
        admin.userId,
        admin.organizationId,
        admin.role,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.projectVersion.create).not.toHaveBeenCalled();
  });

  it('allows a second ADMIN to use the canonical versioned approval workflow', async () => {
    const project = {
      id: 'project-a',
      status: 'REVIEW',
      submittedById: 'submitter-a',
      documentType: 'PMU',
      client: { name: 'Client test' },
      building: { name: 'Building test' },
    };
    const prisma: any = {
      project: {
        findFirst: jest.fn().mockResolvedValue(project),
        update: jest.fn().mockResolvedValue({}),
      },
      projectVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ firstName: 'Ada', lastName: 'Admin' }),
      },
      clientUser: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const notifications: any = { create: jest.fn().mockResolvedValue({}) };
    const email: any = { send: jest.fn().mockResolvedValue({}) };
    const exporter: any = { generatePdf: jest.fn().mockResolvedValue({}) };
    const storage: any = { uploadFile: jest.fn() };
    const service = new ApprovalService(
      prisma,
      notifications,
      email,
      exporter,
      storage,
    );

    await expect(
      service.approve('project-a', 'approver-a', 'org-a', 'ADMIN'),
    ).resolves.toMatchObject({
      status: 'VALIDATED',
      version: 1,
    });
    expect(prisma.projectVersion.create).toHaveBeenCalledTimes(1);
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'VALIDATED' }),
      }),
    );
  });

  it('denies foreign file metadata and download without storage access', async () => {
    const prisma: any = {
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      projectFile: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    };
    const storage: any = { getFile: jest.fn() };
    const service = new ProjectFilesService(prisma, storage, {} as any);
    await expect(
      service.getFilesForProject('project-b', undefined, 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getSignedUrl('file-b', 'org-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectFile.findMany).not.toHaveBeenCalled();
    expect(storage.getFile).not.toHaveBeenCalled();
  });
});
