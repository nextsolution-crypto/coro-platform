import type { PlannerEvent } from './types';

export function eventLabel(event: PlannerEvent): string {
  if (event.source === 'USER_UNAVAILABILITY') return 'Indisponible';
  if (event.status === 'BUSY') return 'Occupé';
  return event.label;
}

export function eventForUser(event: PlannerEvent, userId: string): PlannerEvent {
  if (event.source !== 'BOOKING' || event.status === 'REQUESTED' || event.status === 'BUSY') return event;
  const assignment = event.assignments?.find(item => item.userId === userId);
  if (!assignment) return event;
  return { ...event, status: assignment.status === 'PENDING' ? 'PROVISIONAL' : 'CONFIRMED' };
}

export function eventStatus(event: PlannerEvent): string {
  if (event.source === 'USER_UNAVAILABILITY') return 'Indisponible';
  if (event.source === 'LEGACY_ACTIVITY') return 'Legacy · provisoire';
  if (event.status === 'BUSY') return 'Occupé';
  if (event.status === 'REQUESTED') return 'Demande · non confirmée';
  if (event.status === 'PROVISIONAL') return 'Proposition en attente';
  if (event.bookingStatus === 'REPORTEE') return 'Reportée · planifiée';
  if (event.bookingStatus === 'REASSIGNEE') return 'Réaffectée · active';
  return 'Confirmée';
}

export function planningErrorMessage(status?: number): string {
  return status === 400
    ? 'Projection trop large ou filtre invalide. Réduisez la période ou appliquez un filtre conseiller, client ou bâtiment.'
    : 'Impossible de charger la planification. Réessayez dans un instant.';
}
