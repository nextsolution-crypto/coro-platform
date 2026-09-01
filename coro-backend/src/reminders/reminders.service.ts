import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkPendingSignatures() {
    this.logger.log('Vérification des signatures en attente...');

    // Trouver tous les projets VALIDATED avec un PDF exporté mais non signé
    const projects = await this.prisma.project.findMany({
      where: {
        status: { in: ['VALIDATED', 'EXPORTED'] },
        exportedPdfFr: { not: null },
        // Pas encore signé — officialPdfFr est null
        officialPdfFr: null,
      },
      include: {
        client: true,
        building: true,
        organization: {
          include: {
            users: {
              where: { role: { in: ['ADMIN', 'ADVISOR'] as any } },
              take: 1,
            },
          },
        },
        documents: {
          select: { updatedAt: true },
          take: 1,
        },
      },
    });

    const now = new Date();

    for (const project of projects) {
      // Calculer les jours depuis l'export
      const exportDate = project.updatedAt;
      const daysSinceExport = Math.floor((now.getTime() - exportDate.getTime()) / (1000 * 60 * 60 * 24));

      // Envoyer rappel à J+7, J+14, J+21
      if (![7, 14, 21].includes(daysSinceExport)) continue;

      const p = project as any;
      const conseiller = p.organization?.users?.[0];
      if (!conseiller) continue;

      const isUrgent = daysSinceExport >= 14;

      try {
        // Notifier le conseiller
        await this.sendReminderEmail({
          to: conseiller.email,
          toName: `${conseiller.firstName} ${conseiller.lastName}`,
          projectName: p.name,
          clientName: p.client?.name || '—',
          buildingName: p.building?.name || '—',
          daysSince: daysSinceExport,
          isUrgent,
          isConseiller: true,
        });

        this.logger.log(`Rappel J+${daysSinceExport} envoyé pour le projet ${p.name}`);

        // À J+21, notifier aussi l'admin
        if (daysSinceExport === 21) {
          const admin = p.organization?.users?.find((u: any) => u.role === 'ADMIN');
          if (admin && admin.email !== conseiller.email) {
            await this.sendReminderEmail({
              to: admin.email,
              toName: `${admin.firstName} ${admin.lastName}`,
              projectName: p.name,
              clientName: p.client?.name || '—',
              buildingName: p.building?.name || '—',
              daysSince: daysSinceExport,
              isUrgent: true,
              isConseiller: false,
            });
          }
        }
      } catch (e) {
        this.logger.error(`Erreur rappel projet ${project.name}:`, e);
      }
    }
  }

  // ── Purge automatique registre Sentinelle ─────────────────────────────────
  @Cron('0 2 * * *') // Chaque nuit à 2h
  async purgeOldOccupancyRecords() {
    this.logger.log('Purge des anciens enregistrements Sentinelle...');
    const cutoff12months = new Date();
    cutoff12months.setMonth(cutoff12months.getMonth() - 12);

    const cutoff36months = new Date();
    cutoff36months.setMonth(cutoff36months.getMonth() - 36);

    // Supprimer les OccupancyRecord de plus de 12 mois
    const deletedRecords = await this.prisma.occupancyRecord.deleteMany({
      where: { checkedInAt: { lt: cutoff12months } },
    });

    // Supprimer les EvacuationCheckIn orphelins
    await this.prisma.evacuationCheckIn.deleteMany({
      where: {
        evacuationEvent: {
          triggeredAt: { lt: cutoff36months },
        },
      },
    });

    // Supprimer les EvacuationEvent de plus de 36 mois (ISO 22301)
    const deletedEvents = await this.prisma.evacuationEvent.deleteMany({
      where: { triggeredAt: { lt: cutoff36months } },
    });

    // Supprimer les VisitorInvitation de plus de 12 mois
    const deletedInvitations = await this.prisma.visitorInvitation.deleteMany({
      where: { createdAt: { lt: cutoff12months } },
    });

    this.logger.log(
      `Purge Sentinelle complétée — ${deletedRecords.count} présences, ` +
      `${deletedEvents.count} évacuations, ${deletedInvitations.count} invitations supprimées`
    );
  }

  private async sendReminderEmail(data: {
    to: string;
    toName: string;
    projectName: string;
    clientName: string;
    buildingName: string;
    daysSince: number;
    isUrgent: boolean;
    isConseiller: boolean;
  }) {
    const subject = data.isUrgent
      ? `⚠️ Rappel urgent — Document en attente de signature depuis ${data.daysSince} jours`
      : `📋 Rappel — Document en attente de signature (${data.daysSince} jours)`;

    const urgentBanner = data.isUrgent
      ? `<div style="background:#FDEDEC;border-left:4px solid #C0392B;padding:12px 16px;margin:0 0 20px;border-radius:4px;">
           <p style="margin:0;color:#C0392B;font-weight:700;">⚠️ Ce document attend la signature depuis ${data.daysSince} jours.</p>
         </div>`
      : '';

    const conseillierNote = !data.isConseiller
      ? `<p style="color:#6C757D;font-size:13px;margin:16px 0 0;padding:12px;background:#F8F9FA;border-radius:4px;">
           Note administrateur : Ce document n'a toujours pas été signé après ${data.daysSince} jours. Un suivi avec le conseiller responsable est recommandé.
         </p>`
      : '';

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: { name: 'CORO', email: 'info@getcoro.io' },
        to: [{ email: data.to, name: data.toName }],
        subject,
        htmlContent: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
              <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
            </div>
            <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
              <h2 style="color:#2C3E50;margin:0 0 8px;">Document en attente de signature</h2>
              <p style="color:#6C757D;margin:0 0 20px;">Bonjour ${data.toName},</p>
              ${urgentBanner}
              <div style="background:#F8F9FA;border-radius:8px;padding:20px;margin:0 0 24px;">
                <p style="margin:0 0 6px;font-size:14px;color:#6C757D;">Document</p>
                <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#2C3E50;">${data.projectName}</p>
                <p style="margin:0 0 4px;font-size:14px;color:#6C757D;">Client : <span style="color:#2C3E50;">${data.clientName}</span></p>
                <p style="margin:0;font-size:14px;color:#6C757D;">Bâtiment : <span style="color:#2C3E50;">${data.buildingName}</span></p>
              </div>
              <p style="color:#6C757D;margin:0 0 20px;">Ce document a été exporté il y a <strong>${data.daysSince} jours</strong> et attend toujours la signature de votre client dans le portail.</p>
              <a href="https://app.getcoro.io/projects" style="display:inline-block;background:#C0392B;color:#FFFFFF;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;">
                Voir le projet →
              </a>
              ${conseillierNote}
            </div>
          </div>
        `,
      }),
    });
  }
}