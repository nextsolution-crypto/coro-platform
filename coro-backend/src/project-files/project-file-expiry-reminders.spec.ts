import { ForbiddenException } from '@nestjs/common';
import { ProjectFileExpiryRemindersService } from './project-file-expiry-reminders.service';

describe('ProjectFileExpiryRemindersService', () => {
  const now = new Date('2026-10-20T09:15:00.000Z');

  function harness(days = 30) {
    const startOfDay = new Date('2026-10-20T00:00:00.000Z');
    const reminders: any[] = [];
    const notifications: any[] = [];
    const file = {
      id: 'file-v1',
      name: 'Plan urgence.pdf',
      projectId: 'project-a',
      organizationId: 'org-a',
      expiresAt: new Date(startOfDay.getTime() + days * 86_400_000),
      documentResponsibleUserId: 'responsible-a',
      expiryEscalationUserId: 'manager-a',
    };
    const prisma: any = {
      projectFile: { findMany: jest.fn(async () => [file]) },
      user: { findFirst: jest.fn(async () => ({ id: 'active-user' })) },
      notification: {
        create: jest.fn(async ({ data }: any) => {
          const value = {
            id: `notification-${notifications.length + 1}`,
            ...data,
          };
          notifications.push(value);
          return value;
        }),
      },
      projectFileExpiryReminder: {
        findUnique: jest.fn(
          async ({ where }: any) =>
            reminders.find(
              (item) =>
                item.projectFileId ===
                  where
                    .projectFileId_recipientUserId_recipientKind_thresholdDays
                    .projectFileId &&
                item.recipientUserId ===
                  where
                    .projectFileId_recipientUserId_recipientKind_thresholdDays
                    .recipientUserId &&
                item.recipientKind ===
                  where
                    .projectFileId_recipientUserId_recipientKind_thresholdDays
                    .recipientKind &&
                item.thresholdDays ===
                  where
                    .projectFileId_recipientUserId_recipientKind_thresholdDays
                    .thresholdDays,
            ) ?? null,
        ),
        create: jest.fn(async ({ data }: any) => {
          const value = {
            id: `reminder-${reminders.length + 1}`,
            status: 'SENT',
            ...data,
          };
          reminders.push(value);
          return value;
        }),
        updateMany: jest.fn(async () => ({ count: 0 })),
        findFirst: jest.fn(
          async ({ where }: any) =>
            reminders.find(
              (item) =>
                item.id === where.id &&
                item.organizationId === where.organizationId,
            ) ?? null,
        ),
        update: jest.fn(async ({ where, data }: any) => {
          const value = reminders.find((item) => item.id === where.id);
          Object.assign(value, data);
          return value;
        }),
      },
    };
    prisma.$executeRaw = jest.fn(async () => 1);
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
    return {
      service: new ProjectFileExpiryRemindersService(prisma),
      reminders,
      notifications,
    };
  }

  it.each([90, 30, 7, 0])(
    'sends the governed primary J-%s reminder once',
    async (days) => {
      const h = harness(days);
      await h.service.process(now);
      await h.service.process(now);
      expect(
        h.reminders.filter((item) => item.recipientKind === 'PRIMARY'),
      ).toHaveLength(1);
      expect(
        h.notifications.filter((item) => item.userId === 'responsible-a'),
      ).toHaveLength(1);
    },
  );

  it('escalates only at J-7 and J0', async () => {
    const early = harness(30);
    await early.service.process(now);
    expect(
      early.reminders.some((item) => item.recipientKind === 'ESCALATION'),
    ).toBe(false);
    const urgent = harness(7);
    await urgent.service.process(now);
    expect(
      urgent.reminders.some((item) => item.recipientKind === 'ESCALATION'),
    ).toBe(true);
  });

  it('allows only the exact recipient to acknowledge', async () => {
    const h = harness(30);
    await h.service.process(now);
    await expect(
      h.service.acknowledge('reminder-1', 'org-a', 'other-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const result = await h.service.acknowledge(
      'reminder-1',
      'org-a',
      'responsible-a',
    );
    expect(result.status).toBe('ACKNOWLEDGED');
  });
});
