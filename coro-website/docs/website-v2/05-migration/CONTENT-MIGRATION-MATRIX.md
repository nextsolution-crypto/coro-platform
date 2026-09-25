# 03 --- Content Migration Matrix

**Version:** 1.0\
**Date:** 24 septembre 2026\
**Status:** REVIEW\
**Inputs:** `CURRENT-SITE-INVENTORY.md`, `TARGET-PAGE-ARCHITECTURE.md`,
gouvernance Website V2.

> Aucune URL publique, aucun contenu utile, aucun contrat métier et
> aucun acquis SEO ne doit disparaître silencieusement.

## 1. Décisions autorisées

  -----------------------------------------------------------------------
  Décision                            Signification
  ----------------------------------- -----------------------------------
  `KEEP`                              Conserver la route et sa fonction.

  `REBUILD`                           Conserver l'URL publique mais
                                      reconstruire la page en V2.

  `MERGE`                             Consolider le contenu utile dans
                                      une destination explicitement
                                      identifiée.

  `REDIRECT`                          Remplacer la route par une
                                      redirection permanente validée.

  `ARCHIVE-WITH-APPROVAL`             Retrait public seulement après
                                      validation humaine et SEO.

  `REVIEW`                            Décision bloquée par une
                                      information manquante.
  -----------------------------------------------------------------------

`DROP` n'est pas une décision autorisée pour une route publique.

## 2. Règles globales

1.  Les URL publiques existantes sont préservées par défaut.
2.  Une architecture cible plus élégante ne justifie pas à elle seule un
    changement de slug.
3.  Le contenu indexé existant doit être comparé à son remplacement V2
    avant suppression du legacy.
4.  FR et EN font partie de la migration.
5.  Les claims juridiques, réglementaires, sécurité, prix et commerciaux
    doivent être validés avant republication.
6.  Les slugs du blog sont protégés tant que l'inventaire live n'est pas
    connu.
7.  Parrainage, conversion démo et destinations de connexion sont des
    contrats métier à préserver.
8.  Les ancres historiques sont conservées ou explicitement remappées.
9.  Toute redirection doit être documentée et testée.
10. Aucun asset n'est supprimé uniquement parce qu'une recherche
    statique ne trouve pas sa référence.

