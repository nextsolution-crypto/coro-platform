import type { Locale } from './locale.ts';
import { localizedHref } from './locale.ts';
import { getRoute } from './routes.ts';

type Label = Record<Locale, string>;
export type NavigationItem = { id: string; label: Label; href?: string; external?: boolean };
export type NavigationGroup = { id: string; label: Label; items: readonly NavigationItem[] };

const item = (id: string, fr: string, en: string, anchor?: string): NavigationItem => {
  const route = getRoute(id);
  return { id, label: { fr, en }, href: route?.implemented ? `${route.path}${anchor ? `#${anchor}` : ''}` : undefined };
};

/**
 * Menu organisé par moment (se préparer, réagir, suivre et prouver) pour les gestionnaires de bâtiments,
 * plus un menu dédié aux firmes-conseils. Les adresses des pages ne changent pas.
 */
export const navigationGroups: readonly NavigationGroup[] = [
  { id: 'prepare', label: { fr: 'Se préparer', en: 'Prepare' }, items: [
    item('resilience', 'Résilience opérationnelle (Indice CORO)', 'Operational resilience (CORO Index)'),
    item('guides', 'Plans d’urgence', 'Emergency plans'),
    item('exercises', 'Exercices', 'Exercises'),
  ] },
  { id: 'respond', label: { fr: 'Réagir', en: 'Respond' }, items: [
    item('sentinelle', 'Registre et évacuation (CORO Sentinelle)', 'Occupancy and evacuation (CORO Sentinelle)'),
    item('incident', 'Incident (CORO Incident)', 'Incidents (CORO Incident)'),
    item('incident', 'Écrans d’urgence (CORO Display)', 'Emergency screens (CORO Display)', 'coro-display'),
    item('sentinelle-population', 'Alerte à la population (CORO Sentinelle Population)', 'Public alerts (CORO Sentinelle Population)'),
    item('qr-intervention', 'QR Intervention', 'QR Response'),
  ] },
  { id: 'prove', label: { fr: 'Suivre et prouver', en: 'Track and prove' }, items: [
    item('client', 'Portail client (CORO Client)', 'Client portal (CORO Client)'),
    item('sentinelle', 'Rapports de sécurité (CORO Report)', 'Security reports (CORO Report)', 'coro-report'),
    item('knowledge', 'CORO Knowledge', 'CORO Knowledge'), item('ai', 'CORO AI', 'CORO AI'),
    item('network', 'Network', 'Network'),
  ] },
  { id: 'advisors', label: { fr: 'Firmes-conseils', en: 'Consulting firms' }, items: [
    item('documents', 'Gestion documentaire (CORO Documents)', 'Document management (CORO Documents)'), item('projects', 'Projets et mandats (CORO Projects)', 'Projects and mandates (CORO Projects)'),
    item('performance', 'Performance (CORO Performance)', 'Performance (CORO Performance)'),
  ] },
  { id: 'resources', label: { fr: 'Ressources', en: 'Resources' }, items: [
    item('resources', 'Centre de ressources', 'Resource centre'), item('blog', 'Blogue', 'Blog'),
    item('diagnostic', 'Évaluer ma préparation', 'Assess my preparedness'),
    item('security', 'Sécurité et hébergement', 'Security and hosting'),
    item('compliance-resources', 'Conformité et réglementation', 'Compliance and regulations'),
  ] },
];

export function visibleNavigation(locale: Locale) {
  return navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((entry) => entry.href).map((entry) => ({ ...entry, href: localizedHref(entry.href!, locale) })) }))
    .filter((group) => group.items.length > 0);
}
