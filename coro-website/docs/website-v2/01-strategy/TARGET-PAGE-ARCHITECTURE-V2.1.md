# CORO WEBSITE — TARGET PAGE ARCHITECTURE V2.1

**Authoritative state after MIG-03D**
**Date: 2026-09-26**

Branche `feature/website-v2` · HEAD `418737fe` (CORO Incident) · Statut : ARCH-V2.1, en attente de relecture humaine.

## 1. Purpose and authority

Ce document remplace, comme référence d'architecture, la vue de `TARGET-PAGE-ARCHITECTURE.md` (V1.0, 24 septembre) et le plan d'exécution de `SITE-ARCHITECTURE-AND-PAGE-BLUEPRINTS.md` (MIG-00A), devenus partiellement périmés depuis les migrations MIG-01 à MIG-03D. Il décrit l'état RÉEL du dépôt et fixe l'architecture cible pour le travail Website V2 restant.

**Règle d'autorité : quand V1.0 entre en conflit avec V2.1, V2.1 gouverne, sauf s'il est remplacé par un gate approuvé plus récent.** V1.0 et MIG-00A restent des documents historiques : leurs blueprints de pages, cartes SEO, territoires sémantiques et vocabulaires de statuts restent valides là où V2.1 ne les contredit pas. Le dépôt prime sur toute documentation quand ils divergent ; la décision humaine explicite la plus récente prime sur les deux (Master Index §6).

Méthode : chaque énoncé d'état ci-dessous provient du dépôt (`lib/site/routes.ts`, `lib/site/v2-migration.ts`, `app/**`, `app/sitemap.ts`, historique Git), d'une vérification HTTP sur le build de production local du 2026-09-26 et de l'API publique du blog. Aucune donnée de volume ou de classement de recherche n'est avancée.

Ce document ne modifie aucun code, aucune page, aucun contenu public, aucun média.

## 2. Current information architecture

### 2.1 Architecture réelle (dépôt)

```
getcoro.io
├─ HOME  /                                        V1 (legacy monolithique, 9 032 lignes), FR + EN (?lang=en)
├─ PLATEFORME
│  ├─ CORO Documents      /gestion-documentaire   V2
│  ├─ CORO Projects       /gestion-de-projets     V2
│  ├─ CORO Performance    /performance-objectifs  V2
│  ├─ CORO Client         /portail-client         V2
│  └─ Sécurité et hébergement  /security          V1
├─ TARIFICATION  /pricing  (lien direct d'en-tête)   V1
├─ RÉSILIENCE ET OPÉRATIONS
│  ├─ Résilience opérationnelle  /resilience-operationnelle  V2 (FR/EN)
│  ├─ CORO Sentinelle            /sentinelle                 V2 (FR seulement)
│  ├─ Sentinelle Population      /sentinelle-population      V2 (FR seulement)
│  └─ CORO Incident              /coro-incident              V2 (FR seulement)
├─ RESSOURCES
│  ├─ Blogue  /blog, /blog/[slug]   V1, dynamique (API), 56 articles publiés
│  └─ Guides  /documents/plan-{pmu,psi,pca,pgc,pra,pue}   V1, FR seulement
├─ ENTREPRISE   /about /partners /programme-recommandation /contact   V2
├─ LÉGAL        /privacy /terms   V1
└─ TECHNIQUE    /sitemap.xml /robots.txt /manifest.webmanifest, not-found, images OG
   INTERNE      /design-lab   (404 en production, verrou d'environnement)
```

### 2.2 Navigation d'en-tête réellement rendue (FR, routes implémentées seulement)

- Plateforme : Documents, Projects, Performance, Client, Sécurité et hébergement.
- Résilience et opérations : Résilience / Indice CORO, Sentinelle, Incident.
- Solutions : Sentinelle Population.
- Ressources : Blogue.
- Tarification (lien direct), Connexion, CTA « Demander une démonstration ».

Les entrées FUTURE et REVIEW (Exercices, Ops, Knowledge, AI, Network, Campus, Multi-sites, Guides, Conformité) existent dans `navigation.ts` mais ne sont pas rendues : la navigation filtre sur `implemented`.

### 2.3 Comparaison avec la structure attendue

| Structure attendue | Constat dans le dépôt | Écart |
|---|---|---|
| Plateforme : Documents, Projects, Performance, Client, Pricing | Pricing n'est pas sous Plateforme : c'est un lien direct ; Sécurité est sous Plateforme | Mineur : Pricing et Security se placent selon la navigation (§2.2), pas selon la liste attendue |
| Résilience et opérations : Résilience, Sentinelle, Population, Incident | Population est rendue sous « Solutions », pas sous « Résilience et opérations » | **Écart** : MIG-00A §26.2 la place dans Résilience et opérations ; le code la met sous Solutions. À trancher à la migration de navigation. |
| Resources : Blog, articles, guides | Le blogue est présent ; les guides n'ont AUCUN point d'entrée d'en-tête et le hub `/guides` n'existe pas | **Écart** : `/guides` est enregistré PUBLISH-NOW mais n'est pas implémenté (404) |
| Company : About, Security, Partners, Referral, Contact | About / Partners / Referral / Contact hors en-tête (pied de page V2) ; Security sous Plateforme | Mineur |
| Legal : Privacy, Terms | Présents, V1 | Aucun |
| Technical | Présents ; `/design-lab` répond 404 en production | Aucun |
| Pied de page unique | Sur les 12 routes migrées : un seul pied de page (V2). Sur les pages V1 : le pied de page legacy. Aucune page n'en a deux. | La consolidation n'est achevée qu'après migration des pages V1 |

## 3. Complete route matrix

