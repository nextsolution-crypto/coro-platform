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
      const icsContent = this.generateIcs({
        title: `${actLabel} — ${booking.project.name}`,
        description: `Réservation CORO\nActivité : ${actLabel}\nProjet : ${booking.project.name}\nBâtiment : ${booking.project.building?.name || ''}\nConseiller : ${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        startDate: new Date(booking.requestedDate),
        durationMinutes: booking.duration,
        location: booking.project.building?.address || '',
        organizerEmail: updated.assignedUser.email,
        organizerName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        attendeeEmail: booking.clientUser.email,
        attendeeName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
      });

      // Envoyer au client
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
        ics: { content: icsContent, filename: `reservation-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
      });

      // Envoyer au conseiller aussi
      await this.sendBookingEmail({
        to: updated.assignedUser.email,
        toName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        subject: `📅 Réservation confirmée — ${actLabel} — ${booking.project.name}`,
        content: `
          <p>Vous avez confirmé une réservation. L'événement est joint à ce courriel.</p>
          <div style="background:#EAFAF1;border:1px solid #A9DFBF;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;color:#27AE60;font-weight:700;">✓ Réservation confirmée</p>
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;"><strong>Date :</strong> ${dateLabel}</p>
            <p style="margin:0 0 8px;"><strong>Client :</strong> ${booking.clientUser.firstName} ${booking.clientUser.lastName}</p>
            <p style="margin:0;"><strong>Projet :</strong> ${booking.project.name}</p>
          </div>
        `,
        ics: { content: icsContent, filename: `reservation-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
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

      const icsReport = this.generateIcs({
        title: `${actLabel} — ${booking.project.name}`,
        description: `Réservation CORO (reportée)\nActivité : ${actLabel}\nProjet : ${booking.project.name}\nBâtiment : ${booking.project.building?.name || ''}\nConseiller : ${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        startDate: new Date(data.reportedDate),
        durationMinutes: booking.duration,
        location: booking.project.building?.address || '',
        organizerEmail: updated.assignedUser.email,
        organizerName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        attendeeEmail: booking.clientUser.email,
        attendeeName: `${booking.clientUser.firstName} ${booking.clientUser.lastName}`,
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
        ics: { content: icsReport, filename: `reservation-reportee-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
      });

      await this.sendBookingEmail({
        to: updated.assignedUser.email,
        toName: `${updated.assignedUser.firstName} ${updated.assignedUser.lastName}`,
        subject: `📅 Réservation reportée — ${actLabel} — ${booking.project.name}`,
        content: `
          <p>Vous avez reporté une réservation. L'événement mis à jour est joint à ce courriel.</p>
          <div style="background:#FEF9E7;border:1px solid #FAD7A0;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Activité :</strong> ${actLabel}</p>
            <p style="margin:0 0 8px;text-decoration:line-through;color:#ADB5BD;"><strong>Date initiale :</strong> ${dateLabel}</p>
            <p style="margin:0;color:#F39C12;font-weight:700;"><strong>Nouvelle date :</strong> ${newDateLabel}</p>
            <p style="margin:8px 0 0;"><strong>Client :</strong> ${booking.clientUser.firstName} ${booking.clientUser.lastName}</p>
          </div>
        `,
        ics: { content: icsReport, filename: `reservation-reportee-${actLabel.replace(/[^a-z0-9]/gi, '-')}.ics` },
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

  private generateIcs(data: {
    title: string;
    description: string;
    startDate: Date;
    durationMinutes: number;
    location?: string;
    organizerEmail: string;
    organizerName: string;
    attendeeEmail: string;
    attendeeName: string;
  }): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => {
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const endDate = new Date(data.startDate.getTime() + data.durationMinutes * 60000);
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2,9)}@getcoro.io`;
    const now = formatDate(new Date());

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CORO//Réservation//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatDate(data.startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${data.title}`,
      `DESCRIPTION:${data.description.replace(/\n/g, '\\n')}`,
      data.location ? `LOCATION:${data.location}` : '',
      `ORGANIZER;CN=${data.organizerName}:mailto:${data.organizerEmail}`,
      `ATTENDEE;CN=${data.attendeeName};RSVP=TRUE:mailto:${data.attendeeEmail}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
  }

  private async sendBookingEmail(data: {
    to: string;
    toName: string;
    subject: string;
    content: string;
    ics?: { content: string; filename: string };
  }) {
    try {
      const body: any = {
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
              ${data.ics ? `
              <div style="margin-top:24px;padding:16px;background:#F8F9FA;border-radius:8px;border:1px solid #E9ECEF;">
                <p style="margin:0;font-size:13px;color:#6C757D;">
                  📅 <strong>Ajouter à votre calendrier</strong> — Un fichier calendrier (.ics) est joint à ce courriel. 
                  Ouvrez-le pour ajouter automatiquement cet événement à Outlook, Google Calendar ou Apple Calendar.
                </p>
              </div>` : ''}
            </div>
            <div style="text-align:center;padding:16px;font-size:12px;color:#ADB5BD;">
              © 2026 CORO — <a href="https://getcoro.io" style="color:#ADB5BD;">getcoro.io</a>
            </div>
          </div>
        `,
      };

      if (data.ics) {
        body.attachment = [{
          name: data.ics.filename,
          content: Buffer.from(data.ics.content).toString('base64'),
        }];
      }

      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
        body: JSON.stringify(body),
      });
    } catch (e) { console.error('Erreur email réservation:', e); }
  }
}