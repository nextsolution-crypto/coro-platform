import type { Locale } from '@/lib/site/locale';

/**
 * Business information and destinations for the candidate V2 footer.
 * Every value is copied from the production footers and institutional pages (app/components/Footer.tsx, components/site/SiteFooter.tsx,
 * app/privacy, app/terms, app/contact); nothing here is invented. A test compares these values with production so drift is detected.
 */
export const business = {
  name: 'CORO',
  neq: '2282543935',
  address: ['2879 Boul. Pierre-Bernard', 'Montréal (QC), H1L 4R2', 'Canada'],
  email: 'info@getcoro.io',
  phone: '+1 (514) 791-7871',
  phoneHref: 'tel:+15147917871',
  year: 2026,
} as const;

/** The two known production login destinations. No other portal exists. */
export const access = {
  platform: 'https://app.getcoro.io/login',
  client: 'https://client.getcoro.io/login',
} as const;

type Label = Record<Locale, string>;
export type FooterLink = { path: string; label: Label; fr: boolean; en: boolean };
export type FooterGroup = { id: string; label: Label; links: readonly FooterLink[] };

/** Only implemented public routes (lib/site/routes.ts). `fr` / `en` mirror the route's locale availability. */
export const footerGroups: readonly FooterGroup[] = [
  { id: 'resilience', label: { fr: 'Bâtiments et urgences', en: 'Buildings and emergencies' }, links: [
    { path: '/resilience-operationnelle', label: { fr: 'Résilience opérationnelle (Indice CORO)', en: 'Operational resilience (CORO Index)' }, fr: true, en: true },
    { path: '/sentinelle', label: { fr: 'Registre et évacuation (CORO Sentinelle)', en: 'Occupancy and evacuation (CORO Sentinelle)' }, fr: true, en: true },
    { path: '/coro-incident', label: { fr: 'Incident et écrans (CORO Incident, CORO Display)', en: 'Incidents and screens (CORO Incident, CORO Display)' }, fr: true, en: true },
    { path: '/sentinelle-population', label: { fr: 'Alerte à la population (CORO Sentinelle Population)', en: 'Public alerts (CORO Sentinelle Population)' }, fr: true, en: true },
    { path: '/portail-client', label: { fr: 'Portail client (CORO Client)', en: 'Client portal (CORO Client)' }, fr: true, en: true },
    { path: '/coro-ai', label: { fr: 'CORO AI', en: 'CORO AI' }, fr: true, en: true },
  ] },
  { id: 'platform', label: { fr: 'Firmes-conseils', en: 'Consulting firms' }, links: [
    { path: '/gestion-documentaire', label: { fr: 'Gestion documentaire (CORO Documents)', en: 'Document management (CORO Documents)' }, fr: true, en: true },
    { path: '/gestion-de-projets', label: { fr: 'Projets et mandats (CORO Projects)', en: 'Projects and mandates (CORO Projects)' }, fr: true, en: true },
    { path: '/performance-objectifs', label: { fr: 'Performance (CORO Performance)', en: 'Performance (CORO Performance)' }, fr: true, en: true },
    { path: '/guides', label: { fr: 'Plans d’urgence', en: 'Emergency plans' }, fr: true, en: false },
    { path: '/pricing', label: { fr: 'Tarification', en: 'Pricing' }, fr: true, en: true },
  ] },
  { id: 'company', label: { fr: 'Entreprise', en: 'Company' }, links: [
    { path: '/about', label: { fr: 'À propos', en: 'About' }, fr: true, en: true },
    { path: '/security', label: { fr: 'Sécurité et hébergement', en: 'Security and hosting' }, fr: true, en: true },
    { path: '/partners', label: { fr: 'Partenaires', en: 'Partners' }, fr: true, en: true },
    { path: '/programme-recommandation', label: { fr: 'Programme de recommandation', en: 'Referral program' }, fr: true, en: true },
    { path: '/blog', label: { fr: 'Blogue', en: 'Blog' }, fr: true, en: true },
    { path: '/diagnostic', label: { fr: 'Diagnostic Express', en: 'Express Diagnostic' }, fr: true, en: true },
    { path: '/contact', label: { fr: 'Contact', en: 'Contact' }, fr: true, en: true },
  ] },
  { id: 'legal', label: { fr: 'Légal', en: 'Legal' }, links: [
    { path: '/privacy', label: { fr: 'Politique de confidentialité', en: 'Privacy policy' }, fr: true, en: true },
    { path: '/terms', label: { fr: 'Conditions d’utilisation', en: 'Terms of service' }, fr: true, en: true },
    { path: '/sms-terms', label: { fr: 'Conditions SMS', en: 'SMS terms' }, fr: true, en: true },
  ] },
];

export const footerCopy = {
  fr: {
    tagline: 'Conformité opérationnelle et résilience organisationnelle.',
    nav: 'Liens du pied de page', access: 'Accès',
    platform: ['CORO Platform', 'Connexion conseiller'], client: ['CORO Client', 'Portail client'],
    external: '(site externe)', rights: 'Tous droits réservés.', neq: 'NEQ', contact: 'Coordonnées', switchTo: 'English', switchLabel: 'View this page in English',
  },
  en: {
    tagline: 'Operational compliance and organizational resilience.',
    nav: 'Footer links', access: 'Access',
    platform: ['CORO Platform', 'Advisor login'], client: ['CORO Client', 'Client portal'],
    external: '(external site)', rights: 'All rights reserved.', neq: 'NEQ', contact: 'Contact details', switchTo: 'Français', switchLabel: 'Voir cette page en français',
  },
} as const;
