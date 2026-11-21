/**
 * Limites de taille des corps de requête (audit M3-07).
 *
 * Avant : 250 Mo acceptés sur toutes les routes, publiques comprises :
 * quelques requêtes suffisaient à saturer la mémoire du serveur.
 *
 * - Routes publiques ou sans fichier : 1 Mo.
 * - Pointages et occupation (import d'employés compris) : 10 Mo.
 * - Routes authentifiées qui reçoivent des fichiers en base64 (plans,
 *   photos, pièces jointes, PDF) : 50 Mo — le plus gros fichier accepté par
 *   un service est un plan de 25 Mo, soit ~34 Mo en base64.
 * Les limites plus strictes déjà en place (chat, webhook SMS) restent
 * appliquées avant celles-ci.
 */
export const SMALL_BODY_LIMIT = '1mb';
export const OCCUPANCY_BODY_LIMIT = '10mb';
export const UPLOAD_BODY_LIMIT = '50mb';

/** Premier segment après /api pour lequel 1 Mo suffit. */
export const SMALL_BODY_PREFIXES = [
  'auth',
  'client-auth',
  'population',
  'display-public',
  'device-gateway',
  'qr',
  'public-knowledge',
  'referrals',
  'feedback',
  'changelog',
  'internal',
  'notifications',
  'timelog',
  'planning',
  'rendement',
  'work-schedules',
  'task-templates',
  'task-lists',
  'activity-types',
  'advisor-cost-rates',
  'audit',
  'dangerous-substances',
  'language-check',
  'webhooks',
  'chat',
] as const;

export const OCCUPANCY_BODY_PREFIXES = ['occupancy'] as const;

export function bodyLimitForPath(path: string): string {
  const segment = (path.split('?')[0].replace(/^\/+/, '').split('/')[0] === 'api'
    ? path.split('?')[0].replace(/^\/+/, '').split('/')[1]
    : path.split('?')[0].replace(/^\/+/, '').split('/')[0]) ?? '';
  if ((SMALL_BODY_PREFIXES as readonly string[]).includes(segment)) return SMALL_BODY_LIMIT;
  if ((OCCUPANCY_BODY_PREFIXES as readonly string[]).includes(segment)) return OCCUPANCY_BODY_LIMIT;
  return UPLOAD_BODY_LIMIT;
}
