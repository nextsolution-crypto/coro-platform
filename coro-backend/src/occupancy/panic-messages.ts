// Messages du bouton panique (décision du 21 nov. 2026, audit M2-05).
//
// Chaque message suit la grille des alertes efficaces (FEMA IPAWS) :
// source, danger, lieu, consigne de protection, heure, puis le lien de
// réponse. Consignes canadiennes pour une menace : fuir si possible, sinon
// se cacher et verrouiller ; ne pas déclencher l'alarme incendie ; ne pas se
// regrouper au point de rassemblement ; composer le 911 une fois en sécurité.

import { escapeIncidentHtml } from './incident-html';

export const PANIC_TYPES = ['THREAT', 'MEDICAL', 'FIRE', 'OTHER'] as const;
export type PanicType = (typeof PANIC_TYPES)[number];

export const PANIC_SCOPES = ['TEAM', 'BUILDING'] as const;
export type PanicScope = (typeof PANIC_SCOPES)[number];

export type PanicAudience = 'TEAM' | 'OCCUPANT';

export const PANIC_RESPONSES = ['TAKING_CHARGE', 'SAFE', 'NEED_HELP'] as const;
export type PanicResponse = (typeof PANIC_RESPONSES)[number];

/** Type d'incident ouvert par la panique (audit M2-02). */
export const PANIC_INCIDENT_TYPES: Record<PanicType, string> = {
  THREAT: 'ACTIVE_THREAT',
  MEDICAL: 'MEDICAL',
  FIRE: 'FIRE_ALARM',
  OTHER: 'OTHER',
};

export const PANIC_TYPE_LABELS: Record<PanicType, { fr: string; en: string }> = {
  THREAT: { fr: 'MENACE OU VIOLENCE', en: 'THREAT OR VIOLENCE' },
  MEDICAL: { fr: 'URGENCE MÉDICALE', en: 'MEDICAL EMERGENCY' },
  FIRE: { fr: 'FEU OU FUMÉE', en: 'FIRE OR SMOKE' },
  OTHER: { fr: 'URGENCE', en: 'EMERGENCY' },
};

export const PANIC_RESPONSE_LABELS: Record<PanicResponse, { fr: string; en: string }> = {
  TAKING_CHARGE: { fr: 'Je prends en charge', en: 'I am taking charge' },
  SAFE: { fr: 'Je suis en sécurité', en: 'I am safe' },
  NEED_HELP: { fr: 'J’ai besoin d’aide', en: 'I need help' },
};

export function panicResponsesFor(audience: PanicAudience): PanicResponse[] {
  return audience === 'TEAM' ? ['TAKING_CHARGE', 'SAFE', 'NEED_HELP'] : ['SAFE', 'NEED_HELP'];
}

/** Seule la menace peut alerter tout le bâtiment ; les autres types restent à l'équipe. */
export function effectiveScope(type: PanicType, scope: PanicScope | undefined): PanicScope {
  return type === 'THREAT' && scope === 'BUILDING' ? 'BUILDING' : 'TEAM';
}

const ACTIONS: Record<PanicType, { team: { fr: string; en: string }; occupant: { fr: string; en: string } }> = {
  THREAT: {
    team: {
      fr: 'FUYEZ si vous pouvez le faire en sécurité, sinon CACHEZ-VOUS et verrouillez. Ne déclenchez pas l’alarme incendie et n’allez pas au point de rassemblement.',
      en: 'GET OUT if you can do so safely, otherwise HIDE and lock the door. Do not pull the fire alarm and do not go to the assembly point.',
    },
    occupant: {
      fr: 'FUYEZ si vous pouvez le faire en sécurité, sinon CACHEZ-VOUS et verrouillez. N’allez pas au point de rassemblement. Composez le 911 une fois en sécurité.',
      en: 'GET OUT if you can do so safely, otherwise HIDE and lock the door. Do not go to the assembly point. Call 911 once you are safe.',
    },
  },
  MEDICAL: {
    team: {
      fr: 'Secouristes : rendez-vous auprès de la personne avec la trousse et le DEA. Dégagez l’accès et envoyez quelqu’un accueillir les paramédics.',
      en: 'First aiders: go to the person with the first aid kit and the AED. Clear the way and send someone to meet the paramedics.',
    },
    occupant: { fr: '', en: '' },
  },
  FIRE: {
    team: {
      fr: 'Déclenchez l’alarme incendie si ce n’est pas fait. Évacuez par l’escalier le plus proche, sans ascenseur, et rendez-vous au point de rassemblement.',
      en: 'Pull the fire alarm if it is not already sounding. Evacuate by the nearest stairway, no elevators, and go to the assembly point.',
    },
    occupant: { fr: '', en: '' },
  },
  OTHER: {
    team: {
      fr: 'Rejoignez ou appelez la personne qui a déclenché l’alerte et suivez les consignes du coordonnateur.',
      en: 'Reach or call the person who raised the alert and follow the coordinator’s instructions.',
    },
    occupant: { fr: '', en: '' },
  },
};

export type PanicMessageInput = {
  type: PanicType;
  scope: PanicScope;
  audience: PanicAudience;
  buildingName: string;
  address: string;
  triggeredBy: string;
  time: string;
  /** Coordonnateur désigné pour confirmer l'appel au 911 (premier coordonnateur présent). */
  coordinatorName: string | null;
  responseUrl: string | null;
  isExercise?: boolean;
};

