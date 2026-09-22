import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';

const admin = { userId: 'admin-a', organizationId: 'org-a', role: 'ADMIN' };

function harness() {
  const prisma = {
    project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a' }) },
    projectActivity: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { prisma, service: new ActivitiesService(prisma as never) };
}

describe('ActivitiesService exercise report summary', () => {
  it('emits one UTC Z suffix in activity ICS dates', () => {
    const ics = harness().service.generateIcs({ id: 'activity-a', scheduledDate: new Date('2026-10-01T13:00:00Z'), duration: '1h', title: 'Test' });
    expect(ics).toContain('DTSTART:20261001T130000Z');
    expect(ics).not.toMatch(/\dZZ/);
  });
  it('returns an admissible activity without a report', async () => {
    const h = harness();
    h.prisma.projectActivity.findMany.mockResolvedValue([
      { id: 'activity-a', type: 'exercice_table', exerciseReport: null },
    ]);
    await expect(h.service.getActivities('project-a', admin)).resolves.toEqual([
      { id: 'activity-a', type: 'exercice_table', exerciseReport: null },
    ]);
  });

  it('includes a lightweight report summary in the same activity query', async () => {
    const h = harness();
    h.prisma.projectActivity.findMany.mockResolvedValue([
      {
        id: 'activity-a',
        type: 'exercice_evacuation',
        exerciseReport: { id: 'report-a', status: 'DRAFT' },
      },
    ]);
    const result = await h.service.getActivities('project-a', admin);
    expect(result[0].exerciseReport).toEqual({
      id: 'report-a',
      status: 'DRAFT',
    });
    expect(h.prisma.projectActivity.findMany).toHaveBeenCalledTimes(1);
    expect(h.prisma.projectActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { exerciseReport: { select: { id: true, status: true } } },
      }),
    );
  });

  it('rejects an operator without project access', async () => {
    const h = harness();
    h.prisma.project.findFirst.mockResolvedValue(null);
    await expect(
      h.service.getActivities('project-a', {
        userId: 'operator-b',
        organizationId: 'org-a',
        role: 'OPERATOR',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.prisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'project-a',
        organizationId: 'org-a',
        OR: [{ userId: 'operator-b' }, { lastEditedById: 'operator-b' }],
      },
      select: { id: true },
    });
  });
});

describe('ActivitiesService mandate origin', () => {
  it('does not let the generic update forge sourceMandate', async () => {
    const h = harness();
    (h.prisma.projectActivity as any).findFirst = jest.fn().mockResolvedValue({
      id: 'activity-a', clientVisible: true, clientBookable: false,
    });
    (h.prisma.projectActivity as any).update = jest.fn().mockResolvedValue({});
    await h.service.updateActivity('activity-a', 'org-a', { sourceMandate: true, notes: 'note' });
    expect((h.prisma.projectActivity as any).update).toHaveBeenCalledWith({
      where: { id: 'activity-a' }, data: { notes: 'note' },
    });
  });
});
