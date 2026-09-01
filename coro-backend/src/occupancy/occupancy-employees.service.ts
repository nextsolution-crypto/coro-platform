import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OccupancyEmployeesService {
  constructor(private prisma: PrismaService) {}

  // ── Employés ─────────────────────────────────────────────────────────────

  async getEmployees(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.buildingEmployee.findMany({
      where: { buildingId, isActive: true },
      orderBy: { lastName: 'asc' },
    });
  }

  async createEmployee(body: any, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: body.buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.buildingEmployee.create({
      data: {
        buildingId: body.buildingId,
        organizationId,
        firstName: body.firstName,
        lastName: body.lastName,
        poste: body.poste,
        email: body.email,
        phone: body.phone,
      },
    });
  }

  async deleteEmployee(id: string, organizationId: string) {
    return this.prisma.buildingEmployee.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  }

  // Check-in via QR token employé (route publique borne)
  async checkinByQrToken(qrToken: string, kioskToken: string) {
    const employee = await this.prisma.buildingEmployee.findFirst({
      where: { qrToken, isActive: true },
    });
    if (!employee) throw new NotFoundException('QR Code invalide ou employé inactif');

    // Valider le token kiosque
    const kiosk = await this.prisma.buildingKioskToken.findFirst({
      where: { buildingId: employee.buildingId, token: kioskToken, isActive: true },
    });
    if (!kiosk) throw new NotFoundException('Token borne invalide');

    // Vérifier pas déjà checké in aujourd'hui
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existing = await this.prisma.occupancyRecord.findFirst({
      where: {
        employeeId: employee.id,
        status: 'IN',
        checkedInAt: { gte: startOfDay },
      },
    });
    if (existing) {
      return { alreadyIn: true, record: existing, employee };
    }

    const record = await this.prisma.occupancyRecord.create({
      data: {
        buildingId: employee.buildingId,
        organizationId: employee.organizationId,
        type: 'EMPLOYE',
        status: 'IN',
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.id,
      },
    });

    return { alreadyIn: false, record, employee };
  }

  // ── Invitations visiteurs ─────────────────────────────────────────────────

  async getInvitations(buildingId: string, organizationId: string) {
    return this.prisma.visitorInvitation.findMany({
      where: { buildingId, organizationId },
      orderBy: { visitDate: 'desc' },
      take: 50,
    });
  }

  async createInvitation(body: any, organizationId: string, invitedById: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: body.buildingId, organizationId },
      select: { id: true, name: true, address: true, city: true },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const invitation = await this.prisma.visitorInvitation.create({
      data: {
        buildingId: body.buildingId,
        organizationId,
        invitedById,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        company: body.company,
        reason: body.reason,
        hostName: body.hostName,
        visitDate: new Date(body.visitDate),
      },
    });

    // Envoyer le courriel avec QR code
    await this.sendInvitationEmail(invitation, building);

    return invitation;
  }

  // Check-in via QR invitation (route publique borne)
  async checkinByInvitationToken(qrToken: string, kioskToken: string) {
    const invitation = await this.prisma.visitorInvitation.findFirst({
      where: { qrToken },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    if (invitation.status === 'USED') throw new NotFoundException('Cette invitation a déjà été utilisée');

    // Vérifier que c'est la bonne journée (±1 jour de tolérance)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);
    const visitDate = new Date(invitation.visitDate);
    visitDate.setHours(0, 0, 0, 0);
    if (visitDate < today || visitDate >= tomorrow) {
      throw new NotFoundException('Cette invitation n\'est pas valide aujourd\'hui');
    }

    // Valider le token kiosque
    const kiosk = await this.prisma.buildingKioskToken.findFirst({
      where: { buildingId: invitation.buildingId, token: kioskToken, isActive: true },
    });
    if (!kiosk) throw new NotFoundException('Token borne invalide');

    // Créer le check-in
    const record = await this.prisma.occupancyRecord.create({
      data: {
        buildingId: invitation.buildingId,
        organizationId: invitation.organizationId,
        type: 'VISITEUR',
        status: 'IN',
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        company: invitation.company || undefined,
        reason: invitation.reason || undefined,
        hostName: invitation.hostName || undefined,
      },
    });

    // Marquer l'invitation comme utilisée
    await this.prisma.visitorInvitation.update({
      where: { id: invitation.id },
      data: { status: 'USED' },
    });

    return { record, invitation };
  }

  // ── Envoi courriel invitation ─────────────────────────────────────────────

  private async sendInvitationEmail(invitation: any, building: any) {
    const visitDateFr = new Date(invitation.visitDate).toLocaleDateString('fr-CA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    // URL du QR code — la borne va le scanner
    const qrUrl = `https://client.getcoro.io/kiosk/qr/${invitation.qrToken}`;

    // Générer l'image QR via API publique
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: { name: 'CORO Sentinelle', email: 'info@getcoro.io' },
        to: [{ email: invitation.email, name: `${invitation.firstName} ${invitation.lastName}` }],
        subject: `Votre invitation pour le ${visitDateFr} — ${building.name}`,
        htmlContent: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
              <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
              <span style="color:#ADB5BD;font-size:14px;margin-left:12px;">Sentinelle</span>
            </div>
            <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
              <h2 style="color:#2C3E50;margin:0 0 8px;">Vous êtes attendu(e) !</h2>
              <p style="color:#6C757D;margin:0 0 24px;">
                Bonjour ${invitation.firstName},<br><br>
                Vous avez été invité(e) à visiter <strong>${building.name}</strong>.
                Présentez ce code QR à la borne d'accueil à votre arrivée.
              </p>

              <div style="background:#F8F9FA;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:12px;color:#ADB5BD;text-transform:uppercase;letter-spacing:0.08em;">Votre code d'accès</p>
                <img src="${qrImageUrl}" alt="QR Code" style="width:180px;height:180px;margin:16px auto;display:block;" />
                <p style="margin:0;font-size:11px;color:#ADB5BD;">Valide uniquement le ${visitDateFr}</p>
              </div>

              <div style="border-left:4px solid #2C3E50;padding:12px 16px;margin:0 0 24px;background:#F8F9FA;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 6px;font-size:14px;color:#6C757D;">📍 <strong style="color:#2C3E50;">${building.name}</strong></p>
                <p style="margin:0 0 6px;font-size:14px;color:#6C757D;">📅 ${visitDateFr}</p>
                ${invitation.hostName ? `<p style="margin:0 0 6px;font-size:14px;color:#6C757D;">👤 Vous rencontrez : <strong style="color:#2C3E50;">${invitation.hostName}</strong></p>` : ''}
                ${invitation.reason ? `<p style="margin:0;font-size:14px;color:#6C757D;">📋 ${invitation.reason}</p>` : ''}
              </div>

              <p style="color:#ADB5BD;font-size:12px;margin:0;">
                Ce code QR est personnel et à usage unique. 
                En cas de problème, présentez-vous à l'accueil avec une pièce d'identité.
              </p>
            </div>
          </div>
        `,
      }),
    });
  }

    // Check-out via QR token (employé ou invitation)
  async checkoutByQrToken(qrToken: string, kioskToken: string) {
    // Essayer employé
    const employee = await this.prisma.buildingEmployee.findFirst({
      where: { qrToken, isActive: true },
    });
    if (employee) {
      const kiosk = await this.prisma.buildingKioskToken.findFirst({
        where: { buildingId: employee.buildingId, token: kioskToken, isActive: true },
      });
      if (!kiosk) throw new NotFoundException('Token borne invalide');

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const record = await this.prisma.occupancyRecord.findFirst({
        where: { employeeId: employee.id, status: 'IN', checkedInAt: { gte: startOfDay } },
      });
      if (!record) return { alreadyOut: true, employee };

      await this.prisma.occupancyRecord.update({
        where: { id: record.id },
        data: { status: 'OUT', checkedOutAt: new Date() },
      });
      return { alreadyOut: false, employee };
    }

    // Essayer invitation
    const invitation = await this.prisma.visitorInvitation.findFirst({
      where: { qrToken, status: 'USED' },
    });
    if (invitation) {
      const kiosk = await this.prisma.buildingKioskToken.findFirst({
        where: { buildingId: invitation.buildingId, token: kioskToken, isActive: true },
      });
      if (!kiosk) throw new NotFoundException('Token borne invalide');

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const record = await this.prisma.occupancyRecord.findFirst({
        where: {
          buildingId: invitation.buildingId,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          status: 'IN',
          checkedInAt: { gte: startOfDay },
        },
      });
      if (!record) return { alreadyOut: true, invitation };

      await this.prisma.occupancyRecord.update({
        where: { id: record.id },
        data: { status: 'OUT', checkedOutAt: new Date() },
      });
      return { alreadyOut: false, invitation };
    }

    throw new NotFoundException('QR Code invalide');
  }

    // Résoudre les infos d'un QR token (employé ou invitation) sans faire de check-in
  async resolveQrInfo(qrToken: string) {
    // Essayer employé
    const employee = await this.prisma.buildingEmployee.findFirst({
      where: { qrToken, isActive: true },
    });
    if (employee) {
      return { type: 'employee', firstName: employee.firstName, lastName: employee.lastName, poste: employee.poste };
    }

    // Essayer invitation
    const invitation = await this.prisma.visitorInvitation.findFirst({
      where: { qrToken },
    });
    if (invitation) {
      return { type: 'invitation', firstName: invitation.firstName, lastName: invitation.lastName, visitDate: invitation.visitDate, status: invitation.status };
    }

    return null;
  }
}