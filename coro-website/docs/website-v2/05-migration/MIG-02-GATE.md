# MIG-02 GATE — cohérence de la famille produit et leçons de migration

Statut : gate MIG-02 (lecture seule côté code). Date : 25 septembre 2026. Branche `feature/website-v2`, HEAD `3f16a447`.

Pages couvertes : `/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`.
Registre V2 (`migratedV2Routes`) : `/about`, `/contact`, `/partners`, `/programme-recommandation`, `/gestion-documentaire`, `/gestion-de-projets`, `/performance-objectifs`, `/portail-client`, et rien d'autre.

## 1. Protocole de migration d'une page (obligatoire dès MIG-03)

1. **Base avant toute modification** : capture FR, EN et `?ref=CR-ABCDEF` (métadonnées, titres, liens, images, JSON-LD, nombre de header / main / footer, texte visible) dans `tests/fixtures/<page>-baseline.json`. Identifier code mort, contenu jamais rendu, doublons.
2. **Audit de vérité produit** (frontend ET backend actuels, jamais les anciens textes) : LIVE / PARTIAL / NOT VERIFIED / NOT IMPLEMENTED. Un modèle Prisma ou un endpoint n'est pas une fonctionnalité publique.
3. **Audit de préservation des actifs visuels V1** (§2 ci-dessous) : avant tout redesign.
4. **Vérification SEO** : title sans marque (le gabarit racine ajoute « | CORO »), description, canonical, hreflang, territoire distinct des pages voisines. Aucune donnée de volume inventée.
5. **Classer chaque image** : MARKETING ILLUSTRATION (décorative, `alt=""`, jamais une preuve), TECHNICAL ILLUSTRATION, REAL PRODUCT SCREENSHOT (cartouche factuelle « Capture d'écran », jamais « capture réelle »), OTHER.
6. **Migrer hors registre** → build → QA (2 footers attendus) → ajouter la route à `migratedV2Routes` → rebuild → QA finale (1 footer, 0 legacy).
7. **FR/EN à parité** : pas de traduction partielle silencieuse ; `?lang=en` reste le contrat d'URL.
8. **Aucune perte silencieuse** de contenu ni d'actif visuel : tout élément omis reçoit une raison écrite.
9. **QA responsive visuelle** : mesurer (320, 390, 768, 1024, 1440, 1920 FR ; 390 et 1440 EN) ET regarder réellement 390 et 1440. Une mesure n'est pas une inspection.
10. **Provenance des données visibles** dans toute capture (noms, courriels, adresses, bâtiments, dates) : sinon PUBLICATION-BLOCKER. Aucun pixel n'est flouté, modifié ou régénéré sans approbation humaine.
11. **Tests, typecheck, lint, build** ; chaque test existant modifié l'est avec un commentaire.

## 2. Règle : audit de préservation des actifs visuels V1

> Visual migration includes an asset-preservation audit. Existing useful product screenshots are migration content, not disposable decoration.

Avant de redessiner une page :
1. inventorier les actifs visuels V1 propres à la page (nom, dimensions, format) ;
2. ouvrir et regarder chacun ;
3. classer sa nature (REAL PRODUCT UI, MARKETING ILLUSTRATION, DIAGRAM, OUTDATED / UNCLEAR) ;
4. le comparer au produit actuel (libellés, boutons, panneaux, navigation) ;
5. décider KEEP / KEEP WITH PUBLICATION REVIEW / REPLACE / REJECT / UNCLEAR ;
6. écrire la raison de chaque actif omis ;
7. ne jamais jeter en silence une preuve visuelle utile.

Une interface visuellement plus ancienne n'est pas rejetée pour cela : elle est rejetée si elle montre une fonction ou un contrôle que le produit actuel n'a plus.
Origine : MIG-02D, où six images V1 avaient d'abord été écartées sans examen alors que deux d'entre elles (carte, page document) correspondaient au code actuel.

## 3. Registre des blockers et points de mise en ligne

| Classe | Portée | Élément |
|---|---|---|
| BLOCKER | Documents | Données visibles dans `public/screenshot-editor.jpg` : provenance non confirmée (fictives ou autorisées) |
| BLOCKER | Projects | Données visibles dans `public/screenshot-dashboard.jpg` : provenance non confirmée |
| BLOCKER | Client | Captures conservées `coro-portail-client-carte.webp` et `coro-portail-client-cycle-documentaire.webp` : noms de personnes, courriel `demo-client@getcoro.io`, organisation, bâtiments, adresses. PUBLICATION-BLOCKER — CLIENT PORTAL SCREENSHOT DATA PROVENANCE |
| RECAPTURE | Client | RECAPTURE REQUIRED BEFORE GO-LIVE : tableau de bord, bâtiments, activités (§4) |
| REVIEW | Global | Identité légale et adresse du pied de page (CONTENT-GOVERNANCE) |
| REVIEW | Global | Promesse « 24 heures » du DemoForm |
| REVIEW | Global | Validité commerciale du Programme de recommandation |
| MIGRATION-ONLY | Global | `<html lang>` reste `fr` (les wrappers V2 portent le `lang` effectif) |
| REVIEW | Projects | Booking et Planner : capacités implémentées dans le code actuel de l'application, donc conservées ; leur disponibilité en production n'est pas vérifiée indépendamment. MIG-02E : intitulés « Planning confirmé » / « Booking confirmé » remplacés par « Planning des ressources » / « Réservations et affectations » (« confirmé » est un langage de statut interne) ; aucune promesse de temps réel, conflit, Outlook, planification intelligente, réassignation automatique, report par le client ou multi-conseiller |
| RESOLVED (MIG-02E) | Projects | Texte de frontière : « architecture visée », « lecture transversale Network », « n'est annoncée ici » retirés ; la frontière décrit le produit actuel (« Planning et Booking sont intégrés à la gestion opérationnelle des mandats. ») |
| RESOLVED (MIG-02E) | Documents | Texte de frontière réécrit : plans PMU, PSI, PCA disponibles ; PGC, PRA, PUE prévus en Phase 2 ; CORO ne garantit pas à lui seul la conformité |
| REVIEW | Performance | Le mot « objectifs » (intro, section navy, métadonnées) : seul un objectif d'heures par période, calculé depuis l'horaire, existe dans le code ; il n'y a pas d'objectifs ni de KPI configurables |
| RESOLVED (MIG-02E) | Famille | Noms de CTA : modèle d'intention adopté (héros = découverte du produit, fin de page = demande de démonstration, Client ajoute l'accès à CORO Client). Seul le CTA final de Performance changé : « Demander une démonstration » |
| LEGACY-DEBT | Code | `ProductPage.tsx` et `ProductCompositions.tsx` ne sont plus utilisés par aucune page ; le code mort `Legacy…Page` a disparu de Performance et Client |

