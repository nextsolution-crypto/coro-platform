# 02 — Current Site Inventory

**Version:** 1.0  
**Date:** 24 septembre 2026  
**Status:** AUDIT VALIDÉ  
**Source:** Audit Claude Code en lecture seule de `feature/website-v2` à `fff4af81`.

> This document replaces the former `PENDING AUDIT` placeholder. It is a factual inventory of the current `coro-website` state. Migration decisions belong in `CONTENT-MIGRATION-MATRIX.md`.

CORO

CURRENT SITE INVENTORY

Website V2 · Photographie factuelle de l'existant

CONNAÎTRE CE QUI EXISTE AVANT DE DÉCIDER CE QUI MIGRE.

Source : audit Claude Code en lecture seule du worktree
feature/website-v2, HEAD fff4af81.

Version 1.0 \| 24 septembre 2026 \| Statut : AUDIT VALIDÉ

# 0. MISE À JOUR V1.1 (LAB-09) — état après le Design Lab

Ce document reste la photographie factuelle d'origine (HEAD `fff4af81`). Cette section réconcilie les points devenus périmés et ajoute les constats de LAB-01 à LAB-08. Les décisions restent dans le Document 03.

## Points périmés depuis l'audit d'origine

- Travail « non committé » (§3) : les pages produit, `ProductPage`, `ProductCompositions` et la documentation sont désormais dans l'historique Git (`6697a036` documentation, `609698fc` point de contrôle produit, `6d0baebf` actifs, puis les lots LAB-01 à LAB-08). Le statut des pages produit reste REVIEW jusqu'à la migration sous Design System V1.0.
- Suite de tests : 143 tests passent (26 au moment de l'audit d'origine).
- « Desktop nav sans aria-expanded » (§9) : corrigé. `DesktopNavigation` expose `aria-expanded` / `aria-controls`, ferme sur Échap et rend le focus.
- « Double footer potentiel — à confirmer dans le navigateur » (§7) : CONFIRMÉ. Sur les pages V2 (vérifié sur `/about`), le layout racine rend aussi le pied de page legacy ; il est masqué par CSS (`display: none`) mais reste dans le DOM. Un seul pied de page est visible. C'est de la dette héritée (LEGACY-DEBT) à retirer à la migration.

## Nouveaux constats (LAB-08)

| Constat | Classe | Note |
|---|---|---|
| Aucun lien d'évitement en production ; `<main>` sans `tabIndex={-1}` | MIGRATION-ONLY | `SkipLink` existe au Lab. |
| Dialogue vidéo d'accueil (`aria-modal`) sans gestion du focus ni Échap | LEGACY-DEBT | `HomePageClient`. |
| `CookieBanner` en `role="dialog"` non modal sans gestion du focus | LEGACY-DEBT | Durcissement du consentement hors Design System. |
| `ChatWidget` : focus du champ à l'ouverture seulement ; FR seulement | LEGACY-DEBT | Déjà REVIEW. |
| `/programme-recommandation` : la liste d'étapes déborde de 5 px à 320 px | LEGACY-DEBT | CSS de la page institutionnelle. |
| `<html lang="fr">` fixe ; titre de `/about` identique au titre générique du site (à confirmer page par page) | SEO-MIGRATION | Voir Document 09. |
| `/design-lab` servi en HTTP 200 en production (`noindex, nofollow`, hors sitemap, `robots.txt` autorise tout) | MIGRATION-ONLY | Verrouillage par environnement avant fusion vers `main`. |
| Jetons V1 appliqués seulement dans le Lab (`data-coro-system="v1"`) ; les pages migrées utilisent encore les jetons legacy | MIGRATION-ONLY | Décision d'adoption dans le registre de gel §11. |
| Build local : récupération du blogue en échec (backend `coro_backend` absent) | ENVIRONMENT | Confirme la fragilité du sitemap noté au §5. |

## Actifs et code de référence

