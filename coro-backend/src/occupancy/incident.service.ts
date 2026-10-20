import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomUUID } from 'crypto';
import { CoroActorType, IncidentPermission } from '@prisma/client';
import { IncidentNotificationDispatcherService } from './incident-notification-dispatcher.service';
import { Cron } from '@nestjs/schedule';

type IncidentAuditContext = {
  actorType: CoroActorType;
  actorId: string;
  assignmentId?: string;
  permission?: IncidentPermission;
  reason: string;
  requestId?: string;
};
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

// Fenêtre de confirmation avant qu'une pré-alerte (panneau d'alarme incendie)
// n'escalade automatiquement en incident actif avec notifications envoyées.
const ALARM_ESCALATION_WINDOW_MS = 45_000;
const PUBLIC_CAPABILITY_TTL_MS = 15 * 60 * 1000;
const TASK_ACK_DEADLINE_MS = {
  CRITICAL: 2 * 60 * 1000,
  HIGH: 5 * 60 * 1000,
  NORMAL: 15 * 60 * 1000,
  LOW: 30 * 60 * 1000,
} as const;

type IncidentTaskSeverityName = keyof typeof TASK_ACK_DEADLINE_MS;

function taskAckPolicy(severity: IncidentTaskSeverityName, configuredAt: Date) {
  const acknowledgmentWindowMs = TASK_ACK_DEADLINE_MS[severity];
  return {
    version: 1,
    severity,
    acknowledgmentWindowMs,
    alternateWindowMs: acknowledgmentWindowMs,
    maximumAutomaticAlternateLevels: 2,
    configuredAt: configuredAt.toISOString(),
    source: 'FOUNDER_APPROVED_DEFAULTS',
    regulatoryClaim: false,
  };
}

function escapeIncidentNotificationHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

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

