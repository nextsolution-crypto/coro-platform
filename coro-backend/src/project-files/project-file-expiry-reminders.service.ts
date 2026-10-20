import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const PRIMARY_THRESHOLDS = [90, 30, 7, 0] as const;

@Injectable()
export class ProjectFileExpiryRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('15 9 * * *')
  async process(now = new Date()) {
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const horizon = new Date(startOfDay.getTime() + 91 * 86_400_000);
    const files = await this.prisma.projectFile.findMany({
      where: {
        lifecycleState: 'APPROVED',
        expiresAt: { gte: startOfDay, lte: horizon },
        documentResponsibleUserId: { not: null },
        OR: [
          { supersededEffectiveAt: null },
          { supersededEffectiveAt: { gt: now } },
        ],
      },
      select: {
        id: true,
        name: true,
        projectId: true,
        organizationId: true,
        expiresAt: true,
        documentResponsibleUserId: true,
        expiryEscalationUserId: true,
      },
    });

    for (const file of files) {
      const days = Math.max(
        0,
        Math.ceil(
          (file.expiresAt!.getTime() - startOfDay.getTime()) / 86_400_000,
        ),
      );
      if (!(PRIMARY_THRESHOLDS as readonly number[]).includes(days)) continue;
      await this.sendOnce(
        file,
        file.documentResponsibleUserId!,
        'PRIMARY',
        days,
      );
      if (days <= 7 && file.expiryEscalationUserId)
        await this.sendOnce(
          file,
          file.expiryEscalationUserId,
          'ESCALATION',
          days,
        );
    }

    await this.prisma.projectFileExpiryReminder.updateMany({
      where: {
        status: 'SENT',
        projectFile: {
          OR: [
            { lifecycleState: { in: ['SUPERSEDED', 'REVOKED'] } },
            { expiresAt: { lt: startOfDay } },
            { supersededEffectiveAt: { lte: now } },
          ],
        },
      },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
  }

  async acknowledge(
    reminderId: string,
    organizationId: string,
    actorUserId: string,
  ) {
    const reminder = await this.prisma.projectFileExpiryReminder.findFirst({
      where: { id: reminderId, organizationId },
    });
    if (!reminder) throw new NotFoundException('Rappel introuvable');
    if (reminder.recipientUserId !== actorUserId)
      throw new ForbiddenException('Acquittement non autorise');
    if (reminder.status === 'ACKNOWLEDGED') return reminder;
    return this.prisma.projectFileExpiryReminder.update({
      where: { id: reminder.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedById: actorUserId,
      },
    });
  }

  private async sendOnce(
    file: {
      id: string;
      name: string;
      projectId: string;
      organizationId: string;
    },
    recipientUserId: string,
    recipientKind: 'PRIMARY' | 'ESCALATION',
    thresholdDays: number,
  ) {
    const recipient = await this.prisma.user.findFirst({
      where: {
        id: recipientUserId,
        organizationId: file.organizationId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!recipient) return null;
    const existing = await this.prisma.projectFileExpiryReminder.findUnique({
      where: {
        projectFileId_recipientUserId_recipientKind_thresholdDays: {
          projectFileId: file.id,
          recipientUserId,
          recipientKind,
          thresholdDays,
        },
      },
    });
    if (existing) return existing;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${file.id}:${recipientUserId}:${recipientKind}:${thresholdDays}`}, 0))`;
      const lockedExisting = await tx.projectFileExpiryReminder.findUnique({
        where: {
          projectFileId_recipientUserId_recipientKind_thresholdDays: {
            projectFileId: file.id,
            recipientUserId,
            recipientKind,
            thresholdDays,
          },
        },
      });
      if (lockedExisting) return lockedExisting;
      const notification = await tx.notification.create({
        data: {
          userId: recipientUserId,
          organizationId: file.organizationId,
          type: 'PROJECT_FILE_EXPIRY',
          title:
            thresholdDays === 0
              ? 'Document expire aujourd’hui'
              : `Document expire dans ${thresholdDays} jours`,
          message: `${file.name} requiert une verification documentaire.`,
          projectId: file.projectId,
        },
      });
      return tx.projectFileExpiryReminder.create({
        data: {
          projectFileId: file.id,
          organizationId: file.organizationId,
          recipientUserId,
          recipientKind,
          thresholdDays,
          notificationId: notification.id,
        },
      });
    });
  }
}
