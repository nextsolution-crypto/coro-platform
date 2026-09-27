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
