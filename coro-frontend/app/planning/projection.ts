import type { PlannerEvent } from './types';

export function eventLabel(event: PlannerEvent): string {
  if (event.source === 'USER_UNAVAILABILITY') return 'Indisponible';
  if (event.status === 'BUSY') return 'Occupé';
  return event.label;
}

// Format commun à tous les conseillers : « 09 h 30 · Client · Adresse · Activité ».
// L'adresse est raccourcie au numéro et à la rue (avant la première virgule).
export function eventSummaryParts(event: PlannerEvent): string[] {
  if (event.source === 'USER_UNAVAILABILITY' || event.status === 'BUSY') return [eventLabel(event)];
  const parts = (event.buildingAddress || event.buildingName || '').split(',').map(part => part.trim()).filter(Boolean);
  // « 525, boulevard X, Montréal » → « 525 boulevard X » : le numéro seul ne dit rien.
  const place = parts.length > 1 && /^\d+[a-z]?$/i.test(parts[0]) ? `${parts[0]} ${parts[1]}` : parts[0] ?? '';
  return [event.clientName, place, eventLabel(event)].filter((part): part is string => !!part && part.trim().length > 0);
}

export function eventSummary(event: PlannerEvent, clock: string): string {
  return [clock, ...eventSummaryParts(event)].join(' · ');
}

export function eventForUser(event: PlannerEvent, userId: string): PlannerEvent {
  if (event.source !== 'BOOKING' || event.status === 'REQUESTED' || event.status === 'BUSY') return event;
  const assignment = event.assignments?.find(item => item.userId === userId);
  if (!assignment) return event;
  return { ...event, status: assignment.status === 'PENDING' ? 'PROVISIONAL' : 'CONFIRMED' };
}

export function eventStatus(event: PlannerEvent): string {
  if (event.source === 'USER_UNAVAILABILITY') return 'Indisponible';
  if (event.source === 'LEGACY_ACTIVITY') return 'Date prévue · à confirmer';
  if (event.status === 'BUSY') return 'Occupé';
  if (event.status === 'REQUESTED') return 'Demande · non confirmée';
  if (event.status === 'PROVISIONAL') return 'En attente de votre confirmation';
  if (event.bookingStatus === 'REPORTEE') return 'Reportée · planifiée';
  if (event.bookingStatus === 'REASSIGNEE') return 'Réaffectée · active';
  return 'Confirmée';
}

export function planningErrorMessage(status?: number): string {
  return status === 400
    ? 'Projection trop large ou filtre invalide. Réduisez la période ou appliquez un filtre conseiller, client ou bâtiment.'
    : 'Impossible de charger la planification. Réessayez dans un instant.';
}
