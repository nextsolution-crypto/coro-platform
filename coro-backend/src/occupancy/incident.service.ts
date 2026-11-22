import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes, randomUUID } from 'crypto';
import {
  CoroActorType,
  IncidentPermission,
  IncidentStatus,
  IncidentType,
  Prisma,
} from '@prisma/client';
import { IncidentNotificationDispatcherService } from './incident-notification-dispatcher.service';
import { openEvacuationWithSnapshot } from './occupancy.service';
import { Cron } from '@nestjs/schedule';
import {
  IncidentHistoryExerciseFilter,
  IncidentHistoryQueryDto,
  IncidentHistoryStatusFilter,
} from './incident-history.dto';
import { AddIncidentLogDto, ContainIncidentDto, ResolveIncidentDto, UpdateIncidentRexDto } from './incident-detail.dto';
import { DemoCommunicationPolicyService } from '../demo-environment/demo-communication-policy.service';
import { DemoCommunicationChannel } from '@prisma/client';
import { TriggerIncidentDto } from './incident-trigger.dto';
import { TriggerIncidentPanicDto } from './incident-command.dto';
import {
  PANIC_TYPES,
  PANIC_TYPE_LABELS,
  buildPanicMessage,
  effectiveScope,
  panicResponsesFor,
  type PanicAudience,
  type PanicResponse,
  type PanicScope,
  type PanicType,
  PANIC_INCIDENT_TYPES,
} from './panic-messages';

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
import { P012_ASCENSEUR } from '../generator/procedures/p012_ascenseur';
import { P017_BRIS_GICLEURS } from '../generator/procedures/p017_bris_gicleurs';
import { P025_VERGLAS } from '../generator/procedures/p025_verglas';
import { P029_ATMOSPHERE_DANGEREUSE } from '../generator/procedures/p029_atmosphere_dangereuse';
import { P030_PERTE_ALIMENTATION_URGENCE } from '../generator/procedures/p030_perte_alimentation_urgence';
import { P031_PERTE_SYSTEME_SECURITE } from '../generator/procedures/p031_perte_systeme_securite';
import { P032_INDISPONIBILITE_PROTECTION_INCENDIE } from '../generator/procedures/p032_indisponibilite_protection_incendie';
import { ProcedureTemplate } from '../generator/procedures/types';

export const INCIDENT_PROCEDURE_MAP: Record<string, string> = {
  SMOKE_DISCOVERY: 'P002', FIRE_ALERT: 'P003', FIRE_ALARM: 'P004',
  GAS_LEAK: 'P005', ACTIVE_THREAT: 'P011', MEDICAL: 'P013',
  TOXIC_GAS: 'P014', SUSPICIOUS_PACKAGE: 'P015', POWER_OUTAGE: 'P016',
  HAZMAT: 'P018', BOMB_THREAT: 'P019', LITHIUM_BATTERY: 'P026',
  FLOODING: 'P024', VIOLENT_WINDS: 'P022', OTHER: 'P001',
  ELEVATOR_ENTRAPMENT: 'P012', FIRE_PROTECTION_IMPAIRMENT: 'P032',
  HAZARDOUS_ATMOSPHERE: 'P029', EMERGENCY_POWER_FAILURE: 'P030',
  SEVERE_ICE_CONDITIONS: 'P025', CRITICAL_SAFETY_SYSTEM_LOSS: 'P031',
};

const INCIDENT_SEARCH_LABELS: Record<IncidentType, string> = {
  SMOKE_DISCOVERY: 'decouverte fumee',
  FIRE_ALERT: 'alerte incendie',
  FIRE_ALARM: 'alarme incendie',
  GAS_LEAK: 'fuite gaz',
  ACTIVE_THREAT: 'menace active',
  MEDICAL: 'urgence medicale',
  TOXIC_GAS: 'gaz toxique',
  SUSPICIOUS_PACKAGE: 'colis suspect',
  POWER_OUTAGE: 'coupure courant',
  HAZMAT: 'matieres dangereuses',
  BOMB_THREAT: 'alerte bombe',
  LITHIUM_BATTERY: 'batterie lithium',
  FLOODING: 'inondations',
  VIOLENT_WINDS: 'vents violents',
  ELEVATOR_ENTRAPMENT: 'personne coincee ascenseur',
  FIRE_PROTECTION_IMPAIRMENT: 'protection incendie compromise',
  HAZARDOUS_ATMOSPHERE: 'atmosphere dangereuse ventilation securite',
  EMERGENCY_POWER_FAILURE: 'alimentation electrique urgence',
  SEVERE_ICE_CONDITIONS: 'conditions dangereuses verglas',
  CRITICAL_SAFETY_SYSTEM_LOSS: 'perte systeme essentiel securite',
  OTHER: 'autre',
};

const OPEN_INCIDENT_STATUSES: IncidentStatus[] = [
  IncidentStatus.PRE_ALERT,
  IncidentStatus.ACTIVE,
  IncidentStatus.CONTAINED,
];

function normalizeIncidentSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export const PROCEDURE_MAP: Record<string, ProcedureTemplate> = {
  P001: P001_DIRECTIVES_GENERALES, P002: P002_DECOUVERTE_FUMEE,
  P003: P003_ALERTE_INCENDIE,      P004: P004_ALARME_INCENDIE,
  P005: P005_FUITE_GAZ,            P011: P011_MENACE_ACTIVE,
  P013: P013_URGENCE_MEDICALE,     P014: P014_GAZ_TOXIQUE,
  P015: P015_COLIS_SUSPECT,        P016: P016_COUPURE_COURANT,
  P018: P018_MATIERES_DANGEREUSES, P019: P019_ALERTE_BOMBE,
  P022: P022_VENTS_VIOLENTS,       P024: P024_INONDATIONS,
  P026: P026_BATTERIE_LITHIUM,
  P012: P012_ASCENSEUR,            P017: P017_BRIS_GICLEURS,
  P025: P025_VERGLAS,              P029: P029_ATMOSPHERE_DANGEREUSE,
  P030: P030_PERTE_ALIMENTATION_URGENCE,
  P031: P031_PERTE_SYSTEME_SECURITE,
  P032: P032_INDISPONIBILITE_PROTECTION_INCENDIE,
};

