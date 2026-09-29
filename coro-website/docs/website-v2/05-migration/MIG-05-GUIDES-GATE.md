# MIG-05-PRE — Guides Family Audit & Migration Gate

Gate d'audit et de planification AVANT toute migration de `/guides` et des six guides documentaires. Aucun code, aucune route, aucun sitemap, aucun registre V2 modifiés. Date : 2026-09-27. Branche `feature/website-v2`, HEAD `8afb0fa4`, arbre propre au départ (seul élément non suivi : `public/website-v2/guides/`, fourni par l'humain pour MIG-05, non modifié). Autorités : `01-strategy/TARGET-PAGE-ARCHITECTURE-V2.1.md`, `04-quality/QA-ACCEPTANCE-CHECKLIST.md`.

## 1. Inventaire des routes

| Route | Implémentée | Comportement HTTP | Sitemap | FR | EN | Liée depuis Documents | Liée depuis l'accueil | Liée depuis un autre guide | Métadonnées | Données structurées | Architecture de page |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/guides` | Non | 404 | Non | — | — | Non | Non | — | Aucune | Aucune | N'existe pas |
| `/documents/plan-mesures-urgence-pmu` (PMU) | Oui | 200 | Oui (registre) | Oui | Non | Oui | Oui (accueil, section documents) | Non | `title`/`description` avec marque, `hreflang` fr-CA + x-default | `WebPage`+`WebSite`+`Thing`+`Organization`+`ImageObject`+`BreadcrumbList`+`ListItem`+`FAQPage`+`Question`+`Answer` | Legacy V1, chrome propre, sans `V2Shell` |
| `/documents/plan-securite-incendie-psi` (PSI) | Oui | 200 | Oui | Oui | Non | Oui | Oui | Non | Idem | Idem | Idem |
| `/documents/plan-continuite-activites-pca` (PCA) | Oui | 200 | Oui | Oui | Non | Oui | Oui | Non | Idem | Idem | Idem |
| `/documents/plan-gestion-crise-pgc` (PGC) | Oui | 200 | Oui | Oui | Non | Oui | Oui | Non | Idem | Idem | Idem, avec bandeau Phase 2 |
| `/documents/plan-reprise-activites-pra` (PRA) | Oui | 200 | Oui | Oui | Non | Oui | Oui | Non | Idem | Idem | Idem, avec bandeau Phase 2 |
| `/documents/plan-urgence-environnementale-pue` (PUE) | Oui | 200 | Oui | Oui | Non | Oui | Oui | Non | Idem | Idem | Idem, avec bandeau Phase 2 |

Vérifié dans `lib/site/routes.ts` : les six guides sont `historical(...)`, `publication: 'PUBLISH-NOW'`, `family: 'resources'`, `fr: true, en: false, sitemap: true`. `/guides` existe comme route future (`kind: 'future'`, `publication: 'PUBLISH-NOW'`, `implemented: false`, `sitemap: false`) : c'est la seule route PUBLISH-NOW du registre qui n'existe pas encore (confirmé par `tests/sitemap.test.ts`).

**Orphelin confirmé.** Aucun guide ne lie `/gestion-documentaire` ni un autre guide dans son contenu (vérifié sur les six pages rendues). Chacun lie seulement `/blog`, `/pricing`, `/sentinelle-population`, `/security`, `/about`, `/partners`, `/contact`, `/privacy`, `/terms`, les identifiants applicatifs et ses propres sources réglementaires. Le silo Documents ↔ Guides décrit dans MIG-00A §26.3 (« chaque guide renvoie naturellement vers `/gestion-documentaire` ») n'est PAS implémenté : c'est un manque à corriger en migration.

## 2. État HTTP actuel

Les six guides répondent 200 sur le serveur de production local. `/guides` répond 404. Chaque guide porte le chrome legacy complet (en-tête propre à la page, pied de page legacy, aucun `V2Shell`), un seul `<footer>` visible, mais `<main>` absent du DOM pour cinq des six (PMU, PSI, PGC, PRA, PUE n'ont pas de `<main>` ; PCA en a un) — dette d'accessibilité à corriger en migration (repère de région principale manquant).

## 3. Inventaire de contenu par guide (matrice de préservation)

Légende : PRESERVE (contenu conservé tel quel), RECOMPOSE (même contenu, structure ou emplacement différent), REWRITE (formulation à revoir), REMOVE (à retirer), REVIEW (décision humaine ou juridique requise avant migration).

### PMU — Plan de mesures d'urgence

| Bloc | Classe | Note |
|---|---|---|
| H1 « Plan de Mesures d'Urgence (PMU) » et intro | PRESERVE | |
| CTA héros « Générer votre PMU avec CORO » | PRESERVE | Cohérent : PMU disponible dans CORO |
| Définition « Qu'est-ce qu'un PMU » | PRESERVE | |
| Cadre légal (RSST section IV art. 34-36, LSST art. 51.1/51.5/51.6/51.8, Loi sur la sécurité civile, Loi sur la sécurité incendie, CSA Z731-14) | REVIEW | Voir §5 : la référence « CSA Z731-14 » est probablement une erreur de désignation (la norme existante est CSA-Z731-03, confirmée 2014, pas une édition « Z731-14 ») ; les numéros d'articles RSST ne sont pas vérifiés dans ce gate |
| Distinction PMU vs PSI | PRESERVE | Cohérente avec les cinq autres guides |
| Contenu d'un PMU complet | PRESERVE | |
| Fréquence de mise à jour | PRESERVE | Formulation générale, sans date fixe |
| « Comment CORO simplifie la production du PMU » | PRESERVE | Vérifié disponible dans le produit (`CLAUDE.md` : PMU 100 % fonctionnel) |
| Sources et références (liens sortants) | PRESERVE, avec vérification de chaque URL en migration | Voir §5 |
| Avertissement « contenu informatif, consultez les autorités » | PRESERVE | Bonne pratique déjà en place |
| FAQ (4 questions) | PRESERVE | |
| CTA final + lien « Lire nos guides » | RECOMPOSE | Le lien « Lire nos guides » pointe aujourd'hui vers... à vérifier en migration (probablement `/guides`, qui n'existe pas : lien mort potentiel, voir §5 REVIEW) |
| JSON-LD `Thing`+`Organization`+`ImageObject` sur une page sans image | REVIEW | `ImageObject` sans image réelle sur la page ; à auditer précisément au moment de la migration |

### PSI — Plan de sécurité incendie

| Bloc | Classe | Note |
|---|---|---|
| H1, intro, CTA « Générer votre PSI avec CORO » | PRESERVE | Cohérent : PSI disponible |
| Définition | PRESERVE | |
| Bâtiments visés (réunion, soins, RPA/RI, garderies, habitation) | REVIEW | À vérifier avec une source primaire au moment de la rédaction finale (voir §5) |
| Contenu d'un PSI complet, références aux articles CNPI (2.8.3, 2.8.2.7, 2.8.1.2) | REVIEW | Numéros d'articles non vérifiés dans ce gate ; à confirmer avant migration |
| Cadre légal CNPI 2020 Québec, entrée en vigueur 17 avril 2025 | VERIFIED avec nuance | Voir §5 : date confirmée, mais une période transitoire jusqu'au 16 octobre 2026 n'est pas mentionnée par le guide |
| Fréquence de mise à jour annuelle | REVIEW | Non vérifié dans ce gate |
| « Comment CORO simplifie la production du PSI » | PRESERVE | Disponible dans le produit |
| Sources et références | PRESERVE, vérification d'URL en migration | |
| FAQ (4 questions) | PRESERVE | |
| CTA final | RECOMPOSE | Même point que PMU |

### PCA — Plan de continuité des activités

| Bloc | Classe | Note |
|---|---|---|
| H1, intro, CTA « Structurer votre PCA avec CORO » | PRESERVE | Cohérent : PCA disponible ; verbe plus prudent que PMU/PSI (« structurer » plutôt que « générer »), à harmoniser en migration selon la vérité produit exacte du générateur PCA |
| Définition, référence ISO 22301 | VERIFIED | Version 2019 toujours actuelle (voir §5) |
| Secteurs où le PCA est exigé ou recommandé (BSIF, santé, gouvernemental, ISO 22301) | REVIEW | Affirmations sectorielles à confirmer avec les sources primaires en migration |
| Contenu (BIA, RTO, RPO, stratégies, communication de crise, tests) | PRESERVE | |
| Fréquence de test annuelle | REVIEW | Non vérifiée dans ce gate |
| « Comment CORO supporte la production du PCA » | PRESERVE | Disponible dans le produit |
| Sources et références | PRESERVE, vérification d'URL | |
| Avertissement | PRESERVE | |
| FAQ (4 questions) | PRESERVE | |
| Différence PCA/PRA | PRESERVE | Cohérente avec le guide PRA |

### PGC — Plan de gestion de crise (Phase 2)

| Bloc | Classe | Note |
|---|---|---|
| Bandeau « Phase 2 — En développement » | PRESERVE | Frontière produit correctement affichée |
| H1, intro | PRESERVE | |
| CTA héros « Structurer votre PGC avec CORO » | REVIEW | Verbe prudent, cohérent avec le bandeau Phase 2 juste en dessous ; à confirmer que « structurer » ne laisse pas entendre une génération actuelle |
| Définition, référence ISO 22361:2022 | VERIFIED | Norme confirmée, publiée en 2022 (voir §5) |
| Distinction urgence / crise | PRESERVE | Territoire éditorial propre, utile |
| Contenu d'un PGC complet | PRESERVE | |
| Communication de crise | PRESERVE | |
| Fréquence de révision, exercices tabletop 12-18 mois | REVIEW | Non vérifié dans ce gate |
| « Comment CORO supporte la production du PGC » | PRESERVE | Formulation déjà prudente (« structure », pas « génère ») |
| Bandeau bas « Le PGC arrive dans CORO — Phase 2 », capture de courriel | PRESERVE | Frontière produit correcte |
| Sources et références (ISO 22361, ISO 22301, cadre fédéral) | PRESERVE, vérification d'URL | |
| FAQ (4 questions) | PRESERVE | |

### PRA — Plan de reprise des activités (Phase 2)

| Bloc | Classe | Note |
|---|---|---|
| Bandeau Phase 2 | PRESERVE | |
| H1, intro, CTA « Structurer votre PRA avec CORO » | PRESERVE | Verbe prudent, cohérent |
| Définition, PRA vs PCA, PRA informatique vs opérationnel | PRESERVE | Territoire distinct de PCA, bien délimité |
| Références ISO 22301, ISO/IEC 27031:2011 | VERIFIED | Voir §5 |
| Contenu d'un PRA complet | PRESERVE | |
| Fréquence de test annuelle | REVIEW | Non vérifiée dans ce gate |
| « Comment CORO supporte la production du PRA » | PRESERVE | |
| Bandeau bas Phase 2 | PRESERVE | |
| FAQ (4 questions), dont « Le PRA doit-il être testé? » qui mentionne « CORO intègre un module de suivi des exercices » | REVIEW | Vérifier si cette capacité existe réellement indépendamment du générateur PRA (Phase 2) : elle pourrait déjà exister via le module Exercices/REX d'Incident, à confirmer avant migration pour ne pas mélanger une capacité déjà livrée avec un document encore en Phase 2 |

### PUE — Plan d'urgence environnementale (Phase 2)

| Bloc | Classe | Note |
|---|---|---|
| Bandeau Phase 2 | PRESERVE | |
| H1, intro | PRESERVE | |
| **CTA héros « Générer votre PUE avec CORO »** | **REMOVE ou REWRITE (PUBLICATION-BLOCKER)** | Contradiction directe avec le bandeau Phase 2 affiché plus bas sur la même page : « Générer » implique une disponibilité actuelle du générateur, alors que le PUE est Phase 2. Seul guide des trois Phase 2 à utiliser un verbe fort de génération dans son CTA principal. À remplacer par un verbe prudent (« Structurer », « Comprendre », « Se préparer au ») avant toute migration |
| Cadre réglementaire RUE 2019 (DORS/2019-51), 249 substances, six catégories de danger | VERIFIED | Voir §5 |
| « Êtes-vous assujetti » | PRESERVE | |
| Contenu d'un PUE complet | PRESERVE | |
| Obligations de notification, courriel de la division des urgences environnementales | REVIEW | Adresse courriel gouvernementale à revérifier au moment de la migration (source dynamique, peut changer) |
| SIMDUT, REPTOX | PRESERVE | Cohérent avec le module REPTOX déjà livré dans CORO (88 substances, `CLAUDE.md`) — bon point de connexion produit à exploiter en migration |
| « Comment CORO supporte la production du PUE » | REVIEW | Décrit un « module de gestion des matières dangereuses » qui documente déjà l'inventaire des substances : à distinguer clairement de la génération du PUE lui-même (Phase 2), qui n'existe pas |
| Bandeau bas Phase 2 | PRESERVE | |
| FAQ (4 questions) | PRESERVE | |
| « Le PUE est-il relié au PMU? Oui, il peut être intégré au PMU... » | PRESERVE | Lien produit-territoire utile |

## 4. Frontière de vérité produit

**Confirmé dans le code et dans `CLAUDE.md`** : PMU, PSI et PCA disposent d'un configurateur applicatif complet (production, édition, approbation, export PDF) dans CORO. PGC, PRA et PUE sont des pages marketing « Phase 2 » sans configurateur applicatif ; les dossiers `pca-export/`, `pca-generator/`, `pca-procedures/` sous `coro-backend/src/pca/` sont vides (piège déjà documenté).

**Cette frontière produit est correctement reflétée dans le code des trois guides Phase 2** par le bandeau « Phase 2 — En développement » (en tête et en pied de page) et par une formulation de CTA généralement prudente (« Structurer votre PGC/PRA avec CORO »), **sauf pour PUE**, dont le CTA héros dit « Générer votre PUE avec CORO » — une formulation de disponibilité immédiate en contradiction avec le bandeau Phase 2 affiché sur la même page. C'est un PUBLICATION-BLOCKER à corriger avant la migration de PUE (§20).

**Formulation sûre pour la migration** (à appliquer aux six guides, en particulier PGC/PRA/PUE) :

| Autorisé | Interdit |
|---|---|
| « Ce guide explique le [document]. » | « CORO génère actuellement ce document. » |
| « CORO structure votre [document] à l'aide de modèles. » (PGC/PRA/PUE seulement si la capacité de structuration existe réellement hors configurateur) | « Générer votre [document] avec CORO » pour un document Phase 2 |
| « [Document] arrive dans CORO — Phase 2 » | Tout CTA suggérant une action immédiate de génération pour PGC/PRA/PUE |
| « CORO génère, structure et gère vos documents de conformité » (CTA final générique, déjà présent sur les six pages) | Attribution d'une capacité Phase 2 à un module déjà livré (ex. confondre le module REPTOX livré avec la génération du PUE, qui ne l'est pas) |

Cette distinction sera protégée par des tests de migration (interdiction de « génère »/« generate » à proximité du nom du document sur les pages PGC/PRA/PUE, sauf dans le contexte « arrive dans CORO »).

## 5. Audit réglementaire et normatif

Recherche publique ciblée, sources primaires priorisées. Aucune de ces sources ne constitue un avis juridique.