## 3. Matrice des routes

  ------------------------------------------------------------------------------------------------
  Route actuelle                 Décision          Destination                À préserver / action
  ------------------------------ ----------------- -------------------------- --------------------
  `/`                            `REBUILD`         `/`                        URL, SEO, `?ref=`,
                                                                              cookies referral,
                                                                              `#demo`, contenu
                                                                              utile, ancres,
                                                                              vidéo. Homepage
                                                                              après Design Lab.

  `/about`                       `KEEP`            `/about`                   Page V2 et metadata;
                                                                              QA finale.

  `/security`                    `REBUILD`         `/security`                URL/SEO; valider
                                                                              hébergement,
                                                                              fournisseur,
                                                                              sécurité, SLA.

  `/privacy`                     `KEEP`            `/privacy`                 Texte légal complet;
                                                                              pas de réécriture
                                                                              substantielle sans
                                                                              validation.

  `/terms`                       `KEEP`            `/terms`                   Texte légal complet.

  `/pricing`                     `REBUILD`         `/pricing`                 URL/SEO; valider
                                                                              prix, essai/démo et
                                                                              Phase 2.

  `/sentinelle`                  `REBUILD`         `/sentinelle`              Contenu utile, EN
                                                                              existant,
                                                                              SEO/JSON-LD;
                                                                              corriger incohérence
                                                                              registre/SEO.

  `/sentinelle-population`       `REBUILD`         `/sentinelle-population`   FR, SEO,
                                                                              FAQ/JSON-LD; créer
                                                                              vrai EN ou retirer
                                                                              les signaux EN
                                                                              jusqu'à
                                                                              disponibilité.

  `/gestion-documentaire`        `REBUILD`         même URL                   Comparer legacy/V2,
                                                                              préserver médias,
                                                                              SEO et structured
                                                                              data. Travail actuel
                                                                              = `REVIEW`.

  `/gestion-de-projets`          `REBUILD`         même URL                   Même règle.

  `/performance-objectifs`       `REBUILD`         même URL                   Préserver
                                                                              distinction
                                                                              Performance vs
                                                                              Résilience/Indice
                                                                              CORO.

  `/portail-client`              `REBUILD`         même URL                   Comparer legacy/V2,
                                                                              médias et SEO.
                                                                              Travail actuel =
                                                                              `REVIEW`.

  `/resilience-operationnelle`   `REBUILD`         même URL                   Préserver slug/SEO;
                                                                              aligner avec
                                                                              direction CORO
                                                                              Résilience.

  `/programme-recommandation`    `KEEP`            même URL                   Conditions, logique
                                                                              referral et montant
                                                                              après validation.

  `/contact`                     `KEEP`            même URL                   Coordonnées,
                                                                              DemoForm,
                                                                              consommation des
                                                                              cookies referral.

  `/partners`                    `KEEP`            même URL                   Page V2; valider
                                                                              contenu partenaire.

  `/blog`                        `KEEP`            `/blog`                    URL, catégories, SEO
                                                                              et contrat API.

  `/blog/[slug]`                 `KEEP`            slug existant              Protection absolue
                                                                              des slugs, contenus,
                                                                              traductions,
                                                                              metadata et images.

  `/documents/plan-*-pmu`        `KEEP`            même URL                   Guide, citations,
                                                                              SEO; valider
                                                                              références.

  `/documents/plan-*-psi`        `KEEP`            même URL                   Idem.

  `/documents/plan-*-pca`        `KEEP`            même URL                   Idem.

  `/documents/plan-*-pgc`        `KEEP`            même URL                   Idem; distinguer
                                                                              contenu éducatif et
                                                                              disponibilité
                                                                              produit.

  `/documents/plan-*-pra`        `KEEP`            même URL                   Idem.

  `/documents/plan-*-pue`        `KEEP`            même URL                   Idem; valider
                                                                              références
                                                                              environnementales.

  `/sitemap.xml`                 `REBUILD`         même endpoint              Couverture complète;
                                                                              éviter perte
                                                                              silencieuse des
                                                                              articles.

  `/robots.txt`                  `KEEP`            même endpoint              Revalider règles
                                                                              finales.

  `/manifest.webmanifest`        `KEEP`            même endpoint              QA branding/icons.

  `not-found`                    `REBUILD`         comportement Next          V2 visuel en
                                                                              conservant les bons
                                                                              statuts HTTP.
  ------------------------------------------------------------------------------------------------

## 4. Contrat de migration de la homepage

### Obligatoirement préserver

-   route `/`;
-   `?ref=CR-[A-HJ-NP-Z2-9]{6}`;
-   cookies `coro_referral_code` et `coro_referral_first_touch`;
-   comportement `.getcoro.io` et fenêtre 90 jours tant qu'aucune
    décision métier ne les modifie;
-   lecture des cookies par `DemoForm`;
-   conversion `#demo`;
-   média utile et structured data après revue.

### Ancres historiques à mapper

`#continuum`, `#indice-coro`, `#sentinelle`, `#evacuation`,
`#module-incident`, `#plateforme`, `#documents`, `#solutions`,
`#environments`, `#pricing`, `#security`, `#demo`.

`/#features` est `REVIEW` : le footer legacy le référence mais l'ancre
n'a pas été retrouvée.

Le code legacy de la homepage ne peut être retiré avant tests explicites
du referral, de la conversion et de la compatibilité d'ancres retenue.

## 5. Pages produit en cours

`ProductPage.tsx`, `ProductCompositions.tsx`, leurs CSS Modules et les
quatre routes modifiées restent `REVIEW`.

Éléments à préserver : - `product-content.ts` bilingue; - compositions
différentes par produit; - médias historiques protégés par tests; -
absence de liens prématurés vers produits futurs; - valeur SEO
historique; - Product/FAQ JSON-LD utile et exact.