/** Qui compose le 911 : le déclencheur, puis le coordonnateur ; les autres seulement avec une information nouvelle. */
export function callerPolicy(triggeredBy: string, coordinatorName: string | null) {
  const fr = coordinatorName
    ? `911 : ${triggeredBy} appelle ; ${coordinatorName} (coordonnateur) confirme l’appel. Les autres : appelez seulement avec une information nouvelle.`
    : `911 : ${triggeredBy} appelle. Les autres : appelez seulement si vous êtes témoin, avec une information nouvelle et en sécurité.`;
  const en = coordinatorName
    ? `911: ${triggeredBy} calls; ${coordinatorName} (coordinator) confirms the call. Others: call only with new information.`
    : `911: ${triggeredBy} calls. Others: call only if you are a witness, have new information and are safe.`;
  return { fr, en };
}

export function buildPanicMessage(input: PanicMessageInput) {
  const label = PANIC_TYPE_LABELS[input.type];
  const action = input.audience === 'OCCUPANT' ? ACTIONS[input.type].occupant : ACTIONS[input.type].team;
  const silent = input.type === 'THREAT' && input.scope === 'TEAM' && input.audience === 'TEAM';
  const caller = input.audience === 'TEAM' ? callerPolicy(input.triggeredBy, input.coordinatorName) : null;
  const exercise = input.isExercise ? { fr: '[EXERCICE] ', en: '[DRILL] ' } : { fr: '', en: '' };
  const where = input.address ? `${input.buildingName}, ${input.address}` : input.buildingName;

  const frLines = [
    `${exercise.fr}CORO – ${where}.`,
    input.audience === 'TEAM'
      ? `Alerte : ${label.fr}, à ${input.time}, déclenchée par ${input.triggeredBy}.`
      : `Alerte : ${label.fr} dans le bâtiment, à ${input.time}.`,
    action.fr,
    silent ? 'Alerte silencieuse : ne la diffusez pas aux occupants.' : '',
    caller?.fr ?? '',
    input.responseUrl ? `Répondez : ${input.responseUrl}` : '',
  ].filter(Boolean);
  const enLines = [
    `${exercise.en}CORO – ${where}.`,
    input.audience === 'TEAM'
      ? `Alert: ${label.en} at ${input.time}, raised by ${input.triggeredBy}.`
      : `Alert: ${label.en} in the building at ${input.time}.`,
    action.en,
    silent ? 'Silent alert: do not broadcast it to occupants.' : '',
    caller?.en ?? '',
  ].filter(Boolean);

  const sms = `${frLines.join('\n')}\n\n${enLines.join('\n')}`;
  const subject = `${exercise.fr}🚨 ${label.fr} — ${input.buildingName}`;

  const h = escapeIncidentHtml;
  const responseButtons = input.responseUrl
    ? `<a href="${h(input.responseUrl)}" style="display:block;text-align:center;background:#2C3E50;color:#FFFFFF;padding:14px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:800;margin:0 0 12px;">Répondre · Respond</a>`
    : '';
  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#C0392B;padding:20px 24px;border-radius:6px 6px 0 0;">
        <span style="color:#FFFFFF;font-size:24px;font-weight:900;">CORO</span>
        <span style="background:#FFFFFF;color:#C0392B;font-size:13px;font-weight:800;padding:4px 10px;border-radius:4px;margin-left:12px;">🚨 ${h(exercise.fr + label.fr)}</span>
      </div>
      <div style="background:#FFFFFF;padding:24px;border:1px solid #E9ECEF;border-radius:0 0 6px 6px;">
        <p style="margin:0 0 6px;font-size:18px;font-weight:900;color:#C0392B;">${h(label.fr)} — ${h(label.en)}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#2C3E50;">📍 ${h(where)} · 🕐 ${h(input.time)}${input.audience === 'TEAM' ? ` · 👤 ${h(input.triggeredBy)}` : ''}</p>
        <div style="background:#FDEDEC;border-left:6px solid #C0392B;padding:14px 16px;border-radius:4px;margin:0 0 16px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#2C3E50;">${h(action.fr)}</p>
          <p style="margin:0;font-size:13px;color:#6C757D;">${h(action.en)}</p>
        </div>
        ${silent ? `<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#C0392B;">Alerte silencieuse : ne la diffusez pas aux occupants. · Silent alert: do not broadcast it.</p>` : ''}
        ${caller ? `<div style="background:#1A1A1A;border-radius:6px;padding:14px 16px;margin:0 0 16px;"><p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#FFD700;">${h(caller.fr)}</p><p style="margin:0;font-size:12px;color:#ADB5BD;">${h(caller.en)}</p></div>` : ''}
        ${responseButtons}
        <a href="tel:911" style="display:block;text-align:center;background:#C0392B;color:#FFFFFF;padding:14px;border-radius:6px;text-decoration:none;font-size:18px;font-weight:900;">📞 911</a>
        <p style="color:#ADB5BD;font-size:11px;text-align:center;margin:16px 0 0;">CORO Sentinelle · ${h(where)}</p>
      </div>
    </div>`;

  return { sms, subject, html };
}
