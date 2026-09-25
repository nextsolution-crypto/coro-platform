CORO

SITE ARCHITECTURE AND PAGE BLUEPRINTS

Website V2 · Plan de construction autoritatif du site cible getcoro.io

DÉFINIR TOUT LE SITE AVANT DE RECONSTRUIRE UNE SEULE PAGE.

Ce document est l'autorité pour l'architecture cible de getcoro.io : quelles pages existent, lesquelles sont publiées, à quoi sert chacune, quelle famille du Design System V1.0 elle utilise, quelle est sa structure de sections, son territoire SEO, son rôle de maillage et de conversion, son risque de migration et l'ordre de reconstruction. Il ne modifie ni le code, ni les composants, ni les jetons, ni les pages.

Version 1.0 | 24 septembre 2026 | Statut : MIG-00A — planification, en attente de validation humaine

# 0. Statut, portée et règles

- Phase : MIG-00A (architecture d'information, blueprints de pages, carte SEO). Aucune migration de page n'est commencée.
- Le Design System V1.0 est gelé (`00-governance/DESIGN-SYSTEM-V1-FREEZE.md`). Ce document ne redessine rien : il compose avec les composants approuvés (`02-design/CORO-COMPONENT-LIBRARY.md`).
- La page d'accueil est la DERNIÈRE grande page reconstruite. `HomePageClient.tsx` reste en lecture seule pendant la migration des pages internes.
- La préservation des URL est la valeur par défaut. Aucune décision MERGE ou REDIRECT n'est prise ici : les candidats sont listés comme « à revoir ».
- Les intentions de recherche et les directions de titre sont des HYPOTHÈSES de conception. Aucun volume de recherche, classement ou donnée d'analyse n'est inventé ; ils sont à mesurer.
- Les affirmations produit, juridiques, réglementaires, de prix et de sécurité restent REVIEW tant que Mathieu ne les a pas validées (voir `00-governance/DESIGN-SYSTEM-V1-FREEZE.md` §9).
- Quand la preuve manque, la mention « REVIEW REQUIRED » est utilisée. La disponibilité d'un produit n'est jamais inventée.
- Sources de vérité produit consultées : `CLAUDE.md` (racine du dépôt, état réel des modules applicatifs), le code du site, les documents Website V2.

## Décision de méthode : architecture du site ≠ navigation principale

Une page peut exister, être indexable et liée sans figurer dans l'en-tête. Ce document distingue systématiquement : (a) l'ARCHITECTURE du site (toutes les pages publiées et leurs liens), (b) la NAVIGATION principale (en-tête, mobile, pied de page).

# 1. Méthode et sources

Ré-audit réalisé sur le dépôt (branche `feature/website-v2`, HEAD `aa7a01bc`, gel V1.0) : arborescence `app/**/page.tsx`, `lib/site/routes.ts`, `lib/site/navigation.ts`, `lib/site/seo.ts`, `lib/site/locale.ts`, `lib/site/sitemap.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/layout.tsx`, métadonnées et JSON-LD par page, liens internes des guides, contrat du blog, médias de `public/images/**`. Les documents Website V2 (00 à 05) ont été lus en entier.

Rien n'a été modifié hors de `docs/website-v2/`.

# 2. Inventaire des routes confirmé (depuis le dépôt)

## 2.1 Routes publiques (24 pages + utilitaires)

| # | Route | Fichier | Type | Langues (code réel) | Dans l'en-tête ? | Dans le sitemap ? |
|---|---|---|---|---|---|---|
| 1 | `/` | `app/page.tsx` + `HomePageClient` | Accueil | FR ; EN choisi côté client après hydratation | non (navigation propre) | oui, FR + EN |
| 2 | `/about` | `app/about/page.tsx` + `AboutV2` | Institutionnelle (V2 migrée) | FR / EN | non (pied de page V2) | oui |
| 3 | `/security` | `app/security/page.tsx` | Confiance | FR / EN | oui (groupe Plateforme) | oui |
| 4 | `/privacy` | `app/privacy/page.tsx` | Légale | FR / EN | non (pied de page) | oui |
| 5 | `/terms` | `app/terms/page.tsx` | Légale | FR / EN | non (pied de page) | oui |
| 6 | `/pricing` | `app/pricing/page.tsx` | Tarification | FR / EN | oui (lien direct) | oui |
| 7 | `/sentinelle` | `app/sentinelle/page.tsx` | Produit | FR ; contenu EN dans le code (`?lang=en`) | oui (Résilience et opérations) | oui, FR + EN |
| 8 | `/sentinelle-population` | `app/sentinelle-population/page.tsx` | Produit | FR seulement en contenu ; EN annoncé | oui (Solutions) | oui, FR + EN |
| 9 | `/gestion-documentaire` | `app/gestion-documentaire/page.tsx` | Produit (V2 en cours) | FR / EN | oui | oui |
| 10 | `/gestion-de-projets` | `app/gestion-de-projets/page.tsx` | Produit (V2 en cours) | FR / EN | oui | oui |
| 11 | `/performance-objectifs` | `app/performance-objectifs/page.tsx` | Produit (V2 en cours) | FR / EN | oui | oui |
| 12 | `/portail-client` | `app/portail-client/page.tsx` | Produit (V2 en cours) | FR / EN | oui | oui |
| 13 | `/resilience-operationnelle` | `app/resilience-operationnelle/page.tsx` | Produit | FR / EN | oui | oui |
| 14 | `/programme-recommandation` | `app/programme-recommandation/page.tsx` | Institutionnelle (V2) | FR / EN | non (pied de page) | oui |
| 15 | `/contact` | `app/contact/page.tsx` | Institutionnelle (V2) | FR / EN | non (pied de page) | oui |
| 16 | `/partners` | `app/partners/page.tsx` | Institutionnelle (V2) | FR / EN | non (pied de page) | oui |
| 17 | `/blog` | `app/blog/page.tsx` | Ressource dynamique | FR / EN | oui (Ressources) | oui, FR + EN |
| 18 | `/blog/[slug]` | `app/blog/[slug]/page.tsx` | Ressource dynamique | FR ; EN si traduction | non | oui (via API) |
| 19–24 | `/documents/plan-{mesures-urgence-pmu, securite-incendie-psi, continuite-activites-pca, gestion-crise-pgc, reprise-activites-pra, urgence-environnementale-pue}` | `app/documents/*/page.tsx` | Guides | FR seulement | non | oui (FR) |

Utilitaires : `/sitemap.xml` (`app/sitemap.ts`), `/robots.txt` (`app/robots.ts`, `allow: /`), `/manifest.webmanifest`, `not-found`, `opengraph-image.png`, `twitter-image.png`, `favicon.ico`. Aucune route d'API dans `coro-website` (`route.ts` absent). Route interne : `/design-lab` (noindex, à verrouiller avant fusion).

## 2.2 Routes enregistrées non implémentées (statuts cibles au §5 et §26)

`/plateforme`, `/coro-platform`, `/resilience-operations`, `/coro-incident`, `/coro-exercices`, `/coro-ops`, `/qr-intervention`, `/coro-knowledge`, `/coro-ai`, `/coro-network`, `/coro-campus`, `/solutions/multi-sites`, `/ressources`, `/guides`, `/conformite-reglementation`. Registre : `implemented: false`, `sitemap: false`. Aucune n'apparaît dans la navigation actuelle (`visibleNavigation` filtre sur `implemented`) ; leur statut cible (PUBLISH-NOW, BUILD-NOW-HIDDEN, REVIEW ou FUTURE) est fixé au §5.

## 2.3 Constats confirmés ou nouveaux

| ID | Constat | Preuve | Classe |
|---|---|---|---|
| R-01 | `/sentinelle` : le registre dit `en: false`, le sitemap publie FR et EN avec alternates, la page bascule en anglais via `?lang=en`, mais ses métadonnées sont statiques (canonical FR, pas d'alternates). Trois sources se contredisent. | `lib/site/routes.ts`, `app/sitemap.ts`, `app/sentinelle/page.tsx` | SEO-MIGRATION |
| R-02 | `/sentinelle-population` : hreflang et titre/description EN annoncés, mais le contenu rendu est toujours `copy.fr` (`en: {} as never`). Faux signal anglais. | `app/sentinelle-population/page.tsx` | SEO-MIGRATION |
| R-03 | Les six guides n'ont AUCUN lien interne entrant dans la branche : la page `/gestion-documentaire` V2 (`ProductPage`) ne les lie pas ; les liens existaient dans `LegacyGestionDocumentairePage` (code conservé mais plus rendu) ; la page d'accueil ne les lie pas ; les guides ne se lient pas entre eux ni aux pages produit (liens : `/`, `/#demo`, `/blog`). Ils ne sont atteignables que par le sitemap. | grep `documents/plan-` | SEO-MIGRATION (critique) |
| R-04 | Les quatre pages produit V2 (`ProductPage`) n'émettent aucune donnée structurée ; le JSON-LD des versions legacy (pricing, security, résilience, sentinelle, guides, accueil, blog) est propre à chaque page et reste à préserver. | `components/ProductPage.tsx` (0 `ld+json`) | SEO-MIGRATION |
| R-05 | `/resilience-operationnelle` : le JSON-LD nomme l'éditeur « Coro Solutions Inc. », alors que les pages légales et le pied de page ne le font pas. | `app/resilience-operationnelle/page.tsx` | CONTENT-GOVERNANCE |
| R-06 | `/resilience-operationnelle` affiche « Conforme ISO 22301 / CNPI 2020 / CNESST » ; le Content Guidelines interdit « conforme » comme promesse absolue. | idem | CONTENT-GOVERNANCE |
| R-07 | `/pricing` : « Réponse sous 24 heures » et « Programme fondateur » sont des énoncés commerciaux non vérifiés. Les prix ne sont pas publiés (profils indicatifs, aucun forfait fixe). | `app/pricing/page.tsx` | CONTENT-GOVERNANCE |
| R-08 | Le lien `/#features` (pied de page legacy, `security`, `privacy`) n'a pas d'ancre correspondante connue. | grep `#features` | LEGACY-DEBT |
| R-09 | Pages produit V2 : le code legacy de chaque page reste dans le fichier (`LegacyGestionDocumentairePage`, `LegacyGestionProjetsPage`…) comme source de contenu à comparer. | `app/gestion-*/page.tsx` | MIGRATION-ONLY |
| R-10 | Le layout racine rend globalement `Footer` (legacy), `CookieBanner`, `ScrollToTop`, `ChatWidget` ; `<html lang="fr">` fixe ; titre par défaut et gabarit `%s \| CORO` ; balise `keywords` (sans effet moteur). | `app/layout.tsx` | MIGRATION-ONLY |
| R-11 | Pages à navigation legacy (en-tête propre, sans `SiteHeader`) : observé pour `/`, `/sentinelle`, `/sentinelle-population`, `/security`, `/privacy` ; à confirmer pour les autres pages legacy (`/pricing`, `/terms`, `/resilience-operationnelle`, blogue, guides). | code des pages | LEGACY-DEBT |
| R-13 | `/sentinelle` affiche des prix (149 $ ; à partir de 249 $, et leurs équivalents EN) alors que `/pricing` ne publie aucun prix fixe et précise qu'aucun profil n'est un forfait. Contradiction commerciale entre deux pages. | `app/sentinelle/page.tsx` (plans), `app/pricing/page.tsx` | CONTENT-GOVERNANCE |
| R-12 | Le titre de `/about` contient déjà la marque (« CORO · … ») et le gabarit ajoute « \| CORO » : double marque à normaliser. | `AboutV2` + `app/layout.tsx` | SEO-MIGRATION |

Aucune de ces constatations n'est corrigée dans MIG-00A.

# 3. Vocabulaires

## 3.1 Statuts de publication (un seul par route cible)

| Statut | Signification |
|---|---|
| PUBLISH-NOW | Page existante ou nouvelle destinée au lancement de Website V2. |
| BUILD-NOW-HIDDEN | À construire pendant la migration, mais non exposée dans la navigation principale ; exposition publique soumise à décision ultérieure. |
| FUTURE | Route ou produit valide, hors lancement Website V2. |
| HIDDEN | Interne, expérimental ou non public. |
| LEGACY-PRESERVE | URL et contenu qui doivent rester, sans repositionnement substantiel. |
| MERGE | Contenu à consolider dans une autre page cible (aucune décision prise ici). |
| REDIRECT | URL à rediriger après approbation explicite (aucune décision prise ici). |

Mention additionnelle « REVIEW REQUIRED » : la preuve est insuffisante ; décision humaine requise avant tout statut ferme.

## 3.2 Profondeur de page (lignes directrices, pas des quotas)

| Profondeur | Repère |
|---|---|
| MAJOR-LANDING | Environ 8 à 12 sections significatives. |
| SECONDARY-PRODUCT | Environ 6 à 9 sections. |
| SUPPORT | Environ 3 à 6 sections. |
| EDITORIAL | Piloté par le contenu. |
| LEGAL | Préservation du contenu d'abord. |
| UTILITY | Selon le but de la page. |

# 4. Arbre cible du site (architecture)

```
getcoro.io
├─ HOME  ........................................ /                          PUBLISH-NOW (dernière reconstruction)
├─ PLATEFORME
│  ├─ CORO Documents .............................. /gestion-documentaire      PUBLISH-NOW
│  ├─ CORO Projects ............................... /gestion-de-projets       PUBLISH-NOW
│  ├─ CORO Performance ............................ /performance-objectifs    PUBLISH-NOW
│  ├─ CORO Client ................................. /portail-client           PUBLISH-NOW
│  └─ (vue d'ensemble) ............................ /plateforme, /coro-platform  BUILD-NOW-HIDDEN (décision MIG-00A-B)
├─ RÉSILIENCE ET OPÉRATIONS
│  ├─ CORO Résilience / Indice CORO ............... /resilience-operationnelle PUBLISH-NOW
│  ├─ CORO Sentinelle ............................. /sentinelle                PUBLISH-NOW
│  ├─ Sentinelle Population ....................... /sentinelle-population     PUBLISH-NOW
│  ├─ CORO Incident ............................... /coro-incident             PUBLISH-NOW (audit de vérité fonctionnelle préalable)
│  ├─ CORO Exercices .............................. /coro-exercices            REVIEW REQUIRED
│  └─ CORO Ops, QR Intervention ................... /coro-ops, /qr-intervention  FUTURE
├─ INTELLIGENCE (Knowledge, AI, Network) ........... /coro-knowledge, /coro-ai, /coro-network  FUTURE
├─ SOLUTIONS
│  ├─ (multi-sites) ............................... /solutions/multi-sites     FUTURE
│  └─ (campus) .................................... /coro-campus               FUTURE
├─ DOCUMENTS / CONFORMITÉ (guides éducatifs, FR)
│  ├─ PMU ......................................... /documents/plan-mesures-urgence-pmu        PUBLISH-NOW
│  ├─ PSI ......................................... /documents/plan-securite-incendie-psi      PUBLISH-NOW
│  ├─ PCA ......................................... /documents/plan-continuite-activites-pca   PUBLISH-NOW
│  ├─ PGC ......................................... /documents/plan-gestion-crise-pgc          PUBLISH-NOW
│  ├─ PRA ......................................... /documents/plan-reprise-activites-pra      PUBLISH-NOW
│  ├─ PUE ......................................... /documents/plan-urgence-environnementale-pue  PUBLISH-NOW
│  ├─ (hub des guides) ............................ /guides                    PUBLISH-NOW
│  └─ (hub conformité et réglementation) .......... /conformite-reglementation  REVIEW / MERGE-REVIEW (non créée)
├─ RESSOURCES
│  ├─ Blogue ...................................... /blog, /blog/[slug]         LEGACY-PRESERVE
│  └─ (centre de ressources) ...................... /ressources                FUTURE
├─ ENTREPRISE
│  ├─ À propos .................................... /about                     PUBLISH-NOW
│  ├─ Partenaires ................................. /partners                  PUBLISH-NOW
│  ├─ Programme de recommandation ................. /programme-recommandation  PUBLISH-NOW
│  └─ Contact et démonstration .................... /contact                   PUBLISH-NOW
├─ CONFIANCE
│  └─ Sécurité et hébergement ..................... /security                  PUBLISH-NOW
├─ TARIFICATION ................................... /pricing                   PUBLISH-NOW
├─ LÉGAL
│  ├─ Confidentialité ............................. /privacy                   LEGACY-PRESERVE
│  └─ Conditions .................................. /terms                     LEGACY-PRESERVE
├─ ACCÈS APPLICATIFS (hors périmètre marketing)
│  ├─ CORO Platform ............................... https://app.getcoro.io/login
│  └─ CORO Client ................................. https://client.getcoro.io/login
└─ UTILITAIRES .................................... /sitemap.xml, /robots.txt, /manifest.webmanifest, not-found   LEGACY-PRESERVE
   INTERNE ...................................... /design-lab                HIDDEN (verrouillage avant fusion)
```

Règle : le lancement n'expose aucune route FUTURE, REVIEW ou BUILD-NOW-HIDDEN (en-tête, accueil, sitemap, liens promotionnels), aucun lien sans destination.

# 5. Matrice route / statut

Colonnes : statut actuel → statut cible, famille du Design System, profondeur, action d'URL, risque de migration, vague.

| Route | Statut actuel | Statut cible | Famille | Profondeur | Action d'URL | Risque | Vague |
|---|---|---|---|---|---|---|---|
| `/` | legacy monolithique | PUBLISH-NOW | Architectural (passages opérationnels) | MAJOR-LANDING | PRESERVE | Très élevé | MIG-10 |
| `/gestion-documentaire` | V2 en cours (REVIEW) | PUBLISH-NOW | Technique | MAJOR-LANDING | PRESERVE | Élevé | MIG-02 |
| `/gestion-de-projets` | V2 en cours (REVIEW) | PUBLISH-NOW | Architectural / produit | SECONDARY-PRODUCT | PRESERVE | Élevé | MIG-02 |
| `/performance-objectifs` | V2 en cours (REVIEW) | PUBLISH-NOW | Architectural / données | SECONDARY-PRODUCT | PRESERVE | Élevé | MIG-02 |
| `/portail-client` | V2 en cours (REVIEW) | PUBLISH-NOW | Architectural | SECONDARY-PRODUCT | PRESERVE | Élevé | MIG-02 |
| `/resilience-operationnelle` | legacy | PUBLISH-NOW | Architectural + Opérationnel | MAJOR-LANDING | PRESERVE | Élevé | MIG-03 |
| `/sentinelle` | legacy | PUBLISH-NOW | Opérationnel | MAJOR-LANDING | PRESERVE | Élevé | MIG-04 |
| `/sentinelle-population` | legacy | PUBLISH-NOW | Technique + Opérationnel | MAJOR-LANDING | PRESERVE | Élevé | MIG-05 |
| `/pricing` | legacy | PUBLISH-NOW | Minimal / conversion | SUPPORT | PRESERVE | Élevé | MIG-06 |
| `/security` | legacy | PUBLISH-NOW | Confiance / technique | SUPPORT | PRESERVE | Moyen à élevé | MIG-06 |
| `/about` | V2 migrée | PUBLISH-NOW | Éditorial (architectural léger) | SUPPORT | PRESERVE | Faible | MIG-01 |
| `/contact` | V2 migrée | PUBLISH-NOW | Minimal / conversion | UTILITY | PRESERVE | Moyen (DemoForm, parrainage) | MIG-01 |
| `/partners` | V2 migrée | PUBLISH-NOW | Éditorial / minimal | SUPPORT | PRESERVE | Faible | MIG-01 |
| `/programme-recommandation` | V2 migrée | PUBLISH-NOW | Éditorial / minimal | SUPPORT | PRESERVE | Moyen (montant, conditions) | MIG-01 |
| `/blog`, `/blog/[slug]` | legacy dynamique | LEGACY-PRESERVE | Éditorial | EDITORIAL | PRESERVE | Très élevé | MIG-07 |
| Guides (6) | legacy | PUBLISH-NOW | Éditorial + Technique | EDITORIAL | PRESERVE | Élevé | MIG-07 (liens dès MIG-02) |
| `/privacy`, `/terms` | legacy | LEGACY-PRESERVE | Légal | LEGAL | PRESERVE | Élevé (juridique) | MIG-08 |
| `/guides` | futur enregistré | PUBLISH-NOW | Éditorial + Technique | SUPPORT | NEW | Moyen | MIG-02 (disponible pour le maillage) ; complété en MIG-07 |
| `/ressources` | futur enregistré | FUTURE | — | — | NEW (non lancé) | — | — |
| `/conformite-reglementation` | futur enregistré | REVIEW / MERGE-REVIEW | — | — | MERGE-REVIEW (avec `/guides`) | — | — |
| `/plateforme` | futur enregistré | BUILD-NOW-HIDDEN (exposition évaluée après MIG-02) | Architectural | MAJOR-LANDING | NEW (non lancé) | — | — |
| `/coro-platform` | futur enregistré | FUTURE (candidat MERGE-REVIEW avec `/plateforme`, non décidé) | — | — | MERGE-REVIEW | — | — |
| `/resilience-operations` | futur enregistré | FUTURE (candidat MERGE-REVIEW avec `/resilience-operationnelle`) | — | — | MERGE-REVIEW | — | — |
| `/coro-incident` | futur enregistré | PUBLISH-NOW (audit de vérité fonctionnelle préalable au texte ; MIG-04) | Opérationnel | MAJOR-LANDING | NEW (non créée) | — | — |
| `/coro-exercices` | futur enregistré | REVIEW REQUIRED (BUILD-NOW-HIDDEN si l'audit fonctionnel le justifie, sinon FUTURE) | Opérationnel / éditorial | SECONDARY-PRODUCT | NEW (non lancé) | — | — |
| `/coro-ops`, `/qr-intervention`, `/coro-knowledge`, `/coro-ai`, `/coro-network`, `/coro-campus`, `/solutions/multi-sites` | futur enregistré | FUTURE | — | — | NEW (non lancé) | — | — |
| `/design-lab` | interne | HIDDEN | — | — | Verrouiller (MIG-00B) | Élevé (exposition) | MIG-00B |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `not-found` | utilitaires | LEGACY-PRESERVE | — | UTILITY | PRESERVE | Moyen (sitemap) | MIG-09, MIG-12 |

Aucune décision MERGE ou REDIRECT n'est prise. Les mentions « MERGE-REVIEW » désignent des candidats à réexaminer si la route future était un jour créée.

# 6. Évaluation des routes futures

Pour chaque route : disponibilité produit, maturité du contenu, valeur SEO, valeur de navigation, dépendances, risque de survente, statut recommandé. La disponibilité produit s'appuie sur `CLAUDE.md` (modules applicatifs livrés) ; la décision de la rendre publique appartient à Mathieu.

| Route | Disponibilité produit | Maturité du contenu | Valeur SEO | Valeur de navigation | Dépendances | Risque de survente | Statut recommandé |
|---|---|---|---|---|---|---|---|
| `/plateforme` | Concept de regroupement, pas un produit | Faible (section d'accueil `#plateforme`) | Moyenne (catégorie et marque) | Moyenne | Les quatre pages produit terminées | Faible | BUILD-NOW-HIDDEN : décision d'exposition après MIG-02 selon la valeur ajoutée par rapport à l'accueil et aux quatre pages produit |
| `/coro-platform` | Désigne aussi l'application conseiller (connexion) | Nulle | Faible | Faible | `/plateforme` | Moyen (confusion de nom) | FUTURE ; ne pas créer en double de `/plateforme` |
| `/resilience-operations` | Regroupement de `/resilience-operationnelle`, `/sentinelle` | Faible | Moyenne mais cannibalise `/resilience-operationnelle` | Faible | Vagues Résilience et Sentinelle | Moyen | FUTURE ; l'URL existante `/resilience-operationnelle` reste l'autorité |
| `/coro-incident` | Module Incident livré dans l'application (types d'incident, tâches par rôle, SMS, accusés, exercice, bouton panique, rapport REX), selon `CLAUDE.md` | Partielle : section `#module-incident` de l'accueil et section de `/resilience-operationnelle` ; médias `coro-module-incident.webp`, `coro-rapport-incident.webp` | Élevée (logiciel de gestion d'incident) | Élevée | Décision de nom produit (module de Sentinelle ou produit distinct) ; validation des énoncés ; vague Résilience | Moyen | PUBLISH-NOW ; audit de vérité fonctionnelle obligatoire avant tout texte public ; MIG-04, prête avant l'accueil |
| `/coro-exercices` | « Mode exercice » dans le module Incident ; archivage des exercices dans Résilience ; pas de produit distinct constaté | Faible | Moyenne | Moyenne | Décision produit | Élevé | REVIEW REQUIRED : BUILD-NOW-HIDDEN seulement si l'audit fonctionnel confirme la maturité, sinon FUTURE |
| `/coro-ops` | Aucune preuve constatée | Nulle | — | — | — | Élevé | FUTURE |
| `/qr-intervention` | Aucune preuve d'un produit distinct (le QR de Sentinelle existe) | Nulle | — | — | — | Élevé | FUTURE |
| `/coro-knowledge` | Aucune preuve constatée | Nulle | — | — | — | Élevé | FUTURE |
| `/coro-ai` | Fonctions IA livrées : générateur de procédures, chat « Sophie » sur le site | Faible | Risque de catégorie générique | Faible | Décision éditoriale sur l'IA (Content Guidelines §11) | Élevé | FUTURE ; l'IA se décrit dans les pages produit concernées |
| `/coro-network` | Aucune preuve constatée | Nulle | — | — | — | Élevé | FUTURE |
| `/coro-campus` | Aucune preuve constatée | Nulle | Moyenne (secteur) | Moyenne | Produit et décision secteur | Élevé | FUTURE |
| `/solutions/multi-sites` | Capacités multi-sites livrées dans le portail client et Sentinelle (vue multi-bâtiments) | Fragments dans `/portail-client`, `/sentinelle`, `/resilience-operationnelle` | Moyenne | Moyenne | Cannibalisation avec ces pages | Moyen | FUTURE : créer seulement si la page est nettement différenciée |
| `/guides` | Contenu existant (6 guides + blogue) | Bonne (contenu déjà publié) | Élevée pour le maillage (aujourd'hui les guides sont orphelins) | Élevée | Guides migrés | Faible | PUBLISH-NOW (décidé) ; MIG-02 pour le maillage, MIG-07 pour l'achèvement |
| `/ressources` | Contenu existant | Doublon de `/guides` + blogue | Faible | Faible | — | Faible | FUTURE : un seul hub suffit au lancement |
| `/conformite-reglementation` | Contenu existant (références dans les guides) | Faible, nécessite validation juridique | Moyenne | Faible | Validation des références | Élevé (allégations réglementaires) | REVIEW / MERGE-REVIEW : non créée, aucune fusion approuvée |

# 7. Blueprints de pages — gabarit et conventions

Chaque blueprint suit le même gabarit (champs de la demande MIG-00A). Les sections sont dans l'ordre recommandé. Les noms de composants sont ceux du catalogue V1.0. Aucun texte marketing final n'est écrit : les « directions » de titre, de H1 et de description décrivent l'intention, à finaliser avec le Content Guidelines.

Conventions :

- « Contenu à préserver » = contenu existant à comparer avant retrait du legacy (source : code legacy conservé dans le fichier de la page, `productContent`, pages actuelles).
- « Contrats fonctionnels » = comportements qui ne doivent pas changer.
- « Claims REVIEW » = énoncés à valider par Mathieu avant republication.
- « Lacune de composant » = un besoin que le catalogue ne couvre pas ; à escalader (MIG-00B, décision D-08), jamais à combler localement.
- Toutes les pages : SiteHeader + SiteFooterV2 (une fois le pied de page fusionné), une `CTASection` finale, et la checklist de migration `04-quality/QA-ACCEPTANCE-CHECKLIST.md` §0.
- Le CTA principal est une demande de démonstration (`/contact`, ou `/#demo` tant que la page d'accueil porte la section) seulement quand l'intention est commerciale. Les pages informatives priorisent la suite logique (§13).

Champs SEO communs à toutes les pages indexables : canonical FR = URL propre ; EN = même route avec `?lang=en` ; hreflang `fr-CA`, `en-CA` (si vrai contenu EN), `x-default` = FR ; title unique (sans doublon de marque avec le gabarit `%s | CORO`) ; description unique ; H1 unique ; Open Graph et Twitter via le helper central `buildPageMetadata` ; alt utile sur les médias informatifs. Seules les particularités sont notées par page.

# 8. Blueprints — pages produit et pages principales

## 8.1 `/gestion-documentaire` — CORO Documents

| Champ | Blueprint |
|---|---|
| Route | `/gestion-documentaire` |
| Statut actuel → cible | V2 en cours (REVIEW) → PUBLISH-NOW |
| Famille · profondeur | Technique · MAJOR-LANDING |
| Objet | Autorité commerciale du produit : produire, éditer, valider, approuver et maintenir des documents de conformité et de résilience à partir des données du bâtiment. |
| Audience principale | Conseillers et firmes qui produisent des PMU / PSI / PCA ; gestionnaires d'immeubles. |
| Question principale | Comment produire et maintenir mes documents sans repartir de zéro à chaque révision ? |
| CTA principal · secondaire | Demander une démonstration · Découvrir les guides (PMU, PSI, PCA) |
| Héros | HeroTechnical (document / plan) |
| Sections | 01 Héros (H1, document et cartouche) · 02 SectionStatement : le bâtiment est la source de vérité · 03 FeatureIndex `steps` : données → génération → édition (43 procédures : claim REVIEW) · 04 SplitContent + MediaFrame technique : éditeur par modules (capture réelle) · 05 Flux d'approbation : révision, approbation, signature, historique (FeatureIndex `steps`, `DocumentStatus` REVIEW) · 06 Types de documents : PMU, PSI, PCA disponibles, PGC / PRA / PUE indiqués « Phase 2 » exactement comme aujourd'hui, chacun lié à son guide (FeatureIndex `rows`) · 07 Sortie bilingue FR / EN (EditorialBlock) · 08 Intégration Projects / Client (SplitContent, liens) · 09 Preuve : captures réelles et énoncés sourcés (TrustStrip ; SectionProof REVIEW) · 10 Accordion FAQ · 11 CTASection |
| Composants DS | HeroTechnical, PageSection (white, soft, paper contextuel), SectionStatement, FeatureIndex, SplitContent, MediaFrame (technical), Accordion, TrustStrip, CTASection |
| Médias | `public/images/solutions/coro-gestion-documentaire.webp`, `public/images/solutions/en/coro-document-management.webp`, `public/screenshot-editor.jpg` ; pack V2 `website-v2/documents/document-blueprint-desk.webp` (provenance à valider) |
| Contenu à préserver | Génération à partir du bâtiment, éditeur modulaire, workflow d'approbation avec réviseur et approbateur, documents bilingues, liste des types de documents et de leur disponibilité, FAQ, description « 43 procédures » (claim), JSON-LD legacy |
| Contrats fonctionnels | Aucun formulaire ; CTA de démonstration ; liens de connexion inchangés |
| Liens sortants | Six guides (obligatoire), `/gestion-de-projets`, `/portail-client`, `/security`, `/pricing`, `/blog`, `/contact` |
| Liens entrants souhaités | Accueil (`#documents`), en-tête, pied de page, chaque guide, blogue, `/gestion-de-projets`, `/portail-client`, `/pricing`, `/programme-recommandation` |
| Destinations externes | Aucune (connexion via l'en-tête) |
| FR · EN | FR complet · EN complet (`productContent.documents`) |
| Claims REVIEW | 43 procédures intégrées ; « génération automatique » ; disponibilité PGC / PRA / PUE ; références réglementaires ; bilinguisme des documents |
| Risques | Perte de contenu riche du legacy (le V2 actuel est plus court) ; JSON-LD perdu ; guides orphelins ; cannibalisation avec les guides ; média historique |
| Dépendances | Hub `/guides` (PUBLISH-NOW, MIG-02) ; comparaison du contenu legacy ; restauration du JSON-LD |
| Lien avec l'accueil | Oui : section Documents (`#documents`), autorité produit |
| Intention · entité · territoire | Commerciale · CORO Documents · logiciel de production de PMU / PSI / PCA, conformité documentaire, workflow d'approbation |
| Thèmes secondaires | Génération de plans d'urgence, plan de sécurité incendie (outil), maintien et révision des documents, export |
| URL · action | `/gestion-documentaire` · PRESERVE |
| Directions | Title : outil de production de documents de conformité (marque en fin de titre) ; H1 : de l'information structurée aux plans approuvés ; description : production, validation et maintien des documents à partir des données du bâtiment |
| Structure H2/H3 | Données du bâtiment → génération → édition → approbation → types de documents → bilinguisme → intégration → FAQ |
| Données structurées | SoftwareApplication (module), FAQPage, BreadcrumbList ; à restaurer depuis le legacy |
| Cannibalisation | PMU, PSI, PCA (définitions : guides) ; PGC, PRA, PUE (produit non disponible : la page ne revendique pas la génération) |
| Contenu SEO historique | Description des types de documents et FAQ legacy |
| Média / alt | Alt décrivant ce que la capture démontre (éditeur, workflow), non pixel par pixel |
| Conversion | Démonstration ; secondaire : guide correspondant |

## 8.2 `/gestion-de-projets` — CORO Projects

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | V2 en cours → PUBLISH-NOW · Architectural / produit · SECONDARY-PRODUCT |
| Objet | Piloter mandats, activités, tâches, échéances et équipes reliés aux clients et aux bâtiments. |
| Audience · question | Firmes de conseil, responsables de portefeuille · Comment piloter mes mandats et mes échéances du démarrage à la livraison ? |
| CTA principal · secondaire | Démonstration · Voir CORO Performance |
| Héros | HeroSignature (mandat relié au bâtiment) ; lacune : pas de héros « produit / workflow » (D-08) |
| Sections | 01 Héros · 02 SectionStatement : du mandat à l'action · 03 FeatureIndex `steps` : client et bâtiment → mandat → activités → tâches → livrables · 04 Échéances et suivi (Timeline de démonstration marquée) · 05 SplitContent + capture : vue portefeuille · 06 Planificateur et réservations (seulement si public : claim REVIEW) · 07 Lien capacité / performance (EditorialBlock + lien) · 08 Accordion FAQ · 09 CTASection |
| Composants DS | HeroSignature, PageSection, FeatureIndex, Timeline, SplitContent, MediaFrame, Accordion, CTASection |
| Médias | `solutions/coro-gestion-projets.webp`, `solutions/en/coro-project-management.webp`, `public/screenshot-project.jpg` |
| Contenu à préserver | Vue portefeuille, clients et bâtiments multiples, activités et tâches, échéances réglementaires (calcul automatique : claim), planificateur, JSON-LD legacy, FAQ |
| Contrats | Aucun formulaire |
| Liens sortants · entrants | `/performance-objectifs`, `/portail-client`, `/gestion-documentaire`, `/contact`, `/pricing` · accueil, en-tête, pied de page, Documents, Performance |
| FR · EN | Complet · complet |
| Claims REVIEW | Calcul automatique des échéances réglementaires ; « temps réel » ; disponibilité du planificateur |
| Risques | Contenu legacy plus riche ; JSON-LD ; confusion avec Performance |
| Accueil | Oui (rôle : pilotage, écosystème) |
| SEO | Intention commerciale · CORO Projects · gestion de mandats pour firmes de conseil en sécurité / conformité · territoire : suivi de mandats et d'échéances, capacité en aval de Performance · title / H1 / description : piloter les mandats, les activités et les ressources · SoftwareApplication + FAQPage + BreadcrumbList · cannibalisation faible, séparer de Performance (mesure) |
| Conversion | Démonstration ; suite logique : Performance |

## 8.3 `/performance-objectifs` — CORO Performance

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | V2 en cours → PUBLISH-NOW · Architectural / données · SECONDARY-PRODUCT |
| Objet | Mesurer heures, budgets, charge, objectifs et écarts pour éclairer les décisions de gestion. Distinct de l'Indice CORO (résilience). |
| Audience · question | Directions de firme, chefs d'équipe · Comment transformer l'activité en capacité de pilotage ? |
| CTA | Démonstration · Voir CORO Projects |
| Héros | HeroSignature avec repère de données de démonstration ; lacune : héros « métrique » non construit (D-08) |
| Sections | 01 Héros · 02 SectionStatement : relier chaque chiffre à une décision · 03 MetricComposition (valeurs marquées démonstration) · 04 Heures et budget : FeatureIndex `rows` · 05 Capacity planning : SplitContent + capture · 06 Rendement par conseiller (EditorialBlock sobre) · 07 Des données à la décision (FeatureIndex `steps`, sans DataToActionFlow qui est réservé aux quatre concepts canoniques) · 08 Accordion FAQ · 09 CTASection |
| Composants DS | HeroSignature, MetricComposition, FeatureIndex, SplitContent, MediaFrame, Accordion, CTASection |
| Médias | `solutions/coro-performance-objectifs.webp`, `solutions/en/coro-performance-objectives.webp` |
| Contenu à préserver | Tableau de rendement, heures vs budget, capacity planning, rendement par conseiller, portefeuille, tendances |
| Liens · accueil | `/gestion-de-projets`, `/resilience-operationnelle` (distinction Indice), `/contact`, `/pricing` · rôle : décision et pilotage |
| FR · EN | Complet · complet |
| Claims REVIEW | « Temps réel » ; chiffres de démonstration ; suivi individuel (sensibilité) |
| Risques | Confusion Performance / Résilience ; métriques inventées |
| SEO | Commerciale · CORO Performance · suivi du rendement et de la capacité des conseillers · Software + FAQ + Breadcrumb · cannibalisation faible |
| Conversion | Démonstration ; suite : Projects |

## 8.4 `/portail-client` — CORO Client

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | V2 en cours → PUBLISH-NOW · Architectural (calme, premium) · SECONDARY-PRODUCT |
| Objet | Donner au client autorisé la bonne information sur le bon bâtiment dans un espace sécurisé. |
| Audience · question | Firmes qui servent des clients ; gestionnaires · Comment prolonger mon service auprès du client avec continuité du dossier ? |
| CTA principal · secondaire | Démonstration · Accéder au portail (`https://client.getcoro.io/login`) |
| Héros | HeroSignature (portefeuille de bâtiments) |
| Sections | 01 Héros · 02 SectionStatement : la continuité du dossier · 03 Tableau de bord (MediaFrame technique, capture réelle) · 04 Bâtiments et carte (MediaFrame + SplitContent) · 05 Cycle documentaire (FeatureIndex `steps` + capture) · 06 Activités et réservations (seulement si public) · 07 Résilience et incidents visibles au client (REVIEW : uniquement les capacités publiques) · 08 Accès et sécurité (TrustStrip sourcé) · 09 CTASection |
| Composants DS | HeroSignature, SplitContent, MediaFrame (technical), FeatureIndex, TrustStrip, CTASection |
| Médias réels | `solutions/portail-client/coro-portail-client-{tableau-de-bord, batiments, carte, activites, cycle-documentaire, espace-conseiller}.webp`, `solutions/en/coro-client-portal.webp` |
| Contenu à préserver | Suivi documentaire, Indice CORO et rôles d'urgence, intelligence multi-sites, gestion d'incidents depuis le portail, description du tableau de bord ; legacy de 1 706 lignes à comparer |
| Contrats | Destination `https://client.getcoro.io/login` inchangée |
| Liens · accueil | `/gestion-documentaire`, `/gestion-de-projets`, `/resilience-operationnelle`, `/security`, `/contact` · rôle : gestionnaires de portefeuille |
| FR · EN | Complet · complet |
| Claims REVIEW | Résilience « en temps réel », recommandations proactives, gestion d'incidents depuis le portail |
| Risques | Perte de contenu (legacy très riche) ; captures à jour ; JSON-LD |
| SEO | Commerciale · CORO Client · portail client pour firmes de conformité · territoire : portail client documents et bâtiments · Software + FAQ + Breadcrumb |
| Conversion | Démonstration ; le lien de connexion est de la navigation, pas une conversion |

## 8.5 `/resilience-operationnelle` — CORO Résilience / Indice CORO

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy → PUBLISH-NOW · Architectural + Opérationnel · MAJOR-LANDING |
| Objet | Mesurer la préparation (Indice CORO), coordonner l'incident et boucler par le retour d'expérience. Slug conservé malgré le nom produit « CORO Résilience ». |
| Audience · question | Responsables de mesures d'urgence, directions · Sommes-nous vraiment prêts, et comment progresser ? |
| CTA | Démonstration · Voir Sentinelle |
| Héros | HeroSignature ou HeroOperational avec repère d'Indice de démonstration (décision de composition au lot) |
| Sections | 01 Héros · 02 SectionStatement : un plan n'est utile que s'il peut être appliqué (formulation à valider) · 03 Présence réelle (OperationalScene `people`) · 04 Indice CORO : quatre composantes pondérées (MetricComposition) · 05 Substitution automatique des rôles (Timeline de démonstration) · 06 Incident : déclencher, notifier, mobiliser, agir (ProcessFlow REVIEW) · 07 Rapports et retour d'expérience (DocumentStatus REVIEW) · 08 Continuum et boucle d'amélioration (Continuum, séquence canonique) · 09 Accordion FAQ · 10 CTASection |
| Composants DS | HeroSignature ou HeroOperational, OperationalScene, MetricComposition, ProcessFlow, Continuum, Accordion, CTASection |
| Médias | `solutions/resilience/*` (indice, tableau de bord, module incident, rapport, organisation d'urgence, kiosque, intelligence organisationnelle), `solutions/en/coro-resilience-operationnelle.webp`, `solutions/coro-resilience-operationnelle.webp` |
| Contenu à préserver | Quatre piliers, Indice à quatre composantes, substitution des rôles, incident (déclencher, notifier, mobiliser, agir), rapports et REX, détection des lacunes, boucle plan → incident → plan amélioré, FAQ, JSON-LD (WebPage, BreadcrumbList, FAQPage) |
| Liens · accueil | `/sentinelle`, `/portail-client`, `/performance-objectifs` (distinction), guides PMU / PCA, `/contact` · rôle : mesure et amélioration continue |
| FR · EN | Complet · complet |
| Claims REVIEW | « Conforme ISO 22301 / CNPI 2020 / CNESST » ; conservation de 36 mois, 24 mois, 5 ans ; « rapport conforme prêt pour inspection » ; éditeur nommé « Coro Solutions Inc. » dans le JSON-LD |
| Risques | Allégations de conformité absolue ; cannibalisation avec Sentinelle, la page Incident (PUBLISH-NOW, MIG-04) et Exercices (REVIEW) ; contenu Incident sans page dédiée tant que MIG-04 n'est pas livré |
| SEO | Commerciale · CORO Résilience · indice de résilience, gestion d'incident, retour d'expérience · territoire : mesurer la préparation d'une organisation · structured data existant à préserver |
| Conversion | Démonstration ; suite : Sentinelle |

## 8.6 `/sentinelle` — CORO Sentinelle

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy → PUBLISH-NOW · Opérationnel · MAJOR-LANDING |
| Objet | Registre numérique de présence : savoir qui est dans le bâtiment, faciliter le décompte et l'évacuation. |
| Audience · question | Gestionnaires d'immeubles, responsables des mesures d'urgence · Qui est dans mon bâtiment et qui manque en cas d'évacuation ? |
| CTA | Démonstration · Voir CORO Résilience |
| Héros | HeroOperational (bâtiment vivant, plaque de démonstration marquée) |
| Sections | 01 Héros · 02 QR à l'entrée et code PIN (SplitContent + média) · 03 Présence actualisée (OperationalScene `lead` puis `plate`) · 04 Équipes d'urgence et substitution (ActionItem, Timeline) · 05 Évacuation et point de rassemblement (OperationalScene `people`, PeopleStatus) · 06 Personnes manquantes : de « combien ? » à « qui ? » · 07 Types d'occupants et environnements · 08 Un bâtiment aujourd'hui, plusieurs sites demain (seulement les capacités disponibles) · 09 Registre papier ou numérique ? (comparaison sobre) · 10 Écosystème CORO et FAQ · 11 CTASection |
| Composants DS | HeroOperational, OperationalScene, PeopleStatus, ActionItem, Timeline, StatusChip, Accordion, CTASection |
| Médias | `public/images/sentinelle/*` (huit visuels : QR, PIN, registre, temps réel, évacuation, point de rassemblement, personnes manquantes, multi-sites) ; pack V2 `website-v2/sentinel/*` (provenance à valider) |
| Contenu à préserver | Les sections du registre listées ci-dessus, les plans et prix affichés (à réconcilier avec `/pricing` avant republication), FAQ à quatre questions, JSON-LD SoftwareApplication + FAQPage, contenu EN existant |
| Contrats | Aucun formulaire ; le QR et le PIN sont des fonctions de l'application, pas du site |
| Liens · accueil | `/resilience-operationnelle`, `/sentinelle-population` (périmètre distinct), `/portail-client`, guides PMU / PSI, `/contact` · rôle : le bâtiment vivant |
| FR · EN | FR complet · contenu EN présent dans le code (statut : voir §14) |
| Claims REVIEW | Prix affichés dans la page (149 $ ; à partir de 249 $) en contradiction avec `/pricing` (R-13) ; « temps réel » ; conformité au décompte ; capacités livrées dans l'application (bouton panique, SMS, import d'employés, substitution) : publier seulement après audit de vérité fonctionnelle ; l'incident a sa propre page (`/coro-incident`) ; multi-sites |
| Risques | Sentinelle réduite à un registre / QR (interdit) ; contradiction registre / sitemap / métadonnées ; cannibalisation avec Résilience |
| SEO | Commerciale · CORO Sentinelle · registre de présence numérique, évacuation, décompte · title actuel : « registre de présence numérique et évacuation » · Software + FAQ |
| Conversion | Démonstration ; suite : Résilience |

## 8.7 `/sentinelle-population` — Sentinelle Population

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy → PUBLISH-NOW · Technique + Opérationnel · MAJOR-LANDING |
| Objet | Aider les installations industrielles à préparer, activer, diffuser et documenter les communications à la population dans le cadre du PUE. |
| Audience · question | Responsables d'installations soumises au Règlement sur les urgences environnementales · Mon PUE prévoit l'alerte : comment la rendre opérationnelle ? |
| CTA | Démonstration · Voir le fonctionnement |
| Héros | HeroOperational (marine) ; lacune : pas de héros cartographique (D-08) |
| Sections | 01 Héros (H1 « Votre PUE prévoit l'alerte à la population… ») · 02 Problème : un plan d'alerte ne devrait pas rester dans un classeur · 03 Avant / pendant / après (Continuum ou FeatureIndex) · 04 Mise en situation fictive : fuite d'ammoniac en dix étapes (ScenarioFlow REVIEW ; marquée fictive) · 05 Zone potentiellement concernée (MapFrame, densité `ref`) · 06 Portail citoyen d'inscription · 07 Ce que le produit apporte sur le terrain · 08 Traçabilité et REX · 09 Cadre réglementaire et avis de non-garantie · 10 Deux périmètres complémentaires (avec Sentinelle) · 11 Accordion FAQ · 12 CTASection |
| Composants DS | HeroOperational, MapFrame, ScenarioFlow, OperationalScene, Timeline, Accordion, CTASection |
| Médias | `public/images/sentinelle_population/*` (19 visuels) |
| Contenu à préserver | Toute la mise en situation, les phases, les valeurs, la note « ne garantit pas la conformité » (à conserver mot pour mot), la FAQ (JSON-LD FAQPage), le renvoi au configurateur PUE « évolution prévue » |
| Liens · accueil | Guide PUE, `/sentinelle`, `/resilience-operationnelle`, `/security` (données), `/contact` · rôle : territoire et population |
| FR · EN | FR complet · EN absent (voir §14) |
| Claims REVIEW | Règlement (2019) et références ; « abonnés actifs », canaux, preuves de livraison ; portée (ne pas laisser croire à une application universelle) |
| Risques | Faux signal EN ; chaînes hors dictionnaire ; cannibalisation avec le guide PUE ; esthétique de catastrophe (interdite) |
| SEO | Commerciale · Sentinelle Population · alerte à la population liée au PUE · le guide PUE possède la définition et le règlement ; cette page possède le logiciel · FAQPage existant à préserver |
| Conversion | Démonstration ; suite : guide PUE (informationnel) |

## 8.8 `/pricing`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy → PUBLISH-NOW · Minimal / conversion · SUPPORT |
| Objet | Expliquer la logique de tarification (configuration selon sites, utilisateurs, capacités, accompagnement) et mener à la démonstration. |
| Audience · question | Décideurs · Combien cela coûte-t-il et de quoi dépend le prix ? |
| CTA | Demander une démo · Voir les facteurs de configuration |
| Héros | Minimal : SectionStatement (lacune : HeroMinimal non construit, D-08) |
| Sections | 01 Ouverture minimale · 02 Facteurs qui déterminent la configuration (FeatureIndex `rows`, quatre facteurs) · 03 Trois profils indicatifs (comparaison justifiée ; utiliser les primitives approuvées, pas de mur de cartes) · 04 Programme fondateur (REVIEW) · 05 Accordion FAQ · 06 CTASection |
| Composants DS | SectionStatement, PageSection, FeatureIndex, SplitContent, Accordion, CTASection |
| Contenu à préserver | Aucun prix fixe publié ; disclaimer « aucun profil n'est un forfait fixe » ; FAQ ; JSON-LD WebPage + BreadcrumbList + FAQPage |
| Liens · accueil | Pages produit, `/contact`, `/programme-recommandation` · rôle : décision |
| FR · EN | Complet · complet |
| Claims REVIEW | « Réponse sous 24 heures » (NE PAS MIGRER par défaut) ; « Conçu par des praticiens » ; avantages du programme fondateur (NE PAS MIGRER automatiquement) ; profils inclus ; tout prix éventuel |
| Risques | Prix non validés (le prix constitue le principal contrat commercial) ; FAQ à jour |
| SEO | Commerciale (décision) · Tarification CORO · territoire : prix du logiciel, facteurs de configuration · FAQPage à préserver |
| Conversion | Démonstration (intention forte) |

## 8.9 `/security`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy → PUBLISH-NOW · Technique / confiance · SUPPORT (sept sections issues du contenu existant) |
| Objet | Faire de la sécurité une preuve vérifiable : hébergement, chiffrement, contrôle des accès, continuité, périmètre, vie privée. |
| Audience · question | Acheteurs, TI, juridique · Mes données sont-elles protégées et où sont-elles hébergées ? |
| CTA | Écrire pour la documentation technique (mailto existant) · Demander une démonstration |
| Héros | Minimal (SectionStatement ou HeroTechnical léger ; D-08) |
| Sections | 01 La sécurité fait partie de l'architecture · 02 Approche pour environnements professionnels (TrustStrip sourcé) · 03 Hébergement et souveraineté · 04 Limiter l'accès au strict nécessaire · 05 Intégrité et disponibilité · 06 Réduire la surface d'exposition · 07 Alignement sur les obligations canadiennes (lien `/privacy`) · 08 Aller plus loin (documentation technique) · 09 CTASection |
| Composants DS | SectionStatement, PageSection, TrustStrip, EditorialBlock, FeatureIndex, CTASection |
| Contenu à préserver | Toutes les sections FR et EN ; JSON-LD WebPage et SoftwareApplication ; adresse mailto de documentation |
| Liens · accueil | `/privacy`, `/terms`, pages produit, `/contact` · rôle : confiance |
| FR · EN | Complet · complet |
| Claims REVIEW | Hébergement (Toronto, Ontario), chiffrement HTTPS/TLS, sauvegardes, surveillance, MFA, fournisseurs, SLA : chaque énoncé renvoie à sa source ou reste « À valider » |
| Risques | Sur-promesse de sécurité ; valeurs périmées |
| SEO | Informationnelle et confiance · Sécurité et hébergement CORO · données au Canada · structured data existant |
| Conversion | Contact / documentation avant démonstration |

## 8.10 `/` — Accueil (référence de connexion, PAS de conception)

L'accueil est reconstruit en DERNIER (MIG-10), une fois toutes ses destinations prêtes. Il n'est pas redessiné ici : `01-strategy/HOMEPAGE-V2-BLUEPRINT.md` reste sa narration cible. Ce blueprint ne fixe que son rôle et ses connexions.

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy monolithique (HomePageClient, 9 032 lignes) → PUBLISH-NOW · Architectural (passages opérationnels) · MAJOR-LANDING |
| Rôle | ROUTEUR NARRATIF + ROUTEUR D'ÉCOSYSTÈME + AUTORITÉ SEO + POINT D'ENTRÉE DE CONVERSION |
| Audience · question | Tous les publics · Qu'est-ce que CORO et comment relie-t-il documents, bâtiments, personnes et opérations ? |
| CTA principal · secondaire | Demander une démonstration (`#demo`) · Explorer l'écosystème |
| Sections | Les quatorze sections du blueprint d'accueil (héros architectural, tension, continuum, écosystème, du bâtiment à la décision, Documents, Sentinelle, Incident, Population, Exercices et REX, Résilience, Client / multi-sites, confiance, CTA final) ; chaque section n'existe que si sa destination est prête (§19) |
| Contrats à préserver | Capture `?ref=CR-[A-HJ-NP-Z2-9]{6}` et cookies `coro_referral_code`, `coro_referral_first_touch` (90 jours, `.getcoro.io`) ; lecture par `DemoForm` ; section `#demo` ; ancres historiques (`#continuum`, `#indice-coro`, `#sentinelle`, `#evacuation`, `#module-incident`, `#plateforme`, `#documents`, `#solutions`, `#environments`, `#pricing`, `#security`, `#demo`) ; vidéo locale ; JSON-LD WebSite + Organization ; SSR de la langue |
| SEO | Commerciale et navigationnelle · CORO comme plateforme de résilience opérationnelle · territoire : catégorie et marque · canonical propre sans `?ref` ; FR / EN rendus côté serveur · ne pas dupliquer le H1 ni la description des pages produit |
| Risques | Très élevés (référence, `DemoForm`, ancres, vidéo, langue, JSON-LD) |
| Dépendances | Toutes les destinations du §19 prêtes ; adoption des jetons V1 ; pied de page unique |

# 9. Blueprints — pages institutionnelles (déjà partiellement V2)

Ces pages utilisent déjà le shell V2 avec les jetons legacy. Elles ne sont pas reconstruites maintenant ; le blueprint indique ce qui est PRÉSERVÉ, ADAPTÉ, REMPLACÉ PAR DES COMPOSANTS V1.

## 9.1 `/about`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | V2 migrée → PUBLISH-NOW · Éditorial (architectural léger) · SUPPORT (dix sections existantes ; le contenu prime sur le quota) |
| Objet · question | Raconter pourquoi CORO existe et son continuum · Qui est CORO et quelle est sa vision ? |
| CTA | Demander une démonstration · Explorer l'écosystème |
| Sections actuelles | Héros · pourquoi · évolution · identité · vision · continuum · données · cycle de vie · humain · réseau · CTA |
| PRÉSERVÉ | Tout le contenu FR / EN, JSON-LD AboutPage, métadonnées, `id` d'accessibilité |
| ADAPTÉ | Jetons V1 (scope `data-coro-system`), pied de page unique, titre sans double marque (R-12) |
| REMPLACÉ PAR V1 | La liste du continuum par le composant `Continuum` (séquence canonique déjà présente), sections par PageSection / SectionStatement / EditorialBlock / SplitContent, média par MediaFrame |
| Liens | Sortants : `/`, pages produit, `/partners`, `/contact` ; entrants : pied de page, accueil |
| FR · EN | Complet · complet |
| SEO | Informationnelle et de marque · entité CORO / entreprise · pas de territoire concurrent ; AboutPage à préserver |
| Claims REVIEW | Énoncés d'entreprise (histoire, réseau) ; identité légale |
| Risques | Faible |

## 9.2 `/contact`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | V2 migrée → PUBLISH-NOW · Minimal / conversion · UTILITY |
| Objet | Point de contact et formulaire de démonstration. |
| PRÉSERVÉ | `DemoForm` (fournisseur, destination et lecture des cookies de parrainage inchangés), courriel, téléphone, adresse (typographie REVIEW), métadonnées |
| ADAPTÉ | Jetons V1, pied de page unique |
| REMPLACÉ PAR V1 | Mise en page (PageSection, EditorialBlock) ; `LeadForm` (REVIEW) NE remplace PAS `DemoForm` sans la décision de migration du formulaire (D-13) |
| Liens | Entrants : CTA de toutes les pages, pied de page ; sortants : `/privacy`, `/security` |
| Contrats | Formulaire, parrainage (lecture des cookies), fournisseur, message de succès |
| Claims REVIEW | « Nous vous contacterons dans les 24 heures » (message de succès) : NE PAS MIGRER par défaut, retrait ou remplacement lors du lot de migration de `DemoForm` ; adresse (typographie REVIEW) |
| SEO | Navigationnelle · contact et démonstration · title / description existants |
| Risques | Moyen (formulaire, parrainage) |

## 9.3 `/partners`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | V2 migrée → PUBLISH-NOW · Éditorial / minimal · SUPPORT |
| Objet | Présenter l'écosystème de partenaires pour les professionnels du bâtiment, de la sécurité et de la résilience. |
| PRÉSERVÉ | Contenu FR / EN, métadonnées |
| ADAPTÉ · REMPLACÉ | Jetons V1 ; composition en PageSection, FeatureIndex, EditorialBlock |
| Liens | Entrants : pied de page ; sortants : `/contact`, `/programme-recommandation` |
| Claims REVIEW | Toute affirmation sur des partenaires réels ; aucun logo sans autorisation |
| SEO | Informationnelle · partenaires CORO · faible enjeu |
| Risques | Faible |

## 9.4 `/programme-recommandation`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | V2 migrée → PUBLISH-NOW · Éditorial / minimal · SUPPORT |
| Objet | Expliquer le programme de recommandation et ses conditions. |
| PRÉSERVÉ | Montant et conditions (250 $ de crédit, deux blocs de conditions, testés), format du code `CR-…`, métadonnées FR / EN |
| ADAPTÉ · REMPLACÉ | Jetons V1 ; composition en PageSection, FeatureIndex ; corriger le débordement de 5 px à 320 px (LEGACY-DEBT) |
| Contrats | Le programme dépend de la capture de `?ref=` sur `/` et de la lecture par `DemoForm` : aucune modification |
| Liens | Entrants : pied de page ; sortants : `/contact`, `/pricing` |
| Claims REVIEW | Montant, conditions d'admissibilité |
| SEO | Informationnelle et commerciale · programme de recommandation · territoire propre |
| Risques | Moyen (règles commerciales) |

# 10. Blueprints — ressources et légal

## 10.1 Guides (six pages `/documents/plan-*`)

Gabarit commun. Chaque guide reste une page éducative FR indexable, autorité informationnelle sur son document.

| Champ | Blueprint commun |
|---|---|
| Statut · famille · profondeur | Legacy → PUBLISH-NOW · Éditorial + Technique · EDITORIAL |
| Objet | Expliquer un type de plan : définition, cadre légal, contenu, planification, références ; et pont vers le produit. |
| Audience · question | Responsables de bâtiments, conseillers, juristes · Qu'est-ce que ce plan, est-il obligatoire et que doit-il contenir ? |
| CTA | Principal : lire le guide lié / suite logique ; secondaire : découvrir CORO Documents ; conversion : démonstration en fin de page |
| Héros | HeroTechnical léger ou SectionStatement (D-08) |
| Sections | 01 Ouverture et sommaire · 02 Qu'est-ce que ce plan · 03 Cadre légal applicable · 04 Bâtiments ou organisations visés · 05 Contenu type · 06 Élaboration et mise à jour · 07 Différences avec les plans voisins (liens croisés) · 08 Produire ce document avec CORO Documents (SplitContent ; disponibilité exacte : PMU / PSI / PCA, Phase 2 pour PGC / PRA / PUE) · 09 Accordion FAQ · 10 Guides liés (FeatureIndex `rows`) · 11 CTASection |
| Composants DS | HeroTechnical, SectionStatement, EditorialBlock, Accordion, FeatureIndex, SplitContent, CTASection |
| Contenu à préserver | Tout le texte (références réglementaires et citations à valider), FAQ, JSON-LD (WebPage avec sujets, BreadcrumbList Accueil › Documents › guide, FAQPage), liens de partage, lien vers le blogue |
| Liens sortants | `/gestion-documentaire` (obligatoire), guides voisins, blog, `/contact` |
| Liens entrants | `/gestion-documentaire`, hub `/guides`, pied de page, blogue, autres guides |
| FR · EN | FR seulement au lancement ; EN = FUTURE (voir §17) |
| Claims REVIEW | Toutes les références légales et réglementaires ; dates ; « obligatoire » selon le bâtiment |
| Risques | Guides orphelins (R-03) ; références périmées ; cannibalisation avec la page produit |
| SEO | Informationnelle · entité : le plan (PMU, PSI, PCA, PGC, PRA, PUE) · territoire : définition, obligations, contenu · canonical FR propre, pas d'EN, `hreflang` `fr-CA` et `x-default` seulement · JSON-LD à préserver · alt sur les médias |

Différences par guide :

| Guide | Territoire propre | Disponibilité produit (à énoncer exactement) | Guides voisins à lier | Point de vigilance |
|---|---|---|---|---|
| PMU | Plan de mesures d'urgence : responsabilités, procédures, cadre légal au Québec | Disponible | PSI, PCA, PGC | Références légales |
| PSI | Plan de sécurité incendie : bâtiments visés (CNPI, Code de sécurité du Québec), contenu | Disponible | PMU, PCA | Codes et articles |
| PCA | Continuité des activités : activités critiques, analyse d'impact, secteurs exigés | Disponible | PRA, PGC, PMU | Cadre variable selon le secteur |
| PGC | Gestion de crise : cadre décisionnel, différence urgence / crise | Phase 2 (pas de configurateur) | PMU, PCA, PRA | Ne pas revendiquer la génération |
| PRA | Reprise des activités (DRP) : PRA vs PCA | Phase 2 (pas de configurateur) | PCA, PGC | Chevauchement avec PCA |
| PUE | Urgence environnementale : Règlement (2019), assujettissement | Phase 2 (pas de configurateur) | PGC, PMU + `/sentinelle-population` | Références fédérales ; lien vers Sentinelle Population |

## 10.2 `/blog` et `/blog/[slug]`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy dynamique → LEGACY-PRESERVE · Éditorial · EDITORIAL |
| Objet | Contenu éditorial dynamique alimentant l'autorité du site et le maillage vers les produits et guides. |
| PRÉSERVÉ | Slugs, titres, contenu FR, contenu EN uniquement si `titleEn` et `contentEn` existent, images, catégories (`?category=`), dates, JSON-LD d'article, métadonnées |
| Contrat dynamique | API `blog/public` et `blog/public/{slug}` via `serverApiUrl` ; `revalidate = 0` et `cache: no-store` ; le sitemap lit aussi l'API et renvoie une liste vide en cas d'échec (perte silencieuse d'articles) |
| ADAPTÉ | Enveloppe (SiteHeader, SiteFooterV2, Container, typographie) ; jamais le contenu à l'aveugle |
| Liens | Chaque article lie une page produit ou un guide pertinent ; l'index lie les guides |
| FR · EN | FR ; EN par article traduit |
| SEO | Informationnelle, longue traîne · un territoire par article, sans concurrencer un guide ou une page produit |
| Risques | Très élevés : slugs, images en base, traductions, sitemap, dépendance à `coro_backend` |

## 10.3 `/privacy` et `/terms`

| Champ | Blueprint |
|---|---|
| Statut · famille · profondeur | Legacy → LEGACY-PRESERVE · Légal · LEGAL |
| Priorités | Préservation de l'URL et du contenu ; lisibilité ; métadonnées ; intégrité juridique |
| PRÉSERVÉ | Texte complet FR / EN, sections numérotées, coordonnées de l'entreprise |
| ADAPTÉ | Enveloppe (largeur de lecture, sommaire pour un texte long, PageSection, EditorialBlock) ; aucune réécriture du sens |
| Liens | Entrants : pied de page, formulaire (`/privacy` depuis `DemoForm`), `/security` ; sortants : `/contact` |
| Claims REVIEW | Identité légale (`/terms` désigne un exploitant individuel), hébergement, fournisseurs ; à ne pas harmoniser sans décision |
| SEO | Navigationnelle et légale · faible enjeu, mais indexables ; canonical et hreflang FR / EN existants |
| Risques | Élevés (juridique) |

## 10.4 Hubs cibles

| Route | Statut | Blueprint minimal |
|---|---|---|
| `/guides` | PUBLISH-NOW (MIG-00A-B) | Éditorial + Technique · SUPPORT · sections : ouverture (SectionStatement) · les six guides en index (FeatureIndex `rows`, chacun avec sa disponibilité produit exacte) · pont vers CORO Documents · blogue récent · CTA. Objectif : corriger l'orphelinat (R-03) et donner une entrée de maillage aux guides. Promotion à PUBLISH-NOW sur décision D-09. |
| `/ressources` | FUTURE | Non créé : `/guides` et `/blog` suffisent. |
| `/conformite-reglementation` | REVIEW / MERGE-REVIEW | Non créée : exige une validation juridique des références ; intention à comparer à `/guides`, `/security`, aux guides et au blogue ; aucune fusion approuvée. |


# 11. Territoires sémantiques

Aucun volume de recherche ni classement n'est inventé : les territoires sont des intentions éditoriales, à valider avec des données réelles (Search Console) en MIG-12.

| Territoire | Page propriétaire | Type d'intention | Pages de soutien (ne doivent pas viser la même requête) |
|---|---|---|---|
| Plateforme de résilience opérationnelle (catégorie, marque) | `/` | Commerciale / navigationnelle | Toutes les pages produit |
| Gestion documentaire d'urgence et de continuité | `/gestion-documentaire` | Commerciale | Six guides |
| Définition et obligations de chaque plan (PMU, PSI, PCA, PGC, PRA, PUE) | Guide correspondant | Informationnelle | Blog, `/gestion-documentaire` |
| Gestion de projets de conseil en résilience | `/gestion-de-projets` | Commerciale | — |
| Suivi de performance et objectifs | `/performance-objectifs` | Commerciale | — |
| Portail client et livrables partagés | `/portail-client` | Commerciale | `/sentinelle` (accès client) |
| Résilience opérationnelle, indice CORO | `/resilience-operationnelle` | Commerciale / informationnelle | Blog |
| Registre d'occupation, présence, évacuation | `/sentinelle` | Commerciale | `/sentinelle-population` |
| Population, urgence environnementale, populations avoisinantes | `/sentinelle-population` | Commerciale | Guide PUE |
| Sécurité, hébergement, protection des données | `/security` | Confiance | `/privacy` |
| Confidentialité (loi 25, renseignements personnels) | `/privacy` | Légale | `/security` |
| Tarification et modèle commercial | `/pricing` | Commerciale | `/programme-recommandation` |
| Programme de recommandation | `/programme-recommandation` | Commerciale | — |
| Entreprise, vision | `/about` | De marque | — |
| Partenaires | `/partners` | Informationnelle | — |
| Contact / démonstration | `/contact` | Navigationnelle | Tous les CTA |
| Incident (PUBLISH-NOW), exercices et REX (REVIEW) | `/coro-incident`, `/coro-exercices` | Commerciale | `/resilience-operationnelle` |

# 12. Carte de cannibalisation

| Paire ou groupe | Risque | Règle de partage |
|---|---|---|
| `/gestion-documentaire` vs les six guides | Élevé : mêmes mots-clés (plan d'urgence, plan de continuité) | La page produit vend le logiciel et énumère les documents ; chaque guide explique le plan. La page produit n'utilise pas la définition complète ; les guides ne détaillent pas les fonctions produit. Lien réciproque obligatoire. |
| `/resilience-operationnelle` vs `/sentinelle` vs `/coro-incident` (PUBLISH-NOW) vs exercices (REVIEW) | Élevé | Résilience = indice, méthode, tableau de bord ; Sentinelle = présence et évacuation du bâtiment ; Incident = déclenchement et coordination ; Exercices = simulation et REX. Chaque page ne définit que son objet et renvoie aux autres. |
| `/sentinelle-population` vs guide PUE | Moyen | Le guide explique l'obligation ; la page produit décrit l'outil. Aucun paragraphe dupliqué. |
| `/security` vs `/privacy` | Moyen | Sécurité = mesures techniques et hébergement ; confidentialité = traitement des renseignements personnels. |
| `/` vs pages produit | Moyen | L'accueil décrit la catégorie et route ; il ne reprend pas les descriptions des produits. |
| `/pricing` vs `/programme-recommandation` | Faible | Le programme n'est pas un prix ; lien croisé uniquement. |
| Guides entre eux (PCA vs PRA, PMU vs PGC) | Moyen | Section « différences avec les plans voisins » avec liens ; chacun garde sa définition. |
| Blog vs guides | Moyen | Un article ne cible pas la requête d'un guide ; il lie le guide. |
| `/coro-platform`, `/resilience-operations` vs leurs équivalents | Doublons possibles | MERGE-REVIEW seulement s'ils existent au code ; jamais décidé ici. |

# 13. Carte du maillage interne

Règles : aucune page orpheline ; chaque page a un parent, un chemin de retour, au moins un lien entrant depuis une page de rang supérieur ; chaque lien a une destination existante ; le lien vers une page FUTURE est interdit.

| Page | Parent | Enfants / associées | Soutien ressources | Retour | Destination CTA |
|---|---|---|---|---|---|
| `/` | — | Tous les produits | Blog | — | `#demo` |
| `/gestion-documentaire` | Plateforme | Six guides (à ajouter : R-03) | Blog | `/` | `/contact` |
| `/gestion-de-projets` | Plateforme | `/portail-client`, `/performance-objectifs` | — | `/` | `/contact` |
| `/performance-objectifs` | Plateforme | `/gestion-de-projets` | — | `/` | `/contact` |
| `/portail-client` | Plateforme | `/sentinelle` | — | `/` | `/contact` |
| `/resilience-operationnelle` | Résilience | `/sentinelle`, `/sentinelle-population` | Blog | `/` | `/contact` |
| `/sentinelle` | Résilience | `/sentinelle-population`, `/resilience-operationnelle` | Blog | `/` | `/contact` |
| `/sentinelle-population` | Résilience | Guide PUE, `/sentinelle` | Guide PUE | `/` | `/contact` |
| `/pricing` | — | `/programme-recommandation` | — | `/` | `/contact` |
| `/security` | Confiance | `/privacy` | — | `/` | `/contact` |
| `/about`, `/partners`, `/programme-recommandation`, `/contact` | Entreprise | Entre elles | — | `/` | `/contact` |
| Guides | `/gestion-documentaire` (ou `/guides`) | Guides voisins | Blog | `/gestion-documentaire` | `/contact` |
| `/blog`, `/blog/[slug]` | Ressources | Produits, guides | — | `/blog` | `/contact` |
| `/privacy`, `/terms` | Légal | — | — | `/` | — |

Correction prioritaire (R-03) : ajouter, dès MIG-02, une section « Guides » sur `/gestion-documentaire`, puis le pied de page et `/guides` en MIG-07 / MIG-11.

# 14. Parcours utilisateurs

| # | Rôle | Tâche | Chemin |
|---|---|---|---|
| 1 | Responsable de bâtiment | Produire son plan d'urgence | `/` → guide PMU → `/gestion-documentaire` → `/contact` |
| 2 | Conseiller en résilience | Gérer ses mandats | `/` → `/gestion-de-projets` → `/portail-client` → `/pricing` → `/contact` |
| 3 | Gestionnaire de site | Savoir qui est dans le bâtiment | `/` → `/sentinelle` → `/sentinelle-population` → `/contact` |
| 4 | Direction / risque | Mesurer sa résilience | `/` → `/resilience-operationnelle` → `/security` → `/contact` |
| 5 | Acheteur / TI | Évaluer la confiance | `/pricing` → `/security` → `/privacy` → `/contact` |
| 6 | Parrain / partenaire | Recommander CORO | `/programme-recommandation` → `/partners` → `/contact` |

# 15. Carte de conversion

La démonstration n'est pas le réflexe de toutes les pages : le CTA suit l'intention.

| Type de page | CTA principal | CTA secondaire | Note |
|---|---|---|---|
| Accueil | Demander une démonstration | Explorer l'écosystème | |
| Produit | Demander une démonstration | Page voisine | `DemoCTA` en fin de page |
| Guide | Guide ou produit lié | Démonstration en fin | Éducatif d'abord |
| Blog | Article ou guide lié | Démonstration | |
| Tarification | Parler à l'équipe | Programme de recommandation | Aucun prix inventé |
| Sécurité | Contacter l'équipe | `/privacy` | Confiance avant vente |
| Légal | Aucun | Contact | |
| À propos | Explorer l'écosystème | Démonstration | |
| Contact | Envoyer le formulaire | — | `DemoForm` |

# 16. Planification linguistique — Sentinelle

| Route | Constat | Exigence de migration |
|---|---|---|
| `/sentinelle` | Contenu bilingue (`?lang=en`), registre `en:false`, sitemap FR + EN, métadonnées statiques FR (R-01) | Cible FR + EN ; auditer, compléter et valider le contenu EN en MIG-04 ; basculer métadonnées et canonical selon la langue ; corriger registre et sitemap |
| `/sentinelle-population` | hreflang, titre et description EN annoncés, mais contenu toujours FR (R-02) : défaut de migration | Cible FR + EN ; vraie traduction complète créée et validée en MIG-05 ; aucun hreflang EN vers du contenu français d'ici là ; aucune traduction fabriquée |

# 17. Guides : FR uniquement

- FR seulement au lancement ; EN = FUTURE.
- `hreflang` : `fr-CA` et `x-default` (FR) ; pas de `en-CA` sans contenu réel.
- Canonical FR autoréférencé ; pas de `?lang=en` indexable.
- Sitemap : FR seulement (déjà le cas).

# 18. Contrat du blogue et récupérations préalables

À récupérer ou vérifier avant MIG-07 (le backend local est inaccessible) :

1. Nombre d'articles publiés et liste des slugs (production).
2. Existence de `titleEn` / `contentEn` par article et comportement de repli.
3. Références d'images en base (URL, hôte, dimensions, texte alternatif).
4. Comportement du canonical avec `?category=` et `?lang=`.
5. Échec de l'API : la page et le sitemap doivent échouer proprement, sans perte silencieuse d'URL.
6. Stratégie de build : `revalidate = 0` et `no-store` contre un rendu statique incrémental (décision D-11).

# 19. Matrice de connexion de l'accueil

| Concept | Page cible | Rôle | Statut | Prête avant l'accueil ? |
|---|---|---|---|---|
| Documents | `/gestion-documentaire` | Produit | PUBLISH-NOW | Oui (MIG-02) |
| Projets | `/gestion-de-projets` | Produit | PUBLISH-NOW | Oui (MIG-02) |
| Performance | `/performance-objectifs` | Produit | PUBLISH-NOW | Oui (MIG-02) |
| Portail client | `/portail-client` | Produit | PUBLISH-NOW | Oui (MIG-02) |
| Résilience / indice | `/resilience-operationnelle` | Produit | PUBLISH-NOW | Oui (MIG-03) |
| Sentinelle | `/sentinelle` | Produit | PUBLISH-NOW | Oui (MIG-04) |
| Population | `/sentinelle-population` | Produit | PUBLISH-NOW | Oui (MIG-05) |
| Incident | `/coro-incident` | Produit (audit de vérité fonctionnelle préalable) | PUBLISH-NOW | Oui (MIG-04) |
| Exercices et REX | `/coro-exercices` | Statut REVIEW | REVIEW | Non : aucun lien de destination ; présentation sans lien |
| Confiance | `/security`, `/pricing` | Confiance | PUBLISH-NOW | Oui (MIG-06) |
| Guides | `/guides` ou six guides | Autorité | PUBLISH-NOW | Oui (MIG-07) |
| Démonstration | `#demo`, `/contact` | Conversion | PUBLISH-NOW | Oui |

# 20. Proposition de navigation

**Option A (recommandée)** : Plateforme (Documents, Projets, Performance, Client, Sécurité) · Résilience et opérations (Résilience / Indice CORO, Sentinelle, Incident, Sentinelle Population) · Ressources (Blogue, Guides) · Entreprise (À propos, Partenaires, Recommandation, Contact) · Tarification · Connexion · CTA démonstration. « Solutions » reste FUTURE tant qu'il n'existe pas deux pages de solution différenciées.

**Option B** : la navigation à six éléments du document d'architecture cible.

| Surface | Lancement | Futur |
|---|---|---|
| Bureau | Option A (Incident et Guides inclus) | Exercices (REVIEW), Intelligence, Solutions |
| Mobile | Mêmes groupes, accordéons ; CTA en bas | Idem |
| Pied de page | Plateforme, Résilience et opérations, Entreprise, Légal, Accès + groupe Ressources avec les guides (changement de `footer-content.ts` reporté à MIG-11) | Idem |

Aucun lien sans destination.

# 21. Ordre de migration

| Étape | Contenu | Note |
|---|---|---|
| MIG-00B | Fondations d'intégration (voir §22) | Prérequis |
| MIG-01 | Institutionnel : about, contact, partners, recommandation | Déjà en V2 ; alignement jetons |
| MIG-02 | Quatre produits + hub `/guides` | Section Guides sur `/gestion-documentaire` et hub disponibles pour le maillage (R-03) |
| MIG-03 | `/resilience-operationnelle` | Revue des affirmations ISO / CNPI / CNESST |
| MIG-04 | `/sentinelle` + `/coro-incident` | Langue EN (audit) ; prix à revoir (R-13) ; audit de vérité fonctionnelle Incident avant le texte |
| MIG-05 | `/sentinelle-population` | Traduction EN réelle validée (R-02) |
| MIG-06 | `/pricing`, `/security` | |
| MIG-07 | Blogue, guides, ressources : achèvement | Inventaire de production du blogue préalable |
| MIG-08 | `/privacy`, `/terms` | Juridique |
| MIG-09 | Restant | |
| Point de contrôle | Toutes les destinations de l'accueil prêtes | Obligatoire |
| MIG-10 | Accueil | Dernier |
| MIG-11 | Navigation et maillage | |
| MIG-12 | SEO, FR / EN, données structurées | |
| MIG-13 | QA, exploration, Go / No-Go | |

Ajustements justifiés par les preuves : `/guides` et le lien depuis `/gestion-documentaire` sont disponibles dès MIG-02 ; `/coro-incident` est livré en MIG-04, avant le point de contrôle. La validation SEO publique (§26.6) précède chaque rédaction de page.

# 22. Entrées pour MIG-00B (à décider, pas à implémenter)

| Sujet | Recommandation |
|---|---|
| Activation de `data-coro-system="v1"` | Par page migrée, pas globalement avant l'accueil |
| Isolation des routes / layouts V2 | Groupe de routes distinct ; le layout racine legacy reste pour les pages non migrées |
| Intégration de `SiteFooterV2` | Sur les pages migrées ; pied legacy retiré page par page |
| Pied de page legacy, chat, cookies, retour en haut | Isoler dans le layout legacy (R-10) |
| Lien d'évitement et cible du focus | Un seul lien d'évitement vers `main` avec `tabIndex=-1` |
| Architecture de la langue et `html lang` | Décision D-12 : lang dynamique sans casser le cache |
| Métadonnées, canonical, hreflang | Via `buildPageMetadata` ; corriger R-01 et R-02 |
| Sitemap | Piloté par le registre (remplacer la liste manuelle) |
| JSON-LD | Composant commun ; préserver l'existant (R-04) |
| Barrière du Design Lab | `/design-lab` masqué en production |
| Stratégie des dialogues | Un contrat commun pour modales et formulaires |
| Préservation du parrainage | Aucun changement de capture ni de cookies |
| Migration de `DemoForm` | Conserver l'existant ; `LeadForm` est REVIEW |
| Contrat d'exécution du blogue | Décision D-11 |

# 23. Registre futur / masqué

| Route | Statut | Condition d'ouverture |
|---|---|---|
| `/design-lab` | HIDDEN | Jamais public |
| `/guides` | PUBLISH-NOW (voir §26) | Décidé en MIG-00A-B |
| `/coro-incident` | PUBLISH-NOW (voir §26) | Audit de vérité fonctionnelle avant tout texte public |
| `/coro-exercices`, `/conformite-reglementation` | REVIEW REQUIRED | Audit fonctionnel ; disposition ultérieure |
| `/plateforme` | BUILD-NOW-HIDDEN | Évaluation après MIG-02 |
| `/coro-ops`, `/qr-intervention`, `/solutions/multi-sites`, `/coro-knowledge`, `/coro-ai`, `/coro-network`, `/coro-campus`, `/ressources` | FUTURE | Approbation séparée |
| `/conformite-reglementation` | REVIEW / MERGE-REVIEW | Disposition ultérieure ; non créée |
| `/coro-platform`, `/resilience-operations` | FUTURE / MERGE-REVIEW | Examen ultérieur ; aucune fusion décidée |

# 24. Décisions ouvertes

| ID | Décision | Recommandation |
|---|---|---|
| D-01 | Option de navigation A ou B | A |
| D-02 | Affirmations ISO 22301 / CNPI / CNESST (R-06) | Règle décidée ; formulation validée page par page (§26.5) |
| D-03 | « Réponse sous 24 heures » et programme fondateur (R-07) | RÉSOLU : ne pas migrer par défaut (§26.5) |
| D-04 | Prix affichés sur `/sentinelle` vs `/pricing` (R-13) | REVIEW avant republication ; source de vérité unique requise (§26.5) |
| D-05 | Éditeur de la page (« Coro Solutions Inc. », R-05) | REVIEW : identité légale à revoir avant la migration de production (§26.5) |
| D-06 | Statut public du module Incident | RÉSOLU en MIG-00A-B : PUBLISH-NOW sous audit de vérité fonctionnelle |
| D-07 | Anglais de Sentinelle (cible FR + EN, MIG-04) et de Population (cible FR + EN, MIG-05) | RÉSOLU en MIG-00A-B ; exécution à faire (§26.5) |
| D-08 | Héros manquants (HeroMinimal, HeroEditorial, HeroProduct) | Construire avant MIG-07 ou utiliser SectionStatement |
| D-09 | Promouvoir `/guides` | RÉSOLU en MIG-00A-B : PUBLISH-NOW |
| D-10 | Provenance des visuels `public/website-v2/*` | Valider |
| D-11 | Contrat d'exécution du blogue | À définir en MIG-00B |
| D-12 | Architecture de `html lang` | À définir en MIG-00B |
| D-13 | Migration de `DemoForm` vers `LeadForm` | Reporter |

# 25. Non-décisions explicites

Aucune route créée ; aucune redirection ni fusion décidée ; aucun prix ou volume inventé ; aucune traduction fabriquée ; aucune migration commencée ; accueil et Design System inchangés ; MIG-00B non commencé.

# 26. Intégration des décisions humaines (MIG-00A-B)

Ce chapitre est le JOURNAL DES DÉCISIONS HUMAINES de MIG-00A-B : il résume les décisions, déjà reportées dans les chapitres précédents. Aucune route n'est créée, aucune redirection ni implémentation SEO n'est faite.

## 26.1 Statuts mis à jour

| Route | Avant | Après | Condition |
|---|---|---|---|
| `/guides` | BUILD-NOW-HIDDEN | PUBLISH-NOW | Hub de ressources ; disponible dès MIG-02 si utile au maillage depuis `/gestion-documentaire` ; complété en MIG-07 |
| Six guides | PUBLISH-NOW | PUBLISH-NOW, FR seulement | EN = FUTURE ; aucun hreflang EN tant qu'une vraie version n'existe pas |
| `/coro-incident` | REVIEW (candidat BUILD-NOW-HIDDEN) | PUBLISH-NOW | Audit de vérité fonctionnelle OBLIGATOIRE avant l'écriture du texte public ; famille Operational ; MIG-04 ; prête avant MIG-10 |
| `/coro-exercices` | REVIEW | REVIEW REQUIRED | BUILD-NOW-HIDDEN seulement si l'audit fonctionnel confirme une maturité suffisante ; sinon FUTURE |
| `/plateforme` | REVIEW | BUILD-NOW-HIDDEN | Exposition évaluée après MIG-02 ; absente de la navigation de lancement |
| `/coro-knowledge`, `/coro-ai`, `/coro-network`, `/coro-campus`, `/coro-ops`, `/qr-intervention`, `/solutions/multi-sites`, `/ressources` | FUTURE | FUTURE | Ni navigation, ni accueil, ni sitemap, ni lien promotionnel ; leur présence dans `routes.ts` n'est pas une approbation |
| `/conformite-reglementation` | MERGE-REVIEW | REVIEW / MERGE-REVIEW | Non créée ; intention à comparer à `/guides`, `/security`, guides et blogue ; aucune fusion approuvée |

## 26.2 Arbre de lancement mis à jour (conceptuel, pas la navigation)

- ACCUEIL : `/`
- PLATEFORME : `/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`
- RÉSILIENCE ET OPÉRATIONS : `/resilience-operationnelle`, `/sentinelle`, `/coro-incident`, `/sentinelle-population`
- RESSOURCES : `/guides`, six guides, `/blog`, `/blog/[slug]`
- CONFIANCE / COMMERCIAL : `/security`, `/pricing`
- ENTREPRISE : `/about`, `/partners`, `/programme-recommandation`, `/contact`
- LÉGAL : `/privacy`, `/terms`
- BUILD-NOW-HIDDEN : `/plateforme`
- REVIEW : `/coro-exercices`, `/conformite-reglementation`
- FUTURE : `/coro-knowledge`, `/coro-ai`, `/coro-network`, `/coro-campus`, `/coro-ops`, `/qr-intervention`, `/solutions/multi-sites`, `/ressources`
- HIDDEN : `/design-lab`

## 26.3 Silo documentaire (verrouillé)

`/gestion-documentaire` = autorité commerciale / produit ; `/guides` = hub de ressources ; guides individuels = autorité informationnelle. Produit ↔ hub ↔ guides. Chaque guide renvoie naturellement vers `/gestion-documentaire` ; la page produit renvoie vers `/guides` et les guides pertinents. Un sujet = un propriétaire ; les guides ne deviennent pas des pages de vente.

## 26.4 Conséquences

- **Navigation** : Incident sous Résilience et opérations et Guides sous Ressources sont admissibles (destinations PUBLISH-NOW). Aucune route FUTURE en en-tête. Tous les liens de lancement ne vont pas dans l'en-tête ; le pied de page porte la découverte élargie.
- **Matrice d'accueil** : Incident et Guides ont une destination PUBLISH-NOW prévue ; Exercices n'est pas une destination d'accueil tant que son statut ne change pas ; aucun module FUTURE comme destination de lancement.
- **Ordre de migration** : inchangé, accueil en dernier. Précisions : `/guides` disponible dès MIG-02 si utile ; `/coro-incident` livré avec MIG-04 et avant le point de contrôle ; MIG-07 complète blogue, guides et ressources.
- **Point de contrôle avant MIG-10** : toutes les destinations PUBLISH-NOW liées depuis l'accueil sont prêtes. `HomePageClient.tsx` reste en lecture seule jusqu'à MIG-10.

## 26.5 Décisions de gouvernance de contenu

| ID | Décision | Statut |
|---|---|---|
| D-02 | ISO 22301, CNPI, CNESST : références admises seulement si factuellement fondées et contextuellement exactes. Interdit : « certifié ISO 22301 », « approuvé CNESST / CNPI », toute garantie de conformité. Formulations acceptables si étayées : « structuré en référence à », « tient compte des exigences applicables ». Texte exact validé page par page. | VALIDATION DES AFFIRMATIONS REQUISE |
| D-03 | « Nous vous contacterons dans les 24 heures » : NE PAS MIGRER par défaut. `DemoForm` inchangé maintenant ; retrait ou remplacement lors du lot de migration du formulaire. | Décidé |
| — | « Programme fondateur » et offre commerciale héritée : NE PAS MIGRER automatiquement ; à conserver seulement si la validité commerciale actuelle est confirmée ; distinct du programme de recommandation public. | Revue de gouvernance |
| D-04 | Prix de `/sentinelle` (149 $ ; dès 249 $) : à REVOIR avant republication, sans migration automatique. Une source de vérité unique est requise entre `/sentinelle`, `/pricing` et la documentation commerciale. Aucun modèle choisi. | Ouvert |
| D-05 | « Coro Solutions Inc. » non publié comme exploitant légal par défaut. La marque CORO reste valide. Identité légale et droit d'auteur à revoir avant la migration de production. `/terms` non modifié ; statut d'incorporation non tranché. | Ouvert |
| D-07 | `/sentinelle` : cible FR + EN ; contenu EN à auditer, compléter et valider en MIG-04 ; registre, sitemap et métadonnées reflètent la réalité de l'EN. `/sentinelle-population` : cible FR + EN ; vraie traduction complète validée en MIG-05 ; aucun hreflang EN vers du contenu français d'ici là ; la parité EN actuelle est un défaut de migration. Remplace le statut EN « FUTURE » du §16. | Décidé, à exécuter |
| Blogue | LEGACY-PRESERVE en début de migration ; avant MIG-07, récupérer l'inventaire de production (nombre d'articles, slugs, traductions EN, couvertures, métadonnées, liens internes) sans deviner depuis le code local ; slugs valides préservés par défaut. | Prérequis |

## 26.6 Étape obligatoire de validation SEO

Avant de figer les métadonnées et textes de production, valider phrasé des mots-clés, title, H1, meta description et termes secondaires contre le langage de recherche public actuel (Québec, Canada, français, anglais si applicable), incluant une recherche publique et concurrentielle. L'architecture fixe déjà intentions, territoires, propriétaires de sujet, frontières de cannibalisation et liens. Ne pas inventer volumes, classements, difficulté ni trafic. Recherche non effectuée ici ; à inscrire dans chaque lot de migration (avant la rédaction de la page) et dans MIG-12.

## 26.7 Décisions encore ouvertes

Modèle de tarification public final · exploitant légal et droit d'auteur · typographie de l'adresse · formulations réglementaires approuvées · déclaration publique de traçabilité · maturité publique du module Exercices · exposition publique de `/plateforme` après MIG-02 · disposition de `/conformite-reglementation` · validité commerciale du programme fondateur · traductions anglaises finales · inventaire de production du blogue · phrasé SEO final après recherche publique · audit de vérité fonctionnelle d'Incident (préalable au texte) · D-08, D-10, D-11, D-12, D-13 inchangés.