| # | Affirmation | Guide | Formulation publique actuelle | Source | Date / version | Statut | Décision de migration |
|---|---|---|---|---|---|---|---|
| 1 | RSST, section IV, art. 34-36, mesures de sécurité en cas d'urgence | PMU | « prescrit les obligations de l'employeur : plan d'évacuation, exercices annuels, extincteurs portatifs » | LégisQuébec S-2.1, r. 13 (lien déjà cité par le guide) | Non confirmé dans ce gate | NOT VERIFIED | Confirmer le contenu exact des articles 34 à 36 sur LégisQuébec avant la rédaction finale |
| 2 | LSST art. 51.1, 51.5, 51.6, 51.8 | PMU | « impose également des obligations à l'employeur » | LégisQuébec S-2.1 | Non confirmé | NOT VERIFIED | Idem |
| 3 | Norme CSA Z731-14 | PMU | « norme de référence pour la planification d'urgence » | Recherche publique : la norme existante est **CSA-Z731-03 (confirmée C2014)**, pas une édition « Z731-14 » | 2003, reconduite 2014 | **IMPRECISE** | Corriger la désignation en « CSA Z731-03 (C2014) » avant migration ; vérifier auprès de CSA Group si une édition plus récente existe |
| 4 | CNPI 2020, entrée en vigueur au Québec le 17 avril 2025 | PSI | « entré en vigueur le 17 avril 2025 » | RBQ (rbq.gouv.qc.ca), confirmé par recherche publique | Modifications publiées à la Gazette officielle le 2 avril 2025, en vigueur le 17 avril 2025 | VERIFIED, avec nuance | **Ajouter la période transitoire** : les dispositions antérieures au 17 avril 2025 restent applicables jusqu'au 16 octobre 2026 (18 mois de transition) ; le guide actuel ne mentionne pas cette période, ce qui peut induire en erreur un lecteur qui vérifie sa propre situation pendant la transition |
| 5 | Bâtiments visés par le PSI (réunion, soins, RPA/RI, garderies, habitation), articles 2.8.3, 2.8.2.7, 2.8.1.2 du CNPI | PSI | Liste de catégories et numéros d'articles précis | Non revérifié article par article dans ce gate | — | NOT VERIFIED | Confirmer chaque numéro d'article auprès du texte du CNPI 2020 modifié Québec avant migration |
| 6 | ISO 22301:2019, continuité des activités | PCA, PGC (mention), PRA | « norme internationale de référence » | ISO.org | 2019, toujours la version courante (aucune révision 2025/2026 trouvée) | VERIFIED | Conserver |
| 7 | ISO 22361:2022, gestion de crise | PGC | « fournit des lignes directrices sur les principes et le cadre de la gestion de crise » | ISO.org | Publiée novembre 2022, remplace PD CEN/TS 17091:2018 et BS 11200:2014 | VERIFIED | Conserver |
| 8 | ISO/IEC 27031:2011, continuité TI | PRA | « norme de référence... pour les aspects informatiques » | Recherche publique confirme l'existence de la norme sous cette désignation | 2011 | VERIFIED (existence) ; actualité de l'édition NOT VERIFIED | Vérifier si une édition plus récente existe avant migration |
| 9 | Règlement sur les urgences environnementales (2019), DORS/2019-51, 249 substances réglementées | PUE | « règlemente 249 substances dangereuses » | Gazette du Canada, partie 2, vol. 153 n° 5 ; laws-lois.justice.gc.ca | En vigueur depuis le 24 août 2019 | VERIFIED | Conserver |
| 10 | Six catégories de danger (toxicité aquatique, combustible, explosion, feu en nappe, inhalation, oxydant) | PUE | Liste de six catégories | Cohérente avec la structure connue du règlement ; non revérifiée ligne par ligne dans ce gate | — | NOT VERIFIED | Confirmer la liste exacte avant migration |
| 11 | LCPE (1999), obligation d'aviser immédiatement en cas de rejet | PUE | « le gouvernement fédéral doit être avisé immédiatement » | laws-lois.justice.gc.ca (lien déjà cité) | 1999 | NOT VERIFIED (formulation générale plausible, non revérifiée mot à mot) | Confirmer avant migration |
| 12 | Adresse courriel de la division des urgences environnementales (`ec.ue-e2.ec@canada.ca`) | PUE | Coordonnée directe publiée | Source gouvernementale citée par le guide | — | NOT VERIFIED (adresse dynamique) | Revérifier l'adresse active sur canada.ca au moment de la migration, avant republication |
| 13 | REPTOX, IRSST | PUE | « répertoire REPTOX, géré par l'IRSST » | Cohérent avec le module REPTOX du produit CORO (88 substances) | — | VERIFIED (organisme et rôle) | Conserver ; bonne occasion de lier le produit |

Aucune affirmation ne prétend que CORO lui-même est conforme ou certifié à l'une de ces normes : les guides citent des références externes pour le document décrit, pas pour la plateforme. C'est cohérent avec la gouvernance déjà établie (MIG-00A D-02, `/security`).

## 6. Territoire éditorial par guide

| Guide | Territoire propre | Chevauchement identifié |
|---|---|---|
| PMU | Planification organisationnelle des mesures d'urgence, cadre légal québécois (RSST, LSST, sécurité civile, sécurité incendie) | Partage la distinction PMU/PSI avec PSI (cohérent, un seul propriétaire du sujet par page) |
| PSI | Sécurité incendie d'un bâtiment, CNPI 2020, bâtiments visés | Idem |
| PCA | Continuité des activités critiques, BIA, RTO/RPO, ISO 22301 | Partage RTO/RPO et ISO 22301 avec PRA (attendu : PCA et PRA sont des documents complémentaires et se citent mutuellement) |
| PGC | Gouvernance décisionnelle de crise, communication, cellule de crise, ISO 22361 | Distinction urgence/crise bien posée face à PMU ; référence à ISO 22301 partagée avec PCA (contexte, pas duplication) |
| PRA | Reprise technologique et opérationnelle après sinistre, RTO/RPO, ISO/IEC 27031 | Partage PCA/PRA avec PCA (attendu) |
| PUE | Scénario industriel et environnemental, substances réglementées, RUE 2019, SIMDUT/REPTOX | Territoire le plus distinct des six ; recoupe Sentinelle Population (alerte publique) sans le dupliquer |

Aucune des six pages n'est une copie avec l'acronyme changé : chacune a son cadre légal propre, ses articles FAQ propres et son territoire de recherche propre. Le principal risque de similitude est visuel (structure identique), pas éditorial.

## 7. Recherche SEO par guide

Recherche publique ciblée, français Québec/Canada en priorité. Aucun volume de recherche n'est inventé.

| Guide | Intention de recherche principale | Expression principale probable | Expressions secondaires utiles | Intention concurrente | Piste de titre | Piste de description |
|---|---|---|---|---|---|---|
| PMU | Comprendre l'obligation et le contenu d'un plan de mesures d'urgence | « plan de mesures d'urgence » | « PMU Québec », « obligations mesures d'urgence entreprise », « RSST mesures d'urgence » | Fournisseurs concurrents (PMU Québec, ICO, StraTJ) qui offrent aussi des définitions | « Plan de mesures d'urgence (PMU) : définition, obligations, contenu » | Reprendre cadre légal + contenu + lien CORO, sans marque dans le titre |
| PSI | Comprendre l'obligation CNPI/Code de sécurité pour un bâtiment | « plan de sécurité incendie » | « CNPI 2020 Québec », « PSI obligatoire », « plan d'évacuation bâtiment » | Contenu institutionnel (RBQ) qui répond déjà bien à cette intention | « Plan de sécurité incendie (PSI) : obligations et contenu (CNPI 2020) » | Cadre légal + bâtiments visés |
| PCA | Comprendre le PCA et le distinguer du PRA | « plan de continuité des activités » | « BIA », « RTO RPO », « ISO 22301 » | Fournisseurs de logiciels BCM (contenu déjà présent dans le blog) | « Plan de continuité des activités (PCA) : BIA, RTO, RPO » | Définition + secteurs concernés |
| PGC | Comprendre la gouvernance de crise | « plan de gestion de crise » | « cellule de crise », « communication de crise », « ISO 22361 » | Peu de contenu FR Québec spécifique trouvé : opportunité | « Plan de gestion de crise (PGC) : cellule de crise et communication » | Distinction urgence/crise, disponibilité Phase 2 honnête |
| PRA | Comprendre la reprise après sinistre, RTO/RPO | « plan de reprise des activités » / « disaster recovery plan » | « PRA informatique », « ISO/IEC 27031 » | Contenu IT/DRP anglophone dominant | « Plan de reprise des activités (PRA) : RTO, RPO, PRA vs PCA » | Distinction PCA/PRA en avant, disponibilité Phase 2 honnête |
| PUE | Vérifier l'assujettissement au RUE 2019 | « plan d'urgence environnementale » | « RUE 2019 », « DORS/2019-51 », « 249 substances réglementées » | Peu de contenu FR accessible : opportunité claire | « Plan d'urgence environnementale (PUE) : Règlement 2019 et substances réglementées » | Assujettissement + disponibilité Phase 2 honnête |

**Valeur SEO existante à préserver** : les six URLs actuelles (`/documents/plan-*-{pmu,psi,pca,pgc,pra,pue}`) ne sont pas modifiées dans cette migration ; chaque guide est déjà indexable, au sitemap, avec un `FAQPage` JSON-LD. Aucune raison identifiée de les renommer.

## 8. Architecture du futur hub `/guides`

`/guides` est actuellement 404. Rôle proposé : **aider le visiteur à identifier quel document de résilience répond à quel besoin organisationnel**, pas un centre de ressources générique.

Proposition d'architecture de l'information (aucune implémentation) :

1. **En-tête éditorial** : pourquoi CORO documente ces six plans (rôle du hub, pas un produit en soi).
2. **Disponibles dans CORO aujourd'hui** — PMU, PSI, PCA : trois entrées avec un lien vers le guide et un lien vers `/gestion-documentaire`.
3. **Ressources éducatives — familles de documents Phase 2** — PGC, PRA, PUE : présentées comme des ressources de connaissance à part entière, jamais comme « indisponibles » ou de second ordre ; même profondeur éditoriale que les trois premières, avec la mention honnête que la production dans CORO arrive en Phase 2.
4. **Pont vers `/gestion-documentaire`** pour l'ensemble.
5. Éventuellement, un pont vers la ressource éditoriale du blogue la plus générale (contrôle des versions PMU/PSI/PCA, résilience organisationnelle).
6. FAQ courte propre au hub (ex. « Quelle est la différence entre ces documents? », « Lesquels sont disponibles dans CORO? »).

Aucune section « ressources génériques archivées » : le hub reste un outil d'orientation, cohérent avec la règle de découverte de ressources déjà établie (§9 des tâches précédentes).

## 9. Audit des sept images (fichiers réels)

Répertoire `public/website-v2/guides/`. Fichiers réels, tous audités depuis le dépôt :

