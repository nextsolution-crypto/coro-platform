import type { Locale } from './locale.ts';

/**
 * Repère affiché en haut des pages produit : à quel moment la fonction sert, et pour qui.
 * Une seule table pour tout le site ; une page absente de la table n'affiche rien.
 */
type Label = Record<Locale, string>;
export type PageContext = { moment: Label; audience: Label };

const ctx = (momentFr: string, momentEn: string, audienceFr: string, audienceEn: string): PageContext => ({
  moment: { fr: momentFr, en: momentEn },
  audience: { fr: audienceFr, en: audienceEn },
});

const BUILDINGS = ['Gestionnaires de bâtiments et équipes de sécurité', 'Building managers and security teams'] as const;
const ADVISORS = ['Firmes-conseils en mesures d’urgence', 'Emergency management consulting firms'] as const;
const PLANS = ctx('Avant l’urgence', 'Before an emergency', 'Gestionnaires de bâtiments et firmes-conseils', 'Building managers and consulting firms');

export const pageContexts: Readonly<Record<string, PageContext>> = {
  '/sentinelle': ctx('Au quotidien et pendant l’urgence', 'Every day and during an emergency', ...BUILDINGS),
  '/coro-incident': ctx('Pendant et après l’urgence', 'During and after an emergency', ...BUILDINGS),
  '/sentinelle-population': ctx('Avant et pendant l’urgence', 'Before and during an emergency', 'Installations industrielles', 'Industrial facilities'),
  '/resilience-operationnelle': ctx('Avant et après l’urgence', 'Before and after an emergency', 'Gestionnaires et directions', 'Managers and leadership'),
  '/gestion-documentaire': ctx('Avant l’urgence', 'Before an emergency', ...ADVISORS),
  '/gestion-de-projets': ctx('Au quotidien', 'Every day', ...ADVISORS),
  '/performance-objectifs': ctx('Au quotidien', 'Every day', ...ADVISORS),
  '/portail-client': ctx('Avant, pendant et après l’urgence', 'Before, during and after an emergency', 'Gestionnaires de bâtiments et entreprises clientes', 'Building managers and client organizations'),
  '/coro-knowledge': ctx('Avant, pendant et après l’urgence', 'Before, during and after an emergency', 'Firmes-conseils et gestionnaires de bâtiments', 'Consulting firms and building managers'),
  '/coro-ai': ctx('Avant, pendant et après l’urgence', 'Before, during and after an emergency', 'Firmes-conseils et gestionnaires de bâtiments', 'Consulting firms and building managers'),
  '/guides': PLANS,
  '/documents/plan-mesures-urgence-pmu': PLANS,
  '/documents/plan-securite-incendie-psi': PLANS,
  '/documents/plan-continuite-activites-pca': PLANS,
  '/documents/plan-gestion-crise-pgc': PLANS,
  '/documents/plan-reprise-activites-pra': PLANS,
  '/documents/plan-urgence-environnementale-pue': PLANS,
};

export const pageContextLabels = {
  fr: { region: 'Repère', moment: 'Moment', audience: 'Pour' },
  en: { region: 'At a glance', moment: 'When', audience: 'For' },
} as const;