Avant retrait du legacy : comparer le copy, identifier les omissions,
inventorier JSON-LD, restaurer les structured data utiles, valider FR/EN
et médias, puis appliquer le système issu du Design Lab.

## 6. Blog

Décision : `KEEP` `/blog` et tous les `/blog/[slug]`.

Contrats protégés : API `blog/public`, API article, slugs, disponibilité
FR, EN seulement si traduit, metadata, images de couverture et
catégories.

Aucun article ne peut être renommé, fusionné, archivé ou redirigé avant
inventaire live des slugs, langues, images et indexabilité.

## 7. FR / EN

  ----------------------------------------------------------------------------
  Zone                    Problème actuel         Décision
  ----------------------- ----------------------- ----------------------------
  `<html lang>`           Toujours `fr`           `REBUILD` pour refléter la
                                                  locale réelle.

  Homepage SSR            HTML serveur FR puis EN `REBUILD`.
                          côté client             

  Modèle URL              EN via `?lang=en`       `KEEP` au lancement sauf
                                                  décision explicite du
                                                  Document 09.

  Sentinelle              EN existe mais          `REVIEW`, puis normaliser
                          registre/SEO FR-only    registre/sitemap/metadata.

  Population              EN annoncé mais absent  `REVIEW`: produire EN
                                                  approuvé ou retirer signaux
                                                  EN.

  Guides                  FR-only                 `KEEP` sauf projet explicite
                                                  de traduction.

  Blog                    EN conditionnel         `KEEP`.

  ChatWidget              FR-only                 `REVIEW`.

  Chaînes Population      Certaines hors          `REBUILD` pendant migration.
                          dictionnaire            
  ----------------------------------------------------------------------------

Le passage éventuel de `?lang=en` vers `/en/...` est hors périmètre tant
qu'un plan SEO/redirections ne l'approuve pas.

## 8. Navigation

Décision : `ADAPT` le shell après le Document 07 V1.0.

Ne pas exposer une route future uniquement parce qu'elle existe dans
`routes.ts`.

Préserver : login Platform, login Client, parcours démo, FR/EN, pages
actuellement accessibles et accès aux pages légales.

## 9. Footer

Décision : `MERGE` le `SiteFooter` V2 et le Footer legacy en un footer
partagé unique après vérification navigateur.

Préserver selon validation : liens légaux, coordonnées, adresse,
NEQ/identité légale, claim hébergement Canada, connexions
Platform/Client et navigation utile.

## 10. Design system

### REUSE-CANDIDATE

-   `app/design-tokens.css`;
-   registre de routes;
-   helpers locale/SEO/navigation/API;
-   bases focus/reduced-motion.

### ADAPT-CANDIDATE

-   `Button`, `Container`, `Section`, `ProductCard`, `StatusBadge`;
-   `SiteHeader`, `MobileNavigation`.

### MERGE / REVIEW

-   `.btn-*` legacy vs Button V2;
-   `.card` global vs composants;
-   switchers de langue dupliqués;
-   styles `.cs-*` de Sentinelle;
-   breakpoints fragmentés.

Aucune consolidation massive avant validation du Design Lab.

## 11. Assets

Décision : `KEEP` tous les assets actuels jusqu'à vérification contre le
code, les chemins dynamiques, la base blog et le rendu public.

Groupes protégés : logos, favicons, OG, homepage, Sentinelle,
Population, solutions FR/EN, Client, Résilience, alertes,
`images/images_articles/*`, vidéo/poster homepage.

Aucun asset ne devient `ARCHIVE-WITH-APPROVAL` sur la seule base d'une
recherche textuelle.

## 12. Contrats SEO

À préserver ou remplacer explicitement : URLs, canonical, alternates
FR/EN, garde-fou des traductions d'articles, JSON-LD utile,
indexabilité, sitemap, robots, metadata sociale, alt text et liens
internes.

Les défauts SEO découverts dans le Document 02 sont à corriger dans le
Document 09; ils ne justifient pas automatiquement un changement d'URL.

