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
  /** Route d'outillage de développement : introuvable en production. */
  devOnly?: boolean;
}

export const ROUTE_REGISTRY: readonly RouteEntry[] = [
  // ── pilot (2) ──
  { pattern: '/dashboard', family: 'pilot', shell: 'app', status: 'ga', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/profile', family: 'pilot', shell: 'app', status: 'ga', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  // ── work (11) ──
  { pattern: '/activities/portfolio', family: 'work', shell: 'app', status: 'beta', styling: ['inline-hex'] },
  { pattern: '/dashboard/rendement', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/notifications', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['destructive'] },
  { pattern: '/planning', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'css-module'], sensitivity: ['destructive'] },
  { pattern: '/profile/rendement', family: 'work', shell: 'app', status: 'beta', styling: ['inline-hex'] },
  { pattern: '/projects', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/projects/[id]', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'documents'] },
  { pattern: '/projects/[id]/activities', family: 'work', shell: 'none', status: 'legacy-only', styling: ['inline-hex', 'tailwind', 'css-module'], sensitivity: ['destructive'] },
  { pattern: '/projects/[id]/mandate', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content'] },
  { pattern: '/projects/[id]/procedures', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content'] },
  { pattern: '/timelog', family: 'work', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  // ── portfolio (9) ──
  { pattern: '/bookings', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content'] },
  { pattern: '/buildings', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/buildings/[id]', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/buildings/compliance', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/buildings/map', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex'] },
  { pattern: '/clients', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/clients/[id]', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'] },
  { pattern: '/clients/[id]/portfolio', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/referrals', family: 'portfolio', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  // ── compliance (5) ──
  { pattern: '/configurator/[projectId]', family: 'compliance', shell: 'none', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['documents', 'emergency-content'] },
  { pattern: '/configurator/pca/[projectId]', family: 'compliance', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['documents', 'emergency-content'] },
  { pattern: '/editor/[projectId]', family: 'compliance', shell: 'none', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'documents', 'emergency-content'] },
  { pattern: '/editor/[projectId]/procedures/[procedureId]', family: 'compliance', shell: 'none', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'documents', 'emergency-content'] },
  { pattern: '/library', family: 'compliance', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['emergency-content'] },
  // ── admin (28) ──
  { pattern: '/admin/capacity', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'] },
  { pattern: '/admin/changelog', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'permissions'] },
  { pattern: '/admin/feedback', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['destructive', 'permissions'] },
  { pattern: '/admin/health', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['permissions', 'supervision'] },
  { pattern: '/admin/mandates', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'] },
  { pattern: '/admin/map', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['permissions'] },
  { pattern: '/admin/organizations', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/organizations/[organizationId]', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/organizations/[organizationId]/clients/[clientId]', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/procedures', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['emergency-content', 'permissions'] },
  { pattern: '/admin/procedures/[id]', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content', 'permissions'] },
  { pattern: '/admin/procedures/custom', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'emergency-content', 'permissions'] },
  { pattern: '/admin/projects', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['permissions'] },
  { pattern: '/admin/referrals', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['permissions'] },
  { pattern: '/admin/rex-reports', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex'], sensitivity: ['permissions'] },
  { pattern: '/admin/task-templates', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'permissions'] },
  { pattern: '/blog', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/blog/[id]/edit', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/blog/new', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings', family: 'admin', shell: 'app', status: 'beta', styling: ['inline-hex'] },
  { pattern: '/settings/activity-types', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings/feedback', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings/module1-template', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'] },
  { pattern: '/settings/organization', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['permissions'] },
  { pattern: '/settings/profile', family: 'admin', shell: 'none', status: 'legacy-only', styling: ['none'] },
  { pattern: '/settings/task-templates', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/settings/timelog-categories', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive'] },
  { pattern: '/settings/users', family: 'admin', shell: 'app', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['destructive', 'permissions'] },
  // ── super-admin (24) ──
  { pattern: '/admin/commercial', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/assumptions/cost', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/assumptions/value', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/clauses', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/configuration', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/configurator', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/content', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/contracts', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/dossier/[targetType]/[targetId]', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/entitlements', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/entitlements/[organizationId]', family: 'super-admin', shell: 'none', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/journey', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/legal-issuer', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/proposals', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/proposals/[proposalId]', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/proposals/new', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/prospects', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/reconciliation', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/commercial/simulator', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/control-center', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'supervision'] },
  { pattern: '/admin/metering', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'supervision'] },
  { pattern: '/admin/product-catalog', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/product-catalog/capabilities', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['permissions', 'financial-legal'] },
  { pattern: '/admin/product-catalog/price-books', family: 'super-admin', shell: 'app', status: 'legacy-only', styling: ['tailwind'], sensitivity: ['destructive', 'permissions', 'financial-legal'] },
  // ── auth (3) ──
  { pattern: '/', family: 'auth', shell: 'none', status: 'legacy-only', styling: ['none'] },
  { pattern: '/login', family: 'auth', shell: 'none', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['auth'] },
  { pattern: '/reset-password', family: 'auth', shell: 'none', status: 'legacy-only', styling: ['inline-hex', 'tailwind'], sensitivity: ['auth'] },
  // ── dev (1) ──
  { pattern: '/glass-kit', family: 'dev', shell: 'app', status: 'ga', styling: ['none'], devOnly: true },
];
