/**
 * Délais de première réponse du Centre d'aide, en heures ouvrables
 * (du lundi au vendredi, de 8 h 30 à 17 h, heure de Montréal).
 * Décision de Mathieu (24 nov. 2026) : bloquant 4 h, gênant 1 jour ouvrable,
 * mineur et suggestions 3 jours ouvrables. Les jours fériés ne sont pas retirés.
 */
export type SupportType = 'BUG' | 'QUESTION' | 'SUGGESTION' | 'ACCESS' | 'OTHER';
export type SupportImpact = 'BLOCKING' | 'DISRUPTIVE' | 'MINOR';

export const SUPPORT_TYPES: readonly SupportType[] = ['BUG', 'QUESTION', 'SUGGESTION', 'ACCESS', 'OTHER'];
export const SUPPORT_IMPACTS: readonly SupportImpact[] = ['BLOCKING', 'DISRUPTIVE', 'MINOR'];

const BUSINESS_TIME_ZONE = 'America/Toronto';
const DAY_START_MINUTE = 8 * 60 + 30;
const DAY_END_MINUTE = 17 * 60;
export const BUSINESS_DAY_MINUTES = DAY_END_MINUTE - DAY_START_MINUTE; // 510

/** Priorité : 1 bloquant, 2 gênant, 3 mineur. Une suggestion n'est jamais urgente. */
export function supportPriority(type: SupportType, impact: SupportImpact): 1 | 2 | 3 {
  if (type === 'SUGGESTION') return 3;
  return impact === 'BLOCKING' ? 1 : impact === 'DISRUPTIVE' ? 2 : 3;
}

export function firstResponseBusinessMinutes(priority: number): number {
  if (priority === 1) return 4 * 60;
  if (priority === 2) return BUSINESS_DAY_MINUTES;
  return 3 * BUSINESS_DAY_MINUTES;
}

export function firstResponseLabel(priority: number): string {
  if (priority === 1) return '4 heures ouvrables';
  if (priority === 2) return '1 jour ouvrable';
  return '3 jours ouvrables';
}

function localParts(date: Date): { weekday: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
  return { weekday, minute: Number(value('hour')) * 60 + Number(value('minute')) };
}

function isBusinessMinute(date: Date): boolean {
  const { weekday, minute } = localParts(date);
  return weekday >= 1 && weekday <= 5 && minute >= DAY_START_MINUTE && minute < DAY_END_MINUTE;
}

/** Ajoute des minutes ouvrables à `start`, par pas de 5 minutes (précision suffisante). */
export function addBusinessMinutes(start: Date, minutes: number): Date {
  const step = 5;
  const cursor = new Date(Math.ceil(start.getTime() / (step * 60_000)) * step * 60_000);
  let remaining = minutes;
  // Garde-fou : au plus 60 jours de recherche.
  for (let guard = 0; remaining > 0 && guard < (60 * 24 * 60) / step; guard += 1) {
    if (isBusinessMinute(cursor)) remaining -= step;
    cursor.setTime(cursor.getTime() + step * 60_000);
  }
  return cursor;
}

export function firstResponseDueAt(priority: number, createdAt = new Date()): Date {
  return addBusinessMinutes(createdAt, firstResponseBusinessMinutes(priority));
}

/** File destinataire : l'équipe CORO, sauf une question d'un client du portail (sa firme-conseil). */
export function supportQueue(channel: 'ADVISOR_APP' | 'CLIENT_PORTAL', type: SupportType): 'CORO' | 'ADVISOR' {
  if (channel === 'CLIENT_PORTAL' && (type === 'QUESTION' || type === 'OTHER')) return 'ADVISOR';
  return 'CORO';
}

export function ticketReference(number: number): string {
  return `CORO-${String(number).padStart(4, '0')}`;
}
