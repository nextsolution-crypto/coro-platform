/**
 * Registre des routes Liquid Glass — source de vérité de la migration progressive.
 *
 * Règles :
 *  - Toute route absente de ce registre est traitée comme « legacy-only » ET sans shell Glass :
 *    le document reste entièrement Legacy (aucun token, aucun fond Glass). Un nouvel écran ne
 *    passe donc jamais en Glass par accident.
 *  - 'legacy-only' + shell 'app' : le shell Glass (AppLayout) est actif, le contenu est enveloppé
 *    dans un îlot Legacy qui conserve son apparence claire (voir LegacyIsland).
 *  - 'beta' : rendu Glass UNIQUEMENT avec une activation explicite (voir theme-core.resolveBetaEnabled) :
 *      · développement : localStorage 'coro-glass-beta' = 'on', ou NEXT_PUBLIC_GLASS_BETA = '1' ;
 *      · production : désactivée par défaut ; seul NEXT_PUBLIC_GLASS_BETA = 'production-preview' (valeur exacte, au build)
 *        l'active. Le stockage local d'un utilisateur ne l'active jamais.
 *  - 'ga' : rendu Glass validé, accessible à tout utilisateur ayant choisi Glass.
 *  - 'island: false' : le shell Glass reste actif mais le contenu n'est PAS enveloppé (surface qui
 *    gère elle-même son apparence ou qui ne doit pas être enveloppée).
 *
 * Cohérence avec le code : route-registry.test.cjs compare ce fichier à l'analyse des imports
 * (route-scanner.cjs). Un écran ajouté, supprimé ou dont le shell/le style change fait échouer le test.
 * Ne changer un statut en 'ga' qu'après validation visuelle et fonctionnelle de l'écran.
 */

export type GlassStatus = 'legacy-only' | 'beta' | 'ga';
export type RouteShell = 'app' | 'none';
export type RouteFamily = 'pilot' | 'work' | 'portfolio' | 'compliance' | 'admin' | 'super-admin' | 'auth' | 'dev';
export type RouteStyling = 'inline-hex' | 'tailwind' | 'css-module' | 'none';
/** Nature sensible de l'écran : impose une validation distincte avant migration. */
export type RouteSensitivity =
  | 'documents' // produit ou prévisualise un document exporté (PDF)
  | 'emergency-content' // contenu de sécurité / d'urgence (alarme, évacuation, procédures)
  | 'permissions' // gestion des rôles, accès réservé ADMIN / SUPER_ADMIN
  | 'destructive' // contient une suppression (api.delete)
  | 'financial-legal' // contrats, tarifs, clauses, droits
  | 'supervision' // tableaux d'état de la plateforme
  | 'auth'; // authentification

export interface RouteEntry {
  /** Motif Next.js : segments dynamiques entre crochets, p. ex. '/projects/[id]/mandate'. */
  pattern: string;
  family: RouteFamily;
  /** 'app' : la page affiche AppLayout (shell). 'none' : plein écran / sans shell. */
  shell: RouteShell;
  status: GlassStatus;
  styling: RouteStyling[];
  sensitivity?: RouteSensitivity[];
  /** Défaut true. false : pas d'îlot Legacy autour du contenu (voir en-tête). */
  island?: boolean;
  /**
   * Génération V2 (mandat 49) : 'skin' = le contenu métier existant est conservé tel quel et reçoit l'identité Liquid Glass par
   * la couche de teinte (design-system/skin). Absent = écran Glass natif (dashboard, profil, settings, portefeuille).
   * Un écran 'skin' sans shell Glass (shell: 'none') s'affiche sur le canevas Glass seul (mode 'canvas').
   */
  render?: 'skin';
  /**
   * Tests automatisés dont le passage conditionne la migration d'une route sensible (clés de scripts npm de coro-frontend).
   * Obligatoire pour toute route sensible hors legacy-only (voir route-registry.test.cjs).
   */
  validation?: readonly string[];
  /** Route d'outillage de développement : introuvable en production. */
  devOnly?: boolean;
  /** Exception de sécurité documentée (décision Founder) : explique pourquoi une route sensible reste en l'état ; imprimée dans ROUTES.md. */
  exception?: string;
}