Les actifs visuels du Lab sont dans `public/website-v2/*` et ne sont pas des actifs de production : ils ne remplacent aucun média historique. Le code de référence du Design System est `components/*` et `app/design-tokens.css`.

---

# 1. Objet et validation

Ce document remplace le placeholder PENDING AUDIT du Document 02 et
décrit l'état réel observé de coro-website dans F:\\coro-platform-web.

STATUT --- audit sans modification du dépôt. TypeScript propre; 26/26
tests passants; git status final identique au statut initial.

Aucune suppression, fusion ou redirection n'est décidée ici. Ces
décisions appartiennent au Document 03.

# 2. V2 déjà présente

Commits V2 : dd683a7a fondations/garde-fous; 06133c40 sync main;
a1f3c04a About V2; fff4af81 pages institutionnelles V2.

Socle : routes typées, helpers locale/SEO/navigation/API/JSON-LD, shell
partagé, primitives UI et design tokens.

Pages migrées : /about, /contact, /partners, /programme-recommandation.

# 3. Travail non committé

Quatre pages produit modifiées, ProductPage/ProductCompositions, CSS
Modules, product-content.ts bilingue, trois tests et docs/website-v2.

Le lot compile et les tests passent mais reste REVIEW jusqu'à CURRENT →
TARGET et Design Lab.

IMPORTANT --- ne pas reset/clean/écraser ce travail avant décision
explicite.

# 4. Homepage --- contrats critiques

CRITIQUE --- l'accueil capture seul ?ref=CR-\[A-HJ-NP-Z2-9\]{6}, crée
coro_referral_code et coro_referral_first_touch pour 90 jours sur
.getcoro.io, et DemoForm lit ces cookies.

CRITIQUE --- perdre cette logique casserait l'attribution de parrainage.

L'accueil contient aussi #demo, la vidéo locale et les ancres
#continuum, #indice-coro, #sentinelle, #evacuation, #module-incident,
#plateforme, #documents, #solutions, #environments, #pricing, #security
et #demo.

Le footer legacy référence /#features, ancre non retrouvée.

# 5. Blog

API blog/public et blog/public/{slug}; revalidate=0 et cache=no-store.
L'EN n'est déclaré que si titleEn et contentEn existent.

CRITIQUE --- le sitemap récupère aussi les articles; si l'API échoue, il
peut perdre silencieusement les articles.

50 JPG dans public/images/images_articles semblent liés aux données en
base et doivent être préservés jusqu'à inventaire des données.

# 6. Navigation

Header V2 : groupes Plateforme, Résilience, Solutions et Ressources;
routes futures filtrées par implemented; login app.getcoro.io et CTA
/#demo.

Footer V2 : About, Security, Partners, Referral, Blog, Contact, Privacy,
Terms, CORO Client et CORO Platform.

L'accueil et Sentinelle Population ont encore leur navigation propre. Le
footer legacy reste rendu globalement.

# 7. Double footer potentiel

CRITIQUE --- app/layout.tsx rend Footer legacy tandis que les pages V2
rendent SiteFooter. Aucun mécanisme statique empêchant le double rendu
n'a été trouvé.

À confirmer dans le navigateur.

# 8. Design/UI

Coexistence de Tailwind 4, CSS Modules, CSS global legacy et styles
inline massifs.

design-tokens.css fournit déjà couleurs CORO, surfaces, bordures, états,
typo, spacing, radius, shadows, largeur contenu, focus, motion et
z-index.

Deux palettes historiques coexistent. Inter est chargée 400--900 mais
font-weight:950 apparaît. Les breakpoints sont fragmentés.

next/image est peu utilisé; le legacy utilise surtout \<img\> brut.

# 9. Responsive / accessibilité

Points positifs : cibles 44px dans le shell, focus global, menu mobile
ARIA/Échap, hrefLang, main#main-content, reduced-motion partiel.

