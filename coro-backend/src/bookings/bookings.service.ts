import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async createBooking(data: {
    projectId: string;
    clientUserId: string;
    activityType: string;
    requestedDate: Date;
    duration: number;
    participants?: number;
    comment?: string;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
      include: { user: true, client: true, building: true },
    });
    if (!project) throw new NotFoundException('Projet introuvable');

    const booking = await this.prisma.booking.create({
      data: {
        projectId: data.projectId,
        organizationId: project.organizationId,
        clientUserId: data.clientUserId,
        assignedUserId: project.userId,
        activityType: data.activityType,
        requestedDate: data.requestedDate,
        duration: data.duration,
        participants: data.participants,
        comment: data.comment,
        status: 'DEMANDEE',
      },
      include: {
        project: { include: { client: true, building: true } },
        assignedUser: true,
        clientUser: true,
      },
    });

    // Notifier le conseiller par courriel
    await this.sendBookingEmail({
      to: booking.assignedUser.email,
      toName: `${booking.assignedUser.firstName} ${booking.assignedUser.lastName}`,
      subject: `📅 Nouvelle demande de réservation — ${project.name}`,
      content: `
        <p>Le client <strong>${booking.clientUser.firstName} ${booking.clientUser.lastName}</strong> a soumis une demande de réservation.</p>
        <div style="background:#F8F9FA;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>Projet :</strong> ${project.name}</p>
          <p style="margin:0 0 8px;"><strong>Activité :</strong> ${this.activityLabel(data.activityType)}</p>
          <p style="margin:0 0 8px;"><strong>Date demandée :</strong> ${new Date(data.requestedDate).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p style="margin:0 0 8px;"><strong>Durée :</strong> ${data.duration} minutes</p>
          ${data.participants ? `<p style="margin:0 0 8px;"><strong>Participants :</strong> ${data.participants}</p>` : ''}
          ${data.comment ? `<p style="margin:0;"><strong>Commentaire :</strong> ${data.comment}</p>` : ''}
        </div>
        <a href="https://app.getcoro.io/projects/${project.id}" style="display:inline-block;background:#C0392B;color:#FFFFFF;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;">
          Voir la demande →
        </a>
      `,
    });

    return booking;
  }

  async getBookingsForProject(projectId: string) {
    return this.prisma.booking.findMany({
      where: { projectId },
      include: {
        clientUser: { select: { firstName: true, lastName: true, email: true } },
        assignedUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { requestedDate: 'asc' },
    });
  }

  async getBookingsForOrganization(organizationId: string) {
    return this.prisma.booking.findMany({
      where: { organizationId },
      include: {
        project: { include: { client: true, building: true } },
        clientUser: { select: { firstName: true, lastName: true, email: true } },
        assignedUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { requestedDate: 'asc' },
    });
  }

  async getBookingsForClient(clientUserId: string) {
    return this.prisma.booking.findMany({
      where: { clientUserId },
      include: {
        project: { include: { client: true, building: true } },
        assignedUser: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { requestedDate: 'asc' },
    });
  }

  async updateBookingStatus(bookingId: string, data: {
    status: string;
    refuseReason?: string;
    reportedDate?: Date;
    newUserId?: string;
  }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        project: { include: { client: true, building: true } },
        clientUser: true,
        assignedUser: true,
      },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');

    const updateData: any = { status: data.status };
    if (data.refuseReason) updateData.refuseReason = data.refuseReason;
    if (data.reportedDate) updateData.reportedDate = data.reportedDate;
    if (data.newUserId) updateData.assignedUserId = data.newUserId;

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        project: { include: { client: true, building: true } },
        clientUser: true,
        assignedUser: true,
      },
    });

    // Notifier le client selon le statut
    const actLabel = this.activityLabel(booking.activityType);
    const dateLabel = new Date(booking.requestedDate).toLocaleDateString('fr-CA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (data.status === 'CONFIRMEE') {
      await this.sendBookingEmail({
        to: booking.clientUser.email,
        toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
        subject: `✅ Réservation confirmée — ${actLabel}`,
        content: `
          <p>Votre demande de réservation a été <strong>confirmée</strong> par votre conseiller.</p>
          <div style="background:#EAFAF1;border:1px solid #A9DFBF;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;color:#27AE60;font-weight:700;">✓ Réservation confirmée</p>
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;"><strong>Date :</strong> ${dateLabel}</p>
            <p style="margin:0;"><strong>Conseiller :</strong> ${updated.assignedUser.firstName} ${updated.assignedUser.lastName}</p>
          </div>
          <p style="color:#6C757D;font-size:13px;">Vous recevrez un rappel 7 jours et 24 heures avant la date.</p>
        `,
      });
    } else if (data.status === 'REFUSEE') {
      await this.sendBookingEmail({
        to: booking.clientUser.email,
        toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
        subject: `❌ Demande de réservation refusée — ${actLabel}`,
        content: `
          <p>Votre demande de réservation n'a pas pu être acceptée.</p>
          <div style="background:#FDEDEC;border:1px solid #F1948A;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;"><strong>Date demandée :</strong> ${dateLabel}</p>
            ${data.refuseReason ? `<p style="margin:0;"><strong>Motif :</strong> ${data.refuseReason}</p>` : ''}
          </div>
          <p>Vous pouvez soumettre une nouvelle demande avec une autre date depuis votre portail.</p>
        `,
      });
    } else if (data.status === 'REPORTEE' && data.reportedDate) {
      const newDateLabel = new Date(data.reportedDate).toLocaleDateString('fr-CA', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      await this.sendBookingEmail({
        to: booking.clientUser.email,
        toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
        subject: `📅 Réservation reportée — ${actLabel}`,
        content: `
          <p>Votre réservation a été <strong>reportée</strong> à une nouvelle date.</p>
          <div style="background:#FEF9E7;border:1px solid #FAD7A0;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;text-decoration:line-through;color:#ADB5BD;"><strong>Date initiale :</strong> ${dateLabel}</p>
            <p style="margin:0;color:#F39C12;font-weight:700;"><strong>Nouvelle date :</strong> ${newDateLabel}</p>
          </div>
        `,
      });
    } else if (data.status === 'REASSIGNEE' && data.newUserId) {
      const newUser = await this.prisma.user.findUnique({ where: { id: data.newUserId } });
      if (newUser) {
        await this.sendBookingEmail({
          to: booking.clientUser.email,
          toName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
          subject: `👤 Conseiller changé pour votre réservation`,
          content: `
            <p>Un nouveau conseiller a été assigné à votre réservation.</p>
            <div style="background:#F4ECF7;border:1px solid #D2B4DE;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
              <p style="margin:0 0 8px;"><strong>Date :</strong> ${dateLabel}</p>
              <p style="margin:0;"><strong>Nouveau conseiller :</strong> ${newUser.firstName} ${newUser.lastName}</p>
            </div>
          `,
        });
      }
    }

    return updated;
  }

  async cancelBooking(bookingId: string, cancelledBy: 'client' | 'conseiller') {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { clientUser: true, assignedUser: true, project: true },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'ANNULEE' },
    });

    const actLabel = this.activityLabel(booking.activityType);
    const dateLabel = new Date(booking.requestedDate).toLocaleDateString('fr-CA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // Notifier l'autre partie
    const notifyEmail = cancelledBy === 'client' ? booking.assignedUser.email : booking.clientUser.email;
    const notifyName = cancelledBy === 'client'
      ? `${booking.assignedUser.firstName} ${booking.assignedUser.lastName}`
      : `${booking.clientUser.firstName} ${booking.clientUser.lastName}`;

    await this.sendBookingEmail({
      to: notifyEmail,
      toName: notifyName,
      subject: `❌ Réservation annulée — ${actLabel}`,
      content: `
        <p>La réservation suivante a été <strong>annulée</strong> par ${cancelledBy === 'client' ? 'le client' : 'le conseiller'}.</p>
        <div style="background:#FDEDEC;border:1px solid #F1948A;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
          <p style="margin:0;"><strong>Date :</strong> ${dateLabel}</p>
        </div>
      `,
    });

    return { success: true };
  }

  private activityLabel(type: string): string {
    const labels: Record<string, string> = {
      exercice: 'Exercice d\'évacuation',
      formation: 'Formation',
      visite: 'Visite de suivi',
      revision: 'Révision documentaire',
      autre: 'Autre activité',
    };
    return labels[type] || type;
  }

  private async sendBookingEmail(data: { to: string; toName: string; subject: string; content: string }) {
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
        body: JSON.stringify({
          sender: { name: 'CORO', email: 'info@getcoro.io' },
          to: [{ email: data.to, name: data.toName }],
          subject: data.subject,
          htmlContent: `
            <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
                <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
              </div>
              <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
                ${data.content}
              </div>
              <div style="text-align:center;padding:16px;font-size:12px;color:#ADB5BD;">
                © 2026 CORO — <a href="https://getcoro.io" style="color:#ADB5BD;">getcoro.io</a>
              </div>
            </div>
          `,
        }),
      });
    } catch (e) { console.error('Erreur email réservation:', e); }
  }
}