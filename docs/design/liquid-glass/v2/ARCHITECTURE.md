# Liquid Glass V2 — architecture de la migration complète

Mandat **CORO-LIQUID-GLASS-V2-FULL-APPLICATION-AND-CLIENT-PORTAL-MIGRATION-49**. Base : `main` `ad9f86e2` + point de contrôle de la barre latérale `56dcb5a1`.
Périmètre : application CORO (`coro-frontend`) et portail client (`coro-client-portal`). Le site vitrine `coro-website` est **strictement exclu** : aucun fichier n'y est touché.

## 1. Principe : re-teinter, ne pas réécrire

Les écrans métier existants (≈ 120 routes, ≈ 7 000 couleurs en ligne) ne sont **pas** réécrits. Une *couche de teinte* (« skin ») leur donne l'identité Liquid Glass
(clair, sombre, système) en remplaçant, uniquement quand le Glass est actif, les couleurs Legacy par les jetons `--cg-*`. Les composants métier, les appels d'API,
les rôles, les permissions, les calculs et les confirmations ne sont pas modifiés. Les écrans pilotes déjà natifs (`/dashboard`, `/profile`, `/settings`,
`/activities/portfolio`) restent natifs.

## 2. Modes de rendu d'une route

| Mode | Quand | Rendu |
|---|---|---|
| `legacy` | préférence Classique, route inconnue, bêta inactive | Document 100 % Classique : aucun jeton, aucune feuille supplémentaire. |
| `island` | route non activée, shell Glass actif (application) | Shell Glass + contenu Classique clair dans l'îlot. |
| `glass` | route Glass native (pilotes) | Écran réécrit pour le Glass. |
| `skin` | route `render: 'skin'` activée, avec shell Glass (application) | Shell Glass + contenu métier existant re-teinté. |
| `canvas` | route `render: 'skin'` activée **sans** shell (plein écran, authentification, portail) | Canevas Glass + contenu re-teinté. |

`<html data-ui data-theme data-cg-mode>` reflète l'état. Le script anti-flash, le registre (`design-system/routes`) et le magasin de thème partagent la même table de routes.

## 3. Activation et sécurité de déploiement

* **Classique reste le défaut.** Le choix Glass est une préférence locale à l'appareil (section « Apparence » de `/profile`, et du profil du portail en préproduction).
* Les routes migrées V2 sont **bêta** : elles ne rendent du Glass que si le build porte le jeton exact `NEXT_PUBLIC_GLASS_BETA=production-preview`.
  Ni `1`, ni `true`, ni le stockage local d'un utilisateur ne l'active en production. Un build de production *sans* jeton est donc inchangé (îlot Legacy / Classique).
* Aucune route sensible n'est `ga`. Une route sensible n'est `bêta` que si elle est `render: 'skin'` **et** porte une liste `validation` de scripts de test existants
  (`route-registry.test.cjs`). L'exception de sécurité `/admin/platform-permission-grants` reste **legacy-only** (décision Founder distincte requise).
* `/glass-kit` (outil de développement) reste absent d'un build de production.

## 4. La couche de teinte

* **Source de vérité** : `design-system/skin/skin-map.cjs` (rôles : surface, remplissages, états succès/alerte/danger/info/violet, marine ; textes ; bordures) et
  `design-system/tools/build-skin.cjs`, qui génère `public/glass-skin.<hash>.css` (≈ 210 Ko, ≈ 16 Ko gzippé) pour les **deux** applications.
* **Portée** : chaque règle est scopée à `:root[data-ui="glass"]:is([data-cg-mode="skin"],[data-cg-mode="canvas"])`. Aucune règle globale.
* **Chargement paresseux** : la feuille n'est liée au document que sur une route `skin`/`canvas` (`skin-loader.ts`), retirée à la sortie ; jamais en Classique.
  La page reste masquée tant qu'elle n'est pas chargée (pas de flash illisible).
* **Mécanisme** : sélecteurs d'attributs sur les styles en ligne (hex serveur et `rgb()` navigateur), classes Tailwind de couleur, replis `var(--cg-skin-…, #hex)` dans les
  modules CSS (codemod `tokenize-css.cjs`, **identique au Classique** hors Glass : 0 écart de style calculé au banc). Les couleurs hex absentes de la carte sont classées
  automatiquement par teinte et luminance.
* **Pas d'effet d'empilement** : la teinte ne définit jamais `transform`, `filter`, `backdrop-filter`, `position`, `z-index`, `overflow`… (les modales et menus flottants gardent leur contexte).
  Les surfaces positionnées (menus, tiroirs, en-têtes collants) et le contenu des couches fixes sont rendus **opaques**.
* **Exemptions** : `[data-cg-paper]` (feuilles de document : toujours claires), `[data-cg-emergency]` (surfaces d'urgence : rendu Classique exact) et `[data-cg-keep]`
  (écrans conçus d'origine pour le sombre : cartes).

## 5. Barre latérale

Glass par défaut 350 px, bornes 180–400 px, largeurs enregistrées valides conservées, Classique 240 px, tiroir mobile inchangé (point de contrôle `56dcb5a1`, test `sidebar-width.test.cjs`).

## 6. Portail client

Le portail reçoit le noyau partagé (`sync-portal.cjs` : jetons, thème, résolution de routes, chargeur, kit) et **son propre** registre (`36` routes, toutes `skin`, sans shell Glass natif).
Sa barre (`PortalLayout`) devient du verre dense en Glass. Le portail n'importe rien de l'application interne et n'expose aucune navigation ni permission interne (testé).
La section « Apparence » n'existe que dans un build de préproduction.

## 7. Design system consolidé

Kit (`design-system/kit`, identique dans les deux applications) : `GlassCard`, `GlassPanel`, `PageHeader`, `GlassTable`, `ResponsiveDataCards` (tableau → cartes mobile),
`GlassModal`, `GlassField`, `GlassButton`, `StatusBadge`, `StatCard`, `EmptyState`, `LoadingState`, `ErrorState`, `FilterBar`, `PeriodSelector`. Tests : `kit.test.cjs` (22).
Aucun écran existant ne les emploie encore : ils servent aux évolutions futures et n'ont aucun effet sur le rendu actuel.

## 8. Outils (développement uniquement, jamais livrés)

| Outil | Rôle |
|---|---|
| `tools/inventory-v2.cjs` | Inventaire des routes des deux applications (disposition, style, formulaires, tables, modales, sensibilité, tests). |
| `tools/build-skin.cjs`, `tools/tokenize-css.cjs`, `tools/sync-portal.cjs` | Génération de la feuille, replis des modules CSS, synchronisation du noyau (chacun avec `--check`). |
| `bench/skin-sweep.cjs` | Balayage réel (Chrome) : mode, fuites de surfaces claires en Dark, régressions de contraste (WCAG AA) vs Classique, débordement horizontal, exceptions JS ; L/D × 320/390/768/1600. |
| `bench/real-session.cjs` | Sessions réelles d'un backend de test **jetable** (MFA capturée en local, domaine synthétique). Refuse tout hôte non local et le port 3002. |
| `tools/run-validation.cjs`, `tools/build-matrix.cjs` | Exécution de tous les scripts de test ; matrice de couverture (`coverage-matrix.md/json`). |