Risques : aucun skip link trouvé; html lang=\'fr\' fixe; desktop nav
sans aria-expanded identifié; dialogs/modales sans focus trap observé;
hover legacy; contrastes à mesurer; breakpoints fragmentés.

IMPORTANT --- audit statique, pas certification WCAG.

# 10. SEO

metadataBase getcoro.io, title template, OG/Twitter/robots globaux.
Langue : FR URL nue, EN ?lang=en, x-default FR.

CRITIQUE --- html lang=\'fr\' fixe même en anglais; l'accueil choisit
l'anglais après hydration, donc HTML serveur français.

/sentinelle : contenu EN mais metadata/canonical FR et registre
en:false. /sentinelle-population : hreflang EN mais contenu EN absent.

Sitemap largement manuel; aucune redirection Next. Les quatre pages
produit en cours risquent de perdre leur JSON-LD legacy.

# 11. Assets

public/ ≈48,6 Mo; vidéo homepage ≈21,2 Mo.

Logos, favicons, OG, captures
homepage/Sentinelle/Population/solutions/Client/Résilience/alertes
présents.

50 images d'articles à préserver. Plusieurs assets semblent non
référencés textuellement mais peuvent être dynamiques; aucune
suppression à ce stade.

Trois sources OG coexistent et devront être rationalisées.

# 12. Parité FR / EN

Guides /documents/\* : FR seulement. Sentinelle Population : EN déclaré
mais non implémenté. Sentinelle : EN implémenté mais non déclaré dans
registre/sitemap.

ChatWidget : FR seulement. Articles : EN uniquement si traduction
disponible. Plusieurs chaînes Population sont codées en dur hors
dictionnaire.

RÈGLE --- ces divergences seront tranchées dans la migration, pas
corrigées ad hoc.

# 13. Claims à valider

Hébergement Canada; NEQ/identité légale; prix 149 \$ et 249 \$;
parrainage 250 \$; 43 procédures; références CNESST/CNPI/ISO 22301;
Phase 2 PGC/PRA/PUE; mentions fournisseur/SLA/sécurité.

# 14. Risques de migration prioritaires

1\. Homepage monolithique : contenu + ancres + referral + DemoForm +
vidéo.

2\. Parrainage dépendant exclusivement de /.

3\. Convention ?lang=en et conséquences d'un éventuel changement.

4\. Blog dynamique : slugs/images/traductions hors code.

5\. Pages produit en cours : contenu riche et JSON-LD potentiellement
perdus.

6\. Sentinelle Population : hreflang anglais trompeur.

7\. Sitemap manuel et alternates incomplets.

8\. Guides réglementaires FR à valider.

9\. Claims commerciaux/réglementaires à valider.

10\. Couplages DemoForm/referral, layout/footer/chat,
ProductPage/content/médias, sitemap/blog API.

11\. Dépendance blog à coro_backend:3002.

12\. Documentation technique partiellement obsolète.

# 15. Inconnues restantes

Rendu réel/double footer; next build avec exports LegacyXxxPage;
articles/slugs/traductions/images en base; statut EN de
Sentinelle/Population; port production; validation tarifs/claims; usage
réel de certains assets; choix final des sources OG.

# 16. Entrées pour la suite

Document 03 : commencer par /, /blog, /blog/\[slug\],
/sentinelle-population, /sentinelle, /programme-recommandation,
/pricing, pages produit et guides.

Document 07 V1.0 : confronter navigation actuelle et cible, puis
trancher les 15 routes futures.

Document 09 : traiter ?lang=en, html lang, SSR accueil, sitemap manuel,
alternates Sentinelle/Population, JSON-LD perdu et sources OG.

# 17. Environnement technique

  Élément    Constat
  ---------- --------------------------------------------------------
  Worktree   F:\\coro-platform-web
  Branche    feature/website-v2
  HEAD       fff4af81
  Stack      Next 16.3.6 · React 19.2.8 · Tailwind 4 · lucide-react
  Node       ≥22
  Build      standalone
  Docker     PORT 3001; doc dev 3003 à clarifier
  Tests      26/26

