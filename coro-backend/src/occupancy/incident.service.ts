import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { P001_DIRECTIVES_GENERALES } from '../generator/procedures/p001_directives_generales';
import { P002_DECOUVERTE_FUMEE } from '../generator/procedures/p002_decouverte_fumee';
import { P003_ALERTE_INCENDIE } from '../generator/procedures/p003_alerte_incendie';
import { P004_ALARME_INCENDIE } from '../generator/procedures/p004_alarme_incendie';
import { P005_FUITE_GAZ } from '../generator/procedures/p005_fuite_gaz';
import { P011_MENACE_ACTIVE } from '../generator/procedures/p011_menace_active';
import { P013_URGENCE_MEDICALE } from '../generator/procedures/p013_urgence_medicale';
import { P014_GAZ_TOXIQUE } from '../generator/procedures/p014_gaz_toxique';
import { P015_COLIS_SUSPECT } from '../generator/procedures/p015_colis_suspect';
import { P016_COUPURE_COURANT } from '../generator/procedures/p016_coupure_courant';
import { P018_MATIERES_DANGEREUSES } from '../generator/procedures/p018_matieres_dangereuses';
import { P019_ALERTE_BOMBE } from '../generator/procedures/p019_alerte_bombe';
import { P022_VENTS_VIOLENTS } from '../generator/procedures/p022_vents_violents';
import { P024_INONDATIONS } from '../generator/procedures/p024_inondations';
import { P026_BATTERIE_LITHIUM } from '../generator/procedures/p026_batterie_lithium';
import { ProcedureTemplate } from '../generator/procedures/types';

const INCIDENT_PROCEDURE_MAP: Record<string, string> = {
  SMOKE_DISCOVERY: 'P002', FIRE_ALERT: 'P003', FIRE_ALARM: 'P004',
  GAS_LEAK: 'P005', ACTIVE_THREAT: 'P011', MEDICAL: 'P013',
  TOXIC_GAS: 'P014', SUSPICIOUS_PACKAGE: 'P015', POWER_OUTAGE: 'P016',
  HAZMAT: 'P018', BOMB_THREAT: 'P019', LITHIUM_BATTERY: 'P026',
  FLOODING: 'P024', VIOLENT_WINDS: 'P022', OTHER: 'P001',
};

const PROCEDURE_MAP: Record<string, ProcedureTemplate> = {
  P001: P001_DIRECTIVES_GENERALES, P002: P002_DECOUVERTE_FUMEE,
  P003: P003_ALERTE_INCENDIE,      P004: P004_ALARME_INCENDIE,
  P005: P005_FUITE_GAZ,            P011: P011_MENACE_ACTIVE,
  P013: P013_URGENCE_MEDICALE,     P014: P014_GAZ_TOXIQUE,
  P015: P015_COLIS_SUSPECT,        P016: P016_COUPURE_COURANT,
  P018: P018_MATIERES_DANGEREUSES, P019: P019_ALERTE_BOMBE,
  P022: P022_VENTS_VIOLENTS,       P024: P024_INONDATIONS,
  P026: P026_BATTERIE_LITHIUM,
};

const INCIDENT_LABELS: Record<string, string> = {
  SMOKE_DISCOVERY: 'Découverte de fumée', FIRE_ALERT: 'Alerte incendie',
  FIRE_ALARM: 'Alarme incendie', GAS_LEAK: 'Fuite de gaz',
  ACTIVE_THREAT: 'Menace active / Confinement', MEDICAL: 'Urgence médicale',
  TOXIC_GAS: 'Gaz toxique', SUSPICIOUS_PACKAGE: 'Colis suspect',
  POWER_OUTAGE: 'Coupure de courant', HAZMAT: 'Matières dangereuses',
  BOMB_THREAT: 'Alerte à la bombe', LITHIUM_BATTERY: 'Batterie lithium-ion',
  FLOODING: 'Inondations', VIOLENT_WINDS: 'Vents violents', OTHER: 'Incident général',
};

