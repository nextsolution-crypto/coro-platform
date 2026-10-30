export type PlanningLoadScope = 'context' | 'month';

export function planningLoadError(scope: PlanningLoadScope, status?: number) {
  if (status === 401) return 'Votre session a expiré. Reconnectez-vous pour continuer.';
  if (status === 403) return 'Vous n’avez pas accès à ces données de planification.';
  if (status === 503)
    return `Le service ${scope === 'context' ? 'de contexte' : 'du calendrier mensuel'} est temporairement indisponible.`;
  return `Impossible de charger ${scope === 'context' ? 'les référentiels de planification' : 'les actions du mois'}.`;
}