Colonnes : V1 / V2 = surface actuelle (V2 = présente dans `migratedV2Routes`). Sitemap = présente dans `sitemap.xml` (39 URLs statiques + articles du blogue quand l'API répond). « Indexable » = `robots: index, follow` mesuré. Croisement fait entre `routes.ts`, `app/`, le registre V2 et le sitemap.

### 3.1 Pages publiques implémentées

| Page | URL | Famille | Implémentée | Publication | V1/V2 | Langue | Sitemap | Indexable | Statut de migration | Prochaine action |
|---|---|---|---|---|---|---|---|---|---|---|
| Accueil | `/` | core | Oui | PUBLISH-NOW | V1 | FR / EN (`?lang=en`) | Oui, FR + EN | Oui | Non migrée (dernière) | Brief §13, MIG-09 |
| À propos | `/about` | company | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-01A, terminée | Aucune (ressources : aucune) |
| Contact | `/contact` | company | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-01B, terminée | Aucune |
| Partenaires | `/partners` | company | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-01C, terminée | Aucune (ressources : faible) |
| Programme de recommandation | `/programme-recommandation` | company | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-01D, terminée | Validité commerciale à confirmer |
| CORO Documents | `/gestion-documentaire` | platform | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-02A, terminée | Retrofit ressources (HIGH) |
| CORO Projects | `/gestion-de-projets` | platform | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-02B, terminée | Retrofit ressources (MEDIUM) |
| CORO Performance | `/performance-objectifs` | platform | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-02C, terminée | Retrofit ressources (MEDIUM) |
| CORO Client | `/portail-client` | platform | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-02D, terminée | Retrofit ressources (MEDIUM) ; recapture |
| Résilience opérationnelle | `/resilience-operationnelle` | resilience | Oui | PUBLISH-NOW | V2 | FR / EN | Oui, FR + EN | Oui | MIG-03A, terminée | Retrofit ressources (HIGH) ; lien vers Incident |
| CORO Sentinelle | `/sentinelle` | resilience | Oui | PUBLISH-NOW | V2 | FR seulement | Oui, FR | Oui | MIG-03B, terminée | Recaptures ; lien vers Incident |
| Sentinelle Population | `/sentinelle-population` | solutions | Oui | PUBLISH-NOW | V2 | FR seulement | Oui, FR | Oui | MIG-03C, terminée | Assainir étape 05 ; ressources : à revoir |
| CORO Incident | `/coro-incident` | resilience | Oui | PUBLISH-NOW | V2 | FR seulement | Oui, FR | Oui | MIG-03D, terminée | Assainir la fiche d'intervention |
| Tarification | `/pricing` | pricing | Oui | PUBLISH-NOW | V1 | FR / EN | Oui, FR + EN | Oui | Non migrée | MIG-04 (après décisions commerciales) |
| Sécurité et hébergement | `/security` | platform | Oui | PUBLISH-NOW | V1 | FR / EN | Oui, FR + EN | Oui | Non migrée | MIG-04 (après validation des énoncés) |
| Confidentialité | `/privacy` | legal | Oui | LEGACY-PRESERVE | V1 | FR / EN | Oui, FR + EN | Oui | Non migrée | MIG-07 (enveloppe seulement) |
| Conditions | `/terms` | legal | Oui | LEGACY-PRESERVE | V1 | FR / EN | Oui, FR + EN | Oui | Non migrée | MIG-07 (enveloppe seulement) |
| Blogue (index) | `/blog` | resources | Oui | LEGACY-PRESERVE | V1 | FR / EN | Oui, FR + EN | Oui | Non migrée | MIG-06 (enveloppe) |
| Blogue (article) | `/blog/[slug]` | resources | Oui (dynamique) | LEGACY-PRESERVE | V1 | FR ; EN si traduit | Oui, via API | Oui | Non migrée | MIG-06 (enveloppe) |
| Guide PMU | `/documents/plan-mesures-urgence-pmu` | resources | Oui | PUBLISH-NOW | V1 | FR seulement | Oui, FR | Oui | Non migrée | MIG-05 |
| Guide PSI | `/documents/plan-securite-incendie-psi` | resources | Oui | PUBLISH-NOW | V1 | FR seulement | Oui, FR | Oui | Non migrée | MIG-05 |
| Guide PCA | `/documents/plan-continuite-activites-pca` | resources | Oui | PUBLISH-NOW | V1 | FR seulement | Oui, FR | Oui | Non migrée | MIG-05 |
| Guide PGC | `/documents/plan-gestion-crise-pgc` | resources | Oui | PUBLISH-NOW | V1 | FR seulement | Oui, FR | Oui | Non migrée | MIG-05 |
| Guide PRA | `/documents/plan-reprise-activites-pra` | resources | Oui | PUBLISH-NOW | V1 | FR seulement | Oui, FR | Oui | Non migrée | MIG-05 |
| Guide PUE | `/documents/plan-urgence-environnementale-pue` | resources | Oui | PUBLISH-NOW | V1 | FR seulement | Oui, FR | Oui | Non migrée | MIG-05 |

### 3.2 Utilitaires

| Ressource | URL | Implémentée | Statut | Note |
|---|---|---|---|---|
| Sitemap | `/sitemap.xml` | Oui | LEGACY-PRESERVE | Piloté par le registre de routes ; les articles du blogue viennent de l'API, avec repli sans erreur (les URLs d'articles sont omises si l'API répond en échec : constaté en build local) |
| Robots | `/robots.txt` | Oui | LEGACY-PRESERVE | `allow: /` |
| Manifest | `/manifest.webmanifest` | Oui | LEGACY-PRESERVE | PWA du site |
| Page introuvable | (`not-found`) | Oui | LEGACY-PRESERVE | HTTP 404, `noindex` |
| Images de partage | `opengraph-image.png`, `twitter-image.png`, `favicon.ico` | Oui | LEGACY-PRESERVE | |
| Design Lab | `/design-lab` | Oui (interne) | HIDDEN | 404 en production (verrou d'environnement, commit `eea795ab`) |

### 3.3 Routes enregistrées non implémentées

Voir §11. Aucune ne figure au sitemap ; `/guides` répond 404 alors que son statut cible est PUBLISH-NOW.

## 4. Completed V2 migrations

Registre courant `migratedV2Routes` (`lib/site/v2-migration.ts`) : 12 routes, exactement `/about`, `/contact`, `/partners`, `/programme-recommandation`, `/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`, `/resilience-operationnelle`, `/sentinelle`, `/sentinelle-population`, `/coro-incident`. La route est ajoutée seulement après QA et validation. Le shell V2 (`V2Shell`) porte les jetons V1, la langue effective, le lien d'évitement, l'en-tête, un seul `main#main-content` et `SiteFooterV2`. Commit de fondation du shell : `c4f8df08`.

| Route | Lot | Commit | Langue | Signature visuelle |
|---|---|---|---|---|
| `/about` | MIG-01A institutionnel | `57784032` | FR / EN | Héros éditorial photographique, composition propre à la page |
| `/contact` | MIG-01B institutionnel | `7ebdd15d` | FR / EN | Héros éditorial photographique, conversion et formulaire de démonstration |
| `/partners` | MIG-01C institutionnel | `01ab2e9b` | FR / EN | Héros éditorial photographique, collaboration |
| `/programme-recommandation` | MIG-01D institutionnel | `c897b228` | FR / EN | Héros éditorial photographique, conversation et étapes |
| `/gestion-documentaire` | MIG-02A produit | `b695e242` | FR / EN | Planche technique + preuve d'éditeur (HeroTechnical) |
| `/gestion-de-projets` | MIG-02B produit | `3531282e` | FR / EN | Héros photographique + preuve de tableau de bord |
| `/performance-objectifs` | MIG-02C produit | `17f1ad23` | FR / EN | Héros photographique + flux décision / performance |
| `/portail-client` | MIG-02D produit | `3f16a447` | FR / EN | Contexte de portefeuille + captures produit |
| `/resilience-operationnelle` | MIG-03A opérationnel | `6efea0a8` | FR / EN | Système organisationnel / indice / préparation |
| `/sentinelle` | MIG-03B opérationnel | `1f137903` | FR seulement | Occupation → évacuation → rassemblement |
| `/sentinelle-population` | MIG-03C opérationnel | `1ceeb308` | FR seulement | Scénario industriel / environnemental en quatre actes |
| `/coro-incident` | MIG-03D opérationnel | `418737fe` | FR seulement | Événement → chronologie → information pour l'intervenant → rapport → apprentissage |

Gates et registres : `MIG-02-GATE.md` (commit de clôture `e2df403a`), `MIG-03-PRE-INCIDENT-GATE.md` (`45c1bbe1`), `MIG-03-REGISTER.md`, `MIG-03-FINAL-GATE.md`. Tests : 346 tests passent au dernier état vérifié.

## 5. Visual signature matrix

Cette matrice fixe l'identité établie et sert à empêcher que les pages restantes deviennent des copies génériques les unes des autres. « Preuve produit réelle » = capture de l'interface actuelle (sous réserve de provenance des données, voir §14).

| Page | Type de héros | Langage visuel principal | Composition / narration signature | Preuve produit réelle ? | Photographie marketing ? | Liens de ressources ? | Notes |
|---|---|---|---|---|---|---|---|
| Documents | HeroTechnical | Dessin technique, planche | Éditeur et cycle documentaire | Oui (capture d'éditeur, provenance à confirmer) | Non (technique) | Non (les six guides sont liés) | Distinct des autres : le seul héros technique |
| Projects | EditorialHero photo | Photographie de coordination + tableau de bord | Mandat → activités → capacité | Oui (tableau de bord, provenance à confirmer) | Oui | Non | Héros proche de Performance (miroir) |
| Performance | EditorialHero photo | Photographie + flux de décision | Lecture de l'activité, de la charge et de l'objectif d'heures | Non | Oui | Non | Page la plus légère |
| Client | EditorialHero photo | Portefeuille + captures | Bâtiments, documents, activités | Oui (deux captures, données à recapturer) | Oui | Non | Miroir de Projects |
| Résilience | EditorialHero photo | Système organisationnel | Boucle avant / pendant / après, indice CORO pondéré | Oui (deux captures, provenance à confirmer) | Oui | Non (retrofit HIGH) | Page système de haut niveau |
| Sentinelle | EditorialHero photo | Registre, entrée, évacuation | Occupation → évacuation → rassemblement | Non (aucune capture actuelle) | Oui | Oui (8 articles) | Pilotée par l'occupation |
| Sentinelle Population | EditorialHero photo | Scène industrielle, carte | Scénario en quatre actes, carte dominante à l'étape 05 | Non (scènes générées) | Oui (générée) | À revoir | La plus scénarisée ; 4 sections navy |
| Incident | EditorialHero photo | Intervention, chronologie navy | Événement → chronologie → information intervenant → rapport → apprentissage | Oui (fiche d'intervention, adresse à assainir) | Oui (3 illustrations) | Oui (3 articles) | Seul héros extérieur du groupe opérationnel |
| Pages institutionnelles (About, Contact, Partners, Recommandation) | EditorialHero photo | Éditorial, composition propre | Une composition par page | Non | Oui | Non | Pas de mur de cartes ; formulaire sur Contact |

Consignes pour les pages restantes :
- Trois héros opérationnels sur quatre sont des scènes intérieures sombres avec écrans : ne pas ajouter un quatrième héros du même type (Sécurité en particulier, voir §10).
- Une page = une composition signature. Pricing : minimale et comparative, sans mur de cartes. Security : preuve vérifiable, technique et sobre. Blogue et guides : éditoriaux. Légal : lecture. Accueil : synthèse de l'écosystème.
- Les sections navy restent un accent (Population en compte quatre : plafond, pas modèle).
- Toute image générée est une ILLUSTRATION MARKETING (`alt=""` si décorative) ; jamais une preuve produit.

## 6. Language matrix

| Page(s) | Langue | Sélecteur et lien English | hreflang |
|---|---|---|---|
| `/`, `/pricing`, `/security`, `/privacy`, `/terms`, `/blog` | FR + EN | Oui (`?lang=en`) | fr-CA, en-CA, x-default |
| `/blog/[slug]` | FR ; EN seulement si `titleEn` et `contentEn` existent | Selon l'article | Selon l'article |
| `/about`, `/contact`, `/partners`, `/programme-recommandation` | FR + EN | Oui | fr-CA, en-CA, x-default |
| `/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`, `/resilience-operationnelle` | FR + EN | Oui | fr-CA, en-CA, x-default |
| `/sentinelle`, `/sentinelle-population`, `/coro-incident` | FR seulement | Masqués (`englishAvailable={false}`) | fr-CA, x-default ; canonical FR |
| Six guides `/documents/plan-*` | FR seulement | Sans objet | fr-CA, x-default |

Contrat d'URL : FR sans paramètre, EN via `?lang=en`. Aucune traduction fabriquée : une page sans anglais réel ne le signale pas. Dette connue : `<html lang>` global reste « fr » (le wrapper V2 porte la langue effective).

## 7. Resources and editorial linking rule

Règle établie pendant MIG-03D-E et consignée dans `04-quality/QA-ACCEPTANCE-CHECKLIST.md` (« Editorial resource discovery »). Pour chaque migration restante :

1. identifier le territoire du sujet de la page ;
2. chercher dans le blogue, les guides et les ressources CORO existants (le blogue est servi par l'API `blog/public`, pas par des fichiers locaux) ;
3. vérifier que chaque route candidate existe et est publiable ;
4. évaluer la pertinence sémantique ;
5. n'intégrer que les ressources qui approfondissent réellement la page ;
6. préférer le lien contextuel au lien SEO arbitraire ;
7. éviter les liens faibles ou dupliqués ;
8. ne jamais inventer une ressource ;
9. respecter la disponibilité FR / EN réelle ;
10. vérifier les liens pendant la QA.

La découverte de ressources est OBLIGATOIRE ; une section « Ressources » ne l'est PAS.

| Page | Statut | Note |
|---|---|---|
| `/sentinelle` | FAIT | 8 articles liés |
| `/coro-incident` | FAIT | 3 articles liés |
| `/resilience-operationnelle` | Retrofit HIGH | 3 à 5 articles pertinents existent |
| `/gestion-documentaire` | Retrofit HIGH | 3 à 4 articles ; liés aussi aux guides |
| `/gestion-de-projets`, `/performance-objectifs`, `/portail-client` | MEDIUM | 1 à 2 articles chacune, sans doublon entre pages |
| `/about`, `/contact`, `/programme-recommandation`, `/partners` | LOW / NONE | Aucun article utile ; `/partners` à décider |
| `/sentinelle-population` | REVIEW | Aucun article sur l'alerte publique ou le PUE ; seul un article sur les obligations d'un plan de mesures d'urgence porte l'étiquette PUE |

Aucun retrofit dans ce document. Écarts éditoriaux (sujets sans article) : gestion d'un incident, chronologie pendant l'intervention, contenu d'un rapport d'incident, retour d'expérience après une urgence, actions correctives après incident.

## 8. Remaining migration scope

Pages non migrées, vérifiées dans le dépôt (aucune n'utilise `V2Shell` ; toutes portent l'en-tête et le pied de page legacy).

| Page | État actuel | Complexité | Actifs visuels disponibles | Importance SEO | Dépendances | Famille de migration recommandée | Priorité |
|---|---|---|---|---|---|---|---|
| `/pricing` | V1, 1 738 lignes, JSON-LD WebPage + FAQPage + BreadcrumbList ; « Réponse sous 24 h » ; programme fondateur (`#fondateur`, lié depuis l'accueil) | Élevée (contrat commercial) | `pricing-coro-plans.webp` (contient des prix inventés : voir §10) | Élevée (commerciale) | Source de vérité unique des prix (D-04), promesse « 24 h » (D-03), programme fondateur | MIG-04 Confiance et commerce | P1, après décisions |
| `/security` | V1, 1 650 lignes, JSON-LD WebPage + SoftwareApplication | Élevée (affirmations) | `security-canadian-hosting.webp` (contient des affirmations de conformité : voir §10) | Moyenne à élevée | Validation des énoncés (hébergement, chiffrement, MFA, SLA) ; décision sur SoftwareApplication | MIG-04 Confiance et commerce | P1, après validation |
| `/guides` (hub) | Non implémentée (404) | Faible | Aucun dédié | Élevée (entrée de silo) | Disponibilité produit exacte de chaque guide | MIG-05 Guides | P1 |
| Six guides | V1, 198 à 557 lignes ; FR seulement ; JSON-LD WebPage + FAQPage + BreadcrumbList | Moyenne | Aucun dédié | Élevée (autorité informationnelle) | Références réglementaires à valider ; liens vers `/gestion-documentaire` absents | MIG-05 Guides | P1 |
| `/blog`, `/blog/[slug]` | V1, dynamique, 56 articles publiés, API obligatoire | Très élevée (slugs, images, API, sitemap) | `blog-coro-insights.webp` (illustration d'interface de blogue) | Très élevée (longue traîne) | Inventaire live confirmé (56 articles), contrat API, échec propre | MIG-06 Blogue | P2, enveloppe seulement |
| `/privacy`, `/terms` | V1, 613 et 668 lignes, sans JSON-LD | Élevée (juridique) | Aucun | Faible | Identité légale et copyright (REVIEW) | MIG-07 Légal | P2, enveloppe seulement |
| `/` | V1, `HomePageClient` 9 032 lignes | Très élevée | `portfolio-aerial`, `portfolio-buildings` (inutilisés) | Très élevée (marque et catégorie) | Toutes les destinations prêtes ; contrats de parrainage, DemoForm, ancres, vidéo | MIG-09 Accueil | Dernière |

Aucune autre page publique non migrée n'a été trouvée : les routes du §3.1 marquées « Non migrée » épuisent la liste.

## 9. Guides

Six routes réelles, toutes implémentées, FR seulement, indexables, au sitemap, et sur le design system legacy (V1 : chrome legacy, aucun `V2Shell`).

| URL | Type de document | Implémentée | Langue | Indexable | Design system | Liée depuis la page Documents ? | Disponibilité produit (énoncé exact) | Prochaine action |
|---|---|---|---|---|---|---|---|---|
| `/documents/plan-mesures-urgence-pmu` | PMU | Oui | FR | Oui | V1 legacy | Oui | Configurateur et export PDF disponibles | Migration V2 légère, contenu préservé |
| `/documents/plan-securite-incendie-psi` | PSI | Oui | FR | Oui | V1 legacy | Oui | Configurateur et export PDF disponibles | Idem |
| `/documents/plan-continuite-activites-pca` | PCA | Oui | FR | Oui | V1 legacy | Oui | Configurateur et export PDF disponibles | Idem |
| `/documents/plan-gestion-crise-pgc` | PGC | Oui | FR | Oui | V1 legacy | Oui | Phase 2, pas de configurateur | Idem ; ne pas revendiquer la génération |
| `/documents/plan-reprise-activites-pra` | PRA | Oui | FR | Oui | V1 legacy | Oui | Phase 2, pas de configurateur | Idem |
| `/documents/plan-urgence-environnementale-pue` | PUE | Oui | FR | Oui | V1 legacy | Oui | Phase 2, pas de configurateur | Idem ; lien contextuel vers `/sentinelle-population` |

Constats :
- Les six guides sont liés depuis `/gestion-documentaire` (le constat R-03 de MIG-00A est résolu dans ce sens).
- L'inverse manque : les pages de guide ne lient PAS `/gestion-documentaire` ni les autres pages produit (le chrome legacy ne mène qu'à `/sentinelle-population` parmi les pages produit, et l'accueil lie trois guides). Le silo « produit ↔ hub ↔ guides » de MIG-00A §26.3 n'est donc pas encore établi.
- Le hub `/guides` n'existe pas.

Détermination : ni migration complète ni simple préservation. **Traitement V2 léger** : enveloppe V2 (en-tête, pied de page, typographie de lecture), texte, références, FAQ et JSON-LD préservés à l'identique, liens ajoutés vers `/gestion-documentaire`, guides voisins et `/guides`. Les références légales et réglementaires des guides restent REVIEW avant toute réécriture. Aucune migration dans ce document.

## 10. Prepared assets

Actifs V2 préparés (`public/website-v2/`), vérifiés par usage dans `app/`, `components/` et `lib/`, et pour trois d'entre eux par ouverture de l'image.

| Actif | Page visée | Utilisé ? | Décision | Notes |
|---|---|---|---|---|
| `pricing/pricing-coro-plans.webp` | `/pricing` | Non | **HOLD, ne pas publier tel quel** | Ouvert : affiche des prix et offres inventés (« 0 $ », « 199 $ / mois », « Économisez jusqu'à 20 % », « 5 utilisateurs », « SLA dédié », « MFA et sécurité avancée »), en contradiction avec la règle « aucun prix fixe publié » (MIG-00A D-04). Texte incrusté « TOUR PRÉMONT ». Utilisable seulement recadré hors de l'écran, avec approbation humaine. |
| `security/security-canadian-hosting.webp` | `/security` | Non | **HOLD, ne pas publier tel quel** | Ouvert : affirmations incrustées « Loi 25 », « PIPEDA », « ISO 27001 (inspiration) », « Chiffrement de bout en bout », « MFA », « Surveillance continue 24/7 », « Statut des services » tout au vert, « Hébergé au Canada, Toronto ». Chaque énoncé exige une source avant publication (Content Guidelines, MIG-00A D-02). Risque d'être lu comme une preuve. Utilisable seulement recadrée ou après validation des énoncés. |
| `blog/blog-coro-insights.webp` | `/blog` | Non | REVIEW | Ouvert : maquette d'interface de blogue avec faux titres d'articles et dates. Illustration marketing seulement (`alt=""`), jamais comme aperçu réel du blogue ; à recadrer ou remplacer pour éviter la confusion avec les vrais articles. |
| `exercises/exercise-tabletop.webp` | `/coro-exercices` (REVIEW) | Non | RÉSERVÉ | Route non promue : aucun usage tant que le statut reste REVIEW. |
| `population/industrial-control-room.webp`, `industrial-response.webp`, `industrial-site.webp` | `/sentinelle-population` | Non | RÉSERVÉ | Population utilise `sentinelle-population-alert-territory.webp` ; ces trois images restent disponibles, non requises. |
| `portfolio/portfolio-aerial.webp`, `portfolio-buildings.webp` | Accueil ou Client | Non | RÉSERVÉ | Candidats pour la synthèse d'écosystème de l'accueil ; à auditer à ce moment. |
| `resilience/resilience-building.webp` | `/resilience-operationnelle` | Non | RÉSERVÉ | Alternative de héros ; la page utilise `resilience-emergency-coordination.webp`. |
| `architecture/building-floor.webp` | Laboratoire | Non | RÉSERVÉ | Non utilisé, y compris au Lab. |
| Autres `architecture/*`, `documents/document-blueprint-desk.webp`, `population/population-map-base.webp` | Design Lab | Design Lab seulement | Laboratoire | Le Lab répond 404 en production ; aucun usage de production. |
| `about`, `contact`, `partners`, `referral`, `projects`, `performance`, `client`, `resilience/resilience-emergency-coordination`, `sentinel/*`, `incident/*` | Pages migrées | Oui | UTILISÉS | Aucun retrait. |

Aucun actif n'est supprimé. Aucun actif n'est modifié.

## 11. Future / review routes

Aucune de ces routes n'est promue parce que le concept produit existe. Elles existent dans `routes.ts` avec `implemented: false` et `sitemap: false` ; leur présence n'est pas une approbation.

| Route / concept | Statut actuel | Implémentée ? | Décision de publication | Maturité produit | Action |
|---|---|---|---|---|---|
| `/guides` | PUBLISH-NOW | Non (404) | PUBLISH-NOW | Sans objet (hub éditorial) | À construire en MIG-05 |
| `/plateforme` | BUILD-NOW-HIDDEN | Non | BUILD-NOW-HIDDEN | Vue d'ensemble | Évaluer après stabilité des pages produit ; hors navigation |
| `/coro-platform` | FUTURE | Non | FUTURE, candidat MERGE-REVIEW avec `/plateforme` | — | Aucune |
| `/resilience-operations` | FUTURE | Non | FUTURE, candidat MERGE-REVIEW avec `/resilience-operationnelle` | — | Aucune |
| `/coro-exercices` | REVIEW | Non | REVIEW | Le mode exercice existe dans Incident ; produit autonome non audité | Audit fonctionnel avant décision |
| `/coro-ops` | FUTURE | Non | FUTURE | Non audité | Aucune |
| `/qr-intervention` | FUTURE | Non | FUTURE | Le jeton d'intervention est publié dans Incident comme « lien d'intervention sécurisé », sans revendication de QR | Aucune page dédiée |
| `/coro-knowledge`, `/coro-ai`, `/coro-network` | FUTURE | Non | FUTURE | Non audités ; jamais un produit annoncé | Aucune |
| `/coro-campus` | FUTURE | Non | FUTURE | Non audité | Aucune |
| `/solutions/multi-sites` | FUTURE | Non | FUTURE | Non audité | Aucune |
| `/ressources` | FUTURE | Non | FUTURE | Sans objet | `/guides` et `/blog` suffisent |
| `/conformite-reglementation` | REVIEW | Non | REVIEW / MERGE-REVIEW | Exige validation juridique | Aucune ; comparer à `/guides` et `/security` |
| Application mobile native, alarmes physiques, carte GIS pendant incident, plan ROPI | Roadmap produit (`CLAUDE.md`) | Non | FUTURE | Non publiés | Aucun contenu public |

Vocabulaire retenu pour les statuts : PUBLISH-NOW, BUILD-NOW-HIDDEN, REVIEW, FUTURE, REJECT / SUPERSEDED. Aucune route n'est actuellement REJECT / SUPERSEDED.

## 12. Remaining roadmap

Le séquencement candidat (MIG-04 Sécurité + Tarification, MIG-05 Blogue / ressources, MIG-06 Guides, MIG-07 Accueil, MIG-08 Gate final) a été évalué contre les dépendances réelles. Il n'est pas retenu tel quel, pour quatre raisons :

- **Le légal manque.** `/privacy` et `/terms` doivent passer au shell V2 pour retirer le chrome legacy ; le candidat les omet.
- **Guides avant blogue.** Les guides sont statiques, à faible risque, et portent le silo produit ↔ hub ↔ guides encore manquant ; le blogue est dynamique, à risque très élevé, et dépend de l'API. Regrouper « blogue / ressources » puis « guides » mélange deux niveaux de risque.
- **Le hub `/guides` n'est pas construit** et doit exister avant que l'accueil et les pages produit y renvoient.
- **Sécurité et Tarification dépendent de décisions de gouvernance non prises** (prix, promesse « 24 h », programme fondateur, identité légale, énoncés de sécurité). Elles ne peuvent pas démarrer sur le seul plan visuel.

Séquence recommandée :

| Lot | Contenu | Dépendances et conditions | Note |
|---|---|---|---|
| MIG-04-PRE | Gate de gouvernance : source de vérité des prix, promesse « 24 h », programme fondateur, énoncés de sécurité, identité légale, décision sur le schéma SoftwareApplication de `/security` | Décisions humaines | Aucune migration ; débloque MIG-04 |
| MIG-04 | `/security`, puis `/pricing` (possible en deux sous-lots si les prix restent bloqués) | MIG-04-PRE ; `#fondateur` conservé ou redirigé proprement (lié depuis l'accueil) ; images HOLD (§10) non utilisées telles quelles | Pages de confiance vers lesquelles l'accueil renvoie |
| MIG-05 | `/guides` (hub) et les six guides, avec liens vers `/gestion-documentaire`, guides voisins et Sentinelle Population (PUE) | Références réglementaires préservées et REVIEW ; disponibilité produit exacte par guide | Établit le silo ; FR seulement |
| MIG-06 | `/blog` et `/blog/[slug]` (enveloppe seulement) | Inventaire live confirmé (56 articles) ; contrat API et échec propre ; slugs, images, métadonnées inchangés | Aucune restylisation à l'aveugle |
| MIG-07 | `/privacy` et `/terms` (enveloppe seulement) | Identité légale et copyright REVIEW ; texte inchangé | Achève le retrait du chrome legacy pour les pages non accueil |
| MIG-08 | Passe éditoriale et de maillage : retrofit ressources (Résilience et Documents HIGH ; Projects, Performance, Client MEDIUM), liens contextuels vers Incident depuis Résilience et Sentinelle, vocabulaire « présence » | Aucun contenu créé ; règle §7 | Avant l'accueil pour que celui-ci lie des destinations finales |
| Point de contrôle | Toutes les destinations liées depuis l'accueil sont prêtes | Obligatoire | |
| MIG-09 | Accueil | Voir §13 | Dernier grand lot |
| MIG-10 | Gate final Website V2 : suppression du chrome legacy restant, `<html lang>`, SEO / hreflang / sitemap / données structurées, QA globale (lecteur d'écran, zoom 200 / 400 %), registre de mise en ligne, exploration comparative, Go / No-Go | Tous les lots précédents | Prépare la mise en ligne |

Principe confirmé : l'accueil est finalisé APRÈS que les pages produit, ressources et confiance sont stables, afin d'être la synthèse de l'écosystème V2 réel et non une conception spéculative.

## 13. Homepage strategy

### 13.1 État (audit de haut niveau, sans conception)

- **Surface :** V1 legacy. `app/page.tsx` (308 lignes) rend `HomePageClient.tsx` (9 032 lignes), sans `V2Shell`, sans en-tête ni pied de page V2, jetons V1 non appliqués. L'en-tête et le pied de page sont ceux du legacy.
- **Métadonnées :** générées côté serveur, FR et EN (`?lang=en`), hreflang fr-CA, en-CA, x-default, JSON-LD WebSite, Organization, ImageObject.
- **Sections et ancres historiques :** `#continuum`, `#indice-coro`, `#sentinelle`, `#evacuation`, `#module-incident`, `#plateforme`, `#documents`, `#solutions`, `#environments`, `#pricing`, `#security`, `#demo`. Vidéo de démonstration avec dialogue (`aria-modal`) sans gestion complète du focus (dette).
- **Liens vers les pages migrées :** quatre pages produit (avec `?lang=en`), `/resilience-operationnelle`, `/sentinelle` et `/sentinelle-population`, `/pricing` et `/pricing#fondateur`, trois guides.
- **Manque :** aucun lien vers `/coro-incident` ; les modules Incident et panique sont présentés par une section interne (`#module-incident`) plutôt que par un lien vers la page dédiée.
- **Énoncés à revoir avant reconstruction (non modifiés ici) :** « consigne à transmettre au 911 » (bouton panique) ; références ISO 22301 / CNPI / CNESST (ligne 70 du fichier) ; « Nous vous contacterons dans les 24 heures » ; « Programme fondateur » ; présentation du module Incident et du bouton panique face aux formulations de la page Incident.
- **Actifs préparés :** `portfolio-aerial.webp` et `portfolio-buildings.webp` (inutilisés) ; la narration cible est `HOMEPAGE-V2-BLUEPRINT.md` (14 sections).

### 13.2 HOMEPAGE MIGRATION BRIEF (pas d'implémentation)

À PRÉSERVER (contrats protégés) : capture `?ref=CR-[A-HJ-NP-Z2-9]{6}` et cookies `coro_referral_code`, `coro_referral_first_touch` (90 jours, domaine `.getcoro.io`) ; lecture par `DemoForm` ; section `#demo` ; ancres historiques (mappées ou conservées) ; SEO utile (titres FR et EN, description, JSON-LD) ; canonical sans `?ref` ; rendu serveur FR et EN ; vidéo de démonstration (avec correction du focus).

À REPORTER JUSQU'À MIG-09 : toute reconstruction de `HomePageClient.tsx` (lecture seule d'ici là) ; le choix des modules mis en avant (dépend des pages finales) ; les images du portefeuille ; la promesse « 24 h » et le programme fondateur (dépendent de MIG-04-PRE) ; les liens vers Incident (à ajouter à la reconstruction).

PRINCIPE : l'accueil est un routeur narratif et d'écosystème. Il ne répète pas les pages produit, ne rend pas de module inexistant comme disponible, et lie chaque capacité à sa page propriétaire (Sentinelle, Incident, Population, Résilience, Documents, Projects, Performance, Client, Guides, Sécurité, Tarification).

## 14. Go-Live debt summary

Vue maîtresse : ne duplique pas les gates détaillés, qui restent l'autorité (`MIG-02-GATE.md`, `MIG-03-REGISTER.md`, `MIG-03-FINAL-GATE.md`, `MIG-03C-…-GATE.md`, `MIG-03D-INCIDENT-AUDIT.md`). Les éléments de publication ne bloquent pas la migration : les pages restent dans la branche.

| Classe | Élément | Référence |
|---|---|---|
| PUBLICATION-BLOCKER | Incident : `alert/fiche_intervention.webp`, adresse d'apparence réelle et détails de site | `MIG-03-REGISTER.md` (MIG-03D) |
| PUBLICATION-BLOCKER | Population : `sentinelle-population-zone.webp` (étape 05), adresse d'apparence réelle | `MIG-03-REGISTER.md` (MIG-03C-E) |
| PUBLICATION-BLOCKER | Documents, Projects, Client, Résilience : provenance des données visibles dans les captures conservées | `MIG-02-GATE.md` §3 et §8 |
| PUBLICATION-BLOCKER (nouveau) | Actifs préparés `pricing-coro-plans.webp` et `security-canadian-hosting.webp` : prix inventés et affirmations de conformité incrustés ; ne pas publier tels quels | §10 |
| PUBLICATION-REVIEW | Incident : illustrations avec libellés d'urgence, écrans de type CORO ; enseigne fictive ; héros avec QR partiellement rogné | `MIG-03-FINAL-GATE.md` §9 |
| PUBLICATION-REVIEW | Population : données de démonstration non confirmées fictives | `MIG-03-REGISTER.md` (MIG-03C-E) |
| DO NOT PUBLISH | Population : image d'alerte au numéro 1 800 363-4735 douteux, et images `installation` et `inscription` non utilisées | `MIG-03-REGISTER.md` (MIG-03C-E) |
| RECAPTURE | Sentinelle (registre, évacuation, non confirmés), Client (tableau de bord, bâtiments, activités), Population (aucune capture réelle), Incident (journal, détail : optionnel) | `MIG-02-GATE.md` §4, `MIG-03-FINAL-GATE.md` §9 |
| CONTENT-GOVERNANCE | Identité légale, adresse et droit d'auteur du pied de page | `MIG-02-GATE.md` §3, MIG-00A D-05 |
| CONTENT-GOVERNANCE | Promesse « 24 heures » du DemoForm (aussi dans l'accueil et `/pricing`) | MIG-00A D-03, `MIG-02-GATE.md` §3 |
| CONTENT-GOVERNANCE | Validité commerciale du programme de recommandation ; « Programme fondateur » | `MIG-02-GATE.md` §3, MIG-00A §26.5 |
| CONTENT-GOVERNANCE | Source de vérité unique des prix (D-04) ; références réglementaires et normatives (D-02) ; hébergement, MFA, SLA | MIG-00A §26.5 |
| CONTENT-GOVERNANCE | Résilience : « 7 sections » du rapport PDF, vocabulaire « présence réelle », propriété publique du module panique | `MIG-03-FINAL-GATE.md` §3.1 |
| SEO-REVIEW | Validation SEO finale de chaque page restante avant de figer titres et descriptions (MIG-00A §26.6) ; JSON-LD `SoftwareApplication` de `/security` face à la pratique V2 | MIG-00A §26.6 |
| SEO-REVIEW | Maillage : guides sans lien vers le produit ; `/coro-incident` sans lien de contenu entrant ; hub `/guides` absent | §9 ; `MIG-03-FINAL-GATE.md` §7 |
| SEO-REVIEW | FAQ dupliquée entre Résilience et Incident | `MIG-03-FINAL-GATE.md` §3.1 |
| ACCESSIBILITY | Aucun test avec lecteur d'écran ; zoom 200 % et 400 % non vérifié ; contraste non re-mesuré ; H1 en `span` à confirmer ; dialogue vidéo de l'accueil, CookieBanner et ChatWidget sans gestion du focus | `MIG-02-GATE.md` §6-7, `MIG-03-FINAL-GATE.md` §12 |
| MIGRATION-ONLY / GLOBAL | `<html lang>` global reste « fr » (le wrapper V2 porte la langue effective) | `MIG-02-GATE.md` §3 |
| MIGRATION-ONLY / GLOBAL | Chrome legacy (`Footer`, `CookieBanner`, `ScrollToTop`, `ChatWidget`) toujours rendu sur les pages non migrées | MIG-00A R-10 |
| ENVIRONMENT | Build local : récupération du blogue en échec, articles omis du sitemap local ; à confirmer sur production | `CURRENT-SITE-INVENTORY.md` §0 |

Rien de ceci n'est corrigé dans ce document.

## 15. Change log from V1.0

Écarts entre `TARGET-PAGE-ARCHITECTURE.md` V1.0 (et MIG-00A) et l'état vérifié. V2.1 gouverne.

| # | V1.0 / MIG-00A | État V2.1 (vérifié) |
|---|---|---|
| 1 | `/coro-incident` : « futur enregistré », « non créée », MIG-04 | IMPLÉMENTÉE, PUBLISH-NOW, V2, FR seulement, au sitemap, MIG-03D (commit `418737fe`) |
| 2 | Sentinelle : cible FR + EN, contenu EN à créer en MIG-04 (D-07) | FR SEULEMENT (décision approuvée en MIG-03) ; sélecteur et hreflang EN retirés |
| 3 | Sentinelle Population : cible FR + EN, traduction en MIG-05 (D-07, R-02) | FR SEULEMENT ; faux signal anglais retiré |
| 4 | Vagues : MIG-03 Résilience, MIG-04 Sentinelle + Incident, MIG-05 Population, MIG-06 Pricing / Security, MIG-07 blogue et guides, MIG-08 légal, MIG-10 accueil | MIG-03 a couvert la famille de quatre pages (Résilience, Sentinelle, Population, Incident) ; les lots restants sont renumérotés au §12 |
| 5 | `/guides` : PUBLISH-NOW « disponible dès MIG-02 » | Non implémentée : 404 ; à construire en MIG-05 |
| 6 | R-03 : guides orphelins | Résolu dans le sens produit → guides ; non résolu dans le sens guides → produit |
| 7 | Jetons V1 seulement dans le Lab | Jetons V1 appliqués sur les 12 pages migrées via `V2Shell` (`data-coro-system="v1"`) |
| 8 | Double pied de page masqué par CSS | Un seul pied de page dans le DOM sur chaque route ; le pied legacy n'est plus rendu sur les routes migrées |
| 9 | R-04 : pages produit V2 sans données structurées | Chaque page produit V2 émet un FAQPage dont les questions égalent la FAQ visible ; About émet Organization, AboutPage, WebSite ; aucun `SoftwareApplication` sur les pages V2 |
| 10 | R-06 : affirmations ISO 22301 / CNPI / CNESST sur Résilience | Retirées du texte public (MIG-03A) |
| 11 | R-13 : prix affichés sur `/sentinelle` | Retirés de la page V2 ; `/pricing` reste à migrer |
| 12 | R-05 : « Coro Solutions Inc. » dans le JSON-LD de Résilience | Absent du JSON-LD actuel (FAQPage seulement) ; identité légale reste REVIEW |
| 13 | Sitemap avec liste manuelle | Piloté par le registre de routes (commit `e882cd9a`) ; 39 URLs statiques + articles du blogue |
| 14 | `/design-lab` en HTTP 200 en production | 404 en production (commit `eea795ab`) |
| 15 | Navigation Option A : Population sous « Résilience et opérations », Guides sous « Ressources » | Population sous « Solutions » ; Guides absents (hub non implémenté) |
| 16 | Master Index : « aucune page de production n'a été migrée » | Douze routes migrées ; Master Index mis à jour par renvoi vers V2.1 |
| 17 | Blogue : inventaire de production à récupérer avant MIG-07 | Récupéré : 56 articles publiés (API publique, 2026-09-26) ; aucun sujet dédié à la gestion d'incident |
| 18 | Actifs V2 `pricing`, `security`, `blog` présentés comme des héros prêts | Existent, inutilisés ; deux d'entre eux portent des prix inventés et des affirmations de conformité (§10) |
| 19 | Règle de découverte de ressources | Nouvelle règle globale (§7) |

Documents mis à jour par pointeur : `00-governance/MASTER-INDEX.md`, `01-strategy/TARGET-PAGE-ARCHITECTURE.md` (bandeau « supplanté en partie par V2.1 »). Aucune suppression : V1.0 est conservé comme historique.