const OCCUPANT_MESSAGES: Record<string, { alert: string; alarm: string }> = {
  FIRE_ALERT:      { alert: 'Une investigation est en cours. Restez en place, préparez-vous à évacuer.', alarm: 'Évacuez immédiatement le bâtiment.' },
  FIRE_ALARM:      { alert: 'Évacuez immédiatement le bâtiment.', alarm: 'Évacuez immédiatement le bâtiment.' },
  SMOKE_DISCOVERY: { alert: 'Investigation en cours. Restez en place et soyez prêt à évacuer.', alarm: 'Évacuez immédiatement le bâtiment.' },
  GAS_LEAK:        { alert: 'Fuite de gaz possible. Évitez d\'utiliser des appareils électriques.', alarm: 'Évacuez immédiatement par les sorties désignées.' },
  ACTIVE_THREAT:   { alert: 'Confinement en vigueur. Restez à l\'intérieur, verrouillez les portes.', alarm: 'Confinement d\'urgence — Ne bougez pas.' },
  MEDICAL:         { alert: 'Urgence médicale en cours. Dégagez les allées.', alarm: 'Gardez les allées dégagées pour les secours.' },
  HAZMAT:          { alert: 'Incident matières dangereuses. Restez à l\'écart de la zone identifiée.', alarm: 'Évacuez par les sorties éloignées de la zone à risque.' },
  POWER_OUTAGE:    { alert: 'Coupure de courant. L\'éclairage d\'urgence est actif.', alarm: 'Suivez l\'éclairage d\'urgence pour sortir.' },
  OTHER:           { alert: 'Incident en cours. Restez en place et attendez les instructions.', alarm: 'Suivez les instructions de l\'équipe d\'urgence.' },
};

// Normalise un numéro de téléphone en format E.164 canadien (+1XXXXXXXXXX)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

