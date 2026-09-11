import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { P003_ALERTE_INCENDIE } from '../generator/procedures/p003_alerte_incendie';
import { P004_ALARME_INCENDIE } from '../generator/procedures/p004_alarme_incendie';
import { P002_DECOUVERTE_FUMEE } from '../generator/procedures/p002_decouverte_fumee';
import { P005_FUITE_GAZ } from '../generator/procedures/p005_fuite_gaz';
import { P011_MENACE_ACTIVE } from '../generator/procedures/p011_menace_active';
import { P013_URGENCE_MEDICALE } from '../generator/procedures/p013_urgence_medicale';
import { P014_GAZ_TOXIQUE } from '../generator/procedures/p014_gaz_toxique';
import { P015_COLIS_SUSPECT } from '../generator/procedures/p015_colis_suspect';
import { P016_COUPURE_COURANT } from '../generator/procedures/p016_coupure_courant';
import { P018_MATIERES_DANGEREUSES } from '../generator/procedures/p018_matieres_dangereuses';
import { P019_ALERTE_BOMBE } from '../generator/procedures/p019_alerte_bombe';
import { P026_BATTERIE_LITHIUM } from '../generator/procedures/p026_batterie_lithium';
import { P024_INONDATIONS } from '../generator/procedures/p024_inondations';
import { P022_VENTS_VIOLENTS } from '../generator/procedures/p022_vents_violents';
import { P001_DIRECTIVES_GENERALES } from '../generator/procedures/p001_directives_generales';
import { ProcedureTemplate } from '../generator/procedures/types';

const PROCEDURE_MAP: Record<string, ProcedureTemplate> = {
  P001: P001_DIRECTIVES_GENERALES,
  P002: P002_DECOUVERTE_FUMEE,
  P003: P003_ALERTE_INCENDIE,
  P004: P004_ALARME_INCENDIE,
  P005: P005_FUITE_GAZ,
  P011: P011_MENACE_ACTIVE,
  P013: P013_URGENCE_MEDICALE,
  P014: P014_GAZ_TOXIQUE,
  P015: P015_COLIS_SUSPECT,
  P016: P016_COUPURE_COURANT,
  P018: P018_MATIERES_DANGEREUSES,
  P019: P019_ALERTE_BOMBE,
  P022: P022_VENTS_VIOLENTS,
  P024: P024_INONDATIONS,
  P026: P026_BATTERIE_LITHIUM,
};

// ── Mapping IncidentType → code procédure CORO ────────────────────────────
const INCIDENT_PROCEDURE_MAP: Record<string, string> = {
  SMOKE_DISCOVERY:    'P002',
  FIRE_ALERT:         'P003',
  FIRE_ALARM:         'P004',
  GAS_LEAK:           'P005',
  ACTIVE_THREAT:      'P011',
  MEDICAL:            'P013',
  TOXIC_GAS:          'P014',
  SUSPICIOUS_PACKAGE: 'P015',
  POWER_OUTAGE:       'P016',
  HAZMAT:             'P018',
  BOMB_THREAT:        'P019',
  LITHIUM_BATTERY:    'P026',
  FLOODING:           'P024',
  VIOLENT_WINDS:      'P022',
  OTHER:              'P001',
};

// ── Labels lisibles pour les courriels ───────────────────────────────────
const INCIDENT_LABELS: Record<string, string> = {
  SMOKE_DISCOVERY:    'Découverte de fumée',
  FIRE_ALERT:         'Alerte incendie',
  FIRE_ALARM:         'Alarme incendie',
  GAS_LEAK:           'Fuite de gaz',
  ACTIVE_THREAT:      'Menace active / Confinement',
  MEDICAL:            'Urgence médicale',
  TOXIC_GAS:          'Gaz toxique',
  SUSPICIOUS_PACKAGE: 'Colis suspect',
  POWER_OUTAGE:       'Coupure de courant',
  HAZMAT:             'Matières dangereuses',
  BOMB_THREAT:        'Alerte à la bombe',
  LITHIUM_BATTERY:    'Batterie lithium-ion',
  FLOODING:           'Inondations',
  VIOLENT_WINDS:      'Vents violents',
  OTHER:              'Incident général',
};