export const INCIDENT_LABELS: Record<string, string> = {
  SMOKE_DISCOVERY: 'Découverte de fumée', FIRE_ALERT: 'Alerte incendie',
  FIRE_ALARM: 'Alarme incendie', GAS_LEAK: 'Fuite de gaz',
  ACTIVE_THREAT: 'Menace active / Confinement', MEDICAL: 'Urgence médicale',
  TOXIC_GAS: 'Gaz toxique', SUSPICIOUS_PACKAGE: 'Colis suspect',
  POWER_OUTAGE: 'Coupure de courant', HAZMAT: 'Matières dangereuses',
  BOMB_THREAT: 'Alerte à la bombe', LITHIUM_BATTERY: 'Batterie lithium-ion',
  FLOODING: 'Inondations', VIOLENT_WINDS: 'Vents violents', OTHER: 'Incident général',
  ELEVATOR_ENTRAPMENT: 'Personne coincée dans un ascenseur',
  FIRE_PROTECTION_IMPAIRMENT: 'Protection incendie compromise',
  HAZARDOUS_ATMOSPHERE: 'Atmosphère dangereuse / ventilation de sécurité indisponible',
  EMERGENCY_POWER_FAILURE: "Perte de l'alimentation électrique d'urgence",
  SEVERE_ICE_CONDITIONS: 'Conditions dangereuses liées au verglas',
  CRITICAL_SAFETY_SYSTEM_LOSS: "Perte d'un système essentiel à la sécurité",
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

const THREAT_INCIDENT_TYPES = new Set(['ACTIVE_THREAT']);
const THREAT_MEMBER_INSTRUCTION =
  'Protégez-vous d’abord : FUYEZ si vous pouvez le faire en sécurité, sinon CACHEZ-VOUS et verrouillez. N’allez pas au point de rassemblement. Composez le 911 une fois en sécurité.';

const OCCUPANT_MESSAGES: Record<string, { alert: string; alarm: string }> = {
  FIRE_ALERT:      { alert: 'Une investigation est en cours. Restez en place, préparez-vous à évacuer.', alarm: 'Évacuez immédiatement le bâtiment.' },
  FIRE_ALARM:      { alert: 'Évacuez immédiatement le bâtiment.', alarm: 'Évacuez immédiatement le bâtiment.' },
  SMOKE_DISCOVERY: { alert: 'Investigation en cours. Restez en place et soyez prêt à évacuer.', alarm: 'Évacuez immédiatement le bâtiment.' },
  GAS_LEAK:        { alert: 'Fuite de gaz possible. Évitez d\'utiliser des appareils électriques.', alarm: 'Évacuez immédiatement par les sorties désignées.' },
  // Aligné sur le bouton panique (décision du 21 nov. 2026) : fuir si possible,
  // sinon se cacher ; jamais de point de rassemblement pour une menace.
  ACTIVE_THREAT:   { alert: 'Menace en cours. FUYEZ si vous pouvez le faire en sécurité, sinon CACHEZ-VOUS et verrouillez. N\'allez pas au point de rassemblement. Composez le 911 une fois en sécurité.', alarm: 'Menace en cours. FUYEZ si vous pouvez le faire en sécurité, sinon CACHEZ-VOUS et verrouillez. N\'allez pas au point de rassemblement. Composez le 911 une fois en sécurité.' },
  MEDICAL:         { alert: 'Urgence médicale en cours. Dégagez les allées.', alarm: 'Gardez les allées dégagées pour les secours.' },
  HAZMAT:          { alert: 'Incident matières dangereuses. Restez à l\'écart de la zone identifiée.', alarm: 'Évacuez par les sorties éloignées de la zone à risque.' },
  POWER_OUTAGE:    { alert: 'Coupure de courant. L\'éclairage d\'urgence est actif.', alarm: 'Suivez l\'éclairage d\'urgence pour sortir.' },
  ELEVATOR_ENTRAPMENT: { alert: 'Intervention en cours à un ascenseur. N\'utilisez pas l\'ascenseur touché.', alarm: 'Éloignez-vous de l\'ascenseur touché et suivez les directives du personnel.' },
  FIRE_PROTECTION_IMPAIRMENT: { alert: 'Une fonction de protection incendie est compromise. Suivez les mesures compensatoires communiquées.', alarm: 'Suivez immédiatement les directives d\'évacuation du personnel autorisé.' },
  HAZARDOUS_ATMOSPHERE: { alert: 'Une zone est sous restriction. Évitez la zone et attendez les directives.', alarm: 'Évacuez ou confinez-vous selon les directives du personnel autorisé.' },
  EMERGENCY_POWER_FAILURE: { alert: 'Une fonction d\'alimentation d\'urgence est indisponible. Limitez vos déplacements.', alarm: 'Suivez les directives du personnel et l\'éclairage disponible pour sortir.' },
  SEVERE_ICE_CONDITIONS: { alert: 'Des accès sont dangereux en raison du verglas. Utilisez uniquement les parcours indiqués.', alarm: 'Évitez les zones fermées et suivez les directives du personnel.' },
  CRITICAL_SAFETY_SYSTEM_LOSS: { alert: 'Une fonction essentielle à la sécurité est indisponible. Attendez les directives.', alarm: 'Suivez immédiatement les directives du personnel autorisé.' },
  OTHER:           { alert: 'Incident en cours. Restez en place et attendez les instructions.', alarm: 'Suivez les instructions de l\'équipe d\'urgence.' },
};

// Normalise un numéro de téléphone en format E.164 canadien (+1XXXXXXXXXX)
const PANIC_ROLE_ORDER = ['COORDINATOR', 'FIRST_AIDER'];

export function sortPanicMembers<T extends { emergencyRoles?: Array<{ role: string; priority?: number | null }> }>(
  members: T[],
): T[] {
  const rank = (member: T) => {
    let best = Number.MAX_SAFE_INTEGER;
    for (const role of member.emergencyRoles || []) {
      const index = PANIC_ROLE_ORDER.indexOf(role.role);
      const value = (index === -1 ? PANIC_ROLE_ORDER.length : index) * 1000 + (role.priority ?? 999);
      best = Math.min(best, value);
    }
    return best;
  };
  return [...members].sort((a, b) => rank(a) - rank(b));
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${(local || '').slice(0, 2)}***@${domain || ''}`;
}

function maskPhone(phone: string) {
  return `***${phone.slice(-4)}`;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

/** Incidents qui imposent d'évacuer (pas la menace active : confinement). */
export const EVACUATION_INCIDENT_TYPES = new Set<string>([
  'SMOKE_DISCOVERY',
  'FIRE_ALERT',
  'FIRE_ALARM',
  'GAS_LEAK',
  'TOXIC_GAS',
  'HAZMAT',
  'BOMB_THREAT',
  'SUSPICIOUS_PACKAGE',
  'LITHIUM_BATTERY',
  'HAZARDOUS_ATMOSPHERE',
]);

const PORTAL_URL = process.env.CLIENT_PORTAL_URL || 'https://client.getcoro.io';
const API_URL    = process.env.API_URL            || 'https://api.getcoro.io/api';

// ── Fiche d'intervention — construction du snapshot au déclenchement ────────
function buildInterventionSheet(
  building: any,
  configData: any,
  contactsModule2: any,
  source: {
    projectId: string;
    documentType: string;
    projectStatus: string;
    projectUpdatedAt: Date;
    documentId: string | null;
    documentVersion: number | null;
    documentUpdatedAt: Date | null;
    approvedVersionNumber?: number | null;
  } | null,
) {
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
    provenance: source ? {
      authority: 'APPROVED_PROJECT_DOCUMENT',
      projectId: source.projectId,
      documentType: source.documentType,
      projectStatus: source.projectStatus,
      projectUpdatedAt: source.projectUpdatedAt.toISOString(),
      documentId: source.documentId,
      documentVersion: source.documentVersion,
      documentUpdatedAt: source.documentUpdatedAt?.toISOString() || null,
      // Version approuvée lue (M2-08) ; null : plan courant (approbation ancienne).
      approvedVersionNumber: source.approvedVersionNumber ?? null,
      capturedAt: new Date().toISOString(),
    } : {
      authority: 'NO_APPROVED_PROJECT_DOCUMENT',
      capturedAt: new Date().toISOString(),
    },
  };
}

@Injectable()
export class IncidentService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly dispatcher?: IncidentNotificationDispatcherService,
    @Optional() private readonly demoCommunicationPolicy?: DemoCommunicationPolicyService,
  ) {}

  async requireIncidentAuthority(input: {
    actorType: 'USER' | 'CLIENT_USER';
    actorId: string;
    organizationId: string;
    buildingId?: string;
    incidentEventId?: string;
    permission: IncidentPermission;
    allowResolvedReplay?: boolean;
  }) {
    if (!input.actorId) throw new NotFoundException('Identite operationnelle introuvable.');
    let buildingId = input.buildingId;
    if (input.incidentEventId) {
      const incident = await this.prisma.incidentEvent.findFirst({
        where: { id: input.incidentEventId, organizationId: input.organizationId },
        select: { buildingId: true, status: true, isActive: true },
      });
      const resolvedReplay = input.allowResolvedReplay && incident?.status === IncidentStatus.RESOLVED;
      if (!incident || (!resolvedReplay && (!incident.isActive || !['PRE_ALERT', 'ACTIVE', 'CONTAINED'].includes(incident.status)))) {
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

  async getIncidentCapabilities(input: {
    actorId: string;
    organizationId: string;
    incidentEventId: string;
  }) {
    const [identity, assignments] = await Promise.all([
      this.prisma.clientUser.findFirst({
        where: {
          id: input.actorId,
          organizationId: input.organizationId,
          isActive: true,
        },
        select: { incidentPermissions: true },
      }),
      this.prisma.incidentAuthorityAssignment.findMany({
        where: {
          organizationId: input.organizationId,
          incidentEventId: input.incidentEventId,
          subjectType: 'CLIENT_USER',
          subjectId: input.actorId,
          status: 'ACTIVE',
        },
        select: { permissions: true },
      }),
    ]);
    const individual = new Set(identity?.incidentPermissions ?? []);
    const assigned = new Set(assignments.flatMap((assignment) => assignment.permissions));
    const has = (permission: IncidentPermission) =>
      individual.has(permission) && assigned.has(permission);

    return {
      canRead: has(IncidentPermission.INCIDENT_READ),
      canParticipate: has(IncidentPermission.INCIDENT_TASK_PARTICIPATE),
      canSupervise: has(IncidentPermission.INCIDENT_SUPERVISE),
      canCommand: has(IncidentPermission.INCIDENT_COMMAND),
      canActivatePca: has(IncidentPermission.PCA_ACTIVATE),
    };
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
  // Retourne true seulement si Brevo a accepté l'envoi (ou s'il est simulé
  // pour une organisation de démonstration). Aucun expéditeur de repli :
  // sans BREVO_SMS_SENDER, l'envoi est refusé et journalisé (audit T8).
  private async sendSms(to: string, content: string, organizationId: string): Promise<boolean> {
    const phone = normalizePhone(to);
    if (!phone) return false;
    if (!this.demoCommunicationPolicy) {
      if (process.env.NODE_ENV === 'production') throw new Error('DEMO_COMMUNICATION_POLICY_REQUIRED');
    } else {
      const decision = await this.demoCommunicationPolicy.evaluate({
        organizationId,
        channel: DemoCommunicationChannel.SMS,
        operation: 'INCIDENT_NOTIFICATION',
        recipient: phone,
        payload: { content },
      });
      if (decision.disposition === 'SIMULATED') return true;
      if (decision.disposition !== 'LIVE') return false;
    }
    const sender = process.env.BREVO_SMS_SENDER?.trim();
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!sender || !apiKey) {
      console.error('[IncidentService] SMS non envoyé : BREVO_SMS_SENDER ou BREVO_API_KEY manquant.');
      return false;
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          sender,
          recipient: phone,
          content,
          type: 'transactional',
        }),
      });
      if (!res.ok) {
        console.error(`[IncidentService] SMS refusé par Brevo (HTTP ${res.status}).`);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[IncidentService] Erreur SMS:', e);
      return false;
    }
  }

  // ── Courriel générique ────────────────────────────────────────────────────
  private async sendEmail(data: { to: string; toName: string; subject: string; html: string }, organizationId: string): Promise<boolean> {
    if (!this.demoCommunicationPolicy) {
      if (process.env.NODE_ENV === 'production') throw new Error('DEMO_COMMUNICATION_POLICY_REQUIRED');
    } else {
      const decision = await this.demoCommunicationPolicy.evaluate({
        organizationId,
        channel: DemoCommunicationChannel.EMAIL,
        operation: 'INCIDENT_NOTIFICATION',
        recipient: data.to,
        payload: { subject: data.subject },
      });
      if (decision.disposition === 'SIMULATED') return true;
      if (decision.disposition !== 'LIVE') return false;
    }
    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!apiKey) {
      console.error('[IncidentService] Courriel non envoyé : BREVO_API_KEY manquant.');
      return false;
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          sender: { name: 'CORO Sentinelle', email: 'info@getcoro.io' },
          to: [{ email: data.to, name: data.toName }],
          subject: data.subject,
          htmlContent: data.html,
        }),
      });
      if (!res.ok) {
        console.error(`[IncidentService] Courriel refusé par Brevo (HTTP ${res.status}).`);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[IncidentService] Erreur courriel:', e);
      return false;
    }
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

    const isThreat = THREAT_INCIDENT_TYPES.has(incident.type);
    const subject = isThreat
      ? `${exercisePrefix}🚨 ${label} — Protégez-vous · ${building.name}`
      : `${exercisePrefix}🚨 ${label} — Rapport à votre poste · ${building.name}`;
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
          <p style="font-size:20px;font-weight:800;color:#C0392B;margin:0 0 12px;">${isThreat ? THREAT_MEMBER_INSTRUCTION : 'Rapport à votre poste immédiatement.'}</p>
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
      const sms = isThreat
        ? `${exercisePrefix}CORO SENTINELLE\n${label} - ${building.name}\n${THREAT_MEMBER_INSTRUCTION}\nConfirmez une fois en sécurité: ${ackUrl}`
        : `${exercisePrefix}CORO SENTINELLE\n${label} - ${building.name}\nRapport à votre poste (${roles}).\n${assemblyPoint ? `Rassemblement: ${assemblyPoint}\n` : ''}Confirmez: ${ackUrl}`;
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
  async triggerPanic(
    buildingId: string,
    body: TriggerIncidentPanicDto,
    organizationId: string,
    actor?: { clientUserId: string },
  ) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
    });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    // Identité tirée de la session authentifiée, jamais du navigateur (M2-06).
    const actorUser = actor?.clientUserId
      ? await this.prisma.clientUser.findFirst({
          where: { id: actor.clientUserId, organizationId },
          select: { firstName: true, lastName: true, email: true },
        })
      : null;
    const actorName = actorUser
      ? `${actorUser.firstName || ''} ${actorUser.lastName || ''}`.trim() || actorUser.email
      : null;
    const triggeredBy = actorName || body.triggeredBy || 'Inconnu';

    // Type et portée choisis en un toucher (décision du 21 nov. 2026). Sans
    // type, l'ancien comportement « menace » est conservé, en silencieux.
    const panicType: PanicType = (PANIC_TYPES as readonly string[]).includes(body.panicType as string)
      ? (body.panicType as PanicType)
      : 'THREAT';
    const scope = effectiveScope(panicType, body.scope as PanicScope | undefined);
    const time = new Date().toLocaleTimeString('fr-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit' });
    const address = `${building.address || ''}, ${building.city || ''}, ${building.province || ''}`.trim().replace(/^,\s*|,\s*$/g, '');

    type Contact = { email?: string; phone?: string; name: string; category: string; role?: string; audience: PanicAudience };
    const contacts: Contact[] = [];

    // 1. Responsable du bâtiment
    if (building.responsableEmail || building.responsablePhone) {
      contacts.push({
        email: building.responsableEmail || undefined,
        phone: building.responsablePhone || undefined,
        name: `${building.responsableFirstName || ''} ${building.responsableLastName || ''}`.trim() || 'Responsable',
        category: 'BUILDING_MANAGER',
        audience: 'TEAM',
      });
    }

    // 2. Contact corporatif — fiche client du bâtiment
    const buildingWithClient = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId },
      include: {
        client: {
          select: { name: true, contactEmail: true, contactPhone: true, contactFirstName: true, contactLastName: true, email: true, phone: true },
        },
      },
    });
    const client = buildingWithClient?.client;
    if (client && (client.contactEmail || client.email)) {
      contacts.push({
        email: client.contactEmail || client.email || undefined,
        phone: client.contactPhone || client.phone || undefined,
        name: `${client.contactFirstName || ''} ${client.contactLastName || ''}`.trim() || client.name || 'Contact corpo',
        category: 'CORPORATE',
        audience: 'TEAM',
      });
    }

    // 3. Membres d'urgence présents : coordonnateur d'abord (M2-07), 5 au plus
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const presentEmployees = await this.prisma.occupancyRecord.findMany({
      where: { buildingId, status: 'IN', type: 'EMPLOYE', checkedInAt: { gte: startOfDay } },
      select: { employeeId: true },
    });
    const presentIds = new Set(presentEmployees.map((r) => r.employeeId).filter(Boolean) as string[]);
    const presentMembers = await this.prisma.buildingEmployee.findMany({
      where: { buildingId, isActive: true, isEmergencyMember: true, id: { in: [...presentIds] } },
      include: { emergencyRoles: true },
    });
    const emergencyMembers = sortPanicMembers(presentMembers).slice(0, 5);
    const coordinator = emergencyMembers.find((m: any) => (m.emergencyRoles || []).some((r: any) => r.role === 'COORDINATOR'));
    const coordinatorName = coordinator ? `${(coordinator as any).firstName} ${(coordinator as any).lastName}` : null;
    for (const m of emergencyMembers as any[]) {
      if (m.email || m.phone) {
        contacts.push({
          email: m.email || undefined,
          phone: m.smsConsent && m.phone ? m.phone : undefined,
          name: `${m.firstName} ${m.lastName}`,
          category: 'EMERGENCY_MEMBER',
          role: (m.emergencyRoles || []).map((r: any) => r.role).join(', ') || undefined,
          audience: 'TEAM',
        });
      }
    }

    // 4. « Alerter tout le bâtiment » (menace seulement) : employés présents
    //    qui ont consenti aux SMS, avec la seule consigne de protection.
    if (scope === 'BUILDING' && presentIds.size > 0) {
      const memberIds = new Set(emergencyMembers.map((m: any) => m.id));
      const occupants = await this.prisma.buildingEmployee.findMany({
        where: { buildingId, isActive: true, id: { in: [...presentIds].filter((id) => !memberIds.has(id)) } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, smsConsent: true },
      });
      for (const o of occupants) {
        const phone = o.smsConsent && o.phone ? o.phone : undefined;
        if (phone || o.email) {
          contacts.push({ email: o.email || undefined, phone, name: `${o.firstName} ${o.lastName}`, category: 'OCCUPANT', audience: 'OCCUPANT' });
        }
      }
    }

    const alert = await this.prisma.panicAlert.create({
      data: {
        buildingId,
        organizationId,
        panicType,
        scope,
        triggeredBy,
        clientUserId: actorUser ? actor!.clientUserId : null,
        coordinatorName,
      },
    });

    // Envoi en parallèle, dédupliqué par courriel et par téléphone (M2-04).
    // notifiedCount = personnes de l'équipe jointes par au moins un canal
    // ACCEPTÉ par le fournisseur : le portail n'affiche « alerte envoyée »
    // que si ce compte est ≥ 1, sinon il demande le 911.
    const sentEmails = new Set<string>();
    const sentPhones = new Set<string>();
    const portalUrl = (process.env.CLIENT_PORTAL_PUBLIC_URL?.trim() || 'https://client.getcoro.io').replace(/\/$/, '');
    const responseExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const deliveries = await Promise.all(
      contacts.map(async (contact) => {
        const email = contact.email && !sentEmails.has(contact.email.toLowerCase()) ? contact.email : null;
        if (email) sentEmails.add(email.toLowerCase());
        const normalized = contact.phone ? normalizePhone(contact.phone) : null;
        const phone = normalized && !sentPhones.has(normalized) ? normalized : null;
        if (phone) sentPhones.add(phone);
        if (!email && !phone) return null;

        const responseToken = randomBytes(24).toString('base64url');
        const recipient = await this.prisma.panicRecipient.create({
          data: {
            panicAlertId: alert.id,
            name: contact.name,
            category: contact.category,
            role: contact.role ?? null,
            audience: contact.audience,
            emailMasked: email ? maskEmail(email) : null,
            phoneMasked: phone ? maskPhone(phone) : null,
            responseTokenHash: createHash('sha256').update(responseToken).digest('hex'),
            responseExpiresAt,
          },
        });
        const message = buildPanicMessage({
          type: panicType,
          scope,
          audience: contact.audience,
          buildingName: building.name,
          address,
          triggeredBy,
          time,
          coordinatorName,
          responseUrl: `${portalUrl}/alerte/${responseToken}`,
          isExercise: body.isExercise === true,
        });
        const [emailAccepted, smsAccepted] = await Promise.all([
          email
            ? this.sendEmail({ to: email, toName: contact.name, subject: message.subject, html: message.html }, organizationId)
            : Promise.resolve(null),
          phone ? this.sendSms(phone, message.sms, organizationId) : Promise.resolve(null),
        ]);
        await this.prisma.panicRecipient
          .update({ where: { id: recipient.id }, data: { emailAccepted, smsAccepted } })
          .catch(() => undefined);
        return {
          name: contact.name,
          category: contact.category,
          audience: contact.audience,
          email: email ? maskEmail(email) : null,
          emailAccepted,
          phone: phone ? maskPhone(phone) : null,
          smsAccepted,
          reached: emailAccepted === true || smsAccepted === true,
        };
      }),
    );
    const sent = deliveries.filter((d): d is NonNullable<typeof d> => d !== null);
    const notifiedCount = sent.filter((d) => d.reached && d.audience === 'TEAM').length;
    const occupantCount = sent.filter((d) => d.reached && d.audience === 'OCCUPANT').length;
    await this.prisma.panicAlert
      .update({ where: { id: alert.id }, data: { notifiedCount, occupantCount } })
      .catch(() => undefined);

    // Trace permanente (coordonnées masquées) : preuve pour le REX,
    // l'assureur ou une enquête.
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'PANIC_TRIGGERED',
          entityType: 'Building',
          entityId: buildingId,
          description: `Bouton panique ${panicType} (${scope}) — ${notifiedCount} membre(s) de l'équipe et ${occupantCount} occupant(s) joints`,
          organizationId,
          clientUserId: actorUser ? actor!.clientUserId : null,
          metadata: { panicAlertId: alert.id, triggeredBy, panicType, scope, isExercise: body.isExercise === true, coordinatorName, notifiedCount, occupantCount, contacts: sent },
        },
      });
    } catch (error) {
      console.error('[IncidentService] Trace panique non enregistrée:', error);
    }

    // Incident (audit M2-02) : la panique rejoint l'incident actif, sinon en
    // ouvre un du type correspondant. Les alertes sont déjà parties
    // ci-dessus : l'incident n'envoie rien de plus, il porte le suivi
    // (checklist du coordonnateur, journal, REX).
    const panicLine = `${body.isExercise ? '[EXERCICE] ' : ''}🚨 BOUTON PANIQUE (${PANIC_TYPE_LABELS[panicType].fr}) activé par ${triggeredBy} — ${notifiedCount} membre(s) de l'équipe et ${occupantCount} occupant(s) joints`;
    let incidentEventId: string | null = null;
    const activeIncident = await this.prisma.incidentEvent.findFirst({
      where: { buildingId, organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (activeIncident) {
      incidentEventId = activeIncident.id;
      await this.prisma.incidentLog.create({
        data: { incidentEventId: activeIncident.id, action: panicLine, isAutomatic: false },
      });
    } else {
      try {
        const opened = await this.triggerIncident(
          {
            buildingId,
            type: PANIC_INCIDENT_TYPES[panicType] as any,
            triggeredBy,
            isExercise: body.isExercise === true,
            description: panicLine,
          } as any,
          organizationId,
          { status: 'ACTIVE', deferNotifications: true, source: 'PANIC' },
        );
        incidentEventId = opened.incident.id;
      } catch (error) {
        console.error('[IncidentService] Incident de panique non ouvert (alertes déjà envoyées):', error instanceof Error ? error.message : error);
      }
    }
    if (incidentEventId) {
      await this.prisma.panicAlert
        .update({ where: { id: alert.id }, data: { incidentEventId } })
        .catch(() => undefined);
    }

    return {
      success: true,
      panicAlertId: alert.id,
      panicType,
      scope,
      notifiedCount,
      occupantCount,
      coordinatorName,
      address,
      contacts: sent.length,
      incidentEventId,
    };
  }

  /** Suivi en direct d'une alerte panique pour le déclencheur (portail). */
  async getPanicStatus(panicAlertId: string, buildingId: string, organizationId: string) {
    const alert = await this.prisma.panicAlert.findFirst({
      where: { id: panicAlertId, buildingId, organizationId },
      include: {
        recipients: {
          select: { id: true, name: true, category: true, role: true, audience: true, emailAccepted: true, smsAccepted: true, response: true, respondedAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!alert) throw new NotFoundException('Alerte introuvable');
    const counts = { TAKING_CHARGE: 0, SAFE: 0, NEED_HELP: 0, NO_RESPONSE: 0 };
    for (const r of alert.recipients) counts[(r.response as keyof typeof counts) || 'NO_RESPONSE'] += 1;
    return { ...alert, counts };
  }

  /** Page publique de réponse : contexte minimal, sans coordonnées. */
  async getPanicResponseContext(token: string) {
    const recipient = await this.findPanicRecipient(token);
    const alert = await this.prisma.panicAlert.findUnique({ where: { id: recipient.panicAlertId } });
    const building = alert
      ? await this.prisma.building.findUnique({ where: { id: alert.buildingId }, select: { name: true } })
      : null;
    return {
      buildingName: building?.name ?? '',
      panicType: alert?.panicType ?? 'OTHER',
      createdAt: alert?.createdAt ?? null,
      name: recipient.name.split(' ')[0] || '',
      options: panicResponsesFor(recipient.audience === 'OCCUPANT' ? 'OCCUPANT' : 'TEAM'),
      response: recipient.response,
      respondedAt: recipient.respondedAt,
    };
  }

  async respondToPanic(token: string, response: string) {
    const recipient = await this.findPanicRecipient(token);
    const allowed = panicResponsesFor(recipient.audience === 'OCCUPANT' ? 'OCCUPANT' : 'TEAM');
    if (!allowed.includes(response as PanicResponse)) throw new BadRequestException('Réponse invalide');
    const respondedAt = new Date();
    await this.prisma.panicRecipient.update({ where: { id: recipient.id }, data: { response, respondedAt } });
    return { response, respondedAt };
  }

  private async findPanicRecipient(token: string) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) throw new NotFoundException('Lien invalide ou expiré');
    const recipient = await this.prisma.panicRecipient.findUnique({
      where: { responseTokenHash: createHash('sha256').update(token).digest('hex') },
    });
    if (!recipient || !recipient.responseExpiresAt || recipient.responseExpiresAt <= new Date()) {
      throw new NotFoundException('Lien invalide ou expiré');
    }
    return recipient;
  }

  /**
   * Version approuvée du plan d'urgence du bâtiment (audit M2-08).
   * 1. Dernière version d'approbation dont le snapshot contient le plan
   *    soumis (configuration + contenu) : source opposable.
   * 2. À défaut (approbations anciennes sans snapshot complet), le plan
   *    validé courant, verrouillé en lecture seule depuis l'audit M1.
   */
  async loadApprovedPlanForIncident(buildingId: string, organizationId: string): Promise<{
    project: { id: string; documentType: string; status: string; updatedAt: Date };
    configData: any;
    content: any;
    document: { id: string; version: number; updatedAt: Date } | null;
    approvedVersionNumber: number | null;
  } | null> {
    const version = await this.prisma.projectVersion.findFirst({
      where: {
        project: { buildingId, organizationId, documentType: { in: ['PMU', 'PSI'] }, isActive: true },
        snapshot: { path: ['type'], equals: 'APPROVAL' },
      },
      orderBy: [{ createdAt: 'desc' }, { versionNumber: 'desc' }],
      select: {
        versionNumber: true,
        createdAt: true,
        snapshot: true,
        project: { select: { id: true, documentType: true, status: true, updatedAt: true } },
      },
    });
    const submitted = (version?.snapshot as any)?.submittedSnapshot;
    if (version && submitted?.project && submitted?.document) {
      return {
        project: version.project,
        configData: submitted.project.configData ?? {},
        content: submitted.document.content ?? {},
        document: submitted.document.id
          ? { id: submitted.document.id, version: Number(submitted.document.version) || 0, updatedAt: version.createdAt }
          : null,
        approvedVersionNumber: version.versionNumber,
      };
    }

    const activePmu = await this.prisma.project.findFirst({
      where: { buildingId, organizationId, documentType: { in: ['PMU', 'PSI'] }, status: { in: ['VALIDATED', 'EXPORTED'] }, isActive: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: { id: true, documentType: true, status: true, updatedAt: true, configData: true },
    });
    if (!activePmu) return null;
    const pmuDocument = await this.prisma.document.findFirst({
      where: { projectId: activePmu.id, status: { in: ['VALIDATED', 'EXPORTED'] } },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
      select: { id: true, version: true, updatedAt: true, content: true },
    });
    const { configData, ...project } = activePmu;
    return {
      project,
      configData: configData ?? {},
      content: pmuDocument?.content ?? {},
      document: pmuDocument ? { id: pmuDocument.id, version: pmuDocument.version, updatedAt: pmuDocument.updatedAt } : null,
      approvedVersionNumber: version?.versionNumber ?? null,
    };
  }

  // ── Déclencher un incident ────────────────────────────────────────────────
  // opts.status/'PRE_ALERT' + deferNotifications=true : utilisé par le pont
  // panneau d'alarme (triggerFromAlarmPanel) — l'incident et ses tâches sont
  // créés tout de suite (snapshot fidèle au moment du signal) mais les
  // notifications de masse attendent la confirmation ou l'escalade automatique.
  async triggerIncident(
    body: TriggerIncidentDto & { triggeredBy: string },
    organizationId: string,
    opts?: { status?: 'ACTIVE' | 'PRE_ALERT'; deferNotifications?: boolean; source?: 'PANIC' },
    audit?: IncidentAuditContext,
  ) {
    const building = await this.prisma.building.findFirst({ where: { id: body.buildingId, organizationId } });
    if (!building) throw new NotFoundException('Bâtiment introuvable');

    const status = opts?.status || 'ACTIVE';
    const deferNotifications = opts?.deferNotifications ?? false;
    const isExercise = body.isExercise === true;

    // Plan de référence (audit M2-08) : la dernière version APPROUVÉE du PMU
    // ou du PSI du bâtiment — point de rassemblement et contacts tels
    // qu'approuvés, même si le plan est revenu en révision depuis.
    const approvedPlan = await this.loadApprovedPlanForIncident(body.buildingId, organizationId);
    const activePmu = approvedPlan?.project ?? null;
    const configData    = approvedPlan?.configData ?? null;
    const assemblyPoint = configData?.pointRassemblement || null;
    const contactsModule2: any = approvedPlan?.content?.module2 || null;
    const sourceDocument = approvedPlan?.document ?? null;

    const interventionSheet = buildInterventionSheet(
      building,
      configData,
      contactsModule2,
      activePmu ? {
        projectId: activePmu.id,
        documentType: activePmu.documentType,
        projectStatus: activePmu.status,
        projectUpdatedAt: activePmu.updatedAt,
        documentId: sourceDocument?.id || null,
        documentVersion: sourceDocument?.version || null,
        documentUpdatedAt: sourceDocument?.updatedAt || null,
        approvedVersionNumber: approvedPlan?.approvedVersionNumber ?? null,
      } : null,
    );
    const publicAccessToken = randomUUID();
    const publicAccessExpiresAt = new Date(Date.now() + PUBLIC_CAPABILITY_TTL_MS);

    // Snapshots
    const presentRecords = await this.prisma.occupancyRecord.findMany({
      where: { buildingId: body.buildingId, status: 'IN' },
    });
    const presentIds = new Set(
      (await this.prisma.occupancyRecord.findMany({
        where: { buildingId: body.buildingId, status: 'IN', type: 'EMPLOYE' },
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
    const created = await this.prisma.$transaction(async (tx) => {
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
    } else if (opts?.source === 'PANIC') {
      await tx.incidentLog.create({
        data: {
          incidentEventId: incident.id,
          action:  `${isExercise ? '[EXERCICE] ' : ''}Incident ouvert par le bouton panique — ${incidentLabel}`,
          details: `Alertes déjà envoyées par la panique (suivi dans l'alerte panique) · ${presentRecords.length} occupants · Procédure ${procedureCode}`,
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
    // Envoi immédiat après validation (M2-04) ; la tâche planifiée reprend
    // les échecs.
    if (!deferNotifications) this.kickIncidentDispatch(created.incident.id);
    // Un seul circuit (M5-07) : un incident qui impose d'évacuer ouvre
    // l'évacuation et son dénombrement. Une pré-alerte attend confirmation.
    if (status === 'ACTIVE') await this.openEvacuationForIncident(created.incident);
    return created;
  }

  private async openEvacuationForIncident(incident: { id: string; buildingId: string; organizationId: string; type: string; triggeredBy?: string | null; isExercise?: boolean }) {
    if (!EVACUATION_INCIDENT_TYPES.has(incident.type)) return;
    try {
      const label = INCIDENT_LABELS[incident.type] || 'Incident';
      const result = await openEvacuationWithSnapshot(this.prisma, {
        buildingId: incident.buildingId,
        organizationId: incident.organizationId,
        triggeredBy: incident.triggeredBy ?? null,
        notes: `${incident.isExercise ? '[EXERCICE] ' : ''}Ouverte par l'incident « ${label} »`,
        incidentEventId: incident.id,
      });
      await this.prisma.incidentLog.create({
        data: {
          incidentEventId: incident.id,
          action: result.created
            ? `Évacuation ouverte — dénombrement de ${result.event.totalPresent} personne(s) pointée(s)`
            : 'Évacuation déjà en cours dans le bâtiment — dénombrement existant conservé',
          isAutomatic: true,
        },
      });
    } catch (error) {
      console.error("[IncidentService] Évacuation non ouverte par l'incident :", error instanceof Error ? error.message : error);
    }
  }

  private kickIncidentDispatch(incidentEventId: string) {
    if (!this.dispatcher) return;
    void this.dispatcher.dispatchIncidentNow(incidentEventId).catch((error) =>
      console.error('[IncidentService] Envoi immédiat différé à la tâche planifiée :', error instanceof Error ? error.message : error),
    );
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
    // Menace : personne n'est envoyé au point de rassemblement ni « à son
    // poste » ; l'équipe reçoit la consigne de protection (21 nov. 2026).
    if (THREAT_INCIDENT_TYPES.has(incidentType)) assemblyPoint = null;

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
    const resolved = await this.resolvePreAlertInTransaction(incidentId, outcome, audit);
    if (resolved.claimed && outcome !== 'CANCELLED') {
      this.kickIncidentDispatch(incidentId);
      if ((resolved as any).incident) await this.openEvacuationForIncident((resolved as any).incident);
    }
    return resolved;
  }

  private async resolvePreAlertInTransaction(incidentId: string, outcome: 'CONFIRMED' | 'CANCELLED' | 'AUTO_ESCALATED', audit?: IncidentAuditContext) {
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
      await this.sendEmail({ to: email, toName: '', subject: `🚨 Fiche d'intervention — ${label} · ${building?.name || ''}`, html }, organizationId);
    }

    await this.prisma.incidentLog.create({
      data: { incidentEventId: incidentId, action: `Fiche d'intervention envoyée par courriel à ${validEmails.length} destinataire(s)`, isAutomatic: false },
    });

    return { success: true, sentCount: validEmails.length };
  }

  // ── Journal ───────────────────────────────────────────────────────────────
  async addLog(incidentId: string, body: AddIncidentLogDto, organizationId: string, actor: { type: CoroActorType; id: string }) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return this.prisma.incidentLog.create({ data: { incidentEventId: incidentId, action: body.action.trim(), actor: `${actor.type}:${actor.id}`, details: body.details?.trim() || null, isAutomatic: false } });
  }

  // ── Contenir / Résoudre ───────────────────────────────────────────────────
  async containIncident(incidentId: string, organizationId: string, body: ContainIncidentDto = {}, audit?: IncidentAuditContext) {
    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
      if (!incident) throw new NotFoundException('Incident introuvable');
      if (audit?.assignmentId) {
        const assignment = await tx.incidentAuthorityAssignment.findFirst({ where: { id: audit.assignmentId, organizationId, incidentEventId: incidentId, status: 'ACTIVE', permissions: { has: IncidentPermission.INCIDENT_COMMAND } }, select: { id: true } });
        if (!assignment) throw new NotFoundException('Autorite incident introuvable.');
      }
      if (incident.status === IncidentStatus.CONTAINED) return incident;
      if (incident.status !== IncidentStatus.ACTIVE || !incident.isActive) throw new ConflictException('Seul un incident actif peut etre contenu.');
      if (body.lockVersion !== undefined && body.lockVersion !== incident.lockVersion) throw new ConflictException('La fiche a ete modifiee. Actualisez avant de poursuivre.');
      const result = await tx.incidentEvent.updateMany({ where: { id: incidentId, organizationId, status: IncidentStatus.ACTIVE, isActive: true, lockVersion: incident.lockVersion }, data: { status: IncidentStatus.CONTAINED, containedAt: new Date(), lockVersion: { increment: 1 } } });
      if (result.count !== 1) {
        const current = await tx.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
        if (current?.status === IncidentStatus.CONTAINED) return current;
        throw new ConflictException('Transition concurrente detectee.');
      }
      const updated = await tx.incidentEvent.findUniqueOrThrow({ where: { id: incidentId } });
      await tx.incidentLog.create({ data: { incidentEventId: incidentId, action: 'Incident contenu', isAutomatic: false } });
      if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: incident.buildingId, incidentEventId: incidentId, operation: 'INCIDENT_CONTAINED', ...audit, previousState: { status: incident.status, lockVersion: incident.lockVersion }, resultingState: { status: updated.status, lockVersion: updated.lockVersion } });
      return updated;
    });
  }

  async resolveIncident(incidentId: string, body: ResolveIncidentDto, organizationId: string, audit?: IncidentAuditContext) {
    const closingNotes = body.closingNotes?.trim();
    if (!closingNotes) throw new BadRequestException('Le motif de resolution est obligatoire.');
    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
      if (!incident) throw new NotFoundException('Incident introuvable');
      if (audit?.assignmentId) {
        const assignment = await tx.incidentAuthorityAssignment.findFirst({ where: { id: audit.assignmentId, organizationId, incidentEventId: incidentId, status: 'ACTIVE', permissions: { has: IncidentPermission.INCIDENT_COMMAND } }, select: { id: true } });
        if (!assignment) throw new NotFoundException('Autorite incident introuvable.');
      }
      if (incident.status === IncidentStatus.RESOLVED && incident.closingNotes === closingNotes) return incident;
      if ((incident.status !== IncidentStatus.ACTIVE && incident.status !== IncidentStatus.CONTAINED) || !incident.isActive) throw new ConflictException('Cet incident ne peut pas etre resolu dans son etat actuel.');
      if (body.lockVersion !== undefined && body.lockVersion !== incident.lockVersion) throw new ConflictException('La fiche a ete modifiee. Actualisez avant de poursuivre.');
      const now = new Date();
      const result = await tx.incidentEvent.updateMany({ where: { id: incidentId, organizationId, status: { in: [IncidentStatus.ACTIVE, IncidentStatus.CONTAINED] }, isActive: true, lockVersion: incident.lockVersion }, data: { status: IncidentStatus.RESOLVED, resolvedAt: now, closingNotes, isActive: false, publicAccessRevokedAt: now, lockVersion: { increment: 1 } } });
      if (result.count !== 1) throw new ConflictException('Transition concurrente detectee.');
      const resolved = await tx.incidentEvent.findUniqueOrThrow({ where: { id: incidentId } });
      await tx.incidentTask.updateMany({ where: { incidentEventId: incidentId }, data: { ackRevokedAt: now, escalationStatus: 'CANCELLED', nextEscalationAt: null, escalationCancelledAt: now, escalationCancellationReason: 'INCIDENT_RESOLVED', lockVersion: { increment: 1 } } });
      if (this.dispatcher) await this.dispatcher.cancelIncident(incidentId, 'INCIDENT_RESOLVED', tx);
      await tx.incidentLog.create({ data: { incidentEventId: incidentId, action: 'Incident résolu', details: closingNotes, isAutomatic: false } });
      if (audit) await this.appendCriticalAudit(tx, { organizationId, buildingId: incident.buildingId, incidentEventId: incidentId, operation: 'INCIDENT_RESOLVED', ...audit, previousState: { status: incident.status, isActive: incident.isActive, lockVersion: incident.lockVersion }, resultingState: { status: resolved.status, isActive: resolved.isActive, lockVersion: resolved.lockVersion } });
      return resolved;
    });
  }

  // ── Historique + Détail ───────────────────────────────────────────────────
  async getIncidentHistory(
    buildingId: string,
    organizationId: string,
    query: IncidentHistoryQueryDto = new IncidentHistoryQueryDto(),
  ) {
    const baseWhere: Prisma.IncidentEventWhereInput = {
      buildingId,
      organizationId,
    };
    const search = normalizeIncidentSearch(query.search || '');
    const matchingTypes = search
      ? (Object.values(IncidentType) as IncidentType[]).filter((type) =>
          `${type.toLowerCase()} ${INCIDENT_SEARCH_LABELS[type]}`.includes(search),
        )
      : [];
    const statusWhere =
      query.status === IncidentHistoryStatusFilter.ALL
        ? {}
        : query.status === IncidentHistoryStatusFilter.OPEN
          ? { status: { in: OPEN_INCIDENT_STATUSES } }
          : { status: query.status as unknown as IncidentStatus };
    const exerciseWhere =
      query.exercise === IncidentHistoryExerciseFilter.ALL
        ? {}
        : { isExercise: query.exercise === IncidentHistoryExerciseFilter.EXERCISE };
    const where: Prisma.IncidentEventWhereInput = {
      ...baseWhere,
      ...statusWhere,
      ...exerciseWhere,
      ...(search
        ? {
            OR: [
              { procedureCode: { contains: search, mode: 'insensitive' } },
              ...(matchingTypes.length ? [{ type: { in: matchingTypes } }] : []),
            ],
          }
        : {}),
    };
    const orderBy: Prisma.IncidentEventOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      { id: query.sortOrder },
    ];
    const skip = (query.page - 1) * query.pageSize;
    const [
      total,
      all,
      preAlerts,
      active,
      contained,
      resolved,
      cancelled,
      exercises,
      incidents,
    ] = await this.prisma.$transaction([
      this.prisma.incidentEvent.count({ where }),
      this.prisma.incidentEvent.count({ where: baseWhere }),
      this.prisma.incidentEvent.count({ where: { ...baseWhere, status: IncidentStatus.PRE_ALERT } }),
      this.prisma.incidentEvent.count({ where: { ...baseWhere, status: IncidentStatus.ACTIVE } }),
      this.prisma.incidentEvent.count({ where: { ...baseWhere, status: IncidentStatus.CONTAINED } }),
      this.prisma.incidentEvent.count({ where: { ...baseWhere, status: IncidentStatus.RESOLVED } }),
      this.prisma.incidentEvent.count({ where: { ...baseWhere, status: IncidentStatus.CANCELLED } }),
      this.prisma.incidentEvent.count({ where: { ...baseWhere, isExercise: true } }),
      this.prisma.incidentEvent.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
        select: {
          id: true,
          status: true,
          type: true,
          triggeredAt: true,
          resolvedAt: true,
          procedureCode: true,
          isExercise: true,
          rexWentWell: true,
          rexToImprove: true,
          rexRecommendations: true,
          tasks: {
            where: { isCoordinatorStep: true },
            select: { status: true },
          },
        },
      }),
    ]);

    const countByStatus: Record<IncidentStatus, number> = {
      PRE_ALERT: preAlerts,
      ACTIVE: active,
      CONTAINED: contained,
      RESOLVED: resolved,
      CANCELLED: cancelled,
    };

    return {
      items: incidents.map((incident) => ({
        id: incident.id,
        status: incident.status,
        type: incident.type,
        triggeredAt: incident.triggeredAt,
        resolvedAt: incident.resolvedAt,
        procedureCode: incident.procedureCode,
        isExercise: incident.isExercise,
        hasRex: Boolean(
          incident.rexWentWell ||
            incident.rexToImprove ||
            incident.rexRecommendations,
        ),
        coordinatorStepsTotal: incident.tasks.length,
        coordinatorStepsCompleted: incident.tasks.filter(
          (task) => task.status === 'COMPLETED',
        ).length,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      counts: {
        all,
        open: OPEN_INCIDENT_STATUSES.reduce(
          (sum, status) => sum + countByStatus[status],
          0,
        ),
        byStatus: countByStatus,
        exercises,
        real: all - exercises,
      },
    };
  }

  async getIncidentDetail(incidentId: string, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({
      where: { id: incidentId, organizationId },
      select: {
        id: true, buildingId: true, type: true, status: true, triggeredAt: true, triggeredBy: true,
        description: true, procedureCode: true, assemblyPoint: true, containedAt: true, resolvedAt: true,
        closingNotes: true, isActive: true, isExercise: true, createdAt: true, updatedAt: true, lockVersion: true,
        occupantsSnapshot: true, teamSnapshot: true,
        rexWentWell: true, rexToImprove: true, rexRecommendations: true, rexCorrectiveActions: true, rexCompletedAt: true,
        building: { select: { name: true } },
        tasks: { orderBy: [{ stepOrder: 'asc' }, { id: 'asc' }], select: { id: true, role: true, title: true, description: true, stepId: true, stepText: true, stepOrder: true, isCoordinatorStep: true, status: true, severity: true, ackDeadlineAt: true, missedAcknowledgmentAt: true, escalationStatus: true, escalationLevel: true, acknowledgedAt: true, completedAt: true, lockVersion: true } },
        logs: { orderBy: [{ timestamp: 'asc' }, { id: 'asc' }], select: { id: true, timestamp: true, action: true, actor: true, details: true, isAutomatic: true } },
      },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    const {
      occupantsSnapshot,
      teamSnapshot,
      publicAccessToken: _publicAccessToken,
      interventionSheet: _interventionSheet,
      ...safeIncident
    } = incident as typeof incident & { publicAccessToken?: unknown; interventionSheet?: unknown };
    const occupants = Array.isArray(occupantsSnapshot) ? occupantsSnapshot : [];
    const team = Array.isArray(teamSnapshot) ? teamSnapshot : [];
    return {
      ...safeIncident,
      occupantsSnapshot: occupants.map(() => ({})),
      teamSnapshot: team.map((member: any) => ({ id: member?.id, firstName: member?.firstName, lastName: member?.lastName, roles: Array.isArray(member?.roles) ? member.roles.map((role: any) => ({ role: role?.role })) : [] })),
      snapshotWarnings: [
        ...(!Array.isArray(occupantsSnapshot) ? ['occupantsSnapshot'] : []),
        ...(!Array.isArray(teamSnapshot) ? ['teamSnapshot'] : []),
      ],
      responsible: null,
    };
  }

  // ── REX ───────────────────────────────────────────────────────────────────
  async updateRex(incidentId: string, body: UpdateIncidentRexDto, organizationId: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException();
    return this.prisma.incidentEvent.update({
      where: { id: incidentId },
      data: {
        rexWentWell:          body.rexWentWell          ?? null,
        rexToImprove:         body.rexToImprove         ?? null,
        rexRecommendations:   body.rexRecommendations   ?? null,
        rexCorrectiveActions: body.rexCorrectiveActions ?? null,
        rexCompletedAt:       new Date(),
      },
    });
  }
}
