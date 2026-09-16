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

// Fenêtre de confirmation avant qu'une pré-alerte (panneau d'alarme incendie)
// n'escalade automatiquement en incident actif avec notifications envoyées.
const ALARM_ESCALATION_WINDOW_MS = 45_000;

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

    const incidentLabel = INCIDENT_LABELS[body.type] || 'Incident';

    if (!deferNotifications) {
      await this.dispatchIncidentNotifications(incident, building, mobilizableTeam, coordSteps, assemblyPoint, isExercise, body.type, presentIds);

      await this.prisma.incidentLog.create({
        data: {
          incidentEventId: incident.id,
          action:  `${isExercise ? '[EXERCICE] ' : ''}Incident déclenché — ${incidentLabel}`,
          details: `${presentRecords.length} occupants · ${mobilizableTeam.length} membres mobilisés · Procédure ${procedureCode}${isExercise ? ' · MODE EXERCICE' : ''}`,
          isAutomatic: true,
        },
      });
    } else {
      await this.prisma.incidentLog.create({
        data: {
          incidentEventId: incident.id,
          action:  `Pré-alerte — ${incidentLabel} détectée par le panneau d'alarme`,
          details: `En attente de confirmation (${Math.round(ALARM_ESCALATION_WINDOW_MS / 1000)}s) — ${presentRecords.length} occupants · ${mobilizableTeam.length} membres mobilisables · Procédure ${procedureCode}`,
          isAutomatic: true,
        },
      });
    }

    return { incident, coordinatorStepsCount: coordSteps.length, notifiedCount: mobilizableTeam.length, isExercise };
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
  ) {
    const incidentLabel  = INCIDENT_LABELS[incidentType] || 'Incident';
    const occupantMsgCfg = OCCUPANT_MESSAGES[incidentType] || OCCUPANT_MESSAGES.OTHER;

    const coordinator = mobilizableTeam.find(m => m.roles.some((r: any) => r.role === 'COORDINATOR'));
    if (coordinator?.email) {
      await this.notifyCoordinator(coordinator, incident, incidentLabel, building, assemblyPoint, coordSteps, isExercise);
    }

    const otherMembers = mobilizableTeam.filter(m => !m.roles.some((r: any) => r.role === 'COORDINATOR') && m.email);
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
    );

    this.scheduleAutoEscalation(result.incident.id);
    return result;
  }

  private scheduleAutoEscalation(incidentId: string) {
    setTimeout(() => {
      this.resolvePreAlert(incidentId, 'AUTO_ESCALATED').catch(err =>
        console.error('[IncidentService] Erreur escalade automatique de pré-alerte:', err),
      );
    }, ALARM_ESCALATION_WINDOW_MS);
  }

  // ── Résolution d'une pré-alerte — confirmation, annulation ou expiration ──
  // Le updateMany conditionné sur status:'PRE_ALERT' agit comme verrou
  // atomique : si confirmation, annulation et minuterie se chevauchent, seul
  // le premier appel obtient claimed:true — les autres sont des no-op.
  private async resolvePreAlert(incidentId: string, outcome: 'CONFIRMED' | 'CANCELLED' | 'AUTO_ESCALATED') {
    const claimed = await this.prisma.incidentEvent.updateMany({
      where: { id: incidentId, status: 'PRE_ALERT' },
      data: outcome === 'CANCELLED'
        ? { status: 'CANCELLED', isActive: false, resolvedAt: new Date() }
        : { status: 'ACTIVE' },
    });
    if (claimed.count === 0) return { claimed: false };

    const incident = await this.prisma.incidentEvent.findUnique({ where: { id: incidentId } });
    if (!incident) return { claimed: false };

    if (outcome !== 'CANCELLED') {
      const building = await this.prisma.building.findUnique({ where: { id: incident.buildingId } });
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
          incident.assemblyPoint, incident.isExercise, incident.type, presentIds,
        );
      }
    }

    const logAction =
      outcome === 'AUTO_ESCALATED' ? "Pré-alerte — délai écoulé, escalade automatique, notifications envoyées"
      : outcome === 'CONFIRMED'    ? 'Pré-alerte confirmée — notifications envoyées'
      :                              'Pré-alerte annulée — aucune notification envoyée';

    await this.prisma.incidentLog.create({
      data: { incidentEventId: incident.id, action: logAction, isAutomatic: outcome !== 'CONFIRMED' },
    });

    return { claimed: true, incident };
  }

  async confirmPreAlert(incidentId: string, organizationId: string, confirmedBy: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const result = await this.resolvePreAlert(incidentId, 'CONFIRMED');
    if (!result.claimed) throw new NotFoundException('Cette pré-alerte a déjà été traitée');

    await this.prisma.incidentLog.create({
      data: { incidentEventId: incidentId, action: `Confirmé par ${confirmedBy}`, isAutomatic: false },
    });
    return { confirmed: true };
  }

  async cancelPreAlert(incidentId: string, organizationId: string, cancelledBy: string) {
    const incident = await this.prisma.incidentEvent.findFirst({ where: { id: incidentId, organizationId } });
    if (!incident) throw new NotFoundException('Incident introuvable');

    const result = await this.resolvePreAlert(incidentId, 'CANCELLED');
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

  // ── Fiche d'intervention — accès public temporaire (QR) ──────────────────
  async getInterventionSheetByToken(token: string) {
    const incident = await this.prisma.incidentEvent.findUnique({ where: { publicAccessToken: token } });
    if (!incident || !incident.isActive) {
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