import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CorrectiveActionsService } from './corrective-actions.service';

const corporate = {
  organizationId: 'org-a',
  role: 'CLIENT_CORPORATE',
  clientId: 'client-a',
};
const manager = {
  organizationId: 'org-a',
  role: 'CLIENT_MANAGER',
  clientId: 'client-a',
  buildingIds: ['building-a'],
};

function harness() {
  const prisma = {
    building: { findFirst: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    correctiveAction: {
      create: jest.fn().mockResolvedValue({ id: 'action-a' }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'action-a' }),
    },
  };
  return { prisma, service: new CorrectiveActionsService(prisma as never) };
}

describe('CorrectiveActionsService tenant validation', () => {
  it('rejects a cross-tenant building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      h.service.create(
        { title: 'Action', buildingId: 'building-b' },
        corporate,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a cross-tenant incident', async () => {
    const h = harness();
    h.prisma.incidentEvent.findFirst.mockResolvedValue(null);
    await expect(
      h.service.create(
        { title: 'Action', incidentId: 'incident-b' },
        corporate,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an incident from another building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      buildingId: 'building-b',
    });
    await expect(
      h.service.create(
        { title: 'Action', buildingId: 'building-a', incidentId: 'incident-a' },
        corporate,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an action when all references belong to the organization', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      buildingId: 'building-a',
    });
    await expect(
      h.service.create(
        { title: 'Action', buildingId: 'building-a', incidentId: 'incident-a' },
        corporate,
      ),
    ).resolves.toMatchObject({ id: 'action-a' });
  });

  it('limits a CLIENT_MANAGER list to accessible buildings', async () => {
    const h = harness();
    await h.service.getAll(manager);
    expect(h.prisma.correctiveAction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-a',
          buildingId: { in: ['building-a'] },
          building: { is: { clientId: 'client-a' } },
        }),
      }),
    );
  });

  it('rejects a CLIENT_MANAGER forbidden building', async () => {
    const h = harness();
    await expect(
      h.service.getAll(manager, 'building-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      h.service.create({ title: 'Action', buildingId: 'building-b' }, manager),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a CLIENT_MANAGER action on an accessible building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue({ id: 'building-a' });
    await expect(
      h.service.create({ title: 'Action', buildingId: 'building-a' }, manager),
    ).resolves.toMatchObject({ id: 'action-a' });
    expect(h.prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-a',
          buildingId: 'building-a',
        }),
      }),
    );
  });

  it('derives and checks the building for an incident-only manager action', async () => {
    const h = harness();
    h.prisma.incidentEvent.findFirst.mockResolvedValue({
      id: 'incident-a',
      buildingId: 'building-a',
    });
    await h.service.create(
      { title: 'Action', incidentId: 'incident-a' },
      manager,
    );
    expect(h.prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ buildingId: 'building-a' }),
      }),
    );
  });

  it('prevents direct-id update and delete outside manager building scope', async () => {
    const h = harness();
    h.prisma.correctiveAction.findFirst.mockResolvedValue(null);
    await expect(
      h.service.update('action-b', { title: 'Changed' }, manager),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(h.service.delete('action-b', manager)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(h.prisma.correctiveAction.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'action-b',
        organizationId: 'org-a',
        buildingId: { in: ['building-a'] },
        building: { is: { clientId: 'client-a' } },
      },
    });
  });

  it('scopes corporate by client and keeps adviser access organization-wide', async () => {
    const h = harness();
    await h.service.getAll(corporate);
    await h.service.getAll({ organizationId: 'org-a', role: 'ADMIN' });
    expect(h.prisma.correctiveAction.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          building: { is: { clientId: 'client-a' } },
        }),
      }),
    );
    expect(h.prisma.correctiveAction.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.not.objectContaining({ buildingId: expect.anything() }),
      }),
    );
  });
});