## 13. Contrats métier

### Referral

**PROTECTED.** Aucun changement sans décision métier et tests.

### DemoForm

**PROTECTED / ADAPT.** Conserver Formspree jusqu'à remplacement
explicitement approuvé et conserver l'attribution referral.

### Connexions

**KEEP.** - Platform : `https://app.getcoro.io/login` - Client :
`https://client.getcoro.io/login`

### Chat

`REVIEW`. Préserver le service jusqu'à décision UX/produit; traiter
FR/EN et accessibilité.

## 14. Claims à valider avant republication V2

-   hébergement au Canada;
-   identité légale / NEQ;
-   prix publics;
-   montant de parrainage;
-   nombre de procédures;
-   références CNESST / CNPI / ISO;
-   disponibilité Phase 2;
-   fournisseur/SLA/sécurité;
-   affirmations réglementaires des guides et de Population.

Le fait qu'un claim existe aujourd'hui ne constitue pas automatiquement
son approbation pour une nouvelle page V2.

## 15. Routes futures --- `REVIEW`

`/plateforme`, `/coro-platform`, `/resilience-operations`,
`/coro-incident`, `/coro-exercices`, `/coro-ops`, `/qr-intervention`,
`/coro-knowledge`, `/coro-ai`, `/coro-network`, `/coro-campus`,
`/solutions/multi-sites`, `/ressources`, `/guides`,
`/conformite-reglementation`.

Ce sont des candidates d'architecture cible, pas encore des destinations
de migration approuvées.

## 16. Non-décisions explicites

Cette matrice n'approuve pas encore : - changement de convention URL
FR/EN; - changement de slug produit; - suppression de guide; -
suppression d'article; - suppression d'asset; - publication de tous les
modules futurs; - remplacement de Formspree; - remplacement du chat; -
suppression du legacy produit avant comparaison; - commit du lot produit
non committé; - construction de la homepage de production avant Design
Lab.

## 17. Priorités

### P0 --- prévention de perte

1.  Referral + DemoForm.
2.  Inventaire blog/slugs.
3.  Pages légales.
4.  URLs produits.
5.  Convention FR/EN.

### P1 --- architecture / SEO

1.  Sentinelle langue.
2.  Population langue.
3.  Structured data produit.
4.  Sitemap.
5.  `<html lang>`.
6.  Footer unique.

### P2 --- migration visuelle

1.  Shell partagé.
2.  Pages produit.
3.  Homepage.
4.  Sentinelle / Population / Résilience.
5.  Pricing / Security.
6.  Ressources / guides.

## 18. Critères de passage à `APPROVED`

-   inventaire blog connu ou explicitement différé avec protection des
    URLs;
-   statut EN de Sentinelle et Population décidé;
-   architecture de lancement réconciliée dans Document 07 V1.0;
-   chaque route actuelle possède une décision;
-   Document 09 confirme stratégie canonical/hreflang/redirections;
-   aucun contrat métier critique n'est orphelin.

## 18A. Priorité et risque de migration après le gel V1.0 (LAB-09)

Ce tableau n'ajoute aucune décision d'URL. Il place chaque route dans l'ordre de migration visuelle en tenant compte du risque et des composants V1.0 disponibles. Les décisions KEEP / REBUILD du §3 restent inchangées.

