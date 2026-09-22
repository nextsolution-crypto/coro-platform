// Toutes les valeurs retournées sont en heures. Booking.duration est en minutes.
const CATALOG_HOURS: Record<string, number> = {
  creation_document: 0,
  formation_equipe_urgence: 3,
  formation_equipe_urgence_exercice: 3.5,
  formation_travail_chaud: 2,
  formation_coordonnateur: 2,
  formation_epi: 2,
  formation_communication: 2,
  formation_comportement: 2,
  formation_locataires: 1,
  exercice_table: 2,
  exercice_evacuation: 3,
};

export function parseActivityDurationHours(value: string | null | undefined): number | null {
  if (!value) return null;
  // Pour une fourchette, retenir la borne haute afin de ne pas sous-estimer la charge.
  const matches = [...value.matchAll(/(\d+)(?:\s*h\s*(\d{1,2}))?/gi)];
  if (!matches.length) return null;
  const hours = matches.map(match => Number(match[1]) + Number(match[2] || 0) / 60);
  return Math.max(...hours);
}

export function effectiveActivityHours(activity: {
  type: string;
  duration?: string | null;
  dureeHeures?: number | null;
}, booking?: { duration: number } | null): number {
  if (booking && Number.isFinite(booking.duration) && booking.duration > 0) return booking.duration / 60;
  if (activity.dureeHeures !== null && activity.dureeHeures !== undefined &&
      Number.isFinite(activity.dureeHeures) && activity.dureeHeures >= 0) return activity.dureeHeures;
  return parseActivityDurationHours(activity.duration) ?? CATALOG_HOURS[activity.type] ?? 2;
}
