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
    item('resilience', 'Indice CORO et résilience', 'CORO Index and resilience'),
    item('guides', 'Plans d’urgence', 'Emergency plans'),
    item('exercises', 'Exercices', 'Exercises'),
  ] },
  { id: 'respond', label: { fr: 'Réagir', en: 'Respond' }, items: [
    item('sentinelle', 'Registre et évacuation (Sentinelle)', 'Occupancy and evacuation (Sentinelle)'),
    item('incident', 'Incident et écrans d’urgence', 'Incidents and emergency screens'),
    item('sentinelle-population', 'Alerte à la population', 'Public alerts'),
    item('qr-intervention', 'QR Intervention', 'QR Response'),
  ] },
  { id: 'prove', label: { fr: 'Suivre et prouver', en: 'Track and prove' }, items: [
    item('sentinelle', 'Rapports de sécurité (CORO Report)', 'Security reports (CORO Report)', 'coro-report'),
    item('knowledge', 'CORO Knowledge', 'CORO Knowledge'), item('ai', 'CORO AI', 'CORO AI'),
    item('network', 'Network', 'Network'),
  ] },
  { id: 'advisors', label: { fr: 'Firmes-conseils', en: 'Consulting firms' }, items: [
    item('documents', 'Gestion documentaire', 'Document management'), item('projects', 'Projets et mandats', 'Projects and mandates'),
    item('performance', 'Performance', 'Performance'), item('client', 'Portail client', 'Client portal'),
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
