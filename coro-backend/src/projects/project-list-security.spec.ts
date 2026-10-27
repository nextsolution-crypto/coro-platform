import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

const operator = {
  userId: 'operator-1',
  organizationId: 'org-1',
  role: 'OPERATOR',
} as const;

describe('ProjectsService project-list security', () => {
  const prisma: any = {
    project: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    organization: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma);
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));
  });

  it('refuses an archived or inaccessible update without a second write', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: 'archived-1', status: 'ARCHIVED', updatedAt: new Date('2026-01-01'), organizationId: 'org-1', clientId: 'client-1', buildingId: 'building-1' });

    await expect(
      service.update('archived-1', { name: 'changed', expectedUpdatedAt: '2026-01-01T00:00:00.000Z' }, operator),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.project.updateMany).not.toHaveBeenCalled();
  });

  it('updates an eligible project and reloads it through canonical access', async () => {
    prisma.project.updateMany.mockResolvedValue({ count: 1 });
    prisma.project.findFirst
      .mockResolvedValueOnce({ id: 'project-1', status: 'DRAFT', updatedAt: new Date('2026-01-01'), organizationId: 'org-1', clientId: 'client-1', buildingId: 'building-1' })
      .mockResolvedValueOnce({ id: 'project-1' });

    await expect(
      service.update('project-1', { name: 'Updated', expectedUpdatedAt: '2026-01-01T00:00:00.000Z' }, operator),
    ).resolves.toEqual({ id: 'project-1' });

    expect(prisma.project.updateMany.mock.calls[0][0].data).toEqual({
      name: 'Updated',
      lastEditedById: 'operator-1',
    });
  });

  it('refuses deactivation of an archived project without side effects', async () => {
    prisma.project.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.remove('archived-1', operator)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.project.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rolls back a bulk request when one project is not eligible', async () => {
    const tx = {
      project: { count: jest.fn().mockResolvedValue(1), updateMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    await expect(
      service.bulkDeactivate(['project-1', 'archived-1'], operator),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.project.updateMany).not.toHaveBeenCalled();
  });

  it('deactivates an eligible unique selection in one transaction', async () => {
    const tx = {
      project: {
        count: jest.fn().mockResolvedValue(2),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));

    await expect(
      service.bulkDeactivate(['project-1', 'project-1', 'project-2'], operator),
    ).resolves.toEqual({ count: 2 });
    expect(tx.project.updateMany).toHaveBeenCalledTimes(1);
  });

  it('returns only active responsible users from projects visible to the actor', async () => {
    prisma.project.findMany.mockResolvedValue([
      {
        user: {
          id: 'active',
          firstName: 'Alice',
          lastName: 'Active',
          isActive: true,
        },
      },
      {
        user: {
          id: 'revoked',
          firstName: 'Rita',
          lastName: 'Revoked',
          isActive: false,
        },
      },
      {
        user: {
          id: 'active',
          firstName: 'Alice',
          lastName: 'Active',
          isActive: true,
        },
      },
    ]);

    await expect(service.getFilterUsers(operator)).resolves.toEqual([
      { id: 'active', firstName: 'Alice', lastName: 'Active' },
    ]);
    expect(prisma.project.findMany.mock.calls[0][0].where).toMatchObject({
      organizationId: 'org-1',
      isActive: true,
    });
  });
});