# 18. Matrice des routes

  Route                                                Langue                 Objet             Risque
  ---------------------------------------------------- ---------------------- ----------------- ------------
  /                                                    FR + EN client         Accueil           Très élevé
  /about                                               FR/EN                  À propos          Faible
  /security                                            FR/EN                  Sécurité          Moyen
  /privacy                                             FR/EN                  Confidentialité   Élevé
  /terms                                               FR/EN                  Conditions        Élevé
  /pricing                                             FR/EN                  Tarification      Élevé
  /sentinelle                                          FR + contenu EN        Produit           Élevé
  /sentinelle-population                               FR réel / EN déclaré   Produit           Élevé
  /gestion-documentaire                                FR/EN                  Produit           Élevé
  /gestion-de-projets                                  FR/EN                  Produit           Élevé
  /performance-objectifs                               FR/EN                  Produit           Élevé
  /portail-client                                      FR/EN                  Produit           Élevé
  /resilience-operationnelle                           FR/EN                  Produit           Élevé
  /programme-recommandation                            FR/EN                  Parrainage        Élevé
  /contact                                             FR/EN                  Contact           Élevé
  /partners                                            FR/EN                  Partenaires       Moyen
  /blog                                                FR/EN                  Liste articles    Très élevé
  /blog/\[slug\]                                       FR + EN si traduit     Article           Très élevé
  /documents/plan-\*-{pmu,psi,pca,pgc,pra,pue}         FR                     6 guides          Élevé
  /sitemap.xml · /robots.txt · /manifest.webmanifest   ---                    Utilitaires       ---

# 19. Matrice composants

  Composant                    Classification    Observation
  ---------------------------- ----------------- -------------------------
  SiteHeader                   ADAPT-CANDIDATE   Bon socle
  DesktopNavigation            REVIEW            À tester
  MobileNavigation             ADAPT-CANDIDATE   ARIA/Échap/44px
  LanguageSwitcher             REUSE-CANDIDATE   Doublons legacy
  SiteFooter + Footer legacy   MERGE-CANDIDATE   Double footer potentiel
  lib/site/\*                  REUSE-CANDIDATE   Socle V2
  Primitives UI                ADAPT-CANDIDATE   Minimales
  ProductPage                  REVIEW            Pré-Lab
  ProductCompositions          REVIEW            4 compositions
  product-content.ts           REUSE-CANDIDATE   Bilingue
  AboutV2                      REUSE-CANDIDATE   Pilote
  DemoForm                     ADAPT-CANDIDATE   Referral
  HomePageClient               REVIEW            9 032 lignes
  ChatWidget                   REVIEW            FR seulement
  CookieBanner                 ADAPT-CANDIDATE   Bilingue
  Classes globales legacy      MERGE-CANDIDATE   Concurrence V2
  Sentinelle .cs-\*            REVIEW            Hors système

# 20. Destinations externes

  Destination                                   Usage
  --------------------------------------------- ---------------------------
  app.getcoro.io/login                          Connexion plateforme
  client.getcoro.io/login                       Portail client
  formspree.io/f/xnpadzyq                       DemoForm
  api.getcoro.io/api/chat/\*                    Chat
  coro_backend:3002                             Blog/sitemap serveur
  info@getcoro.io / +1 514 791-7871             Contact
  2879 boul. Pierre-Bernard, Montréal H1L 4R2   Adresse publique actuelle

# 21. Conclusion d'inventaire

Le site actuel contient une valeur importante à préserver : contenu,
SEO, guides, blog, referral, médias et fonctions publiques. Il contient
également un socle V2 déjà prometteur.

RÈGLE --- Website V2 doit être une migration contrôlée, pas une
suppression/reconstruction aveugle.

La prochaine décision formelle appartient au Document 03 --- Content
Migration Matrix.
