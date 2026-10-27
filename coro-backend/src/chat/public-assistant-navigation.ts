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
};

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