const PORTAL_URL = process.env.CLIENT_PORTAL_URL || 'https://client.getcoro.io';
const API_URL    = process.env.API_URL            || 'https://api.getcoro.io/api';

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  // ── Coordonnateur : extraire les étapes ──────────────────────────────────
  private async getCoordinatorSteps(procedureCode: string): Promise<Array<{ stepId: string; stepText: string; stepOrder: number }>> {
    try {
      const procedure = PROCEDURE_MAP[procedureCode];
      if (!procedure) return [];
      const coordSection = procedure.roleSections?.find(s => s.roleCode === 'ROLE-CU' || s.roleCode === 'ROLE-AS');
      if (!coordSection?.steps) return [];
      return coordSection.steps.map((step, index) => ({
        stepId:    step.id || `${procedureCode}-step-${index}`,
        stepText:  (step.textFR || step.textEN || '').replace(/\*\*/g, ''),
        stepOrder: index,
      }));
    } catch { return []; }
  }

  // ── SMS via Brevo ────────────────────────────────────────────────────────
  private async sendSms(to: string, content: string): Promise<void> {
    const phone = normalizePhone(to);
    if (!phone) return;
    try {
      await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
        body: JSON.stringify({
          sender:    process.env.BREVO_SMS_SENDER || 'CORO',
          recipient: phone,
          content,
          type: 'transactional',
        }),
      });
    } catch (e) { console.error('[IncidentService] Erreur SMS:', e); }
  }

  // ── Courriel générique ────────────────────────────────────────────────────
  private async sendEmail(data: { to: string; toName: string; subject: string; html: string }) {
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
        body: JSON.stringify({
          sender: { name: 'CORO Sentinelle', email: 'info@getcoro.io' },
          to: [{ email: data.to, name: data.toName }],
          subject: data.subject,
          htmlContent: data.html,
        }),
      });
    } catch (e) { console.error('[IncidentService] Erreur courriel:', e); }
  }

  // ── Courriel + SMS coordonnateur ─────────────────────────────────────────
  private async notifyCoordinator(
    member: any, incident: any, label: string, building: any,
    assemblyPoint: string | null, coordSteps: any[], isExercise: boolean,
  ) {
    const exercisePrefix = isExercise ? '[EXERCICE] ' : '';
    const stepsHtml = coordSteps.map((s, i) =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #F1F3F5;vertical-align:top;">
        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;border:2px solid #DEE2E6;text-align:center;line-height:18px;font-size:11px;color:#ADB5BD;margin-right:10px;">${i + 1}</span>
        <span style="font-size:14px;color:#2C3E50;">${s.stepText}</span>
      </td></tr>`
    ).join('');

    const subject = `${exercisePrefix}🚨 ${label} · ${building.name}`;
    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:${isExercise ? '#E67E22' : '#C0392B'};padding:24px;border-radius:8px 8px 0 0;">
          <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#FFF">RO</span></span>
          ${isExercise ? '<span style="background:#FFFFFF;color:#E67E22;font-size:12px;font-weight:800;padding:4px 10px;border-radius:4px;margin-left:12px;">MODE EXERCICE</span>' : ''}
        </div>
        <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
          <div style="background:${isExercise ? '#FEF9E7' : '#FDEDEC'};border-left:4px solid ${isExercise ? '#E67E22' : '#C0392B'};padding:12px 16px;margin:0 0 24px;border-radius:4px;">
            <p style="margin:0;font-size:18px;font-weight:800;color:${isExercise ? '#E67E22' : '#C0392B'};">${exercisePrefix}🚨 ${label.toUpperCase()}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#6C757D;">${building.name} · ${building.address || ''}, ${building.city || ''}</p>
          </div>
          <p style="color:#2C3E50;margin:0 0 8px;">Bonjour <strong>${member.firstName}</strong>, vous êtes le coordonnateur d'urgence actif.</p>
          ${assemblyPoint ? `<p style="background:#EAFAF1;padding:10px 14px;border-radius:6px;font-size:14px;color:#27AE60;margin:0 0 20px;"><strong>🏁 Point de rassemblement : ${assemblyPoint}</strong></p>` : ''}
          <p style="font-size:13px;font-weight:700;color:#2C3E50;margin:0 0 8px;">Votre procédure (${incident.procedureCode}) :</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #E9ECEF;border-radius:8px;overflow:hidden;margin-bottom:24px;">${stepsHtml}</table>
          <p style="color:#ADB5BD;font-size:12px;margin:0;">Déclenché le ${new Date().toLocaleString('fr-CA')} par ${incident.triggeredBy}</p>
        </div>
      </div>`;

    await this.sendEmail({ to: member.email, toName: `${member.firstName} ${member.lastName}`, subject, html });

    // SMS coordonnateur
    if (member.phone) {
      const sms = `${exercisePrefix}CORO SENTINELLE\n${label} - ${building.name}\nVous êtes coordonnateur actif.\n${assemblyPoint ? `Rassemblement: ${assemblyPoint}\n` : ''}Consultez votre courriel pour la procédure ${incident.procedureCode}.`;
      await this.sendSms(member.phone, sms);
    }
  }

  // ── Courriel + SMS membres équipe ────────────────────────────────────────
  private async notifyMember(member: any, label: string, building: any, assemblyPoint: string | null, ackToken: string, isExercise: boolean) {
    const exercisePrefix = isExercise ? '[EXERCICE] ' : '';
    const ackUrl = `${API_URL}/incidents/tasks/ack/${ackToken}`;
    const roles  = (member.roles || []).map((r: any) => r.role).join(', ');

    const subject = `${exercisePrefix}🚨 ${label} — Rapport à votre poste · ${building.name}`;
    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:540px;margin:0 auto;">
        <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
          <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
          ${isExercise ? '<span style="background:#E67E22;color:#FFFFFF;font-size:12px;font-weight:800;padding:4px 10px;border-radius:4px;margin-left:12px;">MODE EXERCICE</span>' : ''}
        </div>
        <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
          <div style="background:#FEF9E7;border-left:4px solid #E67E22;padding:16px;margin:0 0 20px;border-radius:4px;">
            <p style="margin:0;font-size:18px;font-weight:800;color:#E67E22;">${exercisePrefix}⚠️ ${label}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#6C757D;">${building.name}</p>
          </div>
          <p style="font-size:20px;font-weight:800;color:#C0392B;margin:0 0 12px;">Rapport à votre poste immédiatement.</p>
          ${assemblyPoint ? `<p style="font-size:14px;color:#27AE60;margin:0 0 16px;"><strong>🏁 Point de rassemblement : ${assemblyPoint}</strong></p>` : ''}
          <p style="font-size:13px;color:#ADB5BD;margin:0 0 24px;">Rôle(s) : ${roles}</p>
          <a href="${ackUrl}" style="display:inline-block;background:#27AE60;color:#FFFFFF;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">✅ Confirmer ma présence au poste</a>
          <p style="margin:16px 0 0;font-size:11px;color:#ADB5BD;">Cliquez ce bouton pour confirmer que vous avez reçu l'alerte et que vous êtes en route vers votre poste.</p>
        </div>
      </div>`;

    await this.sendEmail({ to: member.email, toName: `${member.firstName} ${member.lastName}`, subject, html });

    // SMS membre
    if (member.phone) {
      const sms = `${exercisePrefix}CORO SENTINELLE\n${label} - ${building.name}\nRapport à votre poste (${roles}).\n${assemblyPoint ? `Rassemblement: ${assemblyPoint}\n` : ''}Confirmez: ${ackUrl}`;
      await this.sendSms(member.phone, sms);
    }
  }

  // ── Courriel occupants ────────────────────────────────────────────────────
  private async notifyOccupant(email: string, label: string, building: any, message: string, assemblyPoint: string | null) {
    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:540px;margin:0 auto;">
        <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
          <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
        </div>
        <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;font-weight:700;color:#2C3E50;margin:0 0 12px;">${label} — ${building.name}</p>
          <p style="font-size:15px;color:#495057;margin:0 0 20px;">${message}</p>
          ${assemblyPoint ? `<div style="background:#EAFAF1;border-left:4px solid #27AE60;padding:12px 16px;border-radius:4px;"><p style="margin:0;font-size:14px;color:#27AE60;font-weight:700;">🏁 Point de rassemblement : ${assemblyPoint}</p></div>` : ''}
        </div>
      </div>`;
    await this.sendEmail({ to: email, toName: 'Occupant', subject: `ℹ️ Avis — ${building.name}`, html });
  }

  // ── Accusé de réception public (sans auth) ───────────────────────────────
  async acknowledgeByToken(ackToken: string) {
    const task = await this.prisma.incidentTask.findUnique({ where: { ackToken } });
    if (!task) throw new NotFoundException('Lien invalide ou expiré');
    if (task.acknowledgedAt) return { alreadyAcknowledged: true, acknowledgedAt: task.acknowledgedAt };

    const updated = await this.prisma.incidentTask.update({
      where: { ackToken },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
    });

    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: task.incidentEventId,
        action:  'Accusé de réception — membre confirmé au poste',
        details: `Tâche : ${task.title}`,
        isAutomatic: false,
      },
    });

    return { acknowledged: true, acknowledgedAt: updated.acknowledgedAt };
  }

  // ── Déclencher un incident ────────────────────────────────────────────────
  async triggerIncident(body: any, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id: body.buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const isExercise = body.isExercise === true;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // PMU actif
    const activePmu = await this.prisma.project.findFirst({
      where: { buildingId: body.buildingId, documentType: { in: ['PMU', 'PSI'] }, status: { in: ['VALIDATED', 'EXPORTED'] }, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { configData: true },
    });
    const configData    = activePmu?.configData as any;
    const assemblyPoint = configData?.pointRassemblement || null;

    // Snapshots
    const presentRecords = await this.prisma.occupancyRecord.findMany({
      where: { buildingId: body.buildingId, status: 'IN', checkedInAt: { gte: startOfDay } },
    });
    const presentIds = new Set(
      (await this.prisma.occupancyRecord.findMany({
        where: { buildingId: body.buildingId, status: 'IN', type: 'EMPLOYE', checkedInAt: { gte: startOfDay } },
        select: { employeeId: true },
      })).map(r => r.employeeId).filter(Boolean)
    );
    const allMembers = await this.prisma.buildingEmployee.findMany({
      where: { buildingId: body.buildingId, isActive: true, isEmergencyMember: true },
      include: { emergencyRoles: { orderBy: { priority: 'asc' } } },
      // smsConsent inclus automatiquement via Prisma
    });
    const mobilizableTeam = allMembers
      .filter(m => presentIds.has(m.id))
      .map(m => ({
        id: m.id, firstName: m.firstName, lastName: m.lastName,
        email: m.email,
        phone: m.smsConsent ? m.phone : null,  // SMS seulement si consentement
        smsConsent: (m as any).smsConsent ?? false,
        roles: m.emergencyRoles.map(r => ({ role: r.role, assignType: r.assignType, zone: r.zone })),
      }));

    const procedureCode = INCIDENT_PROCEDURE_MAP[body.type] || 'P001';
    const coordSteps    = await this.getCoordinatorSteps(procedureCode);

    // Créer l'incident
    const incident = await this.prisma.incidentEvent.create({
      data: {
        buildingId:        body.buildingId,
        organizationId,
        type:              body.type,
        triggeredBy:       body.triggeredBy,
        description:       body.description || null,
        occupantsSnapshot: presentRecords   as any,
        teamSnapshot:      mobilizableTeam  as any,
        procedureCode,
        procedureSnapshot: coordSteps       as any,
        assemblyPoint,
        isExercise,
        isActive: true,
      },
    });

    // Tâches checklist coordonnateur
    if (coordSteps.length > 0) {
      await this.prisma.incidentTask.createMany({
        data: coordSteps.map(step => ({
          incidentEventId:   incident.id,
          employeeId:        null,
          role:              'COORDINATOR' as any,
          title:             step.stepText.substring(0, 100),
          stepId:            step.stepId,
          stepText:          step.stepText,
          stepOrder:         step.stepOrder,
          isCoordinatorStep: true,
          status:            'PENDING' as any,
          notifiedAt:        new Date(),
        })),
      });
    }

    const incidentLabel  = INCIDENT_LABELS[body.type] || 'Incident';
    const occupantMsgCfg = OCCUPANT_MESSAGES[body.type] || OCCUPANT_MESSAGES.OTHER;

    // Notifications — seulement si pas exercice pour les occupants
    const coordinator = mobilizableTeam.find(m => m.roles.some(r => r.role === 'COORDINATOR'));
    if (coordinator?.email) {
      await this.notifyCoordinator(coordinator, incident, incidentLabel, building, assemblyPoint, coordSteps, isExercise);
    }

    const otherMembers = mobilizableTeam.filter(m => !m.roles.some(r => r.role === 'COORDINATOR') && m.email);
    for (const member of otherMembers) {
      // Créer tâche membre avec ackToken unique
      const memberTask = await this.prisma.incidentTask.create({
        data: {
          incidentEventId:   incident.id,
          employeeId:        member.id,
          role:              (member.roles[0]?.role || 'COORDINATOR') as any,
          title:             `Rapport au poste — ${member.firstName} ${member.lastName}`,
          isCoordinatorStep: false,
          status:            'PENDING' as any,
          ackToken:          randomUUID(),
          notifiedAt:        new Date(),
        },
      });
      await this.notifyMember(member, incidentLabel, building, assemblyPoint, memberTask.ackToken!, isExercise);
    }

    // Occupants — pas notifiés en mode exercice
    if (!isExercise) {
      const employeeEmails = (await this.prisma.buildingEmployee.findMany({
        where: { id: { in: [...presentIds] as string[] }, isActive: true, isEmergencyMember: false },
        select: { email: true },
      })).filter(e => e.email).map(e => e.email as string);
      for (const email of [...new Set(employeeEmails)]) {
        await this.notifyOccupant(email, incidentLabel, building, occupantMsgCfg.alert, assemblyPoint);
      }
    }

    // Log
    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: incident.id,
        action:  `${isExercise ? '[EXERCICE] ' : ''}Incident déclenché — ${incidentLabel}`,
        details: `${presentRecords.length} occupants · ${mobilizableTeam.length} membres mobilisés · Procédure ${procedureCode}${isExercise ? ' · MODE EXERCICE' : ''}`,
        isAutomatic: true,
      },
    });

    return { incident, coordinatorStepsCount: coordSteps.length, notifiedCount: mobilizableTeam.length, isExercise };
  }

  // ── Incidents actifs ──────────────────────────────────────────────────────
  async getActiveIncidents(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id: buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');
    return this.prisma.incidentEvent.findMany({
      where: { buildingId, isActive: true, status: { in: ['ACTIVE', 'CONTAINED'] }, organizationId },
      orderBy: { triggeredAt: 'desc' },
      include: { tasks: { orderBy: { stepOrder: 'asc' } }, logs: { orderBy: { timestamp: 'asc' } } },
    });
  }

  async getActiveIncident(buildingId: string, organizationId: string) {
    const incidents = await this.getActiveIncidents(buildingId, organizationId);
    return incidents[0] || null;
  }

  // ── Étapes coordonnateur ──────────────────────────────────────────────────
  async completeStep(taskId: string, organizationId: string) {
    const task = await this.prisma.incidentTask.findFirst({ where: { id: taskId, incidentEvent: { organizationId } } });
    if (!task) throw new NotFoundException('Étape introuvable');
    const updated = await this.prisma.incidentTask.update({ where: { id: taskId }, data: { status: 'COMPLETED', completedAt: new Date() } });
    await this.prisma.incidentLog.create({ data: { incidentEventId: task.incidentEventId, action: 'Étape complétée', details: task.stepText?.substring(0, 120) || task.title, isAutomatic: false } });
    return updated;
  }

  async uncompleteStep(taskId: string, organizationId: string) {
    const task = await this.prisma.incidentTask.findFirst({ where: { id: taskId, incidentEvent: { organizationId } } });
    if (!task) throw new NotFoundException('Étape introuvable');
    return this.prisma.incidentTask.update({ where: { id: taskId }, data: { status: 'PENDING', completedAt: null } });
  }

  async acknowledgeTask(taskId: string, organizationId: string) { return this.completeStep(taskId, organizationId); }
  async completeTask(taskId: string, organizationId: string)    { return this.completeStep(taskId, organizationId); }

  // ── Journal ───────────────────────────────────────────────────────────────
  async addLog(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return this.prisma.incidentLog.create({ data: { incidentEventId: incidentId, action: body.action, actor: body.actor || null, details: body.details || null, isAutomatic: false } });
  }

  // ── Contenir / Résoudre ───────────────────────────────────────────────────
  async containIncident(incidentId: string, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException();
    const updated = await this.prisma.incidentEvent.update({ where: { id: incidentId }, data: { status: 'CONTAINED', containedAt: new Date() } });
    await this.prisma.incidentLog.create({ data: { incidentEventId: incidentId, action: 'Incident contenu', isAutomatic: false } });
    return updated;
  }

  async resolveIncident(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException();
    const updated = await this.prisma.incidentEvent.update({ where: { id: incidentId }, data: { status: 'RESOLVED', resolvedAt: new Date(), closingNotes: body.closingNotes || null, isActive: false } });
    await this.prisma.incidentLog.create({ data: { incidentEventId: incidentId, action: 'Incident résolu', details: body.closingNotes || null, isAutomatic: false } });
    return updated;
  }

  // ── Historique + Détail ───────────────────────────────────────────────────
  async getIncidentHistory(buildingId: string, organizationId: string) {
    return this.prisma.incidentEvent.findMany({
      where: { buildingId, organizationId },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
      include: { tasks: { select: { status: true, isCoordinatorStep: true, acknowledgedAt: true } }, logs: { orderBy: { timestamp: 'asc' }, take: 1 } },
    });
  }

  async getIncidentDetail(incidentId: string, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({
      where: { id: incidentId, organizationId },
      include: { tasks: { orderBy: { stepOrder: 'asc' } }, logs: { orderBy: { timestamp: 'asc' } } },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return incident;
  }

  // ── REX ───────────────────────────────────────────────────────────────────
  async updateRex(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException();
    return this.prisma.incidentEvent.update({
      where: { id: incidentId },
      data: {
        rexWentWell:          body.rexWentWell          ?? null,
        rexToImprove:         body.rexToImprove         ?? null,
        rexRecommendations:   body.rexRecommendations   ?? null,
        rexCorrectiveActions: body.rexCorrectiveActions ?? null,
        rexCompletedAt:       body.rexCompletedAt ? new Date(body.rexCompletedAt) : null,
      },
    });
  }
}