| Route | Risque | Priorité | Famille DS | Composants V1.0 pertinents | Pré-requis et points à préserver |
|---|---|---|---|---|---|
| `/` | Très élevé | Après le shell, le pied de page et les pages produit | Architectural, avec passages opérationnels | HeroSignature, Continuum, SpatialFigure, OperationalScene, CTASection, SiteFooterV2 | Parrainage `?ref=` et cookies, `DemoForm`, `#demo`, ancres historiques, vidéo, SSR de la langue, JSON-LD. Jamais avant l'adoption des jetons V1. |
| Pages produit (`/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`) | Élevé | Premiers lots produit | Documents : Technique ; Client : Architectural ; Projets / Performance : Architectural ou Technique | HeroTechnical ou HeroSignature, PageSection, FeatureIndex, BlueprintFrame, MetricComposition, CTASection | Contenu et médias historiques, JSON-LD à restaurer, `product-content.ts` bilingue, aucun lien vers un produit futur. Travail actuel = REVIEW. |
| `/sentinelle` | Élevé | Après le premier lot produit | Opérationnel | HeroOperational, OperationalScene (`people`), SpatialFigure, PeopleStatus | Décision de langue EN, JSON-LD, contenu utile ; ne pas réduire Sentinelle à un registre. |
| `/sentinelle-population` | Élevé | Avec Sentinelle | Opérationnel, cartographique | MapFrame (densité `ref`), OperationalScene, Timeline | Vrai EN ou retrait des signaux EN ; chaînes hors dictionnaire ; ne pas laisser croire à une portée universelle ; média de démonstration marqué. |
| `/resilience-operationnelle` | Élevé | Lot produit | Technique et architectural | Continuum, MetricComposition, EditorialBlock | Préserver le slug et le SEO ; distinguer Performance et Indice CORO. |
| `/pricing` | Élevé | Après validation des prix | Éditorial sobre | PageSection, Accordion, CTASection ; cartes seulement si la comparaison les justifie | Prix, essai / démo, Phase 2, JSON-LD FAQ validés. |
| `/security` | Moyen à élevé | Avec les prérequis de contenu | Technique | TrustStrip, EditorialBlock, PageSection | Hébergement, fournisseur, SLA, MFA validés ; chaque énoncé renvoie à sa source. |
| `/blog`, `/blog/[slug]` | Très élevé | Alignement du shell seulement | Éditorial | Shell (SiteHeader, SiteFooterV2), Container | Aucun changement de slug, contenu, métadonnées ou images avant l'inventaire live ; contrat API protégé ; ne pas restyler le contenu à l'aveugle. |
| `/documents/plan-*` (6 guides) | Élevé | Après le blog | Technique (FR seulement) | HeroTechnical, FeatureIndex, Accordion | Citations, références réglementaires à valider, JSON-LD, liens internes. |
| `/privacy`, `/terms` | Élevé (juridique) | Shell seulement | Utilitaire | Shell ; texte inchangé | Texte légal complet ; aucune réécriture substantielle ; identité légale et copyright REVIEW. |
| `/about`, `/contact`, `/partners`, `/programme-recommandation` | Faible à moyen | Adoption des jetons V1 et du pied de page | Selon la page | Shell, composants déjà migrés, LeadForm ou `DemoForm` | `/contact` porte `DemoForm` et le parrainage ; `/programme-recommandation` : dette de 5 px à 320 px ; valider le contenu partenaire. |

## 18B. Séquence de migration recommandée après le gel

0. Pré-fusion : verrouiller `/design-lab` par environnement ; confirmer la stratégie de fusion.
1. Adoption des jetons V1 et fusion des pieds de page (SiteFooterV2 unique) ; layout racine : lien d'évitement, cible `main`.
2. Pages institutionnelles déjà migrées : alignement sur V1.0.
3. Pages produit, une à la fois, avec restauration du JSON-LD.
4. Sentinelle et Sentinelle Population (après décision EN).
5. Pricing et Security (après validation des énoncés).
6. Guides et blog (shell seulement pour le blog).
7. Homepage, en dernier des grands lots, avec les contrats de parrainage, `DemoForm` et ancres testés.

Aucune étape ne redessine le Design System. Une lacune est escaladée.

## 19. Étape suivante

Mettre **07 --- Target Page Architecture** à jour de V0.1 vers V1.0 à
partir de cette matrice et du Current Site Inventory.

Puis produire **09 --- SEO Migration Plan** avant les modifications
d'implémentation.

## 20. Règle directrice

> Website V2 est une migration contrôlée, pas un remplacement à blanc.

Le nouveau site peut transformer radicalement la présentation de CORO
sans perdre les URLs, contenus, contrats métier et acquis SEO qui ont
déjà de la valeur.
