import { BadRequestException } from '@nestjs/common';
import { CorrectiveActionsService } from './corrective-actions.service';

function harness() {
  const prisma = {
    building: { findFirst: jest.fn() },
    incidentEvent: { findFirst: jest.fn() },
    correctiveAction: {
      create: jest.fn().mockResolvedValue({ id: 'action-a' }),
    },
  };
  return { prisma, service: new CorrectiveActionsService(prisma as never) };
}

describe('CorrectiveActionsService tenant validation', () => {
  it('rejects a cross-tenant building', async () => {
    const h = harness();
    h.prisma.building.findFirst.mockResolvedValue(null);
    await expect(
      h.service.create({ title: 'Action', buildingId: 'building-b' }, 'org-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a cross-tenant incident', async () => {
    const h = harness();
    h.prisma.incidentEvent.findFirst.mockResolvedValue(null);
    await expect(
      h.service.create({ title: 'Action', incidentId: 'incident-b' }, 'org-a'),
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
        'org-a',
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
        'org-a',
      ),
    ).resolves.toMatchObject({ id: 'action-a' });
  });
});
