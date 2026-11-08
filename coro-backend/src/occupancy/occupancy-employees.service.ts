import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { randomInt } from 'node:crypto';
import { DemoCommunicationChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DemoCommunicationPolicyService } from '../demo-environment/demo-communication-policy.service';

@Injectable()
export class OccupancyEmployeesService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly demoCommunicationPolicy?: DemoCommunicationPolicyService,
  ) {}

  private async allowExternalEmail(input: {
    organizationId: string;
    operation: string;
    recipient: string;
    payload: unknown;
  }): Promise<string> {
    if (!this.demoCommunicationPolicy) {
      if (process.env.NODE_ENV === 'production')
        throw new Error('DEMO_COMMUNICATION_POLICY_REQUIRED');
      return 'LIVE';
    }
    const decision = await this.demoCommunicationPolicy.evaluate({
      organizationId: input.organizationId,
      channel: DemoCommunicationChannel.EMAIL,
      operation: input.operation,
      recipient: input.recipient,
      payload: input.payload,
    });
    return decision.disposition;
  }

  // ── Employés ─────────────────────────────────────────────────────────────

  async getEmployees(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.buildingEmployee.findMany({
      where: { buildingId, isActive: true },
      orderBy: { lastName: 'asc' },
      include: {
        emergencyRoles: { orderBy: { priority: 'asc' } },
        qualifications: true,
      },
    });
  }

  async createEmployee(
    body: any,
    organizationId: string,
    sendExternalEmail: boolean = true,
  ) {
    if (!String(body.firstName || '').trim() || !String(body.lastName || '').trim()) {
      throw new BadRequestException('Prénom et nom requis.');
    }
    if (body.email && !isEmail(String(body.email).trim())) {
      throw new BadRequestException('Adresse courriel invalide.');
    }
    body = { ...body, firstName: String(body.firstName).trim(), lastName: String(body.lastName).trim(), email: body.email ? String(body.email).trim().toLowerCase() : null };
    const building = await this.prisma.building.findFirst({
      where: { id: body.buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    // Serialize allocation for this building; the database index is the final guard.
    const employee = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`sentinelle-pin:${body.buildingId}`}, 0))`;
      let pin: string | undefined;
      for (let attempt = 0; attempt < 100; attempt++) {
        const candidate = randomInt(1000, 10000).toString();
        const existing = await tx.buildingEmployee.findFirst({
          where: {
            buildingId: body.buildingId,
            pin: candidate,
            isActive: true,
          },
        });
        if (!existing) {
          pin = candidate;
          break;
        }
      }
      if (!pin)
        throw new ConflictException(
          'Aucun PIN disponible; contactez un administrateur.',
        );
      const created = await tx.buildingEmployee.create({
        data: {
          buildingId: body.buildingId,
          organizationId,
          firstName: body.firstName,
          lastName: body.lastName,
          poste: body.poste,
          email: body.email,
          phone: body.phone,
          pin,
          isEmergencyMember: body.isEmergencyMember === true,
          smsConsent: body.smsConsent === true,
          pinEmailStatus: 'NOT_REQUESTED',
        },
      });
      if (body.isEmergencyMember && body.emergencyRole) {
        await tx.employeeEmergencyRole.create({
          data: {
            employeeId: created.id,
            buildingId: body.buildingId,
            role: body.emergencyRole,
            assignType: body.emergencyAssignType || 'PRIMARY',
            priority: body.emergencyAssignType === 'ALTERNATE' ? 2 : 1,
            zone: body.emergencyZone || null,
          },
        });
      }
      for (const type of body.qualifications || []) {
        await tx.employeeQualification.create({
          data: { employeeId: created.id, type },
        });
      }
      return created;
    });

    if (!body.email || !sendExternalEmail) return employee;
    // Persist the attempt before I/O. An interrupted/ambiguous request must not
    // delete the identity or invite automatic retries.
    await this.prisma.buildingEmployee.update({
      where: { id: employee.id },
      data: {
        pinEmailStatus: 'OUTCOME_UNKNOWN',
        pinEmailAttemptedAt: new Date(),
      },
    });
    let delivery: { status: string; messageId?: string };
    try {
      delivery = await this.sendPinEmail(employee, building);
    } catch {
      delivery = { status: 'OUTCOME_UNKNOWN' };
    }
    return this.prisma.buildingEmployee.update({
      where: { id: employee.id },
      data: {
        pinEmailStatus: delivery.status,
        pinEmailMessageId: delivery.messageId ?? null,
      },
    });
  }

  private async sendPinEmail(employee: any, building: any) {
    const html = (value: string) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
    const disposition = await this.allowExternalEmail({
      organizationId: employee.organizationId,
      operation: 'SENTINELLE_EMPLOYEE_PIN',
      recipient: employee.email,
      payload: { employeeId: employee.id, buildingId: building.id },
    });
    if (disposition !== 'LIVE') return { status: disposition };
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: { name: 'CORO Sentinelle', email: 'info@getcoro.io' },
        to: [
          {
            email: employee.email,
            name: `${employee.firstName} ${employee.lastName}`,
          },
        ],
        subject: `Votre code d'accès CORO Sentinelle — ${building.name}`,
        htmlContent: `
          <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
              <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
              <span style="color:#ADB5BD;font-size:14px;margin-left:12px;">Sentinelle</span>
            </div>
            <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
              <h2 style="color:#2C3E50;margin:0 0 8px;">Votre code PIN d'accès</h2>
              <p style="color:#6C757D;margin:0 0 24px;">
                Bonjour ${html(employee.firstName)},<br><br>
                Vous avez été enregistré(e) dans le système de présence CORO Sentinelle 
                pour <strong>${html(building.name)}</strong>.
              </p>
              <div style="background:#F8F9FA;border-radius:12px;padding:32px;margin:0 0 24px;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;color:#ADB5BD;text-transform:uppercase;letter-spacing:0.08em;">Votre PIN personnel</p>
                <p style="margin:0;font-size:56px;font-weight:900;color:#2C3E50;letter-spacing:12px;">${employee.pin}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#ADB5BD;">Gardez ce code confidentiel</p>
              </div>
              <div style="background:#EBF5FB;border-radius:8px;padding:16px;margin:0 0 24px;">
                <p style="margin:0;font-size:14px;color:#2980B9;font-weight:600;">Comment utiliser votre PIN :</p>
                <ol style="margin:8px 0 0;padding-left:20px;color:#6C757D;font-size:13px;line-height:1.8;">
                  <li>Scannez le QR code affiché sur la borne d'accueil</li>
                  <li>Entrez votre PIN à 4 chiffres</li>
                  <li>Vérifiez votre identité et confirmez votre entrée ou votre sortie</li>
                </ol>
              </div>
              <p style="color:#ADB5BD;font-size:12px;margin:0;">
                Ce PIN est personnel. Ne le partagez pas avec vos collègues.
              </p>
            </div>
          </div>
        `,
      }),
    });
    if (!response.ok)
      return {
        status:
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 408
            ? 'REJECTED'
            : 'OUTCOME_UNKNOWN',
      };
    const payload = await response.json().catch(() => null);
    return typeof payload?.messageId === 'string' && payload.messageId.trim()
      ? { status: 'ACCEPTED', messageId: payload.messageId }
      : { status: 'OUTCOME_UNKNOWN' };
  }

  async updateEmployee(id: string, body: any, organizationId: string) {
    const employee = await this.prisma.buildingEmployee.findFirst({
      where: { id, organizationId },
    });
    if (!employee) throw new NotFoundException('Employé introuvable');

    // Mise à jour des champs de base
    await this.prisma.buildingEmployee.update({
      where: { id },
      data: {
        firstName:         body.firstName         ?? employee.firstName,
        lastName:          body.lastName          ?? employee.lastName,
        poste:             body.poste             ?? employee.poste,
        email:             body.email             ?? employee.email,
        phone:             body.phone             ?? employee.phone,
        isEmergencyMember: body.isEmergencyMember ?? employee.isEmergencyMember,
        smsConsent:        body.smsConsent        ?? employee.smsConsent,
      },
    });

    // Rôle d'urgence — remplacer entièrement
    await this.prisma.employeeEmergencyRole.deleteMany({ where: { employeeId: id } });
    if (body.isEmergencyMember && body.emergencyRole) {
      await this.prisma.employeeEmergencyRole.create({
        data: {
          employeeId: id,
          buildingId: employee.buildingId,
          role:       body.emergencyRole,
          assignType: body.emergencyAssignType || 'PRIMARY',
          priority:   body.emergencyAssignType === 'ALTERNATE' ? 2 : 1,
          zone:       body.emergencyZone || null,
        },
      });
    }

    // Qualifications — remplacer entièrement
    await this.prisma.employeeQualification.deleteMany({ where: { employeeId: id } });
    if (body.qualifications?.length > 0) {
      for (const qual of body.qualifications) {
        await this.prisma.employeeQualification.create({
          data: { employeeId: id, type: qual },
        });
      }
    }

    return this.prisma.buildingEmployee.findUnique({
      where: { id },
      include: {
        emergencyRoles: { orderBy: { priority: 'asc' } },
        qualifications: true,
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

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employee.id}))`;
      // Une présence ouverte reste ouverte après minuit, quel que soit le QR utilisé.
    const existing = await tx.occupancyRecord.findFirst({
      where: {
        employeeId: employee.id,
        status: 'IN',
      },
    });
    if (existing) {
      return { alreadyIn: true, record: existing, employee };
    }

    const record = await tx.occupancyRecord.create({
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
    });
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
    try {
      await this.sendInvitationEmail(invitation, building);
    } catch (error) {
      // Invitation creation and delivery are one client-visible operation.
      // Roll back the new row when the provider did not confirm acceptance so
      // that a retry cannot create a silent duplicate.
      await this.prisma.visitorInvitation.delete({ where: { id: invitation.id } });
      throw error;
    }

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
    const visitDateFr = new Date(invitation.visitDate).toLocaleDateString(
      'fr-CA',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    );

    // URL du QR code — la borne va le scanner
    const qrUrl = `https://client.getcoro.io/kiosk/qr/${invitation.qrToken}`;

    // Générer l'image QR via API publique
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

    if (
      (await this.allowExternalEmail({
        organizationId: invitation.organizationId,
        operation: 'SENTINELLE_VISITOR_INVITATION',
        recipient: invitation.email,
        payload: { invitationId: invitation.id, buildingId: building.id },
      })) !== 'LIVE'
    )
      return;

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: { name: 'CORO Sentinelle', email: 'info@getcoro.io' },
        to: [
          {
            email: invitation.email,
            name: `${invitation.firstName} ${invitation.lastName}`,
          },
        ],
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
        where: {
          buildingId: employee.buildingId,
          token: kioskToken,
          isActive: true,
        },
      });
      if (!kiosk) throw new NotFoundException('Token borne invalide');

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const record = await this.prisma.occupancyRecord.findFirst({
        where: {
          employeeId: employee.id,
          status: 'IN',
          checkedInAt: { gte: startOfDay },
        },
      });
      if (!record) return { alreadyOut: true, employee };

      await this.prisma.occupancyRecord.update({
        where: { id: record.id },
        data: {
          status: 'OUT',
          checkedOutAt: new Date(),
          checkoutSource: 'MANUAL',
        },
      });
      return { alreadyOut: false, employee };
    }

    // Essayer invitation
    const invitation = await this.prisma.visitorInvitation.findFirst({
      where: { qrToken, status: 'USED' },
    });
    if (invitation) {
      const kiosk = await this.prisma.buildingKioskToken.findFirst({
        where: {
          buildingId: invitation.buildingId,
          token: kioskToken,
          isActive: true,
        },
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
        data: {
          status: 'OUT',
          checkedOutAt: new Date(),
          checkoutSource: 'MANUAL',
        },
      });
      return { alreadyOut: false, invitation };
    }

    throw new NotFoundException('QR Code invalide');
  }

  // Check-in ou check-out par PIN (depuis page /presence)
  async checkinByPin(kioskToken: string, pin: string) {
    // Valider le token kiosque et récupérer le bâtiment
    const kiosk = await this.prisma.buildingKioskToken.findFirst({
      where: { token: kioskToken, isActive: true },
    });
    if (!kiosk) throw new NotFoundException('Borne invalide');

    // Trouver l'employé par PIN dans ce bâtiment
    const employee = await this.prisma.buildingEmployee.findFirst({
      where: { buildingId: kiosk.buildingId, pin, isActive: true },
    });
    if (!employee) throw new NotFoundException('PIN invalide');

    // Vérifier si déjà présent aujourd'hui
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
      // Déjà présent → checkout
      await this.prisma.occupancyRecord.update({
        where: { id: existing.id },
        data: {
          status: 'OUT',
          checkedOutAt: new Date(),
          checkoutSource: 'MANUAL',
        },
      });
      return { action: 'checkout', employee };
    }

    // Pas présent → check-in
    const record = await this.prisma.occupancyRecord.create({
      data: {
        buildingId: kiosk.buildingId,
        organizationId: employee.organizationId,
        type: 'EMPLOYE',
        status: 'IN',
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.id,
      },
    });

    return { action: 'checkin', employee, record };
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

  // ── Import CSV ────────────────────────────────────────────────────────────

  async importEmployeesCsv(
    buildingId: string,
    csvContent: string,
    organizationId: string,
    sendEmails: boolean = true,
  ) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length < 2)
      return { created: 0, skipped: 0, errors: [], total: 0 };

    // Détecter le séparateur (virgule ou point-virgule)
    const sep = lines[0].includes(';') ? ';' : ',';

    // Parser une ligne CSV (gère les guillemets)
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (char === sep && !inQuotes) {
          result.push(current.trim());
          current = '';
          continue;
        }
        current += char;
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) =>
      h
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // supprimer accents
        .replace(/[^a-z0-9]/g, ''),
    );

    // Mapping flexible des colonnes
    const col = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.findIndex((h) => h.includes(name));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const COLS = {
      // Colonnes CORO natif + Azure AD + Google Workspace + ADP + BambooHR
      firstName: col([
        'prenom',
        'firstname',
        'first',
        'givenname',
        'given name',
        'givenname',
        'prénom',
        'forename',
      ]),
      lastName: col([
        'nom',
        'lastname',
        'last',
        'surname',
        'familyname',
        'family name',
        'sn',
      ]),
      displayName: col([
        'displayname',
        'display name',
        'fullname',
        'full name',
        'name',
        'nom complet',
      ]),
      poste: col([
        'poste',
        'titre',
        'position',
        'title',
        'jobtitle',
        'job title',
        'fonction',
        'department',
      ]),
      email: col([
        'email',
        'courriel',
        'mail',
        'userprincipalname',
        'user principal name',
        'emailaddress',
        'email address',
        'work email',
      ]),
      phone: col([
        'telephone',
        'phone',
        'tel',
        'cellulaire',
        'mobilephone',
        'mobile phone',
        'mobile',
        'cell',
        'businessphones',
        'work phone',
        'phonenum',
      ]),
      isEmergency: col(['urgence', 'emergency', 'membre']),
      emergencyRole: col(['roleurgence', 'emergencyrole', 'roleurgence']),
      assignType: col(['type', 'assigntype', 'titulaire']),
      zone: col(['zone', 'secteur', 'area']),
      qualifications: col(['qualification', 'certif', 'formation']),
      smsConsent: col(['sms', 'consentement', 'consent']),
    };

    const ROLE_MAP: Record<string, string> = {
      coordinateur: 'COORDINATOR',
      coordinator: 'COORDINATOR',
      coord: 'COORDINATOR',
      epi: 'EPI',
      'equipe premiere': 'EPI',
      'first response': 'EPI',
      rassemblement: 'ASSEMBLY_WARDEN',
      assembly: 'ASSEMBLY_WARDEN',
      warden: 'ASSEMBLY_WARDEN',
      chercheur: 'SEARCHER',
      searcher: 'SEARCHER',
      sortie: 'EXIT_WARDEN',
      exit: 'EXIT_WARDEN',
      pna: 'PNA_ESCORT',
      accompagnateur: 'PNA_ESCORT',
      escort: 'PNA_ESCORT',
      secouriste: 'FIRST_AIDER',
      'first aid': 'FIRST_AIDER',
      aider: 'FIRST_AIDER',
    };

    const QUAL_MAP: Record<string, string> = {
      rcr: 'FIRST_AID_CPR',
      rcp: 'FIRST_AID_CPR',
      cpr: 'FIRST_AID_CPR',
      'premiers soins': 'FIRST_AID_CPR',
      'first aid': 'FIRST_AID_CPR',
      first_aid_cpr: 'FIRST_AID_CPR',
      dea: 'AED',
      aed: 'AED',
      defibrillateur: 'AED',
      extincteur: 'FIRE_EXTINGUISHER',
      extinguisher: 'FIRE_EXTINGUISHER',
      fire_extinguisher: 'FIRE_EXTINGUISHER',
      epi: 'EPI_TRAINING',
      epi_training: 'EPI_TRAINING',
      matdang: 'HAZMAT',
      hazmat: 'HAZMAT',
      'matieres dangereuses': 'HAZMAT',
    };

    const isOui = (val: string) =>
      ['oui', 'yes', 'true', '1', 'vrai', 'x'].includes(
        val.toLowerCase().trim(),
      );

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      total: 0,
    };
    const dataLines = lines.slice(1);
    results.total = dataLines.length;

    for (let i = 0; i < dataLines.length; i++) {
      const row = parseLine(dataLines[i]);
      const lineNum = i + 2;

      const get = (colIdx: number) =>
        colIdx >= 0 && colIdx < row.length ? row[colIdx]?.trim() || '' : '';

      let firstName = get(COLS.firstName);
      let lastName = get(COLS.lastName);

      // Fallback displayName — Azure AD et Google exportent souvent "John Doe" dans une seule colonne
      if ((!firstName || !lastName) && COLS.displayName >= 0) {
        const displayName = get(COLS.displayName).trim();
        if (displayName) {
          const parts = displayName.split(' ');
          if (parts.length >= 2) {
            firstName = firstName || parts[0];
            lastName = lastName || parts.slice(1).join(' ');
          }
        }
      }

      if (!firstName || !lastName) {
        results.errors.push(
          `Ligne ${lineNum} : Prénom et Nom requis — ignorée`,
        );
        results.skipped++;
        continue;
      }

      const email = get(COLS.email);

      // Vérifier doublon par email
      if (email) {
        const existing = await this.prisma.buildingEmployee.findFirst({
          where: { buildingId, email, isActive: true },
        });
        if (existing) {
          results.errors.push(
            `Ligne ${lineNum} : ${firstName} ${lastName} (${email}) — déjà existant, ignoré`,
          );
          results.skipped++;
          continue;
        }
      }

      const isEmergencyRaw = get(COLS.isEmergency);
      const isEmergencyMember = isEmergencyRaw ? isOui(isEmergencyRaw) : false;

      // Parser rôle urgence
      const emergencyRoleRaw = get(COLS.emergencyRole).toLowerCase().trim();
      const emergencyRole =
        ROLE_MAP[emergencyRoleRaw] ||
        (Object.values(ROLE_MAP).includes(emergencyRoleRaw.toUpperCase())
          ? emergencyRoleRaw.toUpperCase()
          : null);

      // Parser type (titulaire/substitut)
      const assignTypeRaw = get(COLS.assignType).toLowerCase().trim();
      const assignType = ['alternate', 'substitut', 'sub', '2'].includes(
        assignTypeRaw,
      )
        ? 'ALTERNATE'
        : 'PRIMARY';

      // Parser qualifications (séparées par | ou ,)
      const qualRaw = get(COLS.qualifications);
      const qualifications: string[] = [];
      if (qualRaw) {
        const parts = qualRaw.split(/[|,]/).map((q) => q.trim().toLowerCase());
        for (const part of parts) {
          const mapped =
            QUAL_MAP[part] ||
            (Object.values(QUAL_MAP).includes(part.toUpperCase())
              ? part.toUpperCase()
              : null);
          if (mapped && !qualifications.includes(mapped))
            qualifications.push(mapped);
        }
      }

      const smsConsentRaw = get(COLS.smsConsent);
      const smsConsent = smsConsentRaw ? isOui(smsConsentRaw) : false;

      try {
        const employee = await this.createEmployee(
          {
            buildingId,
            firstName,
            lastName,
            poste: get(COLS.poste) || null,
            email: email || null,
            phone: get(COLS.phone) || null,
            isEmergencyMember,
            smsConsent,
            emergencyRole,
            emergencyAssignType: assignType,
            emergencyZone: get(COLS.zone) || null,
            qualifications,
          },
          organizationId,
          sendEmails,
        );
        if (
          email &&
          sendEmails &&
          employee.pinEmailStatus !== 'ACCEPTED' &&
          employee.pinEmailStatus !== 'DELIVERED'
        ) {
          results.errors.push(
            `Ligne ${lineNum} : employé créé; courriel PIN ${employee.pinEmailStatus}. Ne pas réimporter cette ligne pour relancer l’envoi.`,
          );
        }
        results.created++;
      } catch (err: any) {
        results.errors.push(
          `Ligne ${lineNum} : ${firstName} ${lastName} — Erreur : ${err.message}`,
        );
        results.skipped++;
      }
    }

    return results;
  }
}