Aucun élément REVIEW n'est promu en BLOCKER.

## 4. Plan de recapture des captures Client (à ne pas exécuter dans ce gate)

Les trois images V1 suivantes montrent une interface qui a changé. Ce sont des candidats : la page finale n'a pas besoin des trois.

| Capture | À montrer (UI actuelle) | À ne pas montrer (obsolète) | Cadrage | Emplacement possible |
|---|---|---|---|---|
| Tableau de bord | Salutation, 3 statistiques (Total documents, Validés, En cours), section « Mes bâtiments » avec recherche, cartes de bâtiment (Documents, Résilience, Sentinelle), « Activités à venir », navigation actuelle avec Intelligence | 5 statistiques (dont Signés / En révision), panneau « Documents récents », navigation sans Intelligence | Bureau environ 1440 × 1000, ratio 3 / 2, sans scrollbar | Avant la carte (« Vue d'ensemble »), ou remplace la descente du hero |
| Bâtiments | En-tête « N bâtiments », cartes avec responsable, compteurs (documents, validés, en cours), boutons Documents et Sentinelle | Bouton « Ajouter un bâtiment » | Bureau 1440 × 900, ratio 8 / 5 | Après la grappe « objets client » |
| Activités | « Calendrier des activités », filtre par statut, liste actuelle ; vérifier les colonnes réelles au moment de la capture | Bouton « Ajouter une activité » ; toute colonne absente du produit actuel | Bureau 1440 × 900 | Dans « Activités et communications » si elle est retenue |

Gouvernance des données pour les trois : compte de démonstration dédié avec organisations, personnes, courriels et adresses inventés ou explicitement autorisés, sans nom de client réel ; jamais de courriel réel ; provenance consignée avant publication.
Stratégie FR/EN : capturer l'interface en français (la seule langue du portail actuel), garder l'`alt` et la cartouche en deux langues avec la mention « interface en français / French interface shown ».

## 5. Revue des composants / abstractions

| Candidat | Décision | Raison |
|---|---|---|
| Région de capture défilable + légende « Sur cet écran » | REVIEW, à extraire seulement si MIG-03 (Sentinelle) en a besoin | Copie dans Projects et Client ; CSS quasi identique ; trois usages (Projects, Client x2) |
| Bloc « Un socle produit relié » (liste de liens produits) | KEEP LOCAL | Identique dans 4 pages, alimenté par `productContent` ; l'extraire n'aide pas les autres familles |
| Cartes numérotées (Projects, Performance, Client) | KEEP LOCAL | Trois variantes volontairement distinctes (filet haut / gauche) |
| Cadre technique de capture (`MediaFrame kind="technical"`) | Déjà composant approuvé | Rien à extraire |
| Hero photographique | Déjà dans `EditorialHero` (mode photo, `coverage`, `mobileRatio`) | Rien à extraire |

Aucune extraction n'est recommandée avant MIG-03.

## 6. Constats de cohérence de la famille

- **CTA (résolu, MIG-02E) :** les héros disent « Découvrir CORO X » (`/#demo`), Client « Demander une démonstration » ; le CTA final de Performance répétait « Découvrir CORO Performance » et dit maintenant « Demander une démonstration », comme les trois autres fins de page.
- **Silhouettes de hero :** Projects et Performance partagent le même cadre (photo à gauche, dégradé marine à droite, texte à droite) ; Client est le miroir. Documents reste distinct (planche technique). REVIEW.
- **Cartes :** une grappe par page (Documents 6, Projects 4, Performance 4, Client 4). Performance et Client sont proches (quatre cartes à filet, haut contre gauche). REVIEW, pas de mur de cartes.
- **Performance** est la page la plus légère (aucune preuve UI, page la plus courte). Elle n'est pas générique.
- **Maillage :** chaque page liée aux trois autres par le même bloc. Contextuellement justifié, sans auto-lien.
- **JSON-LD :** FAQPage seulement sur les quatre pages, FAQ visible identique mot pour mot (FR et EN), pas de SoftwareApplication, pas d'Organization ajoutée.
- **Lien H1 :** les lignes du H1 sont des `span` en `display: block` ; le texte brut du DOM les concatène sans espace, ce que les navigateurs traitent comme des blocs distincts. À confirmer avec un vrai lecteur d'écran.

## 7. Critères de sortie MIG-02

| Critère | Résultat |
|---|---|
| A. Distinction des rôles produit | PASS |
| B. Cohérence visuelle de la famille | PASS WITH GO-LIVE ITEMS (hero Projects/Performance proches) ; CTA harmonisés (MIG-02E) |
| C. Vérité produit | PASS WITH GO-LIVE ITEMS (Booking/Planner : disponibilité en production non vérifiée) ; Network et langage interne résolus (MIG-02E) |
| D. Séparation SEO | PASS |
| E. FR/EN | PASS |
| F. Maillage | PASS |
| G. Données structurées | PASS |
| H. Responsive | PASS |
| I. Accessibilité | PASS WITH GO-LIVE ITEMS (aucun lecteur d'écran testé ; zoom 200 % / 400 % et contraste non vérifiés dans ce gate) |
| J. Gouvernance des preuves | PASS WITH GO-LIVE ITEMS (blockers de provenance) |
| K. Documentation de migration | PASS |
| L. Intégrité du registre | PASS |

## 8. Ajouts MIG-03A (`/resilience-operationnelle`)

| Classe | Portée | Élément |
|---|---|---|
| BLOCKER | Résilience | PUBLICATION-BLOCKER — RESILIENCE SCREENSHOT DATA PROVENANCE : les deux captures conservées (`coro-organisation-urgence.webp`, `coro-alerte-panique-courriel.webp`) montrent des noms de personnes, un courriel, des numéros de téléphone, une organisation, un bâtiment et une adresse, non confirmés fictifs ou autorisés |
| RECAPTURE | Résilience | Captures V1 à refaire si elles doivent servir : registre d'occupation (`coro-module-incident-types.webp`, jeton d'URL de borne visible), indice de résilience, alerte envoyée (canaux voix / application absents de l'UI actuelle), rapport d'incident (mention « ISO 22301 » incrustée) |
| REVIEW | Résilience | Références normatives (ISO 22301, CNPI, CNESST, NFPA, CCOHS) et durées de conservation retirées du texte public (ISO 22301 est une norme de système de management certifiable au niveau de l'organisation) ; à réintroduire seulement après validation humaine ou juridique |
| REVIEW | Résilience | Le lien `/sentinelle` mène à une page FR seulement (`en: false`), y compris depuis la page EN |