export const ROUTE_REGISTRY: readonly RouteEntry[] = [
  // ── pilot (2) ──
  { pattern: '/dashboard', family: 'pilot', shell: 'app', status: 'ga', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/profile', family: 'pilot', shell: 'app', status: 'ga', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  // ── work (11) ──
  { pattern: '/activities/portfolio', family: 'work', shell: 'app', status: 'beta', styling: ['inline-hex'] },
  { pattern: '/dashboard/rendement', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['financial-legal', 'permissions'], validation: ['test:rendement', 'test:skin', 'test:design-system'] },
  { pattern: '/notifications', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['destructive'] },
  { pattern: '/planning', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'css-module'], sensitivity: ['destructive'] },
  { pattern: '/profile/rendement', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], validation: ['test:rendement', 'test:skin'] },
  { pattern: '/projects', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/projects/[id]', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'documents'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/projects/[id]/activities', family: 'work', shell: 'none', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind', 'css-module'], sensitivity: ['destructive'] },
  { pattern: '/projects/[id]/mandate', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/projects/[id]/procedures', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/timelog', family: 'work', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  // ── portfolio (9) ──
  { pattern: '/bookings', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content'], validation: ['test:bookings', 'test:skin', 'test:design-system'] },
  { pattern: '/buildings', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/buildings/[id]', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/buildings/compliance', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/buildings/map', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'] },
  { pattern: '/clients', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/clients/[id]', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/clients/[id]/portfolio', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/referrals', family: 'portfolio', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  // ── compliance (5) ──
  { pattern: '/configurator/[projectId]', family: 'compliance', shell: 'none', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['documents', 'emergency-content'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/configurator/pca/[projectId]', family: 'compliance', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['documents', 'emergency-content'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/editor/[projectId]', family: 'compliance', shell: 'none', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'documents', 'emergency-content'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/editor/[projectId]/procedures/[procedureId]', family: 'compliance', shell: 'none', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'documents', 'emergency-content'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/library', family: 'compliance', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['emergency-content'], validation: ['test:skin', 'test:design-system'] },
  // ── admin (28) ──
  { pattern: '/admin/capacity', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/changelog', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/feedback', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['destructive', 'permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/health', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['permissions', 'supervision'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/mandates', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/map', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/organizations', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:organization360', 'test:organization-contracts', 'test:capability-entitlements', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/organizations/[organizationId]', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:organization360', 'test:organization-contracts', 'test:capability-entitlements', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/organizations/[organizationId]/clients/[clientId]', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:organization360', 'test:organization-contracts', 'test:capability-entitlements', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/procedures', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['emergency-content', 'permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/procedures/[id]', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content', 'permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/procedures/custom', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content', 'permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/projects', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/referrals', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/rex-reports', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/admin/task-templates', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/blog', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/blog/[id]/edit', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/blog/new', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings', family: 'admin', shell: 'app', status: 'beta', styling: ['inline-hex'] },
  { pattern: '/settings/activity-types', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings/feedback', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings/module1-template', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings/organization', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'], validation: ['test:skin', 'test:design-system'] },
  { pattern: '/settings/profile', family: 'admin', shell: 'none', status: 'beta', render: 'skin', styling: ['none'] },
  { pattern: '/settings/task-templates', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/settings/timelog-categories', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/settings/users', family: 'admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'permissions'], validation: ['test:skin', 'test:design-system'] },
  // ── super-admin (25) ──
  { pattern: '/admin/commercial', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/assumptions/cost', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-assumptions', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/assumptions/value', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-assumptions', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/clauses', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-clauses', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/configuration', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/configurator', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-configurator', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/content', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-content', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/contracts', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:organization-contracts', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/dossier/[targetType]/[targetId]', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/entitlements', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:capability-entitlements', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/entitlements/[organizationId]', family: 'super-admin', shell: 'none', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:capability-entitlements', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/journey', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/legal-issuer', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-legal-issuer', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/proposals', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-proposals', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/proposals/[proposalId]', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-proposals', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/proposals/new', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-proposals', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/prospects', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/reconciliation', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/commercial/simulator', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-contracts', 'test:commercial-simulator', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/control-center', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'supervision'], validation: ['test:control-center', 'test:skin', 'test:design-system'] },
  {
    pattern: '/admin/platform-permission-grants', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind', 'css-module'], sensitivity: ['financial-legal', 'permissions'], validation: ['test:platform-permission-grants', 'test:skin', 'test:design-system'],
  },
  { pattern: '/admin/metering', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'supervision'], validation: ['test:metering', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/product-catalog', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-catalog', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/product-catalog/capabilities', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'], validation: ['test:commercial-catalog', 'test:skin', 'test:design-system'] },
  { pattern: '/admin/product-catalog/price-books', family: 'super-admin', shell: 'app', status: 'beta', render: 'skin', styling: ['tailwind'], sensitivity: ['destructive', 'permissions', 'financial-legal'], validation: ['test:commercial-catalog', 'test:skin', 'test:design-system'] },
  // ── auth (3) ──
  { pattern: '/', family: 'auth', shell: 'none', status: 'beta', render: 'skin', styling: ['none'] },
  { pattern: '/login', family: 'auth', shell: 'none', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['auth'], validation: ['test:auth-hydration', 'test:skin', 'test:design-system'] },
  { pattern: '/reset-password', family: 'auth', shell: 'none', status: 'beta', render: 'skin', styling: ['inline-hex', 'tailwind'], sensitivity: ['auth'], validation: ['test:auth-hydration', 'test:skin', 'test:design-system'] },
  // ── dev (1) ──
  { pattern: '/glass-kit', family: 'dev', shell: 'app', status: 'ga', styling: ['none'], devOnly: true },
];
