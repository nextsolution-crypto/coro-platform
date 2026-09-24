import type { Locale } from './locale.ts';
import { localizedHref } from './locale.ts';
import { getRoute } from './routes.ts';

type Label = Record<Locale, string>;
export type NavigationItem = { id: string; label: Label; href?: string; external?: boolean };
export type NavigationGroup = { id: string; label: Label; items: readonly NavigationItem[] };

const item = (id: string, fr: string, en: string): NavigationItem => {
  const route = getRoute(id);
  return { id, label: { fr, en }, href: route?.implemented ? route.path : undefined };
};

export const navigationGroups: readonly NavigationGroup[] = [
  { id: 'platform', label: { fr: 'Plateforme', en: 'Platform' }, items: [
    item('platform-overview', "Vue d’ensemble", 'Overview'), item('coro-platform', 'CORO Platform', 'CORO Platform'),
    item('documents', 'Documents', 'Documents'), item('projects', 'Projects', 'Projects'),
    item('performance', 'Performance', 'Performance'), item('client', 'Client', 'Client'),
    item('security', 'Sécurité & hébergement', 'Security & hosting'),
  ] },
  { id: 'resilience', label: { fr: 'Résilience & opérations', en: 'Resilience & operations' }, items: [
    item('resilience-operations', "Vue d’ensemble", 'Overview'), item('resilience', 'Résilience / Indice CORO', 'Resilience / CORO Index'),
    item('sentinelle', 'Sentinelle', 'Sentinelle'), item('incident', 'Incident', 'Incident'),
    item('exercises', 'Exercices', 'Exercises'), item('ops', 'Ops', 'Ops'), item('qr-intervention', 'QR Intervention', 'QR Response'),
  ] },
  { id: 'intelligence', label: { fr: 'Intelligence', en: 'Intelligence' }, items: [
    item('knowledge', 'Knowledge', 'Knowledge'), item('ai', 'AI', 'AI'), item('network', 'Network', 'Network'),
  ] },
  { id: 'solutions', label: { fr: 'Solutions', en: 'Solutions' }, items: [
    item('sentinelle-population', 'Sentinelle Population', 'Sentinelle Population'),
    item('campus', 'Campus', 'Campus'), item('multi-site', 'Multi-sites', 'Multi-site'),
  ] },
  { id: 'resources', label: { fr: 'Ressources', en: 'Resources' }, items: [
    item('resources', 'Centre de ressources', 'Resource centre'), item('blog', 'Blogue', 'Blog'),
    item('guides', 'Guides', 'Guides'), item('compliance-resources', 'Conformité & réglementation', 'Compliance & regulations'),
  ] },
];

export function visibleNavigation(locale: Locale) {
  return navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((entry) => entry.href).map((entry) => ({ ...entry, href: localizedHref(entry.href!, locale) })) }))
    .filter((group) => group.items.length > 0);
}