// ── Fiche d'intervention — construction du snapshot au déclenchement ────────
function buildInterventionSheet(building: any, configData: any, contactsModule2: any) {
  const cfg = configData || {};
  return {
    building: {
      name: building.name,
      address: building.address,
      city: building.city,
      province: building.province,
      buildingType: cfg.buildingType || null,
      responsable: {
        name: `${building.responsableFirstName || ''} ${building.responsableLastName || ''}`.trim() || null,
        phone: building.responsablePhone || null,
        email: building.responsableEmail || null,
      },
    },
    acces: {
      posteCommandement: cfg.posteCommandement || null,
      boiteClePompier: cfg.boiteClePompier || null,
      trousseClesPompierLieu: cfg.trousseClesPompier ? cfg.trousseClesPompierLieu || null : null,
      raccordPompierLieu: cfg.raccordPompier ? cfg.raccordPompierLieu || null : null,
      bornesFontaineLieu: cfg.bornesFontaine ? cfg.bornesFontaineLieu || null : null,
      vannesIsolementLieu: cfg.vannesIsolement ? cfg.vannesIsolementLieu || null : null,
      ascenseurPompier: cfg.ascenseurPompier ? cfg.ascenseurPompierLequel || null : null,
    },
    protectionIncendie: {
      panneauAlarme: !!cfg.panneauAlarme,
      panneauLocalisation: cfg.panneauLocalisation || null,
      gicleurs: !!cfg.gicleurs,
      salleGicleurs: cfg.salleGicleurs || null,
      pompeIncendie: !!cfg.pompeIncendie,
      pompeIncendieLieu: cfg.pompeIncendieLieu || null,
      extincteurPortatif: !!cfg.extincteurPortatif,
    },
    matieresDangereuses: {
      presentes: !!cfg.matieresDangereuses,
      liste: Array.isArray(cfg.matieresList) ? cfg.matieresList : [],
      ammoniac: !!cfg.ammoniac,
      batteriesLithium: !!cfg.batteriesLithium,
    },
    utilites: {
      vanneGazNaturel: cfg.vannesArretGazNaturel || null,
      vanneEauDomestique: cfg.vannesArretEauDomestique || null,
      vanneSalleElectrique: cfg.vannesArretSalleElectrique || null,
    },
    rassemblement: {
      principal: cfg.pointRassemblement || null,
      secondaire: cfg.pointRassemblement2 || null,
      lieuAccueilTemporaire: cfg.lieuAccueilTemporaire || null,
    },
    personnesAssistance: cfg.personnelHandicap ? {
      present: true,
      typesLimitations: Array.isArray(cfg.ppnaeTypesLimitations) ? cfg.ppnaeTypesLimitations : [],
      mesuresPrevues: Array.isArray(cfg.ppnaeMesures) ? cfg.ppnaeMesures : [],
      avertissement: 'Donnée déclarative issue du PMU — peut être incomplète. Vérifier sur place.',
    } : { present: false },
    contacts: contactsModule2 || null,
  };
}

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService, @Optional() private readonly dispatcher?: IncidentNotificationDispatcherService) {}

  async requireIncidentAuthority(input: {
    actorType: 'USER' | 'CLIENT_USER';
    actorId: string;
    organizationId: string;
    buildingId?: string;
    incidentEventId?: string;
    permission: IncidentPermission;
  }) {
    if (!input.actorId) throw new NotFoundException('Identite operationnelle introuvable.');
    let buildingId = input.buildingId;
    if (input.incidentEventId) {
      const incident = await this.prisma.incidentEvent.findFirst({
        where: { id: input.incidentEventId, organizationId: input.organizationId },
        select: { buildingId: true, status: true, isActive: true },
      });
      if (!incident || !incident.isActive || !['PRE_ALERT', 'ACTIVE', 'CONTAINED'].includes(incident.status)) {
        throw new NotFoundException('Incident actif introuvable.');
      }
      buildingId = incident.buildingId;
    }
    if (!buildingId) throw new NotFoundException('Portee batiment requise.');
    if (input.actorType === 'CLIENT_USER') {
      const identity = await this.prisma.clientUser.findFirst({
        where: { id: input.actorId, organizationId: input.organizationId, isActive: true, incidentPermissions: { has: input.permission } },
        select: { id: true },
      });
      if (!identity) throw new NotFoundException('Autorite incident introuvable.');
    } else {
      const identity = await this.prisma.user.findFirst({ where: { id: input.actorId, organizationId: input.organizationId, isActive: true }, select: { id: true } });
      if (!identity) throw new NotFoundException('Identite operatrice inactive ou introuvable.');
    }
    const assignment = await this.prisma.incidentAuthorityAssignment.findFirst({
      where: {
        organizationId: input.organizationId,
        buildingId,
        incidentEventId: input.incidentEventId ?? null,
        subjectType: input.actorType,
        subjectId: input.actorId,
        status: 'ACTIVE',
        permissions: { has: input.permission },
      },
    });
    if (!assignment) throw new NotFoundException('Affectation operationnelle explicite requise.');
    return assignment;
  }

  async requireTaskAuthority(taskId: string, actorType: 'USER' | 'CLIENT_USER', actorId: string, organizationId: string, permission: IncidentPermission) {
    const task = await this.prisma.incidentTask.findFirst({ where: { id: taskId, incidentEvent: { organizationId } }, select: { incidentEventId: true } });
    if (!task) throw new NotFoundException('Tache introuvable.');
    return this.requireIncidentAuthority({ actorType, actorId, organizationId, incidentEventId: task.incidentEventId, permission });
  }

  async grantIncidentAuthority(input: {
    organizationId: string; buildingId: string; incidentEventId?: string; subjectType: 'USER' | 'CLIENT_USER';
    subjectId: string; operationalRole: string; permissions: IncidentPermission[]; reason: string;
    grantedByType: 'USER' | 'CLIENT_USER'; grantedById: string; authorizationAssignmentId?: string; requestId?: string;
  }) {
    if (!input.reason?.trim() || !input.operationalRole?.trim() || input.permissions.length === 0) {
      throw new ConflictException('Role, permissions et justification sont obligatoires.');
    }
    if (input.incidentEventId) {
      const incident = await this.prisma.incidentEvent.findFirst({ where: { id: input.incidentEventId, organizationId: input.organizationId, buildingId: input.buildingId, isActive: true }, select: { id: true } });
      if (!incident) throw new NotFoundException('Incident actif introuvable.');
    }
    const subject = input.subjectType === 'USER'
      ? await this.prisma.user.findFirst({ where: { id: input.subjectId, organizationId: input.organizationId, isActive: true }, select: { id: true } })
      : await this.prisma.clientUser.findFirst({ where: { id: input.subjectId, organizationId: input.organizationId, isActive: true }, select: { id: true } });
    if (!subject) throw new NotFoundException('Identite cible active introuvable dans cette organisation.');
    return this.prisma.$transaction(async (tx) => {
    const assignment = await tx.incidentAuthorityAssignment.create({ data: {
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      incidentEventId: input.incidentEventId ?? null,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      operationalRole: input.operationalRole.trim(),
      permissions: input.permissions,
      grantedByType: input.grantedByType,
      grantedById: input.grantedById,
      grantReason: input.reason.trim(),
    } });
    if (input.incidentEventId) await this.appendCriticalAudit(tx, {
      organizationId: input.organizationId, buildingId: input.buildingId, incidentEventId: input.incidentEventId,
      operation: 'INCIDENT_AUTHORITY_ASSIGNED', actorType: input.grantedByType, actorId: input.grantedById,
      assignmentId: input.authorizationAssignmentId, permission: 'INCIDENT_SUPERVISE', reason: input.reason.trim(), requestId: input.requestId,
      previousState: null, resultingState: { id: assignment.id, subjectType: assignment.subjectType, subjectId: assignment.subjectId, permissions: assignment.permissions, status: assignment.status },
    });
    return assignment;
    });
  }

  async revokeIncidentAuthority(assignmentId: string, organizationId: string, actorType: 'USER' | 'CLIENT_USER', actorId: string, reason: string, expectedLockVersion: number, authorizationAssignmentId?: string, requestId?: string) {
    if (!reason?.trim()) throw new ConflictException('Une justification est obligatoire.');
    const assignment = await this.prisma.incidentAuthorityAssignment.findFirst({ where: { id: assignmentId, organizationId, status: 'ACTIVE' } });
    if (!assignment) throw new ConflictException('Affectation absente ou deja revoquee.');
    return this.prisma.$transaction(async (tx) => {
    const claimed = await tx.incidentAuthorityAssignment.updateMany({
      where: { id: assignmentId, organizationId, status: 'ACTIVE', lockVersion: expectedLockVersion },
      data: { status: 'REVOKED', revokedByType: actorType, revokedById: actorId, revokedAt: new Date(), revocationReason: reason.trim(), lockVersion: { increment: 1 } },
    });
    if (claimed.count !== 1) throw new ConflictException('Affectation absente, deja revoquee ou modifiee.');
    const updated = await tx.incidentAuthorityAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    if (assignment.incidentEventId) await this.appendCriticalAudit(tx, {
      organizationId, buildingId: assignment.buildingId, incidentEventId: assignment.incidentEventId,
      operation: 'INCIDENT_AUTHORITY_REVOKED', actorType, actorId, assignmentId: authorizationAssignmentId,
      permission: 'INCIDENT_SUPERVISE', reason: reason.trim(), requestId,
      previousState: { id: assignment.id, status: assignment.status, lockVersion: assignment.lockVersion },
      resultingState: { id: updated.id, status: updated.status, lockVersion: updated.lockVersion },
    });
    return { revoked: true };
    });
  }

  private async appendCriticalAudit(tx: any, input: { organizationId: string; buildingId: string; incidentEventId: string; operation: string; actorType: CoroActorType; actorId: string; assignmentId?: string; permission?: IncidentPermission; reason?: string; requestId?: string; previousState?: unknown; resultingState?: unknown }) {
    // Serialize one chain per tenant/incident. Without this transaction-scoped
    // lock, concurrent mutations could both select the same predecessor and
    // silently fork the append-only chain.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.organizationId}:${input.incidentEventId}`}))`;
    const previous = await tx.incidentAuditEvent.findFirst({ where: { organizationId: input.organizationId, incidentEventId: input.incidentEventId }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], select: { eventHash: true } });
    const occurredAt = new Date();
    const canonical = JSON.stringify({ ...input, occurredAt: occurredAt.toISOString(), previousEventHash: previous?.eventHash ?? null });
    const eventHash = createHash('sha256').update(canonical).digest('hex');
    return tx.incidentAuditEvent.create({ data: { organizationId: input.organizationId, buildingId: input.buildingId, incidentEventId: input.incidentEventId, operation: input.operation, actorType: input.actorType, actorId: input.actorId, authorizationAssignmentId: input.assignmentId, authorizationPermission: input.permission, reason: input.reason, requestId: input.requestId, previousState: input.previousState as any, resultingState: input.resultingState as any, occurredAt, previousEventHash: previous?.eventHash ?? null, eventHash } });
  }

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
    assemblyPoint: string | null, coordSteps: any[], isExercise: boolean, tx: any = this.prisma,
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

    if (!this.dispatcher) throw new Error('Incident notification dispatcher unavailable');
    await this.dispatcher.enqueue({ organizationId: incident.organizationId, incidentEventId: incident.id, channel: 'EMAIL', purpose: 'COORDINATOR_ALERT', idempotencyKey: `${incident.id}:coordinator:${member.id}:email`, envelope: { destination: member.email, subject, html } }, tx);

    // SMS coordonnateur
    if (member.phone) {
      const sms = `${exercisePrefix}CORO SENTINELLE\n${label} - ${building.name}\nVous êtes coordonnateur actif.\n${assemblyPoint ? `Rassemblement: ${assemblyPoint}\n` : ''}Consultez votre courriel pour la procédure ${incident.procedureCode}.`;
      await this.dispatcher.enqueue({ organizationId: incident.organizationId, incidentEventId: incident.id, channel: 'SMS', purpose: 'COORDINATOR_ALERT', idempotencyKey: `${incident.id}:coordinator:${member.id}:sms`, envelope: { destination: member.phone, message: sms } }, tx);
    }
  }

  // ── Courriel + SMS membres équipe ────────────────────────────────────────
  private async notifyMember(member: any, incident: any, label: string, building: any, assemblyPoint: string | null, ackToken: string, isExercise: boolean, tx: any = this.prisma) {
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

    if (!this.dispatcher) throw new Error('Incident notification dispatcher unavailable');
    await this.dispatcher.enqueue({ organizationId: incident.organizationId, incidentEventId: incident.id, channel: 'EMAIL', purpose: 'MEMBER_ALERT', idempotencyKey: `${incident.id}:member:${member.id}:email`, envelope: { destination: member.email, subject, html } }, tx);

    // SMS membre
    if (member.phone) {
      const sms = `${exercisePrefix}CORO SENTINELLE\n${label} - ${building.name}\nRapport à votre poste (${roles}).\n${assemblyPoint ? `Rassemblement: ${assemblyPoint}\n` : ''}Confirmez: ${ackUrl}`;
      await this.dispatcher.enqueue({ organizationId: incident.organizationId, incidentEventId: incident.id, channel: 'SMS', purpose: 'MEMBER_ALERT', idempotencyKey: `${incident.id}:member:${member.id}:sms`, envelope: { destination: member.phone, message: sms } }, tx);
    }
  }

  // ── Courriel occupants ────────────────────────────────────────────────────
  private async notifyOccupant(email: string, incident: any, label: string, building: any, message: string, assemblyPoint: string | null, tx: any = this.prisma) {
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
    if (!this.dispatcher) throw new Error('Incident notification dispatcher unavailable');
    const recipientHash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    await this.dispatcher.enqueue({ organizationId: incident.organizationId, incidentEventId: incident.id, channel: 'EMAIL', purpose: 'OCCUPANT_ALERT', idempotencyKey: `${incident.id}:occupant:${recipientHash}:email`, envelope: { destination: email, subject: `Avis - ${building.name}`, html } }, tx);
  }

  // ── Accusé de réception public (sans auth) ───────────────────────────────
  async acknowledgeByToken(ackToken: string) {
    const task = await this.prisma.incidentTask.findUnique({ where: { ackToken }, include: { incidentEvent: { select: { organizationId: true, buildingId: true } } } });
    if (!task) throw new NotFoundException('Lien invalide ou expiré');
    const now = new Date();
    if (task.ackRevokedAt || task.ackUsedAt || !task.ackExpiresAt || task.ackExpiresAt <= now) {
      throw new NotFoundException('Lien invalide ou expire');
    }
    return this.prisma.$transaction(async (tx) => {
    const claimed = await tx.incidentTask.updateMany({
      where: { id: task.id, ackUsedAt: null, ackRevokedAt: null, ackExpiresAt: { gt: now } },
      data: { status: 'ACKNOWLEDGED', acknowledgedAt: now, ackUsedAt: now, escalationStatus: 'ACKNOWLEDGED', nextEscalationAt: null, escalationCancelledAt: now, escalationCancellationReason: 'ACKNOWLEDGED_BY_CAPABILITY', lockVersion: { increment: 1 } },
    });
    if (claimed.count !== 1) throw new ConflictException('Ce lien a deja ete utilise.');

    await tx.incidentLog.create({
      data: {
        incidentEventId: task.incidentEventId,
        action:  'Accusé de réception — membre confirmé au poste',
        details: `Tâche : ${task.title}`,
        isAutomatic: false,
      },
    });

    await this.appendCriticalAudit(tx, {
      organizationId: task.incidentEvent.organizationId, buildingId: task.incidentEvent.buildingId,
      incidentEventId: task.incidentEventId, operation: 'TASK_ACKNOWLEDGED_BY_CAPABILITY',
      actorType: 'SYSTEM', actorId: `public-task-capability:${task.id}`, reason: 'Single-use public acknowledgment capability',
      previousState: { id: task.id, status: task.status, lockVersion: task.lockVersion },
      resultingState: { id: task.id, status: 'ACKNOWLEDGED', lockVersion: task.lockVersion + 1 },
    });

    return { acknowledged: true, acknowledgedAt: now };
    });
  }

  // ── Bouton panique ────────────────────────────────────────────────────────
  async triggerPanic(buildingId: string, body: any, organizationId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const triggeredBy  = body.triggeredBy || 'Inconnu';
    const emergencyType = body.emergencyType || 'URGENCE GÉNÉRALE';
    const now          = new Date().toLocaleString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const address      = `${building.address || ''}, ${building.city || ''}, ${building.province || ''}`.trim().replace(/^,|,$/g, '');

    const smsText = `🚨 ALERTE SÉCURITÉ — MENACE ACTIVE\n${building.name}\n${address}\nDéclenché par ${triggeredBy} à ${now}\n\nCOMPOSEZ LE 911 ET DITES :\n"Menace active au ${address}"\n\nSECURITY ALERT — ACTIVE THREAT\nCall 911 and say: "Active threat at ${address}"`;

    const htmlEmail = `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#C0392B;padding:24px;border-radius:8px 8px 0 0;">
          <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span>RO</span></span>
          <span style="background:#FFFFFF;color:#C0392B;font-size:13px;font-weight:800;padding:4px 10px;border-radius:4px;margin-left:12px;">🚨 ALERTE PANIQUE</span>
        </div>
        <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
          <div style="background:#FDEDEC;border-left:6px solid #C0392B;padding:16px 20px;border-radius:4px;margin-bottom:24px;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#C0392B;">🚨 MENACE ACTIVE — ACTIVE THREAT</p>
            <p style="margin:6px 0 0;font-size:15px;color:#6C757D;">${building.name}</p>
          </div>
          <div style="background:#F8F9FA;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:14px;color:#6C757D;">📍 <strong style="color:#2C3E50;">${address}</strong></p>
            <p style="margin:0 0 8px;font-size:14px;color:#6C757D;">🕐 Déclenché à <strong style="color:#2C3E50;">${now}</strong></p>
            <p style="margin:0;font-size:14px;color:#6C757D;">👤 Par <strong style="color:#2C3E50;">${triggeredBy}</strong></p>
          </div>
          <div style="background:#1A1A1A;border-radius:8px;padding:16px 20px;margin-bottom:16px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#FFFFFF;text-transform:uppercase;letter-spacing:0.1em;">📞 Composez le 911 et dites :</p>
            <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#FFD700;">"Menace active au ${address}"</p>
            <p style="margin:0;font-size:12px;color:#ADB5BD;">Call 911 and say: "Active threat at ${address}"</p>
          </div>
          <a href="tel:911" style="display:block;text-align:center;background:#C0392B;color:#FFFFFF;padding:16px;border-radius:8px;text-decoration:none;font-size:20px;font-weight:900;margin-bottom:16px;">
            📞 APPELER LE 911
          </a>
          <p style="color:#ADB5BD;font-size:12px;text-align:center;margin:0;">
            Cette alerte a été envoyée automatiquement par CORO Sentinelle.<br>
            ${building.name} · ${address}
          </p>
        </div>
      </div>`;

    // Contacts à notifier
    const contacts: Array<{ email?: string; phone?: string; name: string }> = [];

    // 1. Responsable du bâtiment
    if (building.responsableEmail || building.responsablePhone) {
      contacts.push({
        email: building.responsableEmail || undefined,
        phone: building.responsablePhone || undefined,
        name:  `${building.responsableFirstName || ''} ${building.responsableLastName || ''}`.trim() || 'Responsable',
      });
    }

    // 2. Contact corpo — depuis la fiche client du bâtiment
    const buildingWithClient = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
      include: {
        client: {
          select: { name: true, contactEmail: true, contactPhone: true, contactFirstName: true, contactLastName: true, email: true, phone: true },
        },
      },
    });
    const client = buildingWithClient?.client;
    if (client) {
      // Contact principal du client
      if (client.contactEmail || client.email) {
        contacts.push({
          email: client.contactEmail || client.email || undefined,
          phone: client.contactPhone || client.phone || undefined,
          name:  `${client.contactFirstName || ''} ${client.contactLastName || ''}`.trim() || client.name || 'Contact corpo',
        });
      }
    }

    // 3. Membres d'urgence présents (coordonnateur en priorité)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const presentIds = new Set(
      (await this.prisma.occupancyRecord.findMany({
        where: { buildingId, status: 'IN', type: 'EMPLOYE', checkedInAt: { gte: startOfDay } },
        select: { employeeId: true },
      })).map(r => r.employeeId).filter(Boolean)
    );
    const emergencyMembers = await this.prisma.buildingEmployee.findMany({
      where: { buildingId, isActive: true, isEmergencyMember: true, id: { in: [...presentIds] as string[] } },
      include: { emergencyRoles: true },
      take: 5,
    });
    for (const m of emergencyMembers) {
      if (m.email || m.phone) {
        contacts.push({ email: m.email || undefined, phone: m.smsConsent && m.phone ? m.phone : undefined, name: `${m.firstName} ${m.lastName}` });
      }
    }

    // Envoyer à tous les contacts (dédupliqués par email)
    const sentEmails = new Set<string>();
    let notifiedCount = 0;
    for (const contact of contacts) {
      if (contact.email && !sentEmails.has(contact.email)) {
        sentEmails.add(contact.email);
        await this.sendEmail({ to: contact.email, toName: contact.name, subject: `🚨 ALERTE PANIQUE — ${building.name}`, html: htmlEmail });
        notifiedCount++;
      }
      if (contact.phone) {
        await this.sendSms(contact.phone, smsText);
      }
    }

    // Log dans l'incident actif si existant
    const activeIncident = await this.prisma.incidentEvent.findFirst({
      where: { buildingId, organizationId, isActive: true },
    });
    if (activeIncident) {
      await this.prisma.incidentLog.create({
        data: { incidentEventId: activeIncident.id, action: `🚨 BOUTON PANIQUE activé par ${triggeredBy}`, isAutomatic: false },
      });
    }

    return { success: true, notifiedCount, address, contacts: contacts.length };
  }

  // ── Déclencher un incident ────────────────────────────────────────────────
  // opts.status/'PRE_ALERT' + deferNotifications=true : utilisé par le pont
  // panneau d'alarme (triggerFromAlarmPanel) — l'incident et ses tâches sont
  // créés tout de suite (snapshot fidèle au moment du signal) mais les
  // notifications de masse attendent la confirmation ou l'escalade automatique.
  async triggerIncident(
    body: any,
    organizationId: string,
    opts?: { status?: 'ACTIVE' | 'PRE_ALERT'; deferNotifications?: boolean },
    audit?: IncidentAuditContext,
  ) {
    const building = await this.prisma.building.findFirst({ where: { id: body.buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const status = opts?.status || 'ACTIVE';
    const deferNotifications = opts?.deferNotifications ?? false;
    const isExercise = body.isExercise === true;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // PMU actif
    const activePmu = await this.prisma.project.findFirst({
      where: { buildingId: body.buildingId, documentType: { in: ['PMU', 'PSI'] }, status: { in: ['VALIDATED', 'EXPORTED'] }, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, configData: true },
    });
    const configData    = activePmu?.configData as any;
    const assemblyPoint = configData?.pointRassemblement || null;

    // Contacts d'urgence (Module 2 — stockés dans Document.content, pas configData)
    let contactsModule2: any = null;
    if (activePmu?.id) {
      const pmuDocument = await this.prisma.document.findFirst({
        where: { projectId: activePmu.id },
        select: { content: true },
      });
      contactsModule2 = (pmuDocument?.content as any)?.module2 || null;
    }

    const interventionSheet = buildInterventionSheet(building, configData, contactsModule2);
    const publicAccessToken = randomUUID();
    const publicAccessExpiresAt = new Date(Date.now() + PUBLIC_CAPABILITY_TTL_MS);

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
    return this.prisma.$transaction(async (tx) => {
    const incident = await tx.incidentEvent.create({
      data: {
        buildingId:        body.buildingId,
        organizationId,
        type:              body.type,
        status:            status as any,
        triggeredBy:       body.triggeredBy,
        description:       body.description || null,
        occupantsSnapshot: presentRecords   as any,
        teamSnapshot:      mobilizableTeam  as any,
        procedureCode,
        procedureSnapshot: coordSteps       as any,
        assemblyPoint,
        interventionSheet: interventionSheet as any,
        publicAccessToken,
        publicAccessExpiresAt,
        isExercise,
        isActive: true,
      },
    });

    // Tâches checklist coordonnateur
    if (coordSteps.length > 0) {
      await tx.incidentTask.createMany({
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

    const incidentLabel = INCIDENT_LABELS[body.type] || 'Incident';

    if (!deferNotifications) {
      await this.dispatchIncidentNotifications(incident, building, mobilizableTeam, coordSteps, assemblyPoint, isExercise, body.type, presentIds, tx);

      await tx.incidentLog.create({
        data: {
          incidentEventId: incident.id,
          action:  `${isExercise ? '[EXERCICE] ' : ''}Incident déclenché — ${incidentLabel}`,
          details: `${presentRecords.length} occupants · ${mobilizableTeam.length} membres mobilisés · Procédure ${procedureCode}${isExercise ? ' · MODE EXERCICE' : ''}`,
          isAutomatic: true,
        },
      });
    } else {
      await tx.incidentLog.create({
        data: {
          incidentEventId: incident.id,
          action:  `Pré-alerte — ${incidentLabel} détectée par le panneau d'alarme`,
          details: `En attente de confirmation (${Math.round(ALARM_ESCALATION_WINDOW_MS / 1000)}s) — ${presentRecords.length} occupants · ${mobilizableTeam.length} membres mobilisables · Procédure ${procedureCode}`,
          isAutomatic: true,
        },
      });
    }

    if (audit) await this.appendCriticalAudit(tx, {
      organizationId, buildingId: body.buildingId, incidentEventId: incident.id,
      operation: status === 'PRE_ALERT' ? 'INCIDENT_PRE_ALERT_CREATED' : 'INCIDENT_CREATED',
      ...audit, previousState: null,
      resultingState: { id: incident.id, status: incident.status, type: incident.type, isExercise },
    });
    return { incident, coordinatorStepsCount: coordSteps.length, notifiedCount: mobilizableTeam.length, isExercise };
    });
  }

  // ── Envoi des notifications (coordonnateur, équipe, occupants) ────────────
  // Extrait de triggerIncident pour être réutilisé par la résolution d'une
  // pré-alerte (confirmation humaine ou escalade automatique après délai).
  private async dispatchIncidentNotifications(
    incident: any,
    building: any,
    mobilizableTeam: any[],
    coordSteps: any[],
    assemblyPoint: string | null,
    isExercise: boolean,
    incidentType: string,
    presentIds: Set<string | null>,
    tx: any = this.prisma,
  ) {
    const incidentLabel  = INCIDENT_LABELS[incidentType] || 'Incident';
    const occupantMsgCfg = OCCUPANT_MESSAGES[incidentType] || OCCUPANT_MESSAGES.OTHER;

    const coordinator = mobilizableTeam.find(m => m.roles.some((r: any) => r.role === 'COORDINATOR'));
    if (coordinator?.email) {
      await this.notifyCoordinator(coordinator, incident, incidentLabel, building, assemblyPoint, coordSteps, isExercise, tx);
    }

    const otherMembers = mobilizableTeam.filter(m => !m.roles.some((r: any) => r.role === 'COORDINATOR') && m.email);
    for (const member of otherMembers) {
      const escalationConfiguredAt = new Date();
      const escalationPolicy = taskAckPolicy('NORMAL', escalationConfiguredAt);
      // Créer tâche membre avec ackToken unique
      const memberTask = await tx.incidentTask.create({
        data: {
          incidentEventId:   incident.id,
          employeeId:        member.id,
          role:              (member.roles[0]?.role || 'COORDINATOR') as any,
          title:             `Rapport au poste — ${member.firstName} ${member.lastName}`,
          isCoordinatorStep: false,
          status:            'PENDING' as any,
          ackToken:          randomUUID(),
          ackExpiresAt:      new Date(Date.now() + PUBLIC_CAPABILITY_TTL_MS),
          severity:          'NORMAL' as any,
          ackDeadlineAt:     new Date(escalationConfiguredAt.getTime() + escalationPolicy.acknowledgmentWindowMs),
          ackPolicySnapshot: escalationPolicy as any,
          nextEscalationAt:  new Date(escalationConfiguredAt.getTime() + escalationPolicy.acknowledgmentWindowMs),
          notifiedAt:        new Date(),
        },
      });
      await this.notifyMember(member, incident, incidentLabel, building, assemblyPoint, memberTask.ackToken!, isExercise, tx);
    }

    // Occupants — pas notifiés en mode exercice
    if (!isExercise) {
      const employeeEmails = (await this.prisma.buildingEmployee.findMany({
        where: { id: { in: [...presentIds] as string[] }, isActive: true, isEmergencyMember: false },
        select: { email: true },
      })).filter(e => e.email).map(e => e.email as string);
      for (const email of [...new Set(employeeEmails)]) {
        await this.notifyOccupant(email, incident, incidentLabel, building, occupantMsgCfg.alert, assemblyPoint, tx);
      }
    }
  }

  // ── Pont panneau d'alarme incendie (PAI) — déclenchement sans authentification,
  // sécurisé par le jeton dédié au bâtiment ─────────────────────────────────
  async triggerFromAlarmPanel(token: string) {
    const alarmToken = await this.prisma.buildingAlarmToken.findUnique({ where: { token } });
    if (!alarmToken || !alarmToken.isActive) throw new NotFoundException('Jeton invalide ou désactivé');

    const building = await this.prisma.building.findUnique({ where: { id: alarmToken.buildingId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    // Anti-rebond : un signal qui se répète pendant qu'une pré-alerte/incident
    // est déjà en cours (ex. contact du PAI maintenu fermé) ne recrée pas un
    // nouvel incident — il est simplement journalisé sur celui déjà ouvert.
    const existing = await this.prisma.incidentEvent.findFirst({
      where: { buildingId: building.id, isActive: true, status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] } },
    });
    if (existing) {
      await this.prisma.incidentLog.create({
        data: { incidentEventId: existing.id, action: "Nouveau signal reçu du panneau d'alarme (incident déjà en cours)", isAutomatic: true },
      });
      return { deduplicated: true, incidentId: existing.id, status: existing.status };
    }

    const result = await this.triggerIncident(
      {
        buildingId:  building.id,
        type:        'FIRE_ALARM',
        triggeredBy: "Panneau d'alarme incendie (automatique)",
        isExercise:  false,
      },
      building.organizationId,
      { status: 'PRE_ALERT', deferNotifications: true },
      { actorType: 'SYSTEM', actorId: `alarm-panel:${building.id}`, reason: 'Verified building alarm signal' },
    );

    this.scheduleAutoEscalation(result.incident.id);
    return result;
  }

  private scheduleAutoEscalation(incidentId: string) {
    setTimeout(() => {
      this.resolvePreAlert(incidentId, 'AUTO_ESCALATED', { actorType: 'SYSTEM', actorId: 'incident-auto-escalation', reason: 'Pre-alert confirmation window expired' }).catch(err =>
        console.error('[IncidentService] Erreur escalade automatique de pré-alerte:', err),
      );
    }, ALARM_ESCALATION_WINDOW_MS);
  }

  // ── Résolution d'une pré-alerte — confirmation, annulation ou expiration ──
  // Le updateMany conditionné sur status:'PRE_ALERT' agit comme verrou
  // atomique : si confirmation, annulation et minuterie se chevauchent, seul
  // le premier appel obtient claimed:true — les autres sont des no-op.
  private async resolvePreAlert(incidentId: string, outcome: 'CONFIRMED' | 'CANCELLED' | 'AUTO_ESCALATED', audit?: IncidentAuditContext) {
    return this.prisma.$transaction(async (tx) => {
    const claimed = await tx.incidentEvent.updateMany({
      where: { id: incidentId, status: 'PRE_ALERT' },
      data: outcome === 'CANCELLED'
        ? { status: 'CANCELLED', isActive: false, resolvedAt: new Date(), publicAccessRevokedAt: new Date(), lockVersion: { increment: 1 } }
        : { status: 'ACTIVE' },
    });
    if (claimed.count === 0) return { claimed: false };

    const incident = await tx.incidentEvent.findUnique({ where: { id: incidentId } });
    if (!incident) return { claimed: false };

    if (outcome !== 'CANCELLED') {
      const building = await tx.building.findUnique({ where: { id: incident.buildingId } });
      if (building) {
        const mobilizableTeam = (incident.teamSnapshot as any[]) || [];
        const coordSteps      = (incident.procedureSnapshot as any[]) || [];
        const presentIds = new Set(
          ((incident.occupantsSnapshot as any[]) || [])
            .filter((r: any) => r.type === 'EMPLOYE')
            .map((r: any) => r.employeeId),
        );
        await this.dispatchIncidentNotifications(
          incident, building, mobilizableTeam, coordSteps,
          incident.assemblyPoint, incident.isExercise, incident.type, presentIds, tx,
        );
      }
    }

    const logAction =
      outcome === 'AUTO_ESCALATED' ? "Pré-alerte — délai écoulé, escalade automatique, notifications envoyées"
      : outcome === 'CONFIRMED'    ? 'Pré-alerte confirmée — notifications envoyées'
      :                              'Pré-alerte annulée — aucune notification envoyée';

    await tx.incidentLog.create({
      data: { incidentEventId: incident.id, action: logAction, isAutomatic: outcome !== 'CONFIRMED' },
    });

    if (audit) await this.appendCriticalAudit(tx, {
      organizationId: incident.organizationId, buildingId: incident.buildingId, incidentEventId: incident.id,
      operation: outcome === 'CANCELLED' ? 'INCIDENT_PRE_ALERT_CANCELLED' : outcome === 'CONFIRMED' ? 'INCIDENT_PRE_ALERT_CONFIRMED' : 'INCIDENT_PRE_ALERT_AUTO_ESCALATED',
      ...audit, previousState: { status: 'PRE_ALERT' }, resultingState: { status: incident.status, isActive: incident.isActive },
    });

    return { claimed: true, incident };
    });
  }

  async confirmPreAlert(incidentId: string, organizationId: string, confirmedBy: string, audit?: IncidentAuditContext) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const result = await this.resolvePreAlert(incidentId, 'CONFIRMED', audit);
    if (!result.claimed) throw new NotFoundException('Cette pré-alerte a déjà été traitée');

    await this.prisma.incidentLog.create({
      data: { incidentEventId: incidentId, action: `Confirmé par ${confirmedBy}`, isAutomatic: false },
    });
    return { confirmed: true };
  }

  async cancelPreAlert(incidentId: string, organizationId: string, cancelledBy: string, audit?: IncidentAuditContext) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const result = await this.resolvePreAlert(incidentId, 'CANCELLED', audit);
    if (!result.claimed) throw new NotFoundException('Cette pré-alerte a déjà été traitée');

    await this.prisma.incidentLog.create({
      data: { incidentEventId: incidentId, action: `Annulé par ${cancelledBy}`, isAutomatic: false },
    });
    return { cancelled: true };
  }

  // ── Incidents actifs ──────────────────────────────────────────────────────
  async getActiveIncidents(buildingId: string, organizationId: string) {
    const building = await this.prisma.building.findFirst({ where: { id: buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');
    return this.prisma.incidentEvent.findMany({
      where: { buildingId, isActive: true, status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] }, organizationId },
      orderBy: { triggeredAt: 'desc' },
      include: { tasks: { orderBy: { stepOrder: 'asc' } }, logs: { orderBy: { timestamp: 'asc' } } },
    });
  }

  async getActiveIncident(buildingId: string, organizationId: string) {
    const incidents = await this.getActiveIncidents(buildingId, organizationId);
    return incidents[0] || null;
  }

  async configureTaskEscalation(
    taskId: string,
    input: { severity: IncidentTaskSeverityName; alternateEmployeeIds?: string[]; acknowledgmentSubjectType: 'USER' | 'CLIENT_USER'; acknowledgmentSubjectId: string; lockVersion: number; reason: string },
    organizationId: string,
    audit: IncidentAuditContext,
  ) {
    if (!input.reason?.trim()) throw new ConflictException('Une justification est obligatoire.');
    if (!Object.prototype.hasOwnProperty.call(TASK_ACK_DEADLINE_MS, input.severity)) throw new ConflictException('Severite invalide.');
    const requestedAlternateIds = input.alternateEmployeeIds || [];
    const alternateEmployeeIds = [...new Set(requestedAlternateIds)];
    if (alternateEmployeeIds.length !== requestedAlternateIds.length) throw new ConflictException('Chaque niveau de suppleance doit designer une identite distincte.');
    if (alternateEmployeeIds.length > 2) throw new ConflictException('Deux niveaux de suppleance maximum sont autorises.');
    if (!input.acknowledgmentSubjectType || !input.acknowledgmentSubjectId) throw new ConflictException("L'identite d'accuse explicite est obligatoire.");

    const task = await this.prisma.incidentTask.findFirst({
      where: { id: taskId, incidentEvent: { organizationId, isActive: true, status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] } } },
      include: { incidentEvent: { select: { buildingId: true } } },
    });
    if (!task || ['COMPLETED', 'CANCELLED'].includes(task.status)) throw new NotFoundException('Tache active introuvable.');
    if (task.employeeId && alternateEmployeeIds.includes(task.employeeId)) throw new ConflictException("L'intervenant principal ne peut pas etre son propre suppleant.");
    if (alternateEmployeeIds.length) {
      const eligible = await this.prisma.buildingEmployee.count({ where: { id: { in: alternateEmployeeIds }, buildingId: task.incidentEvent.buildingId, organizationId, isActive: true } });
      if (eligible !== alternateEmployeeIds.length) throw new NotFoundException('Un suppleant actif est introuvable dans le batiment cible.');
    }
    const identity = input.acknowledgmentSubjectType === 'USER'
      ? await this.prisma.user.findFirst({ where: { id: input.acknowledgmentSubjectId, organizationId, isActive: true }, select: { id: true } })
      : await this.prisma.clientUser.findFirst({ where: { id: input.acknowledgmentSubjectId, organizationId, isActive: true }, select: { id: true } });
    if (!identity) throw new NotFoundException("Identite active d'accuse introuvable dans l'organisation.");

    const now = new Date();
    const policy = taskAckPolicy(input.severity, now);
    const ackDeadlineAt = new Date(now.getTime() + policy.acknowledgmentWindowMs);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.incidentTask.updateMany({
        where: { id: taskId, lockVersion: input.lockVersion, status: 'PENDING' },
        data: {
          severity: input.severity,
          ackDeadlineAt,
          ackPolicySnapshot: policy as any,
          alternateEmployeeIds,
          acknowledgmentSubjectType: input.acknowledgmentSubjectType,
          acknowledgmentSubjectId: input.acknowledgmentSubjectId,
          escalationStatus: 'PENDING',
          escalationLevel: 0,
          nextEscalationAt: ackDeadlineAt,
          operatorQueuedAt: null,
          escalationCancelledAt: null,
          escalationCancellationReason: null,
          lockVersion: { increment: 1 },
        },
      });
      if (claimed.count !== 1) throw new ConflictException('La tache a ete modifiee ou ne peut plus etre configuree.');
      const updated = await tx.incidentTask.findUniqueOrThrow({ where: { id: taskId } });
      await this.appendCriticalAudit(tx, {
        organizationId, buildingId: task.incidentEvent.buildingId, incidentEventId: task.incidentEventId,
        operation: 'TASK_ESCALATION_POLICY_CONFIGURED', ...audit, reason: input.reason.trim(),
        previousState: { severity: task.severity, alternateEmployeeIds: task.alternateEmployeeIds, lockVersion: task.lockVersion },
        resultingState: { severity: updated.severity, ackDeadlineAt: updated.ackDeadlineAt, alternateEmployeeIds: updated.alternateEmployeeIds, acknowledgmentSubjectType: updated.acknowledgmentSubjectType, acknowledgmentSubjectId: updated.acknowledgmentSubjectId, lockVersion: updated.lockVersion },
      });
      return updated;
    });
  }

  @Cron('*/15 * * * * *')
  async dispatchDueTaskEscalations() {
    const due = await this.prisma.incidentTask.findMany({
      where: { status: 'PENDING', escalationStatus: { in: ['PENDING', 'LEVEL_1', 'LEVEL_2'] }, nextEscalationAt: { lte: new Date() }, incidentEvent: { isActive: true, status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] } } },
      select: { id: true }, orderBy: { nextEscalationAt: 'asc' }, take: 25,
    });
    for (const task of due) await this.processTaskEscalation(task.id);
    return { processed: due.length };
  }

  async processTaskEscalation(taskId: string, now = new Date()) {
    const task = await this.prisma.incidentTask.findUnique({
      where: { id: taskId },
      include: { incidentEvent: { select: { organizationId: true, buildingId: true, status: true, isActive: true } } },
    });
    if (!task || task.status !== 'PENDING' || !task.nextEscalationAt || task.nextEscalationAt > now || !task.incidentEvent.isActive || !['PRE_ALERT', 'ACTIVE', 'CONTAINED'].includes(task.incidentEvent.status)) return { claimed: false };
    const nextLevel = Math.min(3, task.escalationLevel + 1);
    const nextStatus = nextLevel === 1 ? 'LEVEL_1' : nextLevel === 2 ? 'LEVEL_2' : 'OPERATOR_QUEUE';
    const policy = (task.ackPolicySnapshot || {}) as any;
    const windowMs = Number(policy.alternateWindowMs) > 0 ? Number(policy.alternateWindowMs) : TASK_ACK_DEADLINE_MS[task.severity];
    const alternateId = nextLevel <= 2 ? task.alternateEmployeeIds[nextLevel - 1] : undefined;
    const alternate = alternateId ? await this.prisma.buildingEmployee.findFirst({ where: { id: alternateId, buildingId: task.incidentEvent.buildingId, organizationId: task.incidentEvent.organizationId, isActive: true }, select: { id: true, email: true, phone: true, smsConsent: true, firstName: true, lastName: true } }) : null;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.incidentTask.updateMany({
        where: { id: task.id, lockVersion: task.lockVersion, status: 'PENDING', escalationStatus: task.escalationStatus, nextEscalationAt: { lte: now } },
        data: {
          escalationStatus: nextStatus as any,
          escalationLevel: nextLevel,
          missedAcknowledgmentAt: task.missedAcknowledgmentAt ?? now,
          nextEscalationAt: nextLevel < 3 ? new Date(now.getTime() + windowMs) : null,
          operatorQueuedAt: nextLevel === 3 ? now : task.operatorQueuedAt,
          lockVersion: { increment: 1 },
        },
      });
      if (claimed.count !== 1) return { claimed: false };
      if (alternate && this.dispatcher) {
        const purpose = `TASK_ACK_ESCALATION_LEVEL_${nextLevel}`;
        const baseKey = `${task.incidentEventId}:task:${task.id}:cycle:${task.escalationCycle}:level:${nextLevel}`;
        const message = `CORO Incident - Accuse requis pour la tache: ${task.title}`;
        if (alternate.email) await this.dispatcher.enqueue({ organizationId: task.incidentEvent.organizationId, incidentEventId: task.incidentEventId, channel: 'EMAIL', purpose, idempotencyKey: `${baseKey}:email`, envelope: { destination: alternate.email, subject: 'CORO - Escalade de tache incident', html: `<p>${escapeIncidentNotificationHtml(message)}</p>` } }, tx);
        if (alternate.smsConsent && alternate.phone) await this.dispatcher.enqueue({ organizationId: task.incidentEvent.organizationId, incidentEventId: task.incidentEventId, channel: 'SMS', purpose, idempotencyKey: `${baseKey}:sms`, envelope: { destination: alternate.phone, message } }, tx);
      }
      const updated = await tx.incidentTask.findUniqueOrThrow({ where: { id: task.id } });
      await tx.incidentLog.create({ data: { incidentEventId: task.incidentEventId, action: nextLevel === 3 ? 'Tache placee dans la file operateur' : `Escalade tache niveau ${nextLevel}`, details: alternate ? `Suppleant explicite ${alternate.id}` : 'Aucun suppleant explicite eligible', isAutomatic: true } });
      await this.appendCriticalAudit(tx, {
        organizationId: task.incidentEvent.organizationId, buildingId: task.incidentEvent.buildingId, incidentEventId: task.incidentEventId,
        operation: nextLevel === 3 ? 'TASK_ESCALATED_TO_OPERATOR_QUEUE' : 'TASK_ACKNOWLEDGMENT_ESCALATED', actorType: 'SYSTEM', actorId: 'incident-task-escalation-dispatcher', reason: 'Acknowledgment deadline missed',
        previousState: { escalationStatus: task.escalationStatus, escalationLevel: task.escalationLevel, nextEscalationAt: task.nextEscalationAt, lockVersion: task.lockVersion },
        resultingState: { escalationStatus: updated.escalationStatus, escalationLevel: updated.escalationLevel, missedAcknowledgmentAt: updated.missedAcknowledgmentAt, nextEscalationAt: updated.nextEscalationAt, operatorQueuedAt: updated.operatorQueuedAt, alternateEmployeeId: alternate?.id ?? null, lockVersion: updated.lockVersion },
      });
      return { claimed: true, level: nextLevel, status: nextStatus, alternateNotified: !!alternate };
    });
  }

  async getOperatorEscalationQueue(organizationId: string) {
    return this.prisma.incidentTask.findMany({
      where: { escalationStatus: 'OPERATOR_QUEUE', status: 'PENDING', incidentEvent: { organizationId, isActive: true } },
      include: { incidentEvent: { select: { id: true, buildingId: true, type: true, status: true, triggeredAt: true } }, employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ operatorQueuedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // Version sans organizationId — pour la borne kiosque (aucune authentification).
  // Ne retourne que le strict nécessaire pour afficher le QR ou l'écran de
  // pré-alerte, rien de sensible. Inclut PRE_ALERT pour que la borne puisse
  // proposer confirmer/annuler pendant la fenêtre de confirmation.
  async getActiveIncidentPublic(buildingId: string) {
    return this.prisma.incidentEvent.findFirst({
      where: { buildingId, isActive: true, status: { in: ['PRE_ALERT', 'ACTIVE', 'CONTAINED'] } },
      orderBy: { triggeredAt: 'desc' },
      select: { id: true, publicAccessToken: true, type: true, status: true },
    });
  }

  // ── Étapes coordonnateur ──────────────────────────────────────────────────
  async completeStep(taskId: string, organizationId: string, audit?: IncidentAuditContext) {
    const task = await this.prisma.incidentTask.findFirst({ where: { id: taskId, incidentEvent: { organizationId } }, include: { incidentEvent: { select: { buildingId: true } } } });
    if (!task) throw new NotFoundException('Étape introuvable');
    if (!['ACKNOWLEDGED', 'IN_PROGRESS'].includes(task.status)) throw new ConflictException('La tache doit etre accusee avant execution.');
    return this.prisma.$transaction(async (tx) => {
    const completedAt = new Date();
    const claimed = await tx.incidentTask.updateMany({ where: { id: taskId, lockVersion: task.lockVersion, status: { in: ['ACKNOWLEDGED', 'IN_PROGRESS'] } }, data: { status: 'COMPLETED', completedAt, escalationStatus: 'CANCELLED', nextEscalationAt: null, escalationCancelledAt: completedAt, escalationCancellationReason: 'TASK_COMPLETED', lockVersion: { increment: 1 } } });
    if (claimed.count !== 1) throw new ConflictException('La tache a ete modifiee.');
    const updated = await tx.incidentTask.findUniqueOrThrow({ where: { id: taskId } });
    await tx.incidentLog.create({ data: { incidentEventId: task.incidentEventId, action: 'Étape complétée', details: task.stepText?.substring(0, 120) || task.title, isAutomatic: false } });
    if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: task.incidentEvent.buildingId, incidentEventId: task.incidentEventId, operation: 'TASK_COMPLETED', ...audit, previousState: { id: task.id, status: task.status, lockVersion: task.lockVersion }, resultingState: { id: updated.id, status: updated.status, lockVersion: updated.lockVersion } });
    return updated;
    });
  }

  async uncompleteStep(taskId: string, organizationId: string, audit?: IncidentAuditContext) {
    const task = await this.prisma.incidentTask.findFirst({ where: { id: taskId, incidentEvent: { organizationId } }, include: { incidentEvent: { select: { buildingId: true } } } });
    if (!task) throw new NotFoundException('Étape introuvable');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incidentTask.update({ where: { id: taskId }, data: { status: 'PENDING', completedAt: null, acknowledgedAt: null, lockVersion: { increment: 1 } } });
      if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: task.incidentEvent.buildingId, incidentEventId: task.incidentEventId, operation: 'TASK_REOPENED', ...audit, previousState: { id: task.id, status: task.status, lockVersion: task.lockVersion }, resultingState: { id: updated.id, status: updated.status, lockVersion: updated.lockVersion } });
      return updated;
    });
  }

  async acknowledgeTask(taskId: string, organizationId: string, audit?: IncidentAuditContext) {
    const task = await this.prisma.incidentTask.findFirst({ where: { id: taskId, incidentEvent: { organizationId } }, include: { incidentEvent: { select: { buildingId: true } } } });
    if (!task) throw new NotFoundException('Tache introuvable');
    if (task.acknowledgmentSubjectType && (audit?.actorType !== task.acknowledgmentSubjectType || audit.actorId !== task.acknowledgmentSubjectId)) {
      throw new NotFoundException("Cette identite n'est pas l'intervenant designe pour cet accuse.");
    }
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
    const claimed = await tx.incidentTask.updateMany({ where: { id: taskId, lockVersion: task.lockVersion, status: 'PENDING' }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: now, escalationStatus: 'ACKNOWLEDGED', nextEscalationAt: null, escalationCancelledAt: now, escalationCancellationReason: 'TASK_ACKNOWLEDGED', lockVersion: { increment: 1 } } });
    if (claimed.count !== 1) throw new ConflictException('La tache est deja accusee ou a ete modifiee.');
    await tx.incidentLog.create({ data: { incidentEventId: task.incidentEventId, action: 'Tache accusee', details: task.title, isAutomatic: false } });
    const updated = await tx.incidentTask.findUniqueOrThrow({ where: { id: taskId } });
    if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: task.incidentEvent.buildingId, incidentEventId: task.incidentEventId, operation: task.missedAcknowledgmentAt ? 'TASK_ACKNOWLEDGED_LATE' : 'TASK_ACKNOWLEDGED', ...audit, previousState: { id: task.id, status: task.status, escalationStatus: task.escalationStatus, missedAcknowledgmentAt: task.missedAcknowledgmentAt, lockVersion: task.lockVersion }, resultingState: { id: updated.id, status: updated.status, escalationStatus: updated.escalationStatus, acknowledgedAt: updated.acknowledgedAt, late: !!task.missedAcknowledgmentAt, lockVersion: updated.lockVersion } });
    return updated;
    });
  }
  async completeTask(taskId: string, organizationId: string, audit?: IncidentAuditContext) { return this.completeStep(taskId, organizationId, audit); }

  async reassignTask(taskId: string, employeeId: string, expectedLockVersion: number, organizationId: string, actorId: string, audit?: IncidentAuditContext) {
    const task = await this.prisma.incidentTask.findFirst({ where: { id: taskId, incidentEvent: { organizationId } }, include: { incidentEvent: { select: { buildingId: true } } } });
    if (!task) throw new NotFoundException('Tache introuvable');
    const employee = await this.prisma.buildingEmployee.findFirst({ where: { id: employeeId, buildingId: task.incidentEvent.buildingId, organizationId, isActive: true }, select: { id: true } });
    if (!employee) throw new NotFoundException('Intervenant introuvable');
    const policy = (task.ackPolicySnapshot || taskAckPolicy(task.severity, new Date())) as any;
    const reassignedAt = new Date();
    const ackDeadlineAt = new Date(reassignedAt.getTime() + (Number(policy.acknowledgmentWindowMs) || TASK_ACK_DEADLINE_MS[task.severity]));
    return this.prisma.$transaction(async (tx) => {
    const claimed = await tx.incidentTask.updateMany({ where: { id: taskId, lockVersion: expectedLockVersion, status: { notIn: ['COMPLETED', 'CANCELLED'] } }, data: { employeeId, reassignedAt, reassignedByType: audit?.actorType ?? 'CLIENT_USER', reassignedById: actorId, status: 'PENDING', acknowledgedAt: null, ackDeadlineAt, nextEscalationAt: ackDeadlineAt, escalationStatus: 'PENDING', escalationLevel: 0, escalationCycle: { increment: 1 }, operatorQueuedAt: null, escalationCancelledAt: reassignedAt, escalationCancellationReason: 'TASK_REASSIGNED', lockVersion: { increment: 1 } } });
    if (claimed.count !== 1) throw new ConflictException('La tache a ete modifiee ou est fermee.');
    await tx.incidentLog.create({ data: { incidentEventId: task.incidentEventId, action: 'Tache reassignee', details: `Tache ${task.id}`, actor: actorId, isAutomatic: false } });
    const updated = await tx.incidentTask.findUniqueOrThrow({ where: { id: taskId } });
    if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: task.incidentEvent.buildingId, incidentEventId: task.incidentEventId, operation: 'TASK_REASSIGNED', ...audit, previousState: { id: task.id, employeeId: task.employeeId, lockVersion: task.lockVersion }, resultingState: { id: updated.id, employeeId: updated.employeeId, lockVersion: updated.lockVersion } });
    return updated;
    });
  }

  async activatePca(input: { buildingId: string; projectId: string; incidentEventId?: string; reason: string }, organizationId: string, actorId: string, actorType: 'USER' | 'CLIENT_USER' = 'CLIENT_USER', audit?: IncidentAuditContext) {
    if (!input.reason?.trim()) throw new ConflictException('Une justification est obligatoire.');
    const project = await this.prisma.project.findFirst({ where: { id: input.projectId, buildingId: input.buildingId, organizationId, documentType: 'PCA', status: { in: ['VALIDATED', 'EXPORTED'] } }, select: { id: true } });
    if (!project) throw new NotFoundException('PCA introuvable pour ce batiment.');
    if (input.incidentEventId) {
      const incident = await this.prisma.incidentEvent.findFirst({ where: { id: input.incidentEventId, buildingId: input.buildingId, organizationId, isActive: true }, select: { id: true } });
      if (!incident) throw new NotFoundException('Incident actif introuvable.');
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.pcaActivation.findFirst({ where: { organizationId, buildingId: input.buildingId, status: 'ACTIVE' }, select: { id: true } });
      if (existing) throw new ConflictException('Un PCA est deja actif pour ce batiment.');
      const activation = await tx.pcaActivation.create({ data: { organizationId, buildingId: input.buildingId, projectId: input.projectId, incidentEventId: input.incidentEventId, activatedByType: actorType, activatedById: actorId, activationReason: input.reason.trim() } });
      if (input.incidentEventId) {
        await tx.incidentLog.create({ data: { incidentEventId: input.incidentEventId, action: 'PCA active', details: input.reason.trim(), actor: actorId, isAutomatic: false } });
        await this.appendCriticalAudit(tx, { organizationId, buildingId: input.buildingId, incidentEventId: input.incidentEventId, operation: 'PCA_ACTIVATED', actorType, actorId, assignmentId: audit?.assignmentId, permission: 'PCA_ACTIVATE', reason: input.reason.trim(), requestId: audit?.requestId, previousState: null, resultingState: activation });
      }
      return activation;
    });
  }

  // ── Fiche d'intervention — accès public temporaire (QR) ──────────────────
  async getInterventionSheetByToken(token: string) {
    const incident = await this.prisma.incidentEvent.findUnique({ where: { publicAccessToken: token } });
    if (!incident || !incident.isActive || incident.publicAccessRevokedAt || !incident.publicAccessExpiresAt || incident.publicAccessExpiresAt <= new Date()) {
      throw new NotFoundException('Lien invalide ou expiré — l\'incident n\'est plus actif.');
    }

    const building = await this.prisma.building.findUnique({ where: { id: incident.buildingId } });

    await this.prisma.incidentEvent.update({
      where: { id: incident.id },
      data: { publicAccessCount: { increment: 1 }, publicAccessLastAt: new Date() },
    });

    return {
      incidentType: incident.type,
      triggeredAt: incident.triggeredAt,
      assemblyPoint: incident.assemblyPoint,
      sheet: incident.interventionSheet,
      team: incident.teamSnapshot,
      building: building ? { name: building.name, address: building.address, city: building.city } : null,
    };
  }

  async sendInterventionAccessByEmail(incidentId: string, emails: string[], organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    if (!incident.publicAccessToken) throw new NotFoundException('Aucun accès public disponible pour cet incident');
    if (!incident.isActive) throw new NotFoundException('Cet incident n\'est plus actif — le lien ne serait plus valide');

    const validEmails = (emails || []).map(e => (e || '').trim()).filter(Boolean);
    if (validEmails.length === 0) throw new NotFoundException('Aucune adresse courriel fournie');

    const building = await this.prisma.building.findUnique({ where: { id: incident.buildingId } });
    const link = `${PORTAL_URL}/intervention/${incident.publicAccessToken}`;
    const label = INCIDENT_LABELS[incident.type] || 'Incident';

    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:540px;margin:0 auto;">
        <div style="background:#C0392B;padding:24px;border-radius:8px 8px 0 0;">
          <span style="color:#FFFFFF;font-size:28px;font-weight:900;">CO<span style="color:#FFF">RO</span></span>
        </div>
        <div style="background:#FFFFFF;padding:32px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
          <p style="font-size:18px;font-weight:800;color:#C0392B;margin:0 0 8px;">🚨 ${label}</p>
          <p style="font-size:14px;color:#6C757D;margin:0 0 24px;">${building?.name || ''}</p>
          <a href="${link}" style="display:inline-block;background:#2C3E50;color:#FFFFFF;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">Consulter la fiche d'intervention</a>
          <p style="margin:16px 0 0;font-size:11px;color:#ADB5BD;">Ce lien reste actif tant que l'incident n'est pas résolu.</p>
        </div>
      </div>`;

    for (const email of validEmails) {
      await this.sendEmail({ to: email, toName: '', subject: `🚨 Fiche d'intervention — ${label} · ${building?.name || ''}`, html });
    }

    await this.prisma.incidentLog.create({
      data: { incidentEventId: incidentId, action: `Fiche d'intervention envoyée par courriel à ${validEmails.length} destinataire(s)`, isAutomatic: false },
    });

    return { success: true, sentCount: validEmails.length };
  }

  // ── Journal ───────────────────────────────────────────────────────────────
  async addLog(incidentId: string, body: any, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return this.prisma.incidentLog.create({ data: { incidentEventId: incidentId, action: body.action, actor: body.actor || null, details: body.details || null, isAutomatic: false } });
  }

  // ── Contenir / Résoudre ───────────────────────────────────────────────────
  async containIncident(incidentId: string, organizationId: string, audit?: IncidentAuditContext) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incidentEvent.update({ where: { id: incidentId }, data: { status: 'CONTAINED', containedAt: new Date(), lockVersion: { increment: 1 } } });
      await tx.incidentLog.create({ data: { incidentEventId: incidentId, action: 'Incident contenu', isAutomatic: false } });
      if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: incident.buildingId, incidentEventId: incidentId, operation: 'INCIDENT_CONTAINED', ...audit, previousState: { status: incident.status, lockVersion: incident.lockVersion }, resultingState: { status: updated.status, lockVersion: updated.lockVersion } });
      return updated;
    });
  }

  async resolveIncident(incidentId: string, body: any, organizationId: string, audit?: IncidentAuditContext) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException();
    const updated = await this.prisma.$transaction(async (tx) => {
      const resolved = await tx.incidentEvent.update({ where: { id: incidentId }, data: { status: 'RESOLVED', resolvedAt: new Date(), closingNotes: body.closingNotes || null, isActive: false, publicAccessRevokedAt: new Date(), lockVersion: { increment: 1 } } });
      await tx.incidentTask.updateMany({ where: { incidentEventId: incidentId }, data: { ackRevokedAt: new Date(), escalationStatus: 'CANCELLED', nextEscalationAt: null, escalationCancelledAt: new Date(), escalationCancellationReason: 'INCIDENT_RESOLVED', lockVersion: { increment: 1 } } });
      if (this.dispatcher) await this.dispatcher.cancelIncident(incidentId, 'INCIDENT_RESOLVED', tx);
      await tx.incidentLog.create({ data: { incidentEventId: incidentId, action: 'Incident résolu', details: body.closingNotes || null, isAutomatic: false } });
      if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: incident.buildingId, incidentEventId: incidentId, operation: 'INCIDENT_RESOLVED', ...audit, previousState: { status: incident.status, isActive: incident.isActive, lockVersion: incident.lockVersion }, resultingState: { status: resolved.status, isActive: resolved.isActive, lockVersion: resolved.lockVersion } });
      return resolved;
    });
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