// ── Message occupants par type ────────────────────────────────────────────
const OCCUPANT_MESSAGES: Record<string, { alert: string; alarm: string }> = {
  FIRE_ALERT:      { alert: 'Une investigation est en cours dans le bâtiment. Restez en place et préparez-vous à évacuer.', alarm: 'Évacuez immédiatement le bâtiment.' },
  FIRE_ALARM:      { alert: 'Évacuez immédiatement le bâtiment.', alarm: 'Évacuez immédiatement le bâtiment.' },
  SMOKE_DISCOVERY: { alert: 'Une investigation est en cours. Restez en place et soyez prêt à évacuer.', alarm: 'Évacuez immédiatement le bâtiment.' },
  GAS_LEAK:        { alert: 'Une fuite de gaz possible est en cours d\'investigation. Évitez d\'utiliser des équipements électriques.', alarm: 'Évacuez immédiatement le bâtiment par les sorties désignées.' },
  ACTIVE_THREAT:   { alert: 'Mesure de confinement en vigueur. Restez à l\'intérieur, verrouillez les portes, éteignez les lumières.', alarm: 'Confinement d\'urgence — Ne bougez pas.' },
  MEDICAL:         { alert: 'Une urgence médicale est en cours. Les secours sont en route. Dégagez les allées.', alarm: 'Urgence médicale — Gardez les allées dégagées pour les secours.' },
  HAZMAT:          { alert: 'Un incident impliquant des matières dangereuses est en cours. Restez à l\'écart de la zone identifiée.', alarm: 'Évacuez immédiatement par les sorties éloignées de la zone à risque.' },
  POWER_OUTAGE:    { alert: 'Une coupure de courant est en cours. Restez calme, l\'éclairage d\'urgence est actif.', alarm: 'Coupure de courant — Suivez l\'éclairage d\'urgence pour sortir.' },
  OTHER:           { alert: 'Un incident est en cours dans le bâtiment. Restez en place et attendez les instructions.', alarm: 'Suivez les instructions de l\'équipe d\'urgence.' },
};

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  // ── Charger les étapes du coordonnateur depuis la bibliothèque ────────────
  private async getCoordinatorSteps(procedureCode: string): Promise<Array<{stepId: string; stepText: string; stepOrder: number}>> {
    try {
      const procedure = PROCEDURE_MAP[procedureCode];
      if (!procedure) return [];

      const coordSection = procedure.roleSections?.find(
        s => s.roleCode === 'ROLE-CU' || s.roleCode === 'ROLE-AS'
      );
      if (!coordSection?.steps) return [];

      return coordSection.steps.map((step, index) => ({
        stepId:    step.id || `${procedureCode}-step-${index}`,
        stepText:  (step.textFR || step.textEN || '').replace(/\*\*/g, ''),
        stepOrder: index,
      }));
    } catch {
      return [];
    }
  }

  // ── Déclencher un incident ────────────────────────────────────────────────
  async triggerIncident(body: any, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: body.buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Récupérer le PMU actif du bâtiment pour le point de rassemblement
    const activePmu = await this.prisma.project.findFirst({
      where: {
        buildingId: body.buildingId,
        documentType: { in: ['PMU', 'PSI'] },
        status: { in: ['VALIDATED', 'EXPORTED'] },
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      select: { configData: true },
    });
    const configData = activePmu?.configData as any;
    const assemblyPoint = configData?.pointRassemblement || null;
    const commandPost   = configData?.posteCommandement  || null;

    // Snapshot occupants présents
    const presentRecords = await this.prisma.occupancyRecord.findMany({
      where: { buildingId: body.buildingId, status: 'IN', checkedInAt: { gte: startOfDay } },
    });

    // Membres d'urgence présents
    const allMembers = await this.prisma.buildingEmployee.findMany({
      where: { buildingId: body.buildingId, isActive: true, isEmergencyMember: true },
      include: { emergencyRoles: { orderBy: { priority: 'asc' } } },
    });
    const presentIds = new Set(
      (await this.prisma.occupancyRecord.findMany({
        where: { buildingId: body.buildingId, status: 'IN', type: 'EMPLOYE', checkedInAt: { gte: startOfDay } },
        select: { employeeId: true },
      })).map(r => r.employeeId).filter(Boolean)
    );
    const mobilizableTeam = allMembers
      .filter(m => presentIds.has(m.id))
      .map(m => ({
        id: m.id, firstName: m.firstName, lastName: m.lastName, email: m.email, phone: m.phone,
        roles: m.emergencyRoles.map(r => ({ role: r.role, assignType: r.assignType, zone: r.zone })),
      }));

    // Procédure liée
    const procedureCode  = INCIDENT_PROCEDURE_MAP[body.type] || 'P001';
    const coordSteps     = await this.getCoordinatorSteps(procedureCode);

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
        isActive:          true,
      },
    });

    // Créer les tâches checklist coordonnateur
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

    const incidentLabel  = INCIDENT_LABELS[body.type]  || 'Incident';
    const occupantMsgCfg = OCCUPANT_MESSAGES[body.type] || OCCUPANT_MESSAGES.OTHER;

    // ── Courriel coordonnateur — procédure complète ───────────────────────
    const coordinator = mobilizableTeam.find(m => m.roles.some(r => r.role === 'COORDINATOR'));
    if (coordinator?.email) {
      await this.sendCoordinatorEmail(coordinator, incident, incidentLabel, building, assemblyPoint, commandPost, coordSteps);
    }

    // ── Courriel membres équipe — notification simple ─────────────────────
    const otherMembers = mobilizableTeam.filter(m =>
      !m.roles.some(r => r.role === 'COORDINATOR') && m.email
    );
    for (const member of otherMembers) {
      await this.sendMemberAlertEmail(member, incidentLabel, building, assemblyPoint);
    }

    // ── Courriel occupants présents ───────────────────────────────────────
    const occupantEmails = presentRecords
      .filter(r => r.email && r.type !== 'EMPLOYE')
      .map(r => r.email as string);
    const employeeEmails = (await this.prisma.buildingEmployee.findMany({
      where: {
        id: { in: [...presentIds] as string[] },
        isActive: true,
        isEmergencyMember: false,
      },
      select: { email: true },
    })).filter(e => e.email).map(e => e.email as string);

    const allOccupantEmails = [...new Set([...occupantEmails, ...employeeEmails])];
    for (const email of allOccupantEmails) {
      await this.sendOccupantAlertEmail(email, incidentLabel, building, occupantMsgCfg.alert, assemblyPoint);
    }

    // Log automatique
    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: incident.id,
        action:  `Incident déclenché — ${incidentLabel}`,
        details: `${presentRecords.length} occupants présents · ${mobilizableTeam.length} membres d'urgence mobilisés · Procédure ${procedureCode} activée`,
        isAutomatic: true,
      },
    });

    return { incident, coordinatorStepsCount: coordSteps.length, notifiedCount: mobilizableTeam.length + allOccupantEmails.length };
  }

  // ── Incidents actifs (supporte plusieurs simultanés) ──────────────────────
  async getActiveIncidents(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id: buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    return this.prisma.incidentEvent.findMany({
      where: { buildingId, isActive: true, status: { in: ['ACTIVE', 'CONTAINED'] }, organizationId },
      orderBy: { triggeredAt: 'desc' },
      include: {
        tasks: { orderBy: { stepOrder: 'asc' } },
        logs:  { orderBy: { timestamp: 'asc' } },
      },
    });
  }

  // Conserver la méthode singular pour compatibilité avec l'ancien code frontend
  async getActiveIncident(buildingId: string, organizationId: string) {
    const incidents = await this.getActiveIncidents(buildingId, organizationId);
    return incidents[0] || null;
  }

  // ── Cocher une étape coordonnateur ───────────────────────────────────────
  async completeStep(taskId: string, organizationId: string) {
    const task = await this.prisma.incidentTask.findFirst({
      where: { id: taskId, incidentEvent: { organizationId } },
    });
    if (!task) throw new NotFoundException('Étape introuvable');

    const updated = await this.prisma.incidentTask.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await this.prisma.incidentLog.create({
      data: {
        incidentEventId: task.incidentEventId,
        action:  `Étape complétée`,
        details: task.stepText?.substring(0, 120) || task.title,
        isAutomatic: false,
      },
    });

    return updated;
  }

  // ── Décocher une étape (annuler) ─────────────────────────────────────────
  async uncompleteStep(taskId: string, organizationId: string) {
    const task = await this.prisma.incidentTask.findFirst({
      where: { id: taskId, incidentEvent: { organizationId } },
    });
    if (!task) throw new NotFoundException('Étape introuvable');

    return this.prisma.incidentTask.update({
      where: { id: taskId },
      data: { status: 'PENDING', completedAt: null },
    });
  }

  // ── Conserver acknowledge/complete pour compatibilité ────────────────────
  async acknowledgeTask(taskId: string, organizationId: string) {
    return this.completeStep(taskId, organizationId);
  }

  async completeTask(taskId: string, organizationId: string) {
    return this.completeStep(taskId, organizationId);
  }

  // ── Journal manuel ────────────────────────────────────────────────────────
  async addLog(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    return this.prisma.incidentLog.create({
      data: {
        incidentEventId: incidentId,
        action:      body.action,
        actor:       body.actor  || null,
        details:     body.details || null,
        isAutomatic: false,
      },
    });
  }

  // ── Contenir ──────────────────────────────────────────────────────────────
  async containIncident(incidentId: string, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const updated = await this.prisma.incidentEvent.update({
      where: { id: incidentId },
      data: { status: 'CONTAINED', containedAt: new Date() },
    });
    await this.prisma.incidentLog.create({
      data: { incidentEventId: incidentId, action: 'Incident contenu', isAutomatic: false },
    });
    return updated;
  }

  // ── Résoudre ──────────────────────────────────────────────────────────────
  async resolveIncident(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const updated = await this.prisma.incidentEvent.update({
      where: { id: incidentId },
      data: { status: 'RESOLVED', resolvedAt: new Date(), closingNotes: body.closingNotes || null, isActive: false },
    });
    await this.prisma.incidentLog.create({
      data: { incidentEventId: incidentId, action: 'Incident résolu', details: body.closingNotes || null, isAutomatic: false },
    });
    return updated;
  }

  // ── Historique ────────────────────────────────────────────────────────────
  async getIncidentHistory(buildingId: string, organizationId: string) {
    return this.prisma.incidentEvent.findMany({
      where: { buildingId, organizationId },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
      include: {
        tasks: { select: { status: true, isCoordinatorStep: true } },
        logs:  { orderBy: { timestamp: 'asc' }, take: 3 },
      },
    });
  }

  // ── Courriels ─────────────────────────────────────────────────────────────

  private async sendCoordinatorEmail(member: any, incident: any, label: string, building: any, assemblyPoint: string | null, commandPost: string | null, steps: any[]) {
    const stepsHtml = steps.map((s, i) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #F1F3F5;vertical-align:top;">
          <span style="display:inline-block;width:22px;height:22px;border-radius:50%;border:2px solid #DEE2E6;text-align:center;line-height:18px;font-size:11px;color:#ADB5BD;margin-right:10px;">${i + 1}</span>
          <span style="font-size:14px;color:#2C3E50;">${s.stepText}</span>
        </td>
      </tr>`
    ).join('');

    await this.sendEmail({
      to: member.email,
      toName: `${member.firstName} ${member.lastName}`,
      subject: `🚨 INCIDENT — ${label} · ${building.name}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;">
          <div style="background:#C0392B;padding:24px;border-radius:8px 8px 0 0;">
            <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#FFF">RO</span></span>
            <span style="color:rgba(255,255,255,0.7);font-size:13px;margin-left:12px;">Sentinelle — Module Incident</span>
          </div>
          <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
            <div style="background:#FDEDEC;border-left:4px solid #C0392B;padding:12px 16px;margin:0 0 24px;border-radius:4px;">
              <p style="margin:0;font-size:18px;font-weight:800;color:#C0392B;">🚨 ${label.toUpperCase()}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#6C757D;">${building.name} · ${building.address}, ${building.city}</p>
            </div>
            <p style="color:#2C3E50;margin:0 0 8px;">Bonjour <strong>${member.firstName}</strong>,</p>
            <p style="color:#6C757D;margin:0 0 24px;">Vous êtes le coordonnateur d'urgence actif. Voici votre procédure à suivre :</p>
            ${commandPost ? `<p style="background:#EBF5FB;padding:10px 14px;border-radius:6px;font-size:14px;color:#2980B9;margin:0 0 20px;"><strong>📍 Poste de commandement :</strong> ${commandPost}</p>` : ''}
            ${assemblyPoint ? `<p style="background:#EAFAF1;padding:10px 14px;border-radius:6px;font-size:14px;color:#27AE60;margin:0 0 20px;"><strong>🏁 Point de rassemblement :</strong> ${assemblyPoint}</p>` : ''}
            <table style="width:100%;border-collapse:collapse;border:1px solid #E9ECEF;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              ${stepsHtml}
            </table>
            <p style="color:#ADB5BD;font-size:12px;margin:0;">Incident déclenché le ${new Date().toLocaleString('fr-CA')} par ${incident.triggeredBy}</p>
          </div>
        </div>`,
    });
  }

  private async sendMemberAlertEmail(member: any, label: string, building: any, assemblyPoint: string | null) {
    const roles = member.roles.map((r: any) => r.role).join(', ');
    await this.sendEmail({
      to: member.email,
      toName: `${member.firstName} ${member.lastName}`,
      subject: `🚨 ${label} — Rapport à votre poste · ${building.name}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:540px;margin:0 auto;">
          <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
            <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
          </div>
          <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
            <div style="background:#FEF9E7;border-left:4px solid #E67E22;padding:16px;margin:0 0 20px;border-radius:4px;">
              <p style="margin:0;font-size:18px;font-weight:800;color:#E67E22;">⚠️ ${label}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#6C757D;">${building.name}</p>
            </div>
            <p style="color:#2C3E50;margin:0 0 16px;">Bonjour <strong>${member.firstName}</strong>,</p>
            <p style="font-size:20px;font-weight:800;color:#C0392B;margin:0 0 12px;">Rapport à votre poste immédiatement.</p>
            ${assemblyPoint ? `<p style="font-size:14px;color:#27AE60;margin:0 0 12px;"><strong>Point de rassemblement : ${assemblyPoint}</strong></p>` : ''}
            <p style="font-size:13px;color:#ADB5BD;">Rôle(s) : ${roles}</p>
          </div>
        </div>`,
    });
  }

  private async sendOccupantAlertEmail(email: string, label: string, building: any, message: string, assemblyPoint: string | null) {
    await this.sendEmail({
      to: email,
      toName: 'Occupant',
      subject: `ℹ️ Avis — ${building.name}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:540px;margin:0 auto;">
          <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
            <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
          </div>
          <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
            <p style="font-size:16px;font-weight:700;color:#2C3E50;margin:0 0 12px;">${label} — ${building.name}</p>
            <p style="font-size:15px;color:#495057;margin:0 0 20px;">${message}</p>
            ${assemblyPoint ? `<div style="background:#EAFAF1;border-left:4px solid #27AE60;padding:12px 16px;border-radius:4px;"><p style="margin:0;font-size:14px;color:#27AE60;font-weight:700;">🏁 Point de rassemblement : ${assemblyPoint}</p></div>` : ''}
          </div>
        </div>`,
    });
  }

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
    } catch (e) {
      console.error('[IncidentService] Erreur courriel:', e);
    }
  }
}