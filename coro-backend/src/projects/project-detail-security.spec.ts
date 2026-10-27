import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

const operator = { userId: 'operator-a', organizationId: 'org-a', role: 'OPERATOR' };
const current = {
  id: 'project-a', organizationId: 'org-a', clientId: 'client-a',
  buildingId: 'building-a', status: 'DRAFT', updatedAt: new Date('2026-10-26T12:00:00.000Z'),
};

function harness() {
  const prisma: any = {
    project: { findFirst: jest.fn(), updateMany: jest.fn() },
    client: { findFirst: jest.fn() },
    building: { findFirst: jest.fn() },
    document: { findFirst: jest.fn() },
    buildingPlan: { count: jest.fn() },
    module7Data: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((callback: any) => callback(prisma));
  return { prisma, service: new ProjectsService(prisma) };
}

describe('ProjectsService project-detail security', () => {
  it('excludes disabled projects from direct reads', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(null);
    await expect(h.service.findOne('disabled', operator)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.project.findFirst.mock.calls[0][0].where).toMatchObject({ isActive: true, organizationId: 'org-a' });
  });

  it('authorizes quality through canonical project scope and active state', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(null);
    await expect(h.service.calculateQualityScore('project-a', operator)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.project.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'project-a', isActive: true, organizationId: 'org-a',
      OR: [{ userId: 'operator-a' }, { lastEditedById: 'operator-a' }],
    });
  });

  it.each([
    [{ clientId: 'client-b' }, null, { id: 'building-a' }],
    [{ buildingId: 'building-b' }, { id: 'client-a' }, null],
    [{ clientId: 'client-b', buildingId: 'building-b' }, null, null],
  ])('rejects an incoherent partial or complete parent reassignment', async (changes, client, building) => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(current);
    h.prisma.client.findFirst.mockResolvedValue(client);
    h.prisma.building.findFirst.mockResolvedValue(building);
    await expect(h.service.update('project-a', { ...changes, expectedUpdatedAt: current.updatedAt.toISOString() }, operator)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.prisma.project.updateMany).not.toHaveBeenCalled();
  });

  it('rejects unknown and nested reassignment fields before database work', async () => {
    const h = harness();
    await expect(h.service.update('project-a', { client: { connect: { id: 'client-b' } }, expectedUpdatedAt: current.updatedAt.toISOString() }, operator)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ignores absent transformed DTO fields and writes only supplied mutable values', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(current);
    h.prisma.project.updateMany.mockResolvedValue({ count: 1 });
    await expect(
      h.service.update(
        'project-a',
        {
          name: 'Updated project',
          expectedUpdatedAt: current.updatedAt.toISOString(),
          organizationId: undefined,
          userId: undefined,
          client: undefined,
        },
        operator,
      ),
    ).resolves.toEqual(current);
    expect(h.prisma.project.updateMany.mock.calls[0][0].data).toMatchObject({
      name: 'Updated project',
      lastEditedById: 'operator-a',
    });
    expect(h.prisma.project.updateMany.mock.calls[0][0].data).not.toHaveProperty(
      'organizationId',
    );
  });

  it('atomically rejects a stale update', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue({ ...current, updatedAt: new Date('2026-10-26T12:01:00.000Z') });
    await expect(h.service.update('project-a', { name: 'stale', expectedUpdatedAt: current.updatedAt.toISOString() }, operator)).rejects.toBeInstanceOf(ConflictException);
    expect(h.prisma.project.updateMany).not.toHaveBeenCalled();
  });

  it('detects a race at the atomic write', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(current);
    h.prisma.project.updateMany.mockResolvedValue({ count: 0 });
    await expect(h.service.update('project-a', { name: 'racing', expectedUpdatedAt: current.updatedAt.toISOString() }, operator)).rejects.toBeInstanceOf(ConflictException);
  });
});
