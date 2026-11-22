import { Injectable } from '@nestjs/common';
import type {
  PublicAssistantLanguage,
  PublicAssistantSuggestedLink,
} from './public-assistant.types';

type RouteDefinition = {
  path: string;
  fr: string;
  en: string;
};

const ROUTES: Record<string, RouteDefinition> = {
  home: { path: '/', fr: 'Découvrir CORO', en: 'Discover CORO' },
  knowledge: {
    path: '/coro-knowledge',
    fr: 'Découvrir CORO Knowledge',
    en: 'Discover CORO Knowledge',
  },
  ai: { path: '/coro-ai', fr: 'Comprendre CORO AI', en: 'Explore CORO AI' },
  documents: {
    path: '/gestion-documentaire',
    fr: 'Documents de conformité',
    en: 'Compliance documents',
  },
  sentinelle: {
    path: '/sentinelle',
    fr: 'Découvrir CORO Sentinelle',
    en: 'Discover CORO Sentinelle',
  },
  incident: {
    path: '/coro-incident',
    fr: 'Découvrir CORO Incident',
    en: 'Discover CORO Incident',
  },
  population: {
    path: '/sentinelle-population',
    fr: 'Découvrir Sentinelle Population',
    en: 'Discover Sentinelle Population',
  },
  portal: {
    path: '/portail-client',
    fr: 'Explorer le portail client',
    en: 'Explore the Client Portal',
  },
  resilience: {
    path: '/resilience-operationnelle',
    fr: 'Résilience opérationnelle',
    en: 'Operational resilience',
  },
  pricing: { path: '/pricing', fr: 'Voir la tarification', en: 'View pricing' },
  security: { path: '/security', fr: 'Sécurité CORO', en: 'CORO security' },
  blog: { path: '/blog', fr: 'Consulter le blogue', en: 'Read the blog' },
  contact: { path: '/contact', fr: 'Contacter CORO', en: 'Contact CORO' },
  projects: { path: '/gestion-de-projets', fr: 'Gestion de projets et de mandats', en: 'Project and mandate management' },
  performance: { path: '/performance-objectifs', fr: 'Performance et capacité', en: 'Performance and capacity' },
  about: { path: '/about', fr: 'À propos de CORO', en: 'About CORO' },
  privacy: { path: '/privacy', fr: 'Politique de confidentialité', en: 'Privacy policy' },
  terms: { path: '/terms', fr: 'Conditions d’utilisation', en: 'Terms of use' },
  partners: { path: '/partners', fr: 'Partenaires', en: 'Partners' },
  referral: { path: '/programme-recommandation', fr: 'Programme de recommandation', en: 'Referral program' },
  guides: { path: '/guides', fr: 'Guides', en: 'Guides' },
  diagnostic: { path: '/diagnostic', fr: 'Diagnostic de préparation', en: 'Readiness diagnostic' },
  pmu: { path: '/documents/plan-mesures-urgence-pmu', fr: 'Plan de mesures d’urgence (PMU)', en: 'Emergency measures plan (PMU)' },
  psi: { path: '/documents/plan-securite-incendie-psi', fr: 'Plan de sécurité incendie (PSI)', en: 'Fire safety plan (PSI)' },
  pca: { path: '/documents/plan-continuite-activites-pca', fr: 'Plan de continuité des activités (PCA)', en: 'Business continuity plan (PCA)' },
  pgc: { path: '/documents/plan-gestion-crise-pgc', fr: 'Plan de gestion de crise (PGC)', en: 'Crisis management plan (PGC)' },
  pra: { path: '/documents/plan-reprise-activites-pra', fr: 'Plan de reprise des activités (PRA)', en: 'Disaster recovery plan (PRA)' },
  pue: { path: '/documents/plan-urgence-environnementale-pue', fr: 'Plan d’urgence environnementale (PUE)', en: 'Environmental emergency plan (PUE)' },
};

/** Clés de navigation proposables par l'assistant. */
export const PUBLIC_ROUTE_KEYS = Object.keys(ROUTES);

@Injectable()
export class PublicAssistantNavigationRegistry {
  normalizePagePath(value?: string): string | undefined {
    if (!value || !value.startsWith('/') || value.includes('://')) return;
    const path =
      value
        .split('?')[0]
        .replace(/\/{2,}/g, '/')
        .replace(/\/$/, '') || '/';
    return Object.values(ROUTES).some(
      (route) =>
        route.path === path ||
        (route.path === '/blog' && path.startsWith('/blog/')),
    )
      ? path
      : undefined;
  }

  links(
    keys: string[],
    language: PublicAssistantLanguage,
  ): PublicAssistantSuggestedLink[] {
    return [...new Set(keys)]
      .map((key) => ROUTES[key])
      .filter((route): route is RouteDefinition => Boolean(route))
      .slice(0, 3)
      .map((route) => ({
        label: language === 'fr-CA' ? route.fr : route.en,
        url: `${route.path}${language === 'en-CA' ? '?lang=en' : ''}`,
      }));
  }

  routeKeyForUrl(value: string): string | undefined {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return;
    }
    return Object.entries(ROUTES).find(([, route]) =>
      route.path === '/blog'
        ? url.pathname.startsWith('/blog/')
        : route.path === url.pathname,
    )?.[0];
  }
}