| Fichier | Guide visé | Classement | Constat |
|---|---|---|---|
| `guides-coro-documentation-resilience.webp` | Hub | MARKETING / EDITORIAL ILLUSTRATION | Scène de bureau, trois professionnels autour de plans et de photos de bâtiments, pile de livres nommés (Plans d'urgence, Continuité des activités, Gestion de crise, Reprise après sinistre, Résilience opérationnelle), texte mural « BÂTIR DES MILIEUX PLUS RÉSILIENTS ». Aucun logo CORO, aucune interface illustrée. Sûre : `alt=""`, contexte éditorial suffisant. |
| `guide-pmu-emergency-measures.webp` | PMU | MARKETING / EDITORIAL ILLUSTRATION | Scène de préparation d'urgence générale : quatre personnes (dont une en tenue d'intervention avec radio et casque rouge visibles) autour de plans, écran « PLAN D'ÉVACUATION » avec pictogrammes, gobelet « PRÉVENIR PRÉPARER PROTÉGER », livres nommés, avertisseur d'incendie mural, panneau SORTIE. Aucun texte réglementaire faux, aucune donnée chiffrée, aucun logo CORO. Sûre pour PMU (territoire large, pas seulement incendie). |
| `guide-psi-fire-safety.webp` | PSI | MARKETING / EDITORIAL ILLUSTRATION | Scène orientée incendie : plan d'évacuation avec légende (Vous êtes ici, Sortie, Extincteur, Borne d'incendie, Alarme incendie), pompiers en arrière-plan avec camion, casque de chantier, livre « SÉCURITÉ INCENDIE ». Cohérente avec le territoire du guide. **Attention** : les pompiers en arrière-plan pourraient suggérer un incident réel en cours plutôt qu'une scène de planification ; à mentionner en légende de contexte (« illustration », pas de cartouche factuelle nécessaire car photo purement décorative). Sûre avec `alt=""`. |
| `guide-pca-business-continuity.webp` | PCA | MARKETING / EDITORIAL ILLUSTRATION | Écran « CONTINUITÉ DES ACTIVITÉS » avec catégories d'incidents illustratives (Sinistre, Cyberattaque, Intempéries, Perturbation des fournisseurs), diagramme de flux Préparer→Répondre→Maintenir→Rétablir, livres nommés, texte mural « ANTICIPER S'ADAPTER MAINTENIR AVANCER ». Aucune donnée chiffrée réelle, aucun logo. Sûre. |
| `guide-pgc-crisis-management.webp` | PGC | MARKETING / EDITORIAL ILLUSTRATION, **point d'attention** | Centre de coordination de crise détaillé : écrans « SITUATION », carte de Montréal avec incidents fictifs géolocalisés, image satellite d'ouragan, tableau « SITES PRIORITAIRES » (Site A à E, statuts Opérationnel/À surveiller/Impacté/Vérification), organigramme d'équipe de gestion de crise, tableau blanc manuscrit avec « Prochaine mise à jour 14h00 ». Personnel en gilet « MESURES D'URGENCE ». **Cette image est la plus proche d'une interface fonctionnelle illustrée (cartes, statuts, tableau de bord) : elle doit rester strictement `alt=""`, sans légende ni cartouche qui pourrait la faire passer pour une capture, et le texte de la page doit rappeler que PGC est une ressource éducative, pas un module CORO existant.** Elle ne montre aucun logo ni élément de marque CORO, donc n'est pas une fausse preuve produit, mais son réalisme d'interface est élevé. |
| `guide-pra-disaster-recovery.webp` | PRA | MARKETING / EDITORIAL ILLUSTRATION, **point d'attention** | Écran « REPRISE DES SYSTÈMES » avec statuts illustratifs (Systèmes critiques : En ligne ; Sauvegardes : Complétées ; Site de relève : Prêt ; Tests de reprise : Planifiés), diagramme cloud/serveurs, affiche « PRA — REPRISE DES SYSTÈMES » avec flux Systèmes critiques→Site principal→Sauvegarde→Site de relève→Rétablissement, personnage en arrière-plan avec inscription « INFRASTRUCTURE RÉSILIENCE » sur le dos. Salle de serveurs en arrière-plan. Même point d'attention que PGC : ressemble à un tableau de bord fonctionnel. `alt=""` obligatoire, jamais de cartouche technique, texte de page qui rappelle Phase 2. |
| `guide-pue-environmental-emergency.webp` | PUE | MARKETING / EDITORIAL ILLUSTRATION, **point d'attention réglementaire** | Site industriel avec réservoirs étiquetés « AMMONIAC » (losange NFPA visible), intervenants en gilets « SÉCURITÉ ENVIRONNEMENT », « INTERVENTION ENVIRONNEMENTALE », « GESTION DE CRISE », « LIAISON AUTORITÉS », camion de pompiers, panache de fumée/vapeur blanche, écran cartographique avec zones concentriques colorées (« Scénario », « Zone d'impact élevée/modérée/faible »), livres nommés. **Scénario clairement fictif et générique (aucune adresse, aucun nom d'installation réel), cohérent avec le traitement déjà approuvé pour Sentinelle Population** (scénario NH₃ fictif, carte de zones illustratives). Le losange NFPA « AMMONIAC » est un pictogramme générique de sécurité, pas une fausse donnée réglementaire spécifique. Sûre avec `alt=""` et, si un texte de contexte est ajouté, une mention « illustration, scénario fictif » comme sur Sentinelle Population. |

**Aucune image ne porte de logo CORO, de texte de marque, de prix, de certification ou de donnée nominative.** Aucune n'est une capture d'écran du produit. Le point commun à surveiller (PGC, PRA) est le réalisme des tableaux de bord illustrés : `alt=""` et absence de cartouche technique suffisent, à condition que le texte éditorial adjacent rappelle explicitement le statut Phase 2 (déjà le cas dans le code actuel des trois guides Phase 2).

## 10. Stratégie de famille visuelle

Une image forte par guide, comme préparée. Ressemblance de famille recommandée : cadrage éditorial similaire (scène de travail collaboratif autour de plans/écrans), palette cohérente avec le reste du site V2 (marine, rouge d'accent), sans dupliquer la composition (chaque image a son propre sujet dominant : évacuation pour PSI, continuité pour PCA, coordination de crise pour PGC, infrastructure pour PRA, scénario industriel pour PUE, préparation générale pour PMU, documentation générale pour le hub). Pas de galerie : une image = un guide, cohérent avec la pratique déjà établie sur les autres familles migrées (Sécurité, Incident).

## 11. Architecture de page proposée (commune, avec signature propre)

Squelette commun proposé, sans forcer des sections identiques :

HERO → Qu'est-ce que ce document? → Quand/pourquoi l'utilise-t-on? → Cadre légal/normatif → Contenu attendu → Qui est impliqué? → Lien avec les autres plans → Frontière CORO (disponible ou Phase 2) → Ressources connexes → FAQ → CTA.

**Sections signature par guide** :
- PMU : cycle de préparation (analyse de risque → PMU → PSI comme sous-ensemble).
- PSI : organisation bâtiment/incendie (personnel de surveillance, plan d'évacuation par étage).
- PCA : logique activités critiques / continuité (BIA → RTO/RPO → stratégies).
- PGC : structure de gouvernance et de décision (cellule de crise, porte-parole, escalade).
- PRA : priorités de reprise et dépendances (RTO/RPO par système, PRA informatique vs opérationnel).
- PUE : scénario industriel, zones d'impact, communication, autorités (cohérent avec Sentinelle Population).

Ne pas forcer une septième section identique si le sujet ne le justifie pas (ex. PGC n'a pas de « contenu type » aussi tabulaire que PSI).

## 12. Maillage interne / silo (constat et cible)

**Constat actuel** : Documents → Guides (existe, les six guides sont liés depuis `/gestion-documentaire`). Guides → Documents (absent). Guide ↔ Guide (absent, sauf mentions textuelles sans lien cliquable, ex. « Le PUE est-il relié au PMU? »). Guides → Résilience opérationnelle (absent). Guides → Sécurité (absent, pertinent uniquement si le guide traite de données). Guides → Sentinelle/Population (absent, pertinent pour PMU et PUE). Guides → Blogue (présent : un seul lien générique vers `/blog`, pas d'articles ciblés).

**Cible pour la migration** : chaque guide lie `/gestion-documentaire` (obligatoire, silo), ses guides voisins pertinents (ex. PMU↔PSI, PCA↔PRA, PMU↔PUE), et `/guides` une fois construit. PUE lie `/sentinelle-population` de façon contextuelle (déjà fait ailleurs sur le site). Aucun lien vers `/resilience-operationnelle` n'est indispensable mais peut être ajouté si le contenu final le justifie, sans sur-lier.

## 13. Ressources du blogue par guide

Recherche faite sur les 56 articles publiés (API publique). Choix limités pour éviter de répéter les trois mêmes articles partout.

| Guide | LINK (forts) | POSSIBLE | DO NOT LINK |
|---|---|---|---|
| PMU | `qu-est-ce-qu-un-plan-de-mesures-d-urgence`, `obligations-plan-mesures-urgence-entreprise-quebec`, `frequence-mise-a-jour-plan-mesures-urgence-pmu` | `pmu-10-erreurs-plus-frequentes`, `comment-creer-plan-mesures-urgence-entreprise` | Articles produit (`logiciel-plan-mesures-urgence-pmu`) réservés à `/gestion-documentaire` |
| PSI | `que-contient-un-plan-de-securite-incendie`, `obligations-plan-securite-incendie-proprietaire-gestionnaire-quebec`, `cnpi-2020-quebec-plan-securite-incendie` | `conformite-incendie-psi-donnees-structurees` | `pmu-vs-psi-quelle-est-la-difference` (déjà couvert dans le corps du guide, éviter le doublon) |
| PCA | `que-doit-contenir-plan-continuite-activites-pca`, `bia-rto-rpo-priorites-continuite`, `identifier-activites-critiques-entreprise` | `analyse-impact-activites-bia` | `pca-vs-pra-difference` (mieux placé sur PRA en lien réciproque) |
| PGC | `resilience-organisationnelle-entreprise` (contexte de gouvernance) | Aucun article dédié « gestion de crise » trouvé | Ne pas réutiliser les articles PCA en LINK direct (les mentionner seulement dans le corps déjà présent) |
| PRA | `pca-vs-pra-difference`, `bia-rto-rpo-priorites-continuite` (si non déjà utilisé sur PCA) | `que-doit-contenir-plan-continuite-activites-pca` | Doublon avec PCA à éviter : choisir des articles différents des deux côtés |
| PUE | Aucun article dédié trouvé | `obligations-plan-mesures-urgence-entreprise-quebec` (mention PUE en tag seulement, lien faible) | Ne pas forcer un lien faible juste pour remplir une section |

**Lacune éditoriale confirmée** : aucun article du blogue ne traite spécifiquement de la gestion de crise (PGC) ni de l'urgence environnementale (PUE). À consigner comme trou de contenu futur, sans création d'article dans ce gate.

## 14. Matrice de langue

| Route | État actuel | Contrat proposé pour la migration |
|---|---|---|
| `/guides` (à construire) | N'existe pas | FR seulement au lancement (cohérent avec les six guides) |
| Six guides | FR seulement (`en: false` dans le registre), aucun contenu anglais dans le code | FR seulement ; `hreflang` fr-CA + x-default ; pas de `?lang=en` indexable (déjà la pratique de `/coro-incident`, `/sentinelle`, `/sentinelle-population`) |

Aucune traduction fabriquée. Si un besoin d'anglais apparaît plus tard, ce sera une décision distincte avec une vraie traduction (règle déjà appliquée à Sentinelle/Population).

## 15. Données structurées

**Existant à retirer en migration** : `Thing` et `ImageObject` (aucune image actuellement sur la page ; `ImageObject` sans image réelle est un schéma orphelin). `Organization` en double avec le `WebSite`/`Organization` global du site.

**Existant à conserver, adapté** : `FAQPage` (la FAQ visible correspond au JSON-LD sur les six pages, à vérifier précisément à la migration) ; `BreadcrumbList` (Accueil › Documents › Guide), cohérent avec un contenu éditorial profond, contrairement à la pratique récente sur les pages produit V2 qui n'en émettent pas — à trancher explicitement à la migration : les guides sont un contenu hiérarchique (comme un article), donc `BreadcrumbList` est défendable ici même s'il a été retiré de `/security` et `/pricing`.

**À ne pas ajouter** : `SoftwareApplication` sur une page éditoriale (règle déjà établie), tout schéma de certification ou de conformité.

## 16. Stratégie de CTA

Éditorial d'abord, commercial ensuite : PRIMAIRE = comprendre/poursuivre la lecture/guide voisin ; COMMERCIAL = découvrir CORO Documents ou demander une démonstration, une seule fois par page en position de fin (plus l'accès existant en tête pour PMU/PSI/PCA). Pour PGC/PRA/PUE, le CTA ne doit jamais impliquer une disponibilité actuelle du générateur (voir §4) : formulation « Être notifié » déjà en place à conserver, en corrigeant le CTA héros de PUE (§20).

## 17. Exigences de base de référence (pour la migration future)

Chaque guide implémenté nécessitera une base de référence capturant : métadonnées (title/description), canonical, hreflang, texte visible complet, titres, liens, JSON-LD, comptes header/main/footer. Aucune base n'est générée dans ce gate ; l'inventaire textuel obtenu ici (fichiers temporaires) sert de preuve d'audit, pas de base de migration formelle.

## 18. Séquence de migration recommandée

Le candidat proposé est globalement retenu, avec un ajustement d'ordre à l'intérieur des guides pour livrer d'abord les trois guides déjà disponibles dans CORO (valeur produit directe) avant les trois Phase 2 :

| Étape | Contenu | Justification |
|---|---|---|
| MIG-05A | `/guides` (hub) | Établit le silo et la destination pour tous les liens de guide ; nécessaire avant ou avec le premier guide migré pour éviter un lien mort |
| MIG-05B | PMU | Disponible dans CORO, cadre légal le plus riche, sert de gabarit de référence pour les autres |
| MIG-05C | PSI | Disponible, territoire proche de PMU, valide le gabarit sur un deuxième cas |
| MIG-05D | PCA | Disponible, teste le gabarit sur un sujet plus normatif (ISO) que légal |
| MIG-05E | PGC | Phase 2, teste le traitement honnête de la frontière produit |
| MIG-05F | PRA | Phase 2, proche de PCA (lien réciproque à construire) |
| MIG-05G | PUE | Phase 2, le plus distinct visuellement et réglementairement ; corriger le PUBLICATION-BLOCKER du CTA avant ou pendant cette étape |
| MIG-05 FINAL GATE | Gel de la famille, registre Go-Live consolidé | Cohérent avec la pratique des familles précédentes (MIG-03 FINAL GATE) |

Aucune dépendance du dépôt ne justifie un ordre différent : les six guides sont indépendants en code, seul le hub doit exister avant que les liens « Lire nos guides » deviennent valides plutôt que orphelins.

## 19. Conséquences sur les routes et le sitemap (à ne pas faire ici)

Quand `/guides` sera implémentée : elle devra être ajoutée à `historicalRoutes` avec `implemented: true`, `sitemap: true`, ce qui l'ajoutera automatiquement à `staticSitemapRoutes` (le sitemap est piloté par le registre, `lib/site/sitemap.ts`). Les six guides existants n'ont besoin d'aucun changement de statut : ils sont déjà `implemented: true`, `sitemap: true`. Le test `tests/sitemap.test.ts` (« PUBLISH-NOW routes that do not exist yet ») devra être mis à jour pour retirer `guides` de la liste des routes non implémentées une fois MIG-05A complétée. Aucun de ces changements n'est fait dans ce gate.

## 20. Registre de mise en ligne (Go-Live)

| Classe | Élément |
|---|---|
| PUBLICATION-BLOCKER | PUE : CTA héros « Générer votre PUE avec CORO » contredit le bandeau Phase 2 affiché plus bas sur la même page. À corriger avant la migration de PUE. |
| CONTENT-GOVERNANCE / LEGAL REVIEW | PMU : désignation « CSA Z731-14 » imprécise (la norme confirmée est CSA-Z731-03, C2014) ; à corriger ou à faire valider auprès de CSA Group |
| CONTENT-GOVERNANCE / LEGAL REVIEW | PSI : date d'entrée en vigueur du CNPI 2020 modifié Québec (17 avril 2025) vérifiée, mais la période transitoire jusqu'au 16 octobre 2026 n'est pas mentionnée par le guide ; à ajouter |
| LEGAL REVIEW | PMU : articles RSST 34-36 et LSST 51.1/51.5/51.6/51.8 non revérifiés mot à mot dans ce gate |
| LEGAL REVIEW | PSI : numéros d'articles CNPI (2.8.3, 2.8.2.7, 2.8.1.2) et liste des bâtiments visés non revérifiés dans ce gate |
| LEGAL REVIEW | PCA : affirmations sectorielles (BSIF, santé, gouvernemental) non revérifiées dans ce gate |
| LEGAL REVIEW | PUE : liste des six catégories de danger et texte exact de l'obligation de notification LCPE non revérifiés mot à mot |
| CONTENT REVIEW | PUE : adresse courriel gouvernementale (`ec.ue-e2.ec@canada.ca`) à reconfirmer avant republication (coordonnée dynamique) |
| CONTENT REVIEW | PRA : la FAQ attribue à CORO un « module de suivi des exercices » alors que le PRA lui-même est Phase 2 ; à clarifier pour ne pas laisser croire à une capacité PRA déjà livrée |
| CONTENT REVIEW | PUE : formulation du « module de gestion des matières dangereuses » à distinguer clairement de la génération du PUE (Phase 2) |
| ACCESSIBILITY | Cinq des six guides (PMU, PSI, PGC, PRA, PUE) n'ont pas de repère `<main>` dans le DOM rendu ; à corriger par la migration V2 (le shell V2 fournit `<main id="main-content">`) |
| SEO REVIEW | Décider si `BreadcrumbList` est conservé sur les guides (contenu hiérarchique) même s'il a été retiré des pages produit V2 récentes ; retirer `Thing`/`ImageObject` orphelins |
| MIGRATION-ONLY | Lien « Lire nos guides » sur chaque guide : destination actuelle à vérifier (probablement un lien mort vers `/guides`, qui n'existe pas encore) |
| GO-LIVE (hérité) | Aucun blocage hérité des familles précédentes ne s'applique directement aux guides |

## 21. Écarts éditoriaux

Aucun article du blogue publié ne couvre la gestion de crise (PGC) ni l'urgence environnementale (PUE) de façon dédiée. Sujets futurs possibles (backlog seulement, aucun article créé) : structurer une cellule de crise, communication de crise étape par étape, se préparer au Règlement sur les urgences environnementales, PUE et Sentinelle Population ensemble.

## Sources publiques consultées

Régie du bâtiment du Québec (chapitre Bâtiment, CNPI 2020 modifié, période transitoire) ; Gazette du Canada partie 2 vol. 153 n° 5 (RUE 2019, 249 substances) ; ISO.org (22301:2019, 22361:2022) ; CSA Group / Standards Council of Canada (CSA-Z731-03 C2014) ; LégisQuébec (RSST, LSST, non revérifié article par article). Ces sources fournissent du contexte ; elles ne remplacent pas une revue juridique.

---

# MIG-05A — `/guides` implementation result

Implémenté (2026-09-27). Registre V2 : `/guides` ajoutée après `/pricing`. Registre de routes : déplacée de la liste future vers `historical({ id: 'guides', publication: 'PUBLISH-NOW', ..., implemented: true, sitemap: true, en: false })`. Aucun guide individuel n'est migré ni réécrit dans cette étape.

## Route

`/guides`, FR seulement (`englishAvailable={false}`), indexable, au sitemap (40 entrées désormais). Aucun guide n'est déplacé ni renommé.

## Frontière de vérité produit — formulation retenue

« Disponible dans CORO » pour PMU/PSI/PCA (groupe section 02) ; « Guide disponible · Production CORO prévue en phase 2 » pour PGC/PRA/PUE (groupe section 03). Aucune phrase n'affirme que les six documents sont produits aujourd'hui ; la section CORO Documents (06) répète explicitement la frontière. Le statut est porté par le texte (« Disponible dans CORO » / « Guide disponible… ») et non par la seule couleur.

## Décisions visuelles

Hero = `guides-coro-documentation-resilience.webp`, décoratif, `alt=""`. Deux groupes de trois tuiles (jamais six tuiles identiques sur une rangée) : chaque tuile porte l'image du guide (recadrée en médaillon 16:9, `alt=""`, jamais une cartouche technique), le sigle, le nom complet, le besoin, le statut et un lien « Lire le guide ». Flux de relation en six étapes sur fond marine (Préparer, Protéger, Poursuivre, Coordonner, Rétablir, Répondre à un risque environnemental). Aide à la décision : liste à filets besoin → sigle, sans quiz ni JavaScript.

## Données structurées

`FAQPage` (5 questions, parité avec la FAQ visible) et `ItemList` (les six guides, `ListItem` avec nom et URL). Aucun `SoftwareApplication`, `Offer`, `AggregateOffer` ni `Product`.

## Métadonnées

Titre « Guides des plans de mesures d'urgence et de résilience » (sans marque). Description factuelle, sans volume ni classement inventé.

## Langue

FR seulement, cohérent avec les six guides.

## Liens

Les six guides sont tous liés. `/gestion-documentaire` est lié à deux endroits (CTA d'exploration et section 06 dédiée), direction réciproque avec la page Documents qui lie déjà les six guides. Aucun lien vers une route FUTURE ou REVIEW.

## Revues de mise en ligne

Aucune nouvelle revue introduite par le hub lui-même. Les revues déjà consignées au §20 (PUBLICATION-BLOCKER PUE, LEGAL REVIEW réglementaires, dette d'accessibilité `<main>` sur cinq guides) restent entières et concernent les guides individuels, pas le hub.

## Tests, build

395 tests passent (`tests/guides-migration.test.ts`, 10 tests dédiés + mises à jour de `tests/sitemap.test.ts`, `tests/foundation.test.ts`, `tests/page-rhythm.test.ts`, `tests/pricing-migration.test.ts` et les listes de registre des autres pages V2). `tsc --noEmit`, ESLint et `npm run build` propres. QA finale : un seul pied de page sur `/guides` et sur les sept autres routes contrôlées, aucun débordement horizontal aux six largeurs, `/guides` répond 200 et figure dans le sitemap.

# MIG-05B — PMU implementation result

Implémenté (2026-09-27). Registre V2 : `/documents/plan-mesures-urgence-pmu` ajoutée après `/guides`. Le PMU reste `historical({ id: 'guide-pmu', ... })` dans le registre de routes (déjà `implemented: true` avant cette étape) — seule l'appartenance V2 change.

## Baseline et contrat de langue

`tests/fixtures/guide-pmu-baseline.json` capture FR / `?lang=en` / `?ref=CR-ABCDEF`. Confirmation octet pour octet : `?lang=en` rendait le même texte français (`bodyText` FR === EN). Aucune traduction anglaise n'existait à préserver → `englishAvailable={false}` / `hasEnglish: false` conservés, pas de traduction inventée.

## Matrice de préservation — résumé

Les six sections V1 (définition, cadre légal, PMU vs PSI, contenu, fréquence de mise à jour, simplification CORO) sont RECOMPOSÉES dans une architecture éditoriale à 10 sections + cycle de préparation + ressources + FAQ + CTA. Aucun contenu utile n'est perdu : chaque affirmation V1 est reprise (RECOMPOSE) ou corrigée (REWRITE) avec sa source. Aucun visuel V1 n'existait (`grep` confirmé : 0 `<img>`/`<Image>` dans le fichier V1) — rien à KEEP/REPLACE/DEFER/REJECT ; l'illustration `guide-pmu-emergency-measures.webp` est une nouvelle addition éditoriale, décorative (`alt=""`), déjà auditée conforme (aucun logo CORO, aucune UI produit, aucun texte réglementaire lisible).

## Corrections réglementaires (vérifiées contre sources primaires)

- **RSST, section IV, art. 34-36** : conservé tel quel (texte vérifié : évacuation, exercices annuels, extincteurs).
- **LSST, article 51** : la V1 citait des sous-paragraphes précis (51.1/51.5/51.6/51.8). Recherche confirmant que l'article 51 a été modernisé en 2021 (16 paragraphes numérotés) sans pouvoir vérifier le contenu exact des sous-paragraphes cités par la V1 → généralisé à « LSST, article 51 » sans numéro de sous-paragraphe, conformément à la consigne « généraliser plutôt qu'inventer de la précision ».
- **Norme CSA** : la V1 citait « CSA Z731-14 », édition inexistante. Corrigé en « CSA Z731-03 (révisée en 2014) », désignation confirmée (3e édition publiée en 2003, révisée en 2014).
- **Précision de délai de production** : la V1 affirmait « quelques heures... plusieurs jours » (précision invérifiable) — retirée. « CORO génère automatiquement » adouci en « CORO Documents structure » pour ne pas surestimer l'automatisation.

## SEO — décision REWRITE

URL conservée à l'identique (`/documents/plan-mesures-urgence-pmu`). Titre et description réécrits (REWRITE, pas KEEP) pour retirer la précision de délai invérifiable et refléter le nouveau cadre éditorial, en gardant les mots-clés porteurs (« plan de mesures d'urgence », « PMU », « cadre légal », « Québec »).

## Frontière de vérité produit

Le PMU est explicitement disponible dans CORO Documents aujourd'hui (section 10) : procédures présélectionnées, éditeur intégré, export PDF bilingue FR/EN. Aucune conformité automatique, certification ou vérification réglementaire par IA n'est affirmée. PGC/PRA/PUE sont mentionnés (section 09) comme familles complémentaires avec leur propre guide, sans affirmer leur disponibilité dans CORO (production Phase 2 inchangée).

## Signature éditoriale — cycle de préparation

Modèle en 7 étapes (Connaître, Planifier, Organiser, Préparer, Intervenir, Exercer, Réviser) sur fond marine, explicitement présenté comme « un repère éditorial, pas une séquence réglementaire ». Blocs numérotés 01-07 sans ligne ni flèche de connexion (nuance par rapport au hub, qui a retiré toute numérotation) — jugé acceptable ici car le texte lui-même désamorce la lecture séquentielle et la numérotation sert le repérage visuel, pas une chronologie d'incident.

## Ressources et liens réciproques

4 ressources blog sélectionnées (slugs vérifiés dans la matrice MIG-05-PRE). Liens réciproques vers `/guides` et `/gestion-documentaire` (silo devient réciproque : Documents ↔ Hub ↔ PMU). Lien contextuel vers le guide PSI (section 03), sans hiérarchie universelle obligatoire.

## Données structurées

`BreadcrumbList` (Accueil › Guides › PMU, pointe désormais vers `/guides` et non `/gestion-documentaire` comme en V1) et `FAQPage` (4 questions, parité avec la FAQ visible). Le `WebPage` avec `about: [Thing×4]` et le `publisher.logo` `ImageObject` orphelin de la V1 sont retirés — aucun schéma `SoftwareApplication`, `Offer` ou `Product`.

## Tests, build, QA

`tests/guide-pmu-migration.test.ts` créé (15 tests dédiés : baseline, registre, langue, hero, frontière produit, corrections réglementaires, absence de précision de délai inventée, liens réciproques, relation PSI/PGC/PRA/PUE, absence de module futur, parité FAQ/JSON-LD, cycle de préparation, métadonnées, accessibilité). Mise à jour des listes `migratedV2Routes` codées en dur dans 14 fichiers de test existants + `tests/page-rhythm.test.ts` (liste d'exclusion des primitives de composition). 411 tests passent. `tsc --noEmit`, ESLint et `npm run build` propres. QA finale : un seul pied de page, un seul `<main>`, un seul `<h1>` sur `/documents/plan-mesures-urgence-pmu` post-registre ; aucun débordement horizontal aux six largeurs (320/390/768/1024/1440/1920) ; inspection visuelle complète à 1440 et 390 sans défaut (rangées réglementaires, liste des 8 éléments, cycle de préparation, cartes de lien, ressources, FAQ, CTA). Contrôle de non-régression : `/`, `/security`, `/pricing`, `/guides`, `/coro-incident`, `/gestion-documentaire`, `/blog` et les cinq guides encore en V1 répondent tous 200.

## Revues de mise en ligne

Aucune nouvelle revue bloquante introduite par le PMU. Les revues déjà consignées au §20 pour les guides restants (PUBLICATION-BLOCKER PUE, LEGAL REVIEW réglementaires PSI/PCA/PGC/PRA/PUE, dette d'accessibilité `<main>`) restent entières et ne sont pas résolues par cette étape.

# MIG-05B-B — PMU editorial density & visual character pass

Implémenté (2026-09-27), sur approbation visuelle du contenu, de la frontière produit, du traitement réglementaire, du SEO, du hero et du cycle de préparation. Aucun de ces éléments n'est modifié dans cette passe ; seule la densité éditoriale et le caractère visuel changent.

## Règle de famille candidate — densité et signature visuelle des Guides

**Un Guide long-form peut utiliser un rythme de section plus dense qu'une page produit/commerciale, et doit porter 2-3 moments visuels mémorables dérivés de son propre sujet.** Ces moments ne sont jamais globaux (`PageSection`/`page.module.css` partagé inchangés) : ils vivent en CSS local à la page du guide. Pour PMU, les trois moments retenus sont : (1) l'ancre typographique « 08 » + la grille 2×4 des éléments attendus, (2) le cycle de préparation marine (contenu inchangé), (3) les cartes de rôles de l'organisation d'urgence. **Les futurs guides (PSI, PCA, PGC, PRA, PUE) ne doivent PAS copier ces mêmes moments** — chacun doit dériver sa propre signature de son sujet (ex. PSI : sécurité incendie ; PCA : continuité). Cette règle reste candidate et doit être revalidée sur PSI avant toute extraction d'un composant Guide partagé — aucun composant partagé n'est créé à cette étape.

## Densité — locale, jamais globale

`density="compact"` appliqué par instance de `PageSection` (§1, §3, §8, §9, §10, ressources) ; conservé à `standard` pour le hero, le cadre légal (§2), le cycle de préparation (§5, navy), les deux moments visuels enrichis (§4, §6, §7 — l'espace sert la composition, pas seulement le texte) et la FAQ (transition finale vers le CTA). Gap du `.stack` local resserré de `--coro-v1-space-8` à `--coro-v1-space-6`. Aucune modification de `components/page/PageSection.tsx` ni de `components/page/page.module.css`.

## Cartes — gouvernance appliquée

Cartes autorisées et utilisées à un seul endroit : les 2 cartes de rôles en §6 (bordure fine, rayon de panneau V1, aucune ombre). Aucune carte pour le cadre légal, les ressources, le FAQ, ou les documents liés — ces sections restent des listes à filets ou des cartes de lien restreintes, conformément à la gouvernance « pas de mur de cartes ».

## Contenu préservé — aucune invention

- **§4 (08 éléments)** : les 8 éléments existants sont repris à l'identique ; le nombre « 08 » est calculé depuis `t.s4.items.length`, jamais codé en dur.
- **§6 (organisation d'urgence)** : seuls les deux rôles explicitement nommés dans le contenu source (personnel de surveillance, équipe de première intervention) sont présentés comme cartes — aucun rôle ni hiérarchie inventés. Le texte descriptif est une reformulation directe de la phrase source existante, pas un nouveau fait.
- **§7 (procédures)** : aucun nombre de procédures n'existe/n'est vérifié — utilisation d'un mot éditorial en gros caractères (« Agir ») au lieu d'inventer un chiffre. Les six catégories listées sont exactement celles déjà nommées dans le paragraphe source (incendie, matières dangereuses, explosion, alerte à la bombe, sauvetage, risques naturels ou technologiques).
- **§8 (utilisabilité)** : le paragraphe unique existant est réparti en deux blocs (Révision / Exercices) qui reprennent ses phrases sans les modifier.

## Tests, build, QA

`tests/guide-pmu-migration.test.ts` étendu à 21 tests (6 tests MIG-05B-B ajoutés : nombre exact d'éléments préservés, absence de nombre de procédures inventé, rôles limités aux deux nommés dans la source, contenu du cycle inchangé, primitives partagées non modifiées). 416 tests passent au total. `tsc --noEmit`, ESLint et `npm run build` propres. QA : registre inchangé (1 pied de page, 1 `<main>`, 1 `<h1>` post-registre) ; inspection visuelle via navigateur (Puppeteer indisponible dans cet environnement — aucune dépendance `puppeteer` installée) confirmant un rendu propre des trois moments visuels et de toutes les sections retravaillées, sans débordement, à la largeur de fenêtre disponible (~1139px, au-dessus du point de rupture desktop de 68rem) ; le comportement en dessous de 68rem/64rem/48rem/40rem repose sur les mêmes motifs de media query déjà vérifiés visuellement pour PMU en MIG-05B (`.rows`, `.cycle`) et réutilisés à l'identique pour les nouvelles grilles (`.elementsGrid`, `.rolesWrap`, `.procWrap`).

## Hauteur de page

≈ 8 736px à ~1139px de largeur (viewport réel obtenu dans cet environnement), contre ≈ 10 100-10 163px mesurés en MIG-05B à largeur desktop comparable (1024-1920px) — réduction d'environ 14 %. En dessous de la cible de 20-30 % demandée, car les trois moments visuels (§4, §6, §7) ont délibérément gardé une densité `standard` plutôt que `compact` pour laisser respirer leur composition, conformément à la consigne de ne pas poursuivre la hauteur minimale comme objectif en soi.

## Limite de vérification signalée

Puppeteer n'est pas installé dans `coro-website` ni ailleurs dans ce monorepo/environnement pendant cette session ; la vérification responsive fine (320/390/768/1024/1920 exacts) n'a pas pu être automatisée par capture d'écran à ces largeurs précises. La vérification s'est appuyée sur (1) l'inspection visuelle réelle à la largeur de fenêtre disponible et (2) la relecture du CSS confirmant que les nouveaux points de rupture (40rem, 64rem, 68rem) suivent exactement les mêmes motifs que les sections déjà QA financées en MIG-05B.

# MIG-05C — PSI implementation result

Implémenté (2026-09-27). Registre V2 : `/documents/plan-securite-incendie-psi` ajoutée après le PMU. Le PSI reste `historical({ id: 'guide-psi', ... })` dans le registre de routes (déjà `implemented: true` avant cette étape) — seule l'appartenance V2 change.

## Baseline et contrat de langue

`tests/fixtures/guide-psi-baseline.json` capture FR / `?lang=en` / `?ref=CR-ABCDEF`. Le fichier V1 n'avait AUCUNE gestion de `searchParams` : `?lang=en` retournait donc trivialement la même page française. `bodyText` FR === EN confirmé octet pour octet → `englishAvailable={false}` / `hasEnglish: false`, aucune traduction inventée.

## Matrice de préservation — résumé

Les 6 sections V1 (définition, bâtiments visés, contenu, cadre légal, fréquence de mise à jour, simplification CORO) sont RECOMPOSÉES dans une architecture éditoriale à 8 sections + relation PMU + CORO Documents + ressources + FAQ + CTA. Les 4 sources officielles et les 4 questions FAQ sont PRESERVED intégralement. La seule suppression volontaire : l'affirmation V1 « le PSI est le document de base de tout bâtiment — toute organisation doit en avoir un », en tension directe avec la propre liste V1 des bâtiments visés — retirée (REVIEW → REMOVE) plutôt que de trancher une question réglementaire non vérifiée.

## Audit réglementaire — décisions

- **Entrée en vigueur CNPI 2020 modifié (17 avril 2025)** : VERIFIED (RBQ, CNRC). Conservé.
- **Période de transition** : AJOUTÉE — non présente en V1. VERIFIED : une période transitoire de 18 mois est prévue à partir du 17 avril 2025 (3 ans pour l'art. 2.1.3.7 uniquement) ; les dispositions antérieures du chapitre VIII peuvent encore s'appliquer jusqu'au jour précédant le 17 octobre 2026. Le PRE gate avait relevé cette omission potentielle — confirmée et corrigée.
- **Art. 2.8.1.2 / 2.8.2.7 / 2.8.3 (formation, plan d'évacuation affiché, exercices)** : la section 2.8 (mesures d'urgence) du CNPI est VERIFIED comme couvrant ces sujets, mais le contenu exact des sous-paragraphes cités n'a pas pu être confirmé avec une confiance suffisante → GÉNÉRALISÉ, aucun numéro d'article précis n'est reproduit en V2.
- **Fréquence de mise à jour (« annuellement » en V1)** : NOT VERIFIED comme figure légale précise → REFINE : présentée comme pratique usuelle recommandée plutôt que comme obligation citée avec précision.
- **Bâtiments visés (établissements de réunion/soins/détention, RPA/RI, services de garde PSI-MU, habitations)** : VERIFIED via les 4 sources officielles déjà citées en V1 (RBQ, CNRC, guide PSI-MU) — conservé tel quel.

## SEO — décision REWRITE

URL conservée à l'identique. Titre et description réécrits pour refléter le nouveau cadre éditorial et retirer l'accroche produit du titre V1 (« Guide complet | CORO »), en gardant les mots-clés porteurs (« plan de sécurité incendie », « PSI », « bâtiments visés », « cadre légal », « Québec »).

## Hero

`guide-psi-fire-safety.webp`, ré-audité entièrement : trois personnes consultant des plans de bâtiment/évacuation, pompiers et camion en arrière-plan (génériques, aucun logo/service identifiable), panneau d'alarme incendie, extincteur, livre « Sécurité incendie ». Aucun logo CORO, aucune UI produit, aucun texte réglementaire lisible, aucune adresse. Classification : MARKETING / ÉDITORIAL, `alt=""`, image non modifiée, aucun fait dérivé de l'illustration.

## Signature visuelle PSI — distincte du PMU

Conformément à la règle de famille (MIG-05B-B), le PSI ne réutilise AUCUN des moments PMU (pas de « 08 » oversized, pas de cycle de préparation, pas de composition « Agir »). Trois moments propres au PSI :
1. **Contenu du PSI** — matrice à 7 éléments via le primitive partagé `FeatureIndex` (`layout="rows"`), un ledger numéroté distinct de la grille PMU.
2. **Organisation de la sécurité incendie** — 4 cartes de parties prenantes (personnel de surveillance, occupants, service de sécurité incendie, personnes nécessitant une assistance), restreintes aux rôles explicitement nommés par la source.
3. **De l'alerte à l'action** — séquence signal→action via `FeatureIndex` (`layout="steps"`, rail vertical à badges circulaires), explicitement qualifiée : « la configuration exacte de l'alarme et les protocoles précis varient selon le bâtiment » — aucune affirmation universelle à un ou deux étages.

`FeatureIndex` est un primitif V2 partagé déjà utilisé sur 5 autres pages (About, Programme de recommandation, Gestion documentaire...) — sa réutilisation ici n'est pas une extraction de composant Guide, juste l'usage normal d'un primitif de composition déjà approuvé.

## Ressources et liens réciproques

4 ressources blog sélectionnées et vérifiées (200 sur `getcoro.io/blog/<slug>`) : contenu PSI, obligations propriétaire/gestionnaire, CNPI 2020, PMU vs PSI. Liens réciproques vers le guide PMU migré, `/guides` et `/gestion-documentaire`.

## Données structurées

`BreadcrumbList` (Accueil › Guides › PSI, pointe désormais vers `/guides`) et `FAQPage` (4 questions, parité avec la FAQ visible). Le `WebPage` avec `about: [Thing×5]` et le `publisher.logo` `ImageObject` orphelin de la V1 sont retirés — aucun schéma `SoftwareApplication`, `Offer`, `Product` ou de conformité.

## Densité locale

Même leçon de famille que PMU : `density="compact"` sur les sections ordinaires (§1, §6, §7, §8, ressources), `standard` conservé pour le hero, §2 (cadre légal/transition), les trois moments visuels (§3, §4, §5) et la FAQ. CSS local à la page uniquement, `PageSection`/`page.module.css` partagés inchangés.

## Tests, build, QA

`tests/guide-psi-migration.test.ts` créé (17 tests dédiés : baseline, registre, langue, hero, frontière produit, période de transition, absence de précision d'article inventée, absence d'affirmation universelle sur l'alarme, absence de la revendication généralisée « toute organisation doit en avoir un », liens réciproques PMU/guides/documentaire, absence de module futur, parité FAQ/JSON-LD, non-clonage de la signature PMU, structure des 7 éléments, structure des 4 rôles, séquence à 5 étapes, métadonnées, accessibilité, densité locale). Mise à jour des listes `migratedV2Routes` codées en dur dans 13 fichiers de test existants + `tests/sentinelle-population-migration.test.ts` (slice/longueur) + `tests/page-rhythm.test.ts` (liste d'exclusion). 433 tests passent. `tsc --noEmit`, ESLint et `npm run build` propres. QA finale : un seul pied de page, un seul `<main>`, un seul `<h1>` sur `/documents/plan-securite-incendie-psi` post-registre ; inspection visuelle par navigateur (Puppeteer toujours indisponible dans cet environnement) confirmant un rendu propre du hero, du ledger à 7 éléments, des 4 cartes d'organisation, du rail signal→action, et de toutes les sections restantes, sans débordement à la largeur de fenêtre disponible. Contrôle de non-régression : `/`, `/security`, `/pricing`, `/guides`, `/coro-incident`, `/gestion-documentaire`, `/blog`, le PMU migré et les quatre guides encore en V1 (PCA/PGC/PRA/PUE) répondent tous 200.

## Conclusion sur les patterns partagés

PMU et PSI fournissent maintenant deux implémentations comparables. Aucun composant Guide partagé n'est extrait à cette étape (par défaut, conformément à la consigne) : la principale ressemblance structurelle (V2Shell + EditorialHero + PageSection + EditorialBlock + FAQ + CTASection + liens réciproques) est déjà entièrement couverte par les primitifs V2 existants, sans duplication de logique propre à un Guide. Le seul pattern réellement récurrent est le protocole de registre et la méthode de densité locale — déjà documentés comme règle de famille, pas comme code. À réévaluer après PCA.

## Revues de mise en ligne

Aucune nouvelle revue bloquante introduite par le PSI. Les revues consignées au §20 pour les guides restants (PUBLICATION-BLOCKER PUE, LEGAL REVIEW réglementaires PCA/PGC/PRA/PUE, dette d'accessibilité `<main>`) restent entières et ne sont pas résolues par cette étape.

# MIG-05C-B — PSI visual character, density & claim clarification pass

Implémenté (2026-09-27). **La première composition PSI (MIG-05C) a été REJETÉE en revue visuelle** : espace horizontal/vertical inutilisé excessif, ledger des 7 éléments trop plat, cartes de parties prenantes sans présence visuelle, section navy sous-utilisant le canevas, et le rail vertical `FeatureIndex` "steps" faisait à tort ressembler « Exercices réguliers » à une cinquième étape opérationnelle après l'évacuation. Contenu, hero, SEO, frontière produit et architecture générale restent approuvés.

## Nouvelle signature visuelle PSI

Toujours sans cloner le PMU ("08"/cycle/"Agir") :
1. **§2 — Bâtiments visés** : matrice 2×2 des 4 catégories vérifiées, à côté de l'explication légale et de la note de transition (au lieu d'une liste à puces sur toute la largeur).
2. **§3 — Contenu du PSI** : ancre typographique « PSI » (l'acronyme lui-même comme objet visuel, concept « ce que le document structure », pas un décompte) à côté du ledger 01-07 (toujours `FeatureIndex` "rows", primitif partagé inchangé).
3. **§4 — Organisation** : les 4 cartes de parties prenantes renforcées en véritable composition 2×2 (padding généreux, filet d'accent supérieur, hiérarchie de titre renforcée h2).
4. **§5 — Navy, reconstruite** : le rail `FeatureIndex` "steps" est RETIRÉ. Remplacé par QUATRE territoires de réponse liés (SIGNAL / AVIS / CONSIGNES / ÉVACUATION) en 4 colonnes sur toute la largeur du canevas navy, sans flèche ni ligne de connexion — la qualification « ne forment pas une séquence obligatoire […] varie selon le bâtiment » reste visible.

## Exercices — retirés du groupe opérationnel

« Exercices réguliers » n'est plus présenté comme la 5e étape de la séquence signal→action. Contenu préservé, relocalisé en §6 (mise à jour) comme second territoire (« Révision » / « Exercices »), aux côtés des déclencheurs de changement au bâtiment.

## Revue de la revendication — révision annuelle

**REMOVE.** Aucune source primaire fiable confirmant une exigence ou une recommandation de révision annuelle du PSI n'a été trouvée lors de cette passe (recherche RBQ/CNRC). La formulation « la pratique usuelle recommande une révision au moins annuelle » (déjà un affaiblissement de l'affirmation légale V1 lors de MIG-05C) est retirée à son tour. Le PSI est désormais présenté comme devant être tenu à jour uniquement lors d'un changement significatif — la seule base explicitement supportée par le contenu source V1 lui-même.

## Revue de la revendication — pouvoir du service de sécurité incendie

**REFINE.** Recherche confirmant que les inspecteurs municipaux/services de sécurité incendie disposent d'un pouvoir général, en vertu de la Loi sur la sécurité incendie et de la Loi sur les compétences municipales, d'exiger des renseignements et documents liés à la sécurité incendie et de vérifier la conformité par inspection. La formulation V1 « peut exiger un exemplaire du PSI pour vérifier sa conformité » est conservée quant au fond mais reformulée pour citer les deux lois habilitantes et éviter l'expression non qualifiée « vérifier sa conformité » : « en vertu de la Loi sur la sécurité incendie et de la Loi sur les compétences municipales, peut demander des renseignements ou des documents relatifs à la sécurité incendie du bâtiment ». Appliqué de façon cohérente à la carte d'organisation et à la FAQ.

## Densité

Réaudité section par section : §1/§6 restent `compact` ; §2/§3/§4/§5 (les moments visuels renforcés + le cadre légal) restent `standard` pour laisser respirer leur composition élargie ; §7/§8/ressources restent `compact`. CSS local à la page uniquement.

## PMU, CORO Documents, ressources, FAQ

Inchangés dans leur contenu et leur frontière produit ; la section PMU reste volontairement calme après la section navy renforcée. Parité FAQ/JSON-LD revérifiée après les changements de formulation (révision, autorité du service incendie).

## Preuve responsive

Puppeteer reste indisponible dans cet environnement (limite déjà signalée en MIG-05B-B/MIG-05C). Vérification par inspection visuelle réelle via navigateur à la largeur de fenêtre disponible (~1036-1139px), en faisant défiler l'intégralité de la page : matrice bâtiments, ancre PSI + ledger 01-07, cartes 2×2, quatre territoires navy, blocs révision/exercices, ressources, FAQ — tous rendus sans débordement ni chevauchement. Aucune capture automatisée à 320/390/768/1024/1920 exacts n'a pu être produite ; cette limite est déclarée explicitement plutôt que de prétendre à une vérification responsive complète.

## Tests, build

`tests/guide-psi-migration.test.ts` étendu à 21 tests (6 tests MIG-05C-B ajoutés : absence de revendication annuelle, autorité du service incendie basée sur les lois nommées, "exercices" retiré du groupe opérationnel avec contenu relocalisé, 4 territoires navy exacts sans rail "steps", primitives locales non partagées). 437 tests passent. `tsc --noEmit`, ESLint et `npm run build` propres. Contrôle de non-régression : toutes les routes déjà vérifiées en MIG-05C répondent toujours 200.

## Revues de mise en ligne

Aucune nouvelle revue bloquante. Les décisions PMU (MIG-05B/MIG-05B-B) restent inchangées et ne sont pas rouvertes par cette passe.

# MIG-05D — PCA implementation result

Implémenté (2026-09-27). Registre V2 : `/documents/plan-continuite-activites-pca` ajoutée après le PSI. Le PCA reste `historical({ id: 'guide-pca', ... })` dans le registre de routes (déjà `implemented: true` avant cette étape) — seule l'appartenance V2 change.

## Baseline et contrat de langue

`tests/fixtures/guide-pca-baseline.json` capture FR / `?lang=en` / `?ref=CR-ABCDEF`. Comme PSI, le fichier V1 n'avait aucune gestion de `searchParams` : `?lang=en` retournait trivialement la même page française. `bodyText` FR === EN confirmé → `englishAvailable={false}` / `hasEnglish: false`, aucune traduction inventée.

## Matrice de préservation — résumé

Les 6 sections V1 (définition/ISO 22301, secteurs concernés, contenu du PCA, ISO 22301 détaillée, fréquence de test, simplification CORO) sont RECOMPOSÉES dans une architecture éditoriale à 8 sections + ressources + FAQ + CTA. Les 3 sources et les 4 questions FAQ sont préservées dans leur substance (2 des 3 liens sources corrigés, voir ci-dessous). Aucune perte de contenu utile.

## Audit normatif — décisions

- **ISO 22301:2019** : VERIFIED — norme réelle confirmée via sources secondaires multiples (iso.org bloque les requêtes scriptées avec un 403, ce qui n'indique pas un lien mort — juste une protection anti-bot ; l'existence et le contenu de la norme sont indépendamment confirmés). Conservée, y compris la description du cycle planifier/établir/mettre en œuvre/exploiter/surveiller/réviser/maintenir/améliorer.
- **« Testé au moins une fois par année »** : NOT VERIFIED comme exigence ISO 22301 → REMOVE. La norme exige un programme d'exercices et de tests mais la fréquence est explicitement fondée sur le risque et les activités de l'organisation, pas sur un chiffre annuel fixe (même décision que MIG-05C-B pour le PSI).
- **Lien source BSIF (V1)** : DEAD (404 vérifié). REFINE : remplacé par la mention nommée de la ligne directrice actuelle, **E-21 — Gestion du risque opérationnel et résilience** (confirmée existante par recherche), avec lien vers le site BSIF (la page française précise n'a pas pu être résolue durant cette passe — la page d'accueil, fonctionnelle, est utilisée plutôt qu'un lien profond deviné).
- **Lien source Canada.ca (V1)** : DEAD (404 vérifié). REFINE : remplacé par une page fonctionnelle du Bureau du Conseil privé sur la gestion de la continuité des activités (200 confirmé).
- **FAQ — délai de production** : la V1 affirmait qu'un premier PCA « peut être produit rapidement » (précision de vitesse non vérifiable) → adoucie : CORO structure la production, la durée dépend de la taille de l'organisation et du nombre d'activités critiques (même traitement que la précision de délai retirée du PMU en MIG-05B).

## SEO — décision REWRITE

URL conservée à l'identique. Titre et description réécrits pour intégrer BIA/RTO/RPO et la distinction PCA vs PRA, retirer l'accroche produit du titre V1 (« Guide complet | CORO »).

## Hero

`guide-pca-business-continuity.webp`, audité entièrement : 5 personnes en réunion, écran mural et diagramme papier portant des libellés éditoriaux inventés par l'illustration elle-même (« PRÉPARER → RÉPONDRE → MAINTENIR → RÉTABLIR », etc.). Aucun logo CORO, aucune UI produit réelle, aucun texte réglementaire lisible. Classification : MARKETING / ÉDITORIAL, `alt=""`, image non modifiée. **Important** : les libellés visibles sur l'écran/le diagramme de l'illustration n'ont PAS été utilisés comme source de contenu — toutes les catégories du texte (sources d'interruption, éléments du PCA) proviennent exclusivement du texte V1/ISO vérifié, jamais de ce qui est dessiné dans l'image.

## Signature visuelle PCA — distincte du PMU et du PSI

Conformément à la règle de famille confirmée par PMU + PSI, le PCA ne réutilise aucun de leurs moments (pas de « 08 », pas de cycle, pas de « Agir », pas d'ancre « PSI »/ledger, pas de cartes de parties prenantes, pas de territoires SIGNAL/AVIS/CONSIGNES/ÉVACUATION). Trois moments propres au PCA :
1. **Sources d'interruption (navy, 5 colonnes)** — Sinistre, Panne informatique, Pandémie, Perte d'accès aux locaux, Défaillance d'un fournisseur clé — repris verbatim du paragraphe d'introduction du guide lui-même (contenu déjà vérifié, jamais inventé), sans classement de gravité.
2. **Glossaire RTO/RPO** — deux termes techniques en typographie large, empilés avec leur définition, un signature de type « glossaire » inédite dans la famille (ni ancre unique ni ledger numéroté).
3. **Comparaison PCA vs PRA** — composition à deux colonnes qui garde visible, dans sa propre colonne, le statut Phase 2 de la production PRA dans CORO — empêchant toute confusion entre les deux frontières produit.

## Frontière produit

PCA explicitement disponible dans CORO Documents aujourd'hui (modules de gestion des ressources critiques, listes de contacts, procédures d'activation, export PDF). PRA reste explicitement Phase 2, visible dans la section §07 (comparaison) ET dans le lien contextuel vers le guide PRA. Aucune analyse d'impact automatique, aucun calcul automatique de RTO/RPO, aucune certification ISO de CORO lui-même n'est affirmée.

## Ressources et liens réciproques

4 ressources blog sélectionnées et vérifiées (200 sur `getcoro.io/blog/<slug>`) : contenu PCA, BIA/RTO/RPO, identification des activités critiques, PCA vs PRA. Liens réciproques vers `/guides`, `/gestion-documentaire` et le guide PRA (toujours en V1, lien fonctionnel indépendamment du statut de migration de la cible — même précédent que le lien PMU→PSI en MIG-05B).

## Données structurées

`BreadcrumbList` (Accueil › Guides › PCA, pointe désormais vers `/guides`) et `FAQPage` (4 questions, parité avec la FAQ visible). Le `WebPage` avec `about: [Thing×3]` et le `publisher.logo` `ImageObject` orphelin de la V1 sont retirés — aucun schéma `SoftwareApplication`, `Offer`, `Product` ou de certification.

## Densité locale

Même leçon de famille : `density="compact"` sur §1, §2, §6, §8, ressources ; `standard` conservé pour le hero, les trois moments visuels (§3 navy, §4 ledger, §5 glossaire) et §7 (comparaison PCA/PRA) pour laisser respirer leur composition ; FAQ `standard` pour la transition finale.

## Preuve responsive

Puppeteer reste indisponible dans cet environnement (limite déjà signalée en MIG-05B-B/MIG-05C/MIG-05C-B). Inspection visuelle réelle via navigateur à la largeur de fenêtre disponible (~1036px), défilement complet de la page : hero, secteurs, 5 sources d'interruption (navy), ledger 6 éléments, glossaire RTO/RPO, comparaison PCA/PRA, CORO Documents, ressources — tous rendus sans débordement ni chevauchement.

## Tests, build, QA

`tests/guide-pca-migration.test.ts` créé (17 tests dédiés : baseline, registre, langue, hero, frontière produit PCA/PRA, absence de revendication de test annuelle, absence des liens morts V1, distinction PCA vs PRA, liens réciproques, parité FAQ/JSON-LD, non-clonage des signatures PMU/PSI, exactitude des 5 sources d'interruption, glossaire RTO/RPO, exactitude des 6 éléments de contenu, métadonnées, accessibilité, densité locale). Mise à jour des listes `migratedV2Routes` codées en dur dans 13 fichiers de test existants + `tests/sentinelle-population-migration.test.ts` (slice/longueur) + `tests/page-rhythm.test.ts` (liste d'exclusion). **454 tests passent** (tous verts dès la première exécution). `tsc --noEmit`, ESLint et `npm run build` propres. QA finale : un seul pied de page, un seul `<main>`, un seul `<h1>` sur `/documents/plan-continuite-activites-pca` post-registre. Contrôle de non-régression : `/`, `/security`, `/pricing`, `/guides`, `/coro-incident`, `/gestion-documentaire`, `/blog`, PMU, PSI et les 3 guides encore en V1 (PGC/PRA/PUE) répondent tous 200.

## Revue de design de famille — PMU + PSI + PCA

**Ce qui est vraiment commun aux trois guides** : `V2Shell` + `EditorialHero` + `PageSection`/`EditorialBlock` + `Accordion` (FAQ) + `CTASection` ; le rythme éditorial dense via `density="compact"` par instance ; le traitement réglementaire/normatif (matrice CLAIM/V1/SOURCE/VERSION/STATUS/DÉCISION, généralisation plutôt qu'invention de précision, retrait des revendications de fréquence non vérifiées — PMU/PSI/PCA ont chacun eu au moins une revendication temporelle retirée) ; les liens `/guides` + `/gestion-documentaire` + lien contextuel vers un guide apparenté ; la sélection de 4 ressources blog vérifiées ; le CTA éditorial-d'abord ; la philosophie de densité (compact pour le contenu ordinaire, standard pour les moments visuels).

**Ce qui doit rester propre à chaque sujet** : les ancres visuelles (« 08 » PMU / « PSI » PSI / aucune pour PCA), les compositions de cartes (2 cartes PMU / 4 cartes PSI / 0 carte PCA — remplacée par un glossaire et une comparaison), les concepts en fond marine (cycle PMU / 4 territoires PSI / 5 sources PCA), les mots-clés et nombres du domaine, et les modèles conceptuels propres au sujet (préparation aux urgences / sécurité incendie / continuité des activités).

**Conclusion** : aucun composant Guide partagé n'est extrait. Trois implémentations indépendantes confirment que les primitifs V2 existants (`PageSection`, `EditorialBlock`, `SplitContent`, `FeatureIndex`, `Accordion`, `CTASection`) suffisent largement, et qu'une extraction prématurée figerait des différences de signature qui sont précisément la valeur éditoriale de chaque guide. **Défaut maintenu : pas d'extraction**, à réévaluer après PGC/PRA/PUE si un besoin technique fort (pas seulement une ressemblance visuelle) apparaît.

## Revues de mise en ligne

Aucune nouvelle revue bloquante introduite par le PCA. Les revues consignées au §20 pour les guides restants (PUBLICATION-BLOCKER PUE, LEGAL REVIEW réglementaires PGC/PRA/PUE, dette d'accessibilité `<main>`) restent entières et ne sont pas résolues par cette étape. Les décisions PMU et PSI restent inchangées.

# MIG-05D-B — PCA visual character, density & claim-precision pass

Implémenté (2026-09-27). **La première composition PCA (MIG-05D) a été REJETÉE en revue visuelle** : espace horizontal inutilisé (sections occupant 35-45 % du canevas), ledger des six éléments trop administratif, RTO/RPO prometteur mais sous-exploité, comparaison PCA/PRA conceptuellement importante mais visuellement trop faible. Contenu, hero, URL, contrat de langue, frontière produit et architecture générale restent approuvés.

## Nouvelle signature visuelle PCA — « CONTINUER »

Le PCA garde son objectif éditorial central : la continuité des activités prioritaires/critiques. Trois moments, toujours sans cloner PMU (« 08 »/cycle/« Agir ») ni PSI (ancre « PSI »/ledger 01-07/cartes de parties prenantes/territoires SIGNAL-AVIS-CONSIGNES-ÉVACUATION) :
1. **§3 — Sources d'interruption (navy, 5 colonnes)** : CONSERVÉE sans changement — approuvée, retravailler pour la seule nouveauté était explicitement hors scope.
2. **§4 — « Continuer »** : ancre typographique éditoriale (pas une terminologie ISO) à côté des six composants existants, en ledger dense — aucun septième élément inventé, aucune numérotation copiant le PSI.
3. **§7 — PCA « Continuer » vs PRA « Rétablir »** : reconstruite en composition majeure à deux territoires, devenue la section la plus forte de la page, avec le statut Phase 2 du PRA toujours visible dans sa propre colonne.

RTO/RPO (§5) renforcé avec une question en langage clair au-dessus de chaque terme technique (« Combien de temps ? » / « Combien de données ? ») sans changer les définitions ni inventer de valeurs. La section ISO (§6) recomposée en split gauche/droite : explication normative + trois concepts déjà présents dans la clause ISO elle-même (Exercer / Réviser / Améliorer) — aucune nouvelle revendication normative, aucune fréquence annuelle réintroduite.

## Revue des revendications sectorielles (§2) — par catégorie

L'ancien titre généralisant « Exigé ou fortement recommandé selon le secteur » est remplacé par « Des exigences qui dépendent du secteur et du contexte », et chaque catégorie a été auditée séparément :

| Catégorie | Source | Statut | Décision |
|---|---|---|---|
| Institutions financières | Ligne directrice E-21 (BSIF), confirmée applicable aux institutions financières sous réglementation fédérale | VERIFIED | Reformulée « Institutions financières fédérales » |
| Gouvernement / services essentiels | Politique sur la sécurité du gouvernement du Canada, confirmée exigeant des mesures de continuité dans les plans de gestion des urgences des institutions fédérales | VERIFIED (institutions fédérales) ; NOT VERIFIED (fournisseurs de services essentiels au sens large) | Rétrécie à « Institutions du gouvernement fédéral » ; la mention générale des « fournisseurs de services essentiels » est retirée faute de source unique |
| Organisations de soins de santé | Aucune source unique trouvée | NOT VERIFIED / REFINE | Généralisée : « exigences propres à leur secteur et leur province », plus présentée comme une exigence plate |
| Organisations certifiées ISO 22301 | N/A — statut volontaire, pas un secteur | REFRAME | Présentée explicitement comme une certification volontaire, pas une catégorie de secteur |

La composition visuelle utilise désormais les deux colonnes du canevas (explication à gauche, 4 blocs contextuels sourcés à droite), au lieu d'une liste à puces sur toute la largeur. La FAQ correspondante est mise à jour pour rester cohérente.

## Défaut de composition corrigé pendant la QA

Un chevauchement visuel réel a été détecté et corrigé en cours de passe : l'ancre « Continuer » (§4), à sa taille de police initiale (`clamp(3rem, 1.6rem + 5.5vw, 5.5rem)`) dans une colonne 1fr:2.4fr, débordait sur la première ligne du ledger adjacent à la largeur de fenêtre disponible (~1036px). Corrigé en réduisant le clamp (`clamp(2.25rem, 1rem + 3.6vw, 4rem)`), en élargissant légèrement la colonne (1fr:1.8fr) et en ajoutant `overflow-wrap: anywhere` en filet de sécurité. Reconfirmé sans chevauchement après correction.

## Preuve responsive

Puppeteer reste indisponible dans cet environnement (limite déjà signalée en MIG-05B-B/MIG-05C/MIG-05C-B/MIG-05D). Inspection visuelle réelle via navigateur à la largeur de fenêtre disponible (~1036px), défilement complet de la page après correction du chevauchement : hero, secteurs (2 colonnes), 5 sources d'interruption (navy, inchangée), « Continuer » + ledger, RTO/RPO renforcé, split ISO, duel PCA/PRA majeur, CORO Documents, ressources — tous rendus sans débordement ni chevauchement.

## Tests, build

`tests/guide-pca-migration.test.ts` étendu à 21 tests (4 tests MIG-05D-B ajoutés : ancre « Continuer » éditoriale non clonée de PSI, duel PCA/PRA majeur sans valeur inventée, précision des revendications sectorielles avec reformulation ISO 22301, concepts ISO Exercer/Réviser/Améliorer sans fréquence annuelle). 458 tests passent. `tsc --noEmit`, ESLint et `npm run build` propres. Contrôle de non-régression : toutes les routes déjà vérifiées en MIG-05D répondent toujours 200, un seul pied de page confirmé.

## Revues de mise en ligne

Aucune nouvelle revue bloquante. Les décisions PMU et PSI restent inchangées et ne sont pas rouvertes par cette passe.

# MIG-05E — PGC implementation result

Implémenté (2026-09-27), **construit dès le premier passage à la qualité visuelle finale** — contrairement à PMU/PSI/PCA, qui ont chacun nécessité une passe de densité/caractère séparée (MIG-05B-B/MIG-05C-B/MIG-05D-B). Registre V2 : `/documents/plan-gestion-crise-pgc` ajoutée après le PCA.

## Baseline et contrat de langue

`tests/fixtures/guide-pgc-baseline.json` capture FR / `?lang=en` / `?ref=CR-ABCDEF`. Comme PSI et PCA, le fichier V1 n'avait aucune gestion de `searchParams` : `?lang=en` retournait trivialement la même page française. `bodyText` FR === EN confirmé → `englishAvailable={false}` / `hasEnglish: false`.

## Frontière produit — CRITIQUE

**La production du PGC dans CORO reste Phase 2**, à la différence du PMU/PSI/PCA. Faille V1 corrigée : le CTA du hero V1 disait « Structurer votre PGC avec CORO », contredisant directement le bandeau Phase 2 de la V1 lui-même une ligne plus bas. En V2 : aucune occurrence de « disponible dans CORO », « Générer votre PGC » ou « Produire votre PGC » — seule affirmation : le **guide** est disponible aujourd'hui, la **production CORO** est « prévue en phase 2 » (§09, deux faits juxtaposés explicitement). Aucun CTA « Découvrir CORO Documents » (aurait laissé croire à une production actuelle) — remplacé par un lien contextuel vers `/gestion-documentaire`, intitulé « Voir les documents disponibles aujourd'hui ».

## Matrice de préservation — résumé

Les 6 sections V1 (définition/ISO 22361, urgence vs crise, contenu du PGC, communication de crise, fréquence de révision/exercices, simplification CORO) sont RECOMPOSÉES dans une architecture éditoriale à 9 sections + FAQ + CTA (pas de section ressources — voir plus bas). Les 4 questions FAQ préservées dans leur substance. Sources : ISO 22361:2022 conservée, ISO 22301:2019 retirée (voir décision normative), lien Gouvernement du Canada conservé.

## Audit normatif — décisions

- **ISO 22361:2022** : VERIFIED — norme de lignes directrices (pas une loi), destinée aux dirigeants responsables de la capacité de gestion de crise, couvrant contexte/principes/leadership de crise/défis décisionnels (confirmé via sources secondaires institutionnelles ; iso.org bloque les requêtes scriptées avec un 403 — signalé comme une protection anti-bot, pas un lien mort). Conservée, présentée explicitement comme « lignes directrices ».
- **ISO 22301:2019** : RETIRÉE des sources PGC. C'est la norme du PCA (déjà couverte sur le guide PCA) ; la V1 la listait en source PGC sans jamais la citer dans le corps du texte — un cross-listing confus plutôt qu'une référence normative réelle pour le PGC.
- **« Révisé annuellement »** et **« exercices tous les 12 à 18 mois »** : NOT VERIFIED → REMOVE. Aucune source primaire, y compris la portée d'ISO 22361 elle-même, ne confirme une fréquence fixe — même leçon de famille que PMU/PSI/PCA. Généralisé à « révisé après chaque activation réelle et chaque changement significatif » et « exercices recommandés » sans fréquence chiffrée.
- **Lien Gouvernement du Canada (Cadre de gestion des urgences)** : VERIFIED (200), conservé.

## Distinction urgence vs crise

Section 2, RECOMPOSÉE en comparaison compacte à deux colonnes (texte normal, pas de mot géant — cette intensité visuelle est réservée à « Décider »). Urgence = sécurité physique des personnes (PMU/PSI) ; Crise = réputation/viabilité/confiance (PGC). Aucune affirmation que « toute urgence devient une crise ».

## Hero — audit renforcé

`guide-pgc-crisis-management.webp` est sensiblement plus chargé que les heros PMU/PSI/PCA : tableau de bord multi-panneaux avec radar météo, statuts de sites, organigramme de cellule de crise, tableau blanc manuscrit. Audité spécifiquement pour un risque de confusion avec une vraie UI CORO : aucun logo CORO, aucune UI produit réelle identifiable, codes de sites fictifs génériques, tableau blanc visiblement manuscrit/mis en scène. Conclusion : illustration éditoriale stylisée, pas une capture d'écran — classification MARKETING/ÉDITORIAL maintenue, `alt=""`, image non modifiée. **Aucun fait n'est dérivé de l'image**, y compris là où elle affiche coïncidemment des mots repris dans le texte de la page (« DÉCIDER », « COORDONNER ») — ces mots proviennent du texte V1 vérifié et de la portée ISO 22361 confirmée indépendamment, jamais de l'image.

## Signature visuelle PGC — distincte de PMU, PSI et PCA

1. **§3 — « Décider »** : ancre typographique avec trois qualificatifs repris verbatim de la phrase de définition du guide (rapidement / de façon coordonnée / en limitant l'impact opérations-réputation). Composition distincte du « 08 » PMU, de l'ancre « PSI » et du « CONTINUER » PCA.
2. **§4 — Cellule de crise** : matrice de 5 fonctions (Direction, Communications, Juridique, RH, Opérations) — aucune ligne de connexion, aucune hiérarchie inventée, explicitement cadrée « typiquement... la composition exacte varie ».
3. **§5 — Composition stratégique navy** : trois bandes pleine largeur (Décision / Communication / Coordination), une forme horizontale délibérément différente des colonnes du PSI et de la grille à 5 colonnes du PCA — concepts liés, explicitement « pas séquentiels ».

## Cellule de crise — pas d'organigramme fictif

Conformément à la consigne, aucune hiérarchie de commandement n'est représentée : 5 fonctions en matrice sans lignes de connexion, aucun rôle ICS/SCI inventé (pas de « incident commander », « liaison officer », etc.), aucune structure universelle affirmée.

## Communication de crise

RECOMPOSÉE en matrice de 4 audiences sourcées du texte V1 (autorités, médias, employés, parties prenantes) — aucune implication de notification de masse, de diffusion automatique, ou de confusion avec Sentinelle Population (module distinct).

## Relation avec PMU et PCA

Trois taglines contextuelles compactes, reprenant la formulation déjà établie sur les guides PMU et PCA eux-mêmes (cohérence réciproque, pas une nouvelle affirmation) : PMU « Agir face à l'urgence », PGC « Gouverner la crise », PCA « Maintenir les activités critiques ». Aucune hiérarchie obligatoire PMU→PGC→PCA→PRA affirmée.

## Ressources — lacune éditoriale enregistrée

Aucun article de blogue fortement spécifique à la gestion de crise/PGC n'existe dans l'inventaire publié actuel (recherché durant MIG-05E — seuls des articles PCA/résilience/tabletop tangentiels existent, aucun sur la cellule de crise ou la communication de crise). Conformément à la consigne explicite de ne pas réutiliser des articles PMU/PCA uniquement pour remplir l'espace, la **section ressources est omise** sur cette page. Lacune éditoriale enregistrée pour suivi futur, pas une omission silencieuse.

## SEO — décision REWRITE

URL conservée à l'identique. Titre et description réécrits pour refléter cellule de crise/communication/ISO 22361, retirer l'accroche produit du titre V1.

## Données structurées

`BreadcrumbList` (Accueil › Guides › PGC) et `FAQPage` (4 questions, parité avec la FAQ visible). Le `WebPage.about[Thing×4]` et le `publisher.logo` orphelin de la V1 sont retirés — aucun schéma `SoftwareApplication`, `Offer` ou `Product`.

## Densité / usage de la largeur — audit section par section (§35 de la consigne)

| Section | Classification | Traitement |
|---|---|---|
| Hero | STRONG | Photo pleine hauteur |
| §1 Qu'est-ce qu'un PGC | CALM | `density="compact"`, section courte et intentionnellement calme |
| §2 Urgence et crise | STRUCTURED | Comparaison 2 colonnes pleine largeur |
| §3 Décider | STRONG | Ancre typographique + qualificatifs, moment majeur |
| §4 Cellule de crise | STRUCTURED | Matrice de 5 fonctions, pleine largeur |
| §5 Trois volets stratégiques | STRONG | Navy, 3 bandes pleine largeur |
| §6 Communication de crise | STRUCTURED | Matrice de 4 audiences |
| §7 Exercices et révision | CALM/STRUCTURED | `density="compact"`, 2 blocs ruled pleine largeur |
| §8 PGC/PMU/PCA | CALM/STRUCTURED | `density="compact"`, 3 taglines pleine largeur |
| §9 PGC dans CORO | CALM/STRUCTURED | `density="compact"`, 2 faits pleine largeur + lien |
| FAQ | STRUCTURED | Accordéon standard |
| CTA | STRONG | Bande finale |

Aucune section « texte étroit à gauche / 55-65 % vide à droite » détectée — le défaut corrigé après coup sur PMU/PSI/PCA n'apparaît pas ici dès la première passe.

## Preuve responsive

Puppeteer reste indisponible dans cet environnement (limite déjà signalée en MIG-05B-B/MIG-05C/MIG-05C-B/MIG-05D/MIG-05D-B). Inspection visuelle réelle via navigateur à la largeur de fenêtre disponible (~1036px), défilement complet : hero, comparaison urgence/crise, « Décider », matrice de fonctions, bandes navy, audiences de communication, exercices/révision, relations, Phase 2, FAQ, CTA — tous rendus sans débordement ni chevauchement. La largeur de fenêtre n'a pas pu être variée avec précision dans cet environnement (limite déjà documentée) ; les points de rupture CSS (40rem/48rem/56rem/64rem/68rem) reprennent exactement les mêmes motifs déjà vérifiés visuellement sur PMU/PSI/PCA.

## Tests, build

`tests/guide-pgc-migration.test.ts` créé (23 tests dédiés : baseline, registre, langue, hero, **frontière Phase 2 critique**, absence d'automatisation invoquée, absence de niveaux de crise/seuils/délais inventés, ISO 22361 comme lignes directrices, absence de numéro de clause inventé, absence de fréquence fixe, 5 fonctions de la cellule de crise exactes sans hiérarchie fictive, non-clonage des signatures PMU/PSI/PCA, qualificatifs de « Décider » exacts, 3 bandes navy exactes, distinction urgence/crise sourcée, relations PMU/PGC/PCA sans séquence forcée, audiences de communication sourcées, parité FAQ/JSON-LD, liens internes contextuels, absence de section ressources justifiée, CTA sans promesse de production, métadonnées, accessibilité, densité locale). **482 tests passent** (tous verts dès la première exécution — aucun correctif de composition nécessaire après la première implémentation). `tsc --noEmit`, ESLint et `npm run build` propres. QA finale : un seul pied de page, un seul `<main>`, un seul `<h1>` post-registre. Contrôle de non-régression : `/`, `/security`, `/pricing`, `/guides`, `/coro-incident`, `/gestion-documentaire`, `/blog`, PMU, PSI, PCA, PRA, PUE répondent tous 200.

## Revue de design de famille — PMU + PSI + PCA + PGC

**Commun aux quatre guides** : `V2Shell` + `EditorialHero` + `PageSection`/`EditorialBlock` + `Accordion` (FAQ) + `CTASection` ; rythme éditorial dense (`density="compact"` par instance) ; méthode normative identique (matrice CLAIM/SOURCE/STATUT/DÉCISION, généralisation plutôt qu'invention de précision, retrait systématique des revendications de fréquence non vérifiées — les quatre guides ont chacun eu au moins une revendication temporelle retirée) ; lien `/guides` obligatoire + liens contextuels vers les guides apparentés ; FAQ ; CTA éditorial-d'abord ; protocole de registre identique ; philosophie de densité (compact pour l'ordinaire, standard pour les moments visuels).

**Propre à chaque sujet** : ancres typographiques (« 08 » / « PSI » / « CONTINUER » / « Décider »), compositions de cartes (rôles PMU / parties prenantes PSI / aucune carte PCA / fonctions de cellule PGC), concepts navy (cycle PMU / territoires-colonnes PSI / grille 5-colonnes PCA / bandes pleine largeur PGC), et les frontières produit elles-mêmes (PMU/PSI/PCA disponibles aujourd'hui vs PGC Phase 2 — la différence la plus structurante entre PGC et les trois guides précédents).

**Conclusion** : toujours **aucune extraction de composant Guide partagé**. Quatre implémentations indépendantes, chacune avec sa propre signature, confirment que les primitifs V2 existants suffisent et qu'aucune logique dupliquée stable ne justifie une abstraction. PGC démontre en plus que la frontière produit elle-même (Phase 2 vs disponible) est un axe de variation suffisamment important pour qu'un composant Guide partagé devrait de toute façon exposer cette différence explicitement — argument supplémentaire contre une extraction prématurée. À réévaluer après PRA/PUE.

## Revues de mise en ligne

Aucune nouvelle revue bloquante introduite par le PGC. Les décisions PMU, PSI et PCA restent inchangées et ne sont pas rouvertes par cette étape. Lacune éditoriale enregistrée : absence de ressource blog spécifique au PGC/gestion de crise dans l'inventaire actuel — à surveiller si du nouveau contenu est publié.

# MIG-05F — PRA implementation result

Implémenté (2026-09-27), **construit dès le premier passage à la qualité visuelle finale**, méthode confirmée par le PGC (MIG-05E). Registre V2 : `/documents/plan-reprise-activites-pra` ajoutée après le PGC.

## Baseline et contrat de langue

`tests/fixtures/guide-pra-baseline.json` capture FR / `?lang=en` / `?ref=CR-ABCDEF`. Comme PSI/PCA/PGC, le fichier V1 n'avait aucune gestion de `searchParams` : `?lang=en` retournait trivialement la même page française. `bodyText` FR === EN confirmé.

## Frontière produit — CRITIQUE

**La production du PRA dans CORO reste Phase 2**, comme le PGC. Même faille V1 corrigée : le CTA du hero V1 disait « Structurer votre PRA avec CORO », contredisant le bandeau Phase 2 de la V1 lui-même. En V2 : aucune occurrence de « disponible dans CORO », « Générer votre PRA » ou « Produire votre PRA » — seule affirmation : le **guide** est disponible aujourd'hui, la **production CORO** est « prévue en phase 2 » (§09). La comparaison PCA/PRA (§02) garde le PCA explicitement « Disponible dans CORO Documents » — la frontière produit reste vraie dans les deux sens.

## Matrice de préservation — résumé

Les 6 sections V1 (définition PRA/DRP, PRA vs PCA, contenu complet, PRA informatique/opérationnel, fréquence de test, simplification CORO) sont RECOMPOSÉES en 9 sections + ressources + FAQ + CTA. Les 4 questions FAQ préservées dans leur substance (une reformulée, voir décisions normatives). Sources : ISO 22301:2019 conservée, ISO/IEC 27031:2011 conservée, lien Gouvernement du Canada conservé avec une limite de vérification signalée.

## Audit normatif — décisions

- **ISO 22301:2019** : VERIFIED (iso.org bloque les requêtes scriptées avec un 403 — protection anti-bot, pas un lien mort).
- **ISO/IEC 27031:2011** : VERIFIED — désignation réelle et toujours valide (une nouvelle édition FDIS 27031:2024 existe mais n'invalide pas la citation 2011 du guide).
- **« Testé au moins une fois par année »** : NOT VERIFIED → REMOVE. La clause 8.5 d'ISO 22301 exige un programme d'exercices régulier mais n'impose pas de fréquence annuelle fixe — même leçon de famille que PMU/PSI/PCA/PGC. Généralisé à « intervalle régulier adapté à la criticité ».
- **Lien Gouvernement du Canada** : la vérification live a échoué de façon transitoire pendant MIG-05F (erreur réseau 000, connectivité générale confirmée fonctionnelle par ailleurs) ; cette URL exacte avait déjà été confirmée 200 lors de MIG-05D. Conservée, limite de vérification consignée plutôt que de la déclarer morte sans preuve.
- **FAQ — « module de suivi des exercices »** : la V1 affirmait que CORO « intègre un module de suivi des exercices » pour le PRA. RETIRÉE — la production du PRA étant Phase 2, aucune fonctionnalité CORO spécifique au PRA n'est actuellement promue.

## Distinction PRA vs PCA — perspective inversée

Section 2, RECOMPOSÉE en comparaison compacte à deux colonnes avec statut produit explicite pour chaque plan. Contrairement à la page PCA (qui utilise « Continuer »/« Rétablir » en gros mots), la page PRA garde des titres de taille normale ici — l'intensité typographique majeure est réservée à la section 3 (« Rétablir » seul). Aucune hiérarchie, aucun gagnant.

## Hero — audit

`guide-pra-disaster-recovery.webp` : plus chargé que les heros précédents, avec des indicateurs de statut à l'apparence « en direct » (« Systèmes critiques : En ligne », « Sauvegardes : Complétées », « Site de relève : Prêt », « Tests de reprise : Planifiés ») et un diagramme manuscrit avec un flux fléché (Systèmes critiques → Site principal → Sauvegarde → Site de relève → Rétablissement). Audité spécifiquement pour un risque de confusion avec une vraie UI/architecture CORO : aucun logo CORO, aucune UI produit réelle identifiable, indicateurs et diagramme visiblement stylisés/mis en scène (papier manuscrit, icônes génériques). Conclusion : illustration éditoriale, pas une capture d'écran — classification MARKETING/ÉDITORIAL maintenue, `alt=""`, image non modifiée. **Le flux fléché du diagramme n'est reproduit nulle part sur la page** — le modèle de reprise du texte (domaines, priorisation) provient exclusivement du contenu V1 vérifié, jamais de ce que dessine l'illustration.

## Signature visuelle PRA — distincte des quatre guides précédents

1. **§3 — « Rétablir », affirmation solo** : un seul mot géant, sans ledger adjacent — délibérément PAS une troisième instance du motif ancre+liste déjà utilisé par PSI (« PSI » + ledger 01-07) et PCA (« Continuer » + ledger 6 éléments).
2. **§4 — Matrice 2×2 des domaines de reprise** (Systèmes/Données/Ressources/Locaux), section structurée distincte.
3. **§5 — Composition navy ASYMÉTRIQUE** : un territoire dominant (« Prioriser ») à côté de deux territoires plus petits empilés (« Restaurer »/« Valider ») — géométrie 1-grand + 2-empilés, différente des boîtes du PMU, des 4 colonnes égales du PSI, des 5 colonnes égales du PCA et des 3 bandes égales du PGC.

## RTO/RPO — pas de duplication de la PCA

Conformément à la consigne explicite, le PRA ne reconstruit pas la composition glossaire RTO/RPO du PCA. Section 7 : référence courte présentant RTO/RPO comme des repères déjà établis par l'analyse de continuité, avec un lien contextuel vers le glossaire complet du guide PCA.

## PRA informatique et opérationnel

Section 6, RECOMPOSÉE en deux blocs ruled compacts, distinction préservée sans dupliquer aucune autre composition de la famille.

## CORO Phase 2

Section 9 : deux faits juxtaposés (Guide disponible aujourd'hui / Production CORO prévue en phase 2), lien contextuel vers `/gestion-documentaire` avec un intitulé de portée explicite (« Voir les documents disponibles aujourd'hui »), pas de CTA « Découvrir CORO Documents ».

## Ressources

2 ressources retenues et vérifiées (200) : « PCA vs PRA : quelle est la différence ? » et « BIA, RTO et RPO : comment définir les priorités de continuité ? » — toutes deux directement pertinentes au PRA (pas de remplissage forcé). Ces deux articles sont déjà utilisés sur la page PCA, ce qui est légitime ici puisqu'ils traitent explicitement de la distinction PCA/PRA et des repères RTO/RPO, deux sujets centraux du PRA.

## Données structurées

`BreadcrumbList` et `FAQPage` (4 questions, parité avec la FAQ visible). Le `WebPage.about[Thing×5]` (incluant DRP, RTO, RPO comme entités séparées) et le `publisher.logo` orphelin de la V1 sont retirés — aucun schéma `SoftwareApplication`, `Offer` ou `Product`.

## Audit densité / largeur — section par section (§48 de la consigne)

| Section | Classification | Traitement |
|---|---|---|
| Hero | STRONG | Photo pleine hauteur |
| §1 Qu'est-ce qu'un PRA | CALM | `density="compact"` |
| §2 PRA et PCA | STRUCTURED | Comparaison 2 colonnes + lien contextuel |
| §3 Rétablir | STRONG | Affirmation typographique solo |
| §4 Domaines de reprise | STRUCTURED | Matrice 2×2 pleine largeur |
| §5 Priorités de reprise | STRONG | Navy asymétrique 1+2 |
| §6 PRA informatique/opérationnel | CALM/STRUCTURED | `density="compact"`, 2 blocs pleine largeur |
| §7 RTO et RPO | CALM/STRUCTURED | `density="compact"`, référence courte + lien |
| §8 Tests et révision | CALM/STRUCTURED | `density="compact"`, 2 blocs pleine largeur |
| §9 PRA dans CORO | CALM/STRUCTURED | `density="compact"`, 2 faits + lien |
| Ressources | CALM | `density="compact"`, 2 items |
| FAQ | STRUCTURED | Accordéon standard |
| CTA | STRONG | Bande finale |

Aucune section « texte étroit à gauche / 55-65 % vide à droite » détectée dès la première passe.

## Preuve responsive

Puppeteer reste indisponible dans cet environnement (limite déjà signalée en MIG-05B-B/MIG-05C/MIG-05C-B/MIG-05D/MIG-05D-B/MIG-05E). Inspection visuelle réelle via navigateur à la largeur de fenêtre disponible (~1036px), défilement complet : hero, comparaison PCA/PRA, « Rétablir », matrice de domaines, navy asymétrique (Prioriser/Restaurer/Valider), PRA informatique/opérationnel, RTO/RPO, tests/révision, Phase 2, ressources, FAQ, CTA — tous rendus sans débordement ni chevauchement. La largeur de fenêtre n'a pas pu être variée avec précision dans cet environnement (limite déjà documentée) ; les points de rupture CSS reprennent les mêmes motifs déjà vérifiés visuellement sur les quatre guides précédents.

## Tests, build

`tests/guide-pra-migration.test.ts` créé (23 tests dédiés : baseline, registre, langue, hero, **frontière Phase 2 critique avec PCA toujours disponible**, absence d'automatisation invoquée, absence de valeurs RTO/RPO/fréquence de sauvegarde/rétention inventées, absence de paliers de reprise ou de séquence technique forcée, absence de langage de garantie, distinction PCA/PRA avec perspective inversée, non-clonage des signatures PMU/PSI/PCA/PGC, « Rétablir » solo sans ledger adjacent, 4 domaines exacts, navy asymétrique exact, RTO/RPO référencé sans duplication du glossaire PCA, absence de rôles de cellule de crise importés du PGC, parité FAQ/JSON-LD, liens internes contextuels, ressources non forcées, CTA sans promesse de production, métadonnées, accessibilité, densité locale). **505 tests passent** (tous verts dès la première exécution). `tsc --noEmit`, ESLint et `npm run build` propres. QA finale : un seul pied de page, un seul `<main>`, un seul `<h1>` post-registre. Contrôle de non-régression : `/`, `/security`, `/pricing`, `/guides`, `/coro-incident`, `/gestion-documentaire`, `/blog`, PMU, PSI, PCA, PGC, PUE répondent tous 200.

## Revue de design de famille — cinq guides (PMU + PSI + PCA + PGC + PRA)

**Commun aux cinq guides** : `V2Shell` + `EditorialHero` + `PageSection`/`EditorialBlock` + `Accordion` (FAQ) + `CTASection` ; rythme éditorial dense ; méthode normative identique (matrice CLAIM/SOURCE/STATUT/DÉCISION, généralisation plutôt qu'invention de précision — les cinq guides ont chacun eu au moins une revendication de fréquence retirée) ; lien `/guides` obligatoire + liens contextuels ; FAQ ; CTA éditorial-d'abord ; protocole de registre identique ; philosophie de densité identique ; méthode d'audit de source (LIVE/BLOCKED-BUT-KNOWN/DEAD/REPLACE, jamais une confusion entre anti-bot 403 et lien réellement mort).

**Propre à chaque sujet** : ancres typographiques (« 08 » / « PSI » / « CONTINUER » / « Décider » / « Rétablir » — cinq mots, cinq géométries différentes) ; compositions structurées (rôles PMU / parties prenantes PSI / aucune carte PCA / fonctions PGC / matrice de domaines PRA) ; géométries navy (cycle PMU / 4 colonnes égales PSI / 5 colonnes égales PCA / 3 bandes égales PGC / 1 dominant + 2 empilés PRA — aucune répétée) ; frontières produit (PMU/PSI/PCA disponibles aujourd'hui vs PGC/PRA Phase 2).

**Conclusion** : toujours **aucune extraction de composant Guide partagé**. Cinq implémentations indépendantes, chacune avec sa propre géométrie de signature, confirment que les primitifs V2 existants (`PageSection`, `EditorialBlock`, `SplitContent`, `FeatureIndex`, `Accordion`, `CTASection`) suffisent et qu'aucune logique dupliquée stable ne justifie une abstraction — au contraire, la variation délibérée de géométrie entre les cinq guides est la preuve que l'identité visuelle par sujet est la valeur, pas un défaut à corriger par une abstraction. À réévaluer après PUE (dernier guide de la famille).

## Revues de mise en ligne

Aucune nouvelle revue bloquante introduite par le PRA. Les décisions PMU, PSI, PCA et PGC restent inchangées et ne sont pas rouvertes par cette étape.

**Aucun point de blocage de publication spécifique au PRA ne subsiste après cette migration.** (Les revues déjà consignées au §20 pour PUE — PUBLICATION-BLOCKER — et la dette d'accessibilité `<main>` générale restent entières et concernent PUE, pas le PRA.)

# MIG-05G — PUE implementation result (sixième et dernier guide de la famille)

Implémenté (2026-09-27), **construit dès le premier passage à la qualité visuelle finale**, méthode confirmée par PGC/PRA. Registre V2 : `/documents/plan-urgence-environnementale-pue` ajoutée après le PRA. PUE est le guide le plus sensible sur le plan réglementaire de toute la famille — traité avec une rigueur accrue.

## État de départ

Arbre propre, HEAD = commit PRA (`eb9e131b`). Route PUE confirmée, hors registre ; PMU/PSI/PCA/PGC/PRA dans le registre ; PUE Phase 2 côté CORO ; `/guides` présentait déjà PUE comme « Guide disponible · Production CORO prévue en phase 2 ».

## Baseline et contrat de langue

`tests/fixtures/guide-pue-baseline.json` capture FR / `?lang=en` / `?ref=CR-ABCDEF`. Comme les cinq guides précédents, aucune gestion de `searchParams` en V1 : `?lang=en` = FR fallback trivial, confirmé octet pour octet.

## PUBLICATION-BLOCKER PUE-01 — fermeture

| | |
|---|---|
| **V1** | Hero CTA « Générer votre PUE avec CORO », contredisant le bandeau Phase 2 de la V1 elle-même une ligne plus bas. Section CORO V1 affirmait aussi « CORO... génère les sections réglementaires du PUE ». |
| **V2 final** | Hero : « Lire le guide » / « Voir tous les guides » (même famille que PGC/PRA). §09 explicite : « Guide disponible · Production CORO prévue en phase 2 ». |
| **Statut produit** | Production du PUE dans CORO = Phase 2. |
| **Statut** | **RESOLVED BY REMOVAL / REPLACEMENT** |
| **Protégé par** | `guide-pue-migration.test.ts` : tests « PUBLICATION-BLOCKER PUE-01 resolved » et « CRITICAL product boundary » |

Recherche grep contextuelle effectuée sur : générer/produire/créer/disponible/automatique/conformité — aucune occurrence dangereuse restante dans le code source de la page.

## Matrice de préservation — résumé

Les 6 sections V1 (cadre réglementaire, assujettissement, contenu PUE, obligations de notification, matières dangereuses/SIMDUT/REPTOX, simplification CORO) sont RECOMPOSÉES en 9 sections + FAQ + CTA (pas de section ressources). Les 4 questions FAQ préservées, 2 reformulées (voir décisions normatives). Aucune perte de contenu utile — SIMDUT/REPTOX explicitement conservés.

## Audit RUE/E2 — sources actuelles

| Source | Autorité | Statut |
|---|---|---|
| Règlement sur les urgences environnementales (2019), DORS/2019-51 | Justice Laws Website (texte consolidé) | VERIFIED (200 confirmé) — remplace le lien mort de V1 (pollution-dechets.canada.ca, 404) |
| Loi canadienne sur la protection de l'environnement (1999) (LCPE) | Justice Laws Website | VERIFIED (200 confirmé) |
| Programme des urgences environnementales — ECCC | canada.ca | BLOCKED-BUT-KNOWN — l'ensemble du domaine canada.ca a rencontré une défaillance réseau générale pendant cette passe (même la page d'accueil canada.ca a expiré, 000) ; source connue et faisant autorité, conservée avec la limite consignée plutôt que retirée sans preuve |
| REPTOX — IRSST/CNESST | reptox.cnesst.gouv.qc.ca | VERIFIED (200 confirmé) |

## Table des revendications réglementaires

| Revendication | V1 | Source actuelle | Statut | Décision V2 |
|---|---|---|---|---|
| DORS/2019-51, publié 6 mars 2019, en vigueur 24 août 2019 | Correct | Gazette du Canada / Justice Laws | VERIFIED | Conservée telle quelle |
| Annexe 1 = 249 substances | Correct | Aperçu réglementaire ECCC | VERIFIED | Conservée, présentée factuellement, jamais comme ancre visuelle géante |
| Six catégories de danger | Correct (libellé français déjà exact) | Aperçu réglementaire ECCC | VERIFIED | Conservée telle quelle |
| Assujettissement = substance + seuil + conditions | Déjà correctement conditionnel en V1 | DORS/2019-51 | VERIFIED | Renforcée : ajout explicite « L'évaluation doit se faire à partir de l'inventaire réel de l'installation, pas d'une catégorie d'industrie » |
| Avis fédéral « immédiat » en cas de rejet | V1 : « avisé immédiatement » | LCPE Partie 8 — conditionnel à un effet nocif réel ou potentiel, formulation officielle sans l'adverbe « immédiatement » | REFINE | « Immédiatement » retiré ; reformulé « un rejet ayant ou pouvant avoir un effet nocif... doit faire l'objet d'un avis » |
| Simulation annuelle (administrative) | Absent de la V1 | Publications ECCC (En4-376/6-2019F) | VERIFIED — **ajoutée**, à la différence des fréquences non vérifiées retirées chez PMU/PSI/PCA/PRA, celle-ci est réelle | Ajoutée, présentée avec précision |
| Simulation à grande échelle, cycle de 5 ans | Absent de la V1 | Publications ECCC | VERIFIED — **ajoutée** | Ajoutée, présentée avec précision |
| SIMDUT exige des FDS | Correct | Cadre réglementaire fédéral/provincial SIMDUT (non re-audité en détail, déjà bien établi) | VERIFIED (connaissance générale établie) | Conservée |
| REPTOX / IRSST | Correct | reptox.cnesst.gouv.qc.ca | VERIFIED (200 confirmé) | Conservée |

## Applicabilité — décision

Structurée en 3 conditions distinctes (Substance listée / Quantité et seuil / Situation réglementaire), jamais présentée comme un calculateur oui/non. Aucune conclusion juridique propre à l'installation du lecteur (« votre installation est assujettie » n'apparaît jamais) ; formulation systématique « peut être assujettie... lorsque... » avec renvoi explicite à l'évaluation de l'inventaire réel.

## Substance / Scénario / Conséquence + « Protéger »

Relation conceptuelle à trois volets, aucune flèche, aucune valeur numérique, aucune modélisation. Le mot « Protéger » est un choix éditorial documenté (pas un terme réglementaire, pas un module CORO) — la copie de soutien le précise explicitement.

## Territoire protégé — navy

Composition à champ central dominant (« Protéger ») entouré de 4 intérêts protégés (Population, Environnement, Installation, Intervenants) — tous sourcés du texte V1/réglementaire. Le texte précise explicitement « sans prétendre calculer une zone d'impact précise ». Aucune carte, aucun cercle concentrique, aucune distance, aucun panache — géométrie entièrement distincte des cinq guides précédents (boîtes PMU / 4 colonnes égales PSI / 5 colonnes égales PCA / 3 bandes égales PGC / 1 dominant + 2 empilés PRA).

## Contenu du plan

7 éléments repris de la V1 (inventaire des substances, scénarios d'incident, prévention/confinement, notification, responsabilités, équipements de réponse, décontamination/remédiation), présentés en ledger ruled, aucun compte décoratif.

## Exercices — décision normative centrale de cette étape

**Contrairement à PMU/PSI/PCA/PRA**, où toute fréquence d'exercice non sourcée a été retirée, le PUE a une exigence RÉELLEMENT vérifiée et est donc **préservée avec précision** : simulation annuelle de nature administrative + simulation à grande échelle (déploiement de personnel, ressources et équipement) au moins une fois par cycle de cinq ans. Ces deux exigences sont distinguées dans deux bandes techniques séparées, sans date ni calendrier inventés.

## Hero — audit à risque élevé

`guide-pue-environmental-emergency.webp` est l'illustration la plus élaborée de toute la famille : elle inclut une carte fictive de « Scénario » avec des anneaux de zone colorés qualitatifs (« Zone d'impact élevée/modérée/faible ») et une plaque de réservoir « AMMONIAC » visible. Audit spécifique effectué : aucun logo CORO, aucune UI produit réelle, aucune valeur numérique de distance/concentration/population, aucune installation réelle identifiable. Conclusion : illustration éditoriale stylisée, cohérente avec le style déjà établi et accepté sur les cinq guides précédents (aucune n'a de branding CORO). Classification MARKETING/ÉDITORIAL maintenue, `alt=""`, image non modifiée. **Aucun fait, zone, substance ou quantité n'est dérivé de l'image** — le mot « AMMONIAC » visible sur l'image n'apparaît nulle part dans le texte de la page (vérifié par test automatisé). Ce risque est documenté explicitement comme le plus élevé de la famille ; recommandé pour l'attention particulière de Mathieu en revue visuelle.

## Absence de contamination client

Recherche effectuée pour Sobeys/Boucherville/Lassonde/Rougemont/Prémont, NH3/ammoniac (comme valeur), 5455/5 455, 1.98/1,98, 2.6 km/2,6 km, 150 ppm, ERPG/ZPI/ZPU : **zéro occurrence** dans le code source de la page (confirmé par test automatisé). Aucun panache, aucun rayon d'impact, aucune donnée de dispersion.

## PUE et PMU

Relation non hiérarchique : « Le PUE peut être intégré au PMU comme procédure propre aux incidents environnementaux, ou constituer un document distinct selon le contexte réglementaire et organisationnel. » Aucune affirmation universelle dans un sens ou l'autre. Lien contextuel vers le guide PMU.

## Sentinelle Population — non contamination

Recherche effectuée : aucune occurrence de « Sentinelle Population », portail citoyen, notification de masse, ou fonctionnalité d'alerte automatique dans le code de la page (confirmé par test). Le PUE reste un document de planification réglementaire, distinct de Sentinelle Population.

## Frontière produit — Phase 2

§09 explicite deux faits : Guide disponible aujourd'hui / Production CORO prévue en phase 2, avec une phrase contextuelle précisant que CORO Documents prend actuellement en charge PMU, PSI et PCA. Aucun badge « coming soon », aucune date de feuille de route, aucune UI de produit désactivé.

## Ressources

Aucun article de blogue suffisamment spécifique au PUE/urgences environnementales n'existe dans l'inventaire publié actuel (recherché durant MIG-05G). Section ressources omise, lacune éditoriale enregistrée.

## SEO — décision REWRITE

URL conservée à l'identique. Titre et description réécrits pour refléter RUE/E2, applicabilité et contenu, sans accroche produit ni promesse de génération automatique.

## Données structurées

`BreadcrumbList` et `FAQPage` (4 questions, parité avec la FAQ visible). Le `WebPage.about[Thing×6]` et le `publisher.logo` orphelin de la V1 sont retirés — aucun schéma `SoftwareApplication`, `Offer` ou `Product`.

## Audit densité / largeur — section par section

| Section | Classification | Traitement |
|---|---|---|
| Hero | STRONG | Photo pleine hauteur |
| §1 Qu'est-ce qu'un PUE | CALM | `density="compact"` |
| §2 Applicabilité | STRUCTURED | 3 conditions pleine largeur |
| §3 Substance/Scénario/Conséquence + Protéger | STRONG | Mot géant + triade |
| §4 Territoire protégé (navy) | STRONG | Champ central + périmètre |
| §5 Contenu du plan | STRUCTURED | Ledger 7 éléments |
| §6 Notification/SIMDUT | CALM/STRUCTURED | `density="compact"`, 2 blocs |
| §7 Exercices | STRUCTURED | 2 bandes techniques |
| §8 PUE et PMU | CALM | `density="compact"` |
| §9 PUE dans CORO | CALM/STRUCTURED | `density="compact"`, 2 faits + lien |
| FAQ | STRUCTURED | Accordéon standard |
| CTA | STRONG | Bande finale |

Aucune section « texte étroit à gauche / vide à droite » détectée dès la première passe.

## Preuve responsive

Puppeteer reste indisponible dans cet environnement (limite documentée depuis MIG-05B-B). Inspection visuelle réelle via navigateur à la largeur de fenêtre disponible (~1036px), défilement complet : hero, applicabilité, triade Substance/Scénario/Conséquence + Protéger, territoire protégé navy, contenu du plan, notification/SIMDUT, exercices, PUE/PMU, Phase 2, FAQ, CTA — tous rendus sans débordement ni chevauchement (un timeout de capture transitoire a été rencontré et résolu par une nouvelle capture réussie). Largeur exacte non variable dans cet environnement (limite déjà documentée) ; points de rupture CSS cohérents avec les cinq guides précédents.

## Tests, build

`tests/guide-pue-migration.test.ts` créé (24 tests dédiés couvrant explicitement : fermeture du blocker PUE-01, frontière Phase 2 critique, absence d'automatisation, applicabilité conditionnelle sans conclusion facility-specific, absence de carte/panache/rayon fictifs, absence de contamination client, fréquences d'exercice exactes sans invention au-delà du vérifié, notification sans « immédiatement », non-clonage des 5 signatures précédentes, composition Protéger/triade exacte, géométrie navy à champ central + périmètre, 249 substances non transformées en ancre visuelle, Sentinelle Population absente, relation PMU non hiérarchique, parité FAQ/JSON-LD, liens contextuels, absence de ressources forcées, CTA sans promesse, métadonnées, accessibilité, densité locale). **530/530 tests passent.** `tsc --noEmit`, ESLint et `npm run build` propres. QA finale : 1 footer/1 main/1 h1 sur PUE, sitemap contient exactement 1 entrée PUE. **Régression complète des 6 guides** : PMU/PSI/PCA/PGC/PRA/PUE vérifiés individuellement — chacun 1 h1/1 main/1 footer, tous 200. `/`, `/security`, `/pricing`, `/guides`, `/coro-incident`, `/gestion-documentaire`, `/sentinelle-population`, `/blog` tous 200 — confirmation qu'aucune page approuvée n'a été modifiée.

## Revue de design de famille — six guides (PMU + PSI + PCA + PGC + PRA + PUE)

**Commun aux six guides** : `V2Shell` + `EditorialHero` + `PageSection`/`EditorialBlock` + `Accordion` (FAQ) + `CTASection` ; rythme éditorial dense ; méthode normative identique (matrice CLAIM/SOURCE/STATUT/DÉCISION) ; distinction rigoureuse LIVE/BLOCKED-BUT-KNOWN/DEAD pour les sources externes ; lien `/guides` obligatoire + liens contextuels ; FAQ ; CTA éditorial-d'abord ; protocole de registre identique ; frontière produit explicite partout où pertinent.

**Propre à chaque sujet** : 6 ancres typographiques distinctes (« 08 » / « PSI » / « CONTINUER » / « Décider » / « Rétablir » / « Protéger ») ; 6 géométries navy distinctes (aucune répétée) ; frontières produit (PMU/PSI/PCA disponibles aujourd'hui vs PGC/PRA/PUE Phase 2) ; PUE seul a une exigence de fréquence d'exercice réellement vérifiée et préservée (tous les autres guides ont vu leurs fréquences non vérifiées retirées).

**Décision finale sur un composant partagé** : **NON**. Six implémentations indépendantes, chacune avec sa propre géométrie de signature et son propre traitement normatif, confirment que les primitifs V2 existants (`PageSection`, `EditorialBlock`, `SplitContent`, `FeatureIndex`, `Accordion`, `CTASection`) suffisent. Aucune logique dupliquée stable ne justifie `GuideHero`, `GuideSection`, `GuideSignature`, `GuideRegulatoryMatrix` ou `GuideProductBoundary` — au contraire, la variation délibérée de géométrie et de méthode entre les six guides est la preuve que l'identité visuelle et normative par sujet est la valeur, pas un défaut à corriger par une abstraction.

## Lacunes éditoriales de la famille (à consigner pour un backlog futur, non traitées durant MIG-05G)

- Aucun article de blogue spécifique au PGC/gestion de crise.
- Aucun article de blogue spécifique au PUE/urgences environnementales.
- Aucune version anglaise pour aucun des six guides (tous FR seulement par contrat, confirmé par baseline).
- Cohérence de `/guides` avec le statut produit final des six guides : vérifiée conforme (PMU/PSI/PCA = disponibles ; PGC/PRA/PUE = Phase 2) — aucune incohérence factuelle détectée, aucune modification du hub nécessaire.

## Points de revue non résolus

**Aucun point de blocage de publication spécifique au PUE ne subsiste après cette migration.**

Le seul point restant à noter, non bloquant : la vérification live de deux sources canada.ca (ECCC E2 program, page « signaler une urgence ») n'a pas pu être reconfirmée pendant cette session en raison d'une panne réseau générale du domaine dans cet environnement ; ces sources restent des autorités connues et fiables (BLOCKED-BUT-KNOWN), à revérifier lors d'une prochaine session si une confirmation renouvelée est souhaitée. Classification : NON-BLOCKING DEBT.

## Revues de mise en ligne

Aucune nouvelle revue bloquante. Les décisions PMU, PSI, PCA, PGC et PRA restent inchangées et ne sont pas rouvertes par cette étape.

**MIG-05 Guide-family migration : IMPLEMENTATION COMPLETE, PENDING HUMAN VISUAL APPROVAL OF PUE.** MIG-05 ne peut être considéré comme gelé qu'après l'approbation visuelle de Mathieu sur le PUE.

# MIG-05G-B — PUE, polish final §02/§07 uniquement

Revue visuelle complète effectuée par Mathieu sur le PUE. **Composition d'ensemble APPROUVÉE.** Aucune redésign, aucune nouvelle passe de densité générale, aucune décision réglementaire/produit rouverte.

Passe limitée à deux sections :

- **§02 Applicabilité** : hiérarchie renforcée uniquement (titre `text-h3`/poids 850 au lieu de `text-body`/800, filet d'accent 4px au lieu de 3px, espacement vertical `space-8` entre les 3 conditions au lieu de `space-5`). Même copie, mêmes 3 conditions, même logique conditionnelle, aucune carte, aucun badge, aucun état de couleur.
- **§07 Exercices** : la fréquence déjà vérifiée (déjà présente dans la phrase existante — « tenu chaque année » / « cycle de cinq ans ») est exposée comme son propre libellé visuel fort (« CHAQUE ANNÉE » / « CYCLE DE CINQ ANS »), au-dessus du titre de chaque bande. Changement de structure minimal en `page.tsx` (tuple `[nom, texte]` → objet `{name, freq, text}`) pour exposer ce libellé — la phrase factuelle sous-jacente reste identique mot pour mot. Filet d'accent supérieur ajouté aux deux bandes.

Toutes les autres sections (hero, §01, §03 Substance/Scénario/Conséquence + « Protéger », §04 territoire navy, §05 ledger, §06 notification/SIMDUT, §08 PUE/PMU, §09 Phase 2, FAQ, CTA, métadonnées, JSON-LD, canonical) sont **inchangées**.

## Gel produit/réglementaire confirmé

Aucune fréquence modifiée, aucune nouvelle revendication, aucune donnée client introduite. PUE-01 reste RESOLVED. §09 (Phase 2) non touché.

## Validation

`tsc --noEmit` propre. ESLint propre sur le fichier modifié. **530/530 tests passent** (aucun test cassé — les tests existants vérifient la présence des phrases « chaque année »/« cinq ans » dans le bloc `s7`, indépendamment de la structure tuple/objet). `npm run build` propre. QA structurelle post-polish : PUE 200, 1 footer, 1 main, 1 h1.

## QA visuelle

Méthode : navigateur (Puppeteer indisponible dans cet environnement — limite déjà documentée). Largeur inspectée : ~1036px (largeur de fenêtre disponible dans cet environnement). Inspection ciblée sur §02 et §07, puis un défilement complet hero→CTA pour confirmer que le rythme approuvé n'a pas été perturbé. §02 : hiérarchie visiblement renforcée, toujours restreinte, aucun mur de cartes, aucune apparence de calculateur de conformité. §07 : fréquences immédiatement lisibles, nuance factuelle préservée mot pour mot, composition à deux colonnes équilibrée, aucune apparence de calendrier ou de tableau de bord. Aucune autre section perturbée (vérifié : §01, §03, §04, §05, §06, §08, §09, FAQ, CTA tous visuellement identiques à MIG-05G).

## Git

`git diff --check` propre (avertissements de fin de ligne uniquement). Fichiers touchés par cette passe : `app/documents/plan-urgence-environnementale-pue/page.tsx` et `page.module.css` uniquement (déjà modifiés/nouveaux depuis MIG-05G). Aucun fichier étranger à PUE touché. Rien indexé, rien commité.
