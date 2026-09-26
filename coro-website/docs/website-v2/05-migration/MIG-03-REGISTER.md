# MIG-03 REGISTER — famille Résilience & opérations

Registre minimal des points de mise en ligne propres à MIG-03. Les points MIG-02 restent dans `MIG-02-GATE.md`.

| Classe | Portée | Élément |
|---|---|---|
| DÉCISION | Sentinelle | `/sentinelle` est FR seulement : `hasEnglish: false`, canonical FR, hreflang `fr-CA` + `x-default`, aucun contenu EN ; sélecteur de langue (en-tête) et lien « English » (pied) masqués via `englishAvailable={false}` |
| RECAPTURE | Sentinelle | RECAPTURE REQUIRED BEFORE GO-LIVE : registre d'occupation, évacuation, personnes manquantes / non confirmées (aucune capture produit actuelle ; les images V1 montrent des interfaces inventées) |
| REVIEW | Sentinelle | Formulation de vie privée : « Sentinelle enregistre les entrées, les sorties et les statuts opérationnels déclarés; le registre d’occupation n’assure pas la géolocalisation continue des personnes. » Aucune allégation Loi 25 ; purge du registre à 12 mois non publiée |
| PROPRIÉTÉ | QR intervention | Incident (jeton public par incident, valide tant que l'incident est actif) ; non publié sur Sentinelle |
| PROPRIÉTÉ | Panneau d'alarme | PARTIAL, Incident / futur : crée un incident en pré-alerte ; dispositif IoT externe absent du dépôt |
| BLOCKER (hérité MIG-03A) | Résilience | Provenance des captures `coro-organisation-urgence.webp` et `coro-alerte-panique-courriel.webp` |
| RÉSERVÉ | Sentinelle Population | Scénario V1 industriel / environnemental et ses images préservés pour MIG-03C ; hero réservé `sentinelle-population-alert-territory.webp` |

## Ajouts MIG-03C (`/sentinelle-population`)

| Classe | Portée | Élément |
|---|---|---|
| DÉCISION | Population | FR seulement : la copie EN de la V1 était vide (`?lang=en` rendait le texte français) ; `englishAvailable={false}`, canonical FR, hreflang `fr-CA` + `x-default` |
| PRÉSERVÉ | Population | Scénario fictif V1 conservé étape par étape (10 étapes, fuite d'ammoniac, « Installation industrielle Prémont », Boucherville) ; 19 images V1 conservées sur disque ; hero V2 `sentinelle-population-alert-territory.webp` |
| REVIEW | Population | Toutes les images sont des scènes générées avec interfaces, chiffres, adresse (Boucherville), numéros de téléphone et un statut « Conforme » inventés : aucune n'est une preuve produit ; aucune capture réelle n'existe. RECAPTURE REQUIRED BEFORE GO-LIVE (centre de communication, zones, message, diffusion, suivi, traçabilité) |
| REVIEW | Population | Provenance des données de scénario (12 400 personnes, 48 890 destinataires, adresse, numéros) : FICTIF, non publié en texte ; les images qui les affichent restent à confirmer |
| REVIEW | Population | Cartes et zones (ZPI / ZPU / ZSE, 1-3-5 km) : illustratives, jamais une analyse d'impact ; libellé explicite sous la carte |
| PÉRIMÈTRE | Population | Canaux directs de CORO : SMS et courriel (Brevo), abonnés consentants. Sirènes, médias, réseaux sociaux, systèmes municipaux : externes, non activés par CORO ; ni voix, ni 911, ni intégration municipale dans le code |
| REVIEW | Réglementaire | RUE 2019 (DORS/2019-51) : la phrase V1 sur les environs et les communications au public est appuyée par la source officielle ; le texte affirme un soutien à la préparation, jamais une conformité |
| REVIEW | Population | Confidentialité du portail citoyen (« l'adresse saisie n'est pas conservée ») : conservée de la V1, non entièrement tracée dans le code |
| REVIEW | Population | « Le configurateur PUE complet demeure une évolution prévue » : concept futur conservé de la V1 |

## Ajouts MIG-03C-B (`/sentinelle-population`)

| Classe | Portée | Élément |
|---|---|---|
| RECOMPOSITION | Population | Les 10 étapes V1 gardent leur ordre et leur texte, regroupées en quatre actes (I Détecter et comprendre : 1-3 ; II Déterminer qui peut être concerné : 4-5 ; III Informer et suivre : 6-8 ; IV Fermer et apprendre : 9-10) ; l'étape 5 est la section signature dominée par la carte ; une rupture (« Ce qui soutient ce scénario ») sépare le scénario de son cadre ; blocs secondaires regroupés (14 sections au lieu de 20) |
| BLOCKER | Population | Provenance des données visibles dans `sentinelle-population-zone.webp` (utilisée à l'étape 5) : adresse « 1500 Bd de Montarville, Boucherville » de type réel, non confirmée fictive ; à confirmer, remplacer ou assainir avant la mise en ligne |
| REVIEW | Population | Image `alerte.webp` (non utilisée) : numéro `1 800 363-4735` attribué à « Urgence environnementale (MELCCFP) » : ne correspond à aucun numéro officiel (ECCC : 1 800 668-6767 ; Urgence-Environnement Québec : 1 866 694-5454) ; ne jamais publier ; `inscription.webp` : `1 800 555-0100` (fictif) ; `installation.webp` : téléphone `(438) 749-6541`, adresse et code postal |
| DÉCISION | Population | Carte : équivalent textuel en HTML (principe du territoire potentiellement concerné organisé en zones) ; les sigles ZPI / ZPU / ZSE ne sont pas définis (aucune source du projet ni réglementaire vérifiée) |
| DÉCISION | Population | Confidentialité : les affirmations « adresse non conservée » et « les opérateurs ne voient ni coordonnées ni marqueurs » sont retirées (latitude et longitude sont persistées par abonné ; le schéma dit seulement « ne pas conserver l'adresse complète lorsque la position suffit ») |
| DÉCISION | Population | Configurateur PUE : mention de la feuille de route retirée du texte public ; le PUE reste le contexte de planification |
| REVIEW | SEO | Recherche publique : le vocabulaire « plan d'urgence environnemental / PUE / E2 / alerte à la population » est celui utilisé par les sources officielles et l'industrie ; « En Alerte » désigne le système national d'alerte publique (source de confusion, traitée dans la FAQ). Titre et description conservés |

## Décisions finales MIG-03C-D (`/sentinelle-population`)

| Classe | Élément |
|---|---|
| DÉCISION | FR seulement ; scénario V1 et 10 étapes préservés dans l'ordre ; recomposition en quatre actes approuvée et figée |
| DÉCISION | Carte (étape 05) : sens essentiel en HTML ; ZPI / ZPU / ZSE non définis publiquement ; « zones et chiffres illustratifs, pas une analyse d'impact » |
| DÉCISION | Confidentialité : allégations « adresse non conservée » et invisibilité pour les opérateurs retirées (coordonnées persistées par abonné) ; aucune promesse de remplacement |
| DÉCISION | Configurateur PUE : feuille de route retirée du texte public |
| DÉCISION | Canaux directs CORO : SMS et courriel ; sirènes, réseaux sociaux, systèmes municipaux, voix : externes, non activés par CORO ; aucune intégration 911 ni répartition |
| DÉCISION | Préparer / Alerter / Documenter : conservés (préparation scénarios-zones-messages ; flux d'alerte approuvé-figé-envoyé ; historique et rapport de preuve) |
| BLOCKER | Adresse d'apparence réelle (Boucherville) dans `sentinelle-population-zone.webp`, utilisée à l'étape 05 |
| REVIEW | Numéro `1 800 363-4735` (image non utilisée `alerte.webp`) : ne correspond à aucun numéro officiel ; ne jamais publier |
| NON AUDITÉ | Rétention, multi-site, seuils de substances, autorités : NOT VERIFIED, non publiés |
| RECAPTURE | Aucune capture réelle : remplacer les interfaces générées avant la mise en ligne |

## MIG-03C-E — Go-Live `/sentinelle-population`

| Classe | Élément |
|---|---|
| PUBLICATION-BLOCKER | Étape 05, `sentinelle-population-zone.webp` : adresse d'apparence réelle de Boucherville (1500 Bd de Montarville) visible ; REPLACE OR SANITIZE BEFORE GO-LIVE. Pas un MIGRATION-BLOCKER : l'image reste dans la branche |
| PUBLICATION-REVIEW | Données de démonstration non confirmées fictives dans les images utilisées (« Prémont », « Martin Gagnon », 12 400 / 48 890 / 28 500 personnes, zones 1-3-5 km, exemples d'établissements sensibles) |
| DO NOT PUBLISH | `sentinelle-population-alerte.webp` (numéro 1 800 363-4735 douteux) : non rendue, hors métadonnées, conservée sur disque pour l'historique ; les images `installation` (téléphone, adresse) et `inscription` (1 800 555-0100) non utilisées |
| APPROVED | Scénario V1, 10 étapes, quatre actes, FR seulement, canaux directs SMS + courriel, équivalent textuel de la carte, feuille de route du configurateur PUE retirée, allégation d'adresse non conservée retirée, séparation Sentinelle / Population, Préparer-Alerter-Documenter |
| DÉFÉRÉ | Audit produit autorités, premiers répondants, rétention, multi-site, seuils : aucune allégation publique ; NOT REQUIRED FOR MIGRATION |

Détail complet (matrice des 19 assets, données, canaux, réglementaire, capacités) : `MIG-03C-SENTINELLE-POPULATION-GATE.md`.

Gate avant Incident (frontières, transmission, Go-Live consolidé) : `MIG-03-PRE-INCIDENT-GATE.md`.

Audit MIG-03D (stade A) : `MIG-03D-INCIDENT-AUDIT.md`.

## MIG-03D — `/coro-incident` (page neuve)
| Classe | Élément |
|---|---|
| DÉCISION | FR seulement (`englishAvailable={false}`) ; route implémentée, sitemap FR seul, registre V2 |
| PUBLICATION-BLOCKER | `alert/fiche_intervention.webp` (preuve de la section 05) : adresse d'apparence réelle (1200 boul. Robert-Bourassa, Montréal) et détails de site ; SANITIZE OR RECAPTURE BEFORE GO-LIVE |
| DÉCISION | Lien d'intervention sécurisé : valide tant que l'incident est actif ; aucune durée ni révocation revendiquée ; aucun « QR » revendiqué |
| EXCLU | Pont PAI (PARTIAL), voix, notification d'application, 911 et répartition, normes et conformité, conservation, codes de procédure, heures inventées |
| RECAPTURE | Aucune capture actuelle du journal ni du détail d'incident |
| REVIEW | Hero `first-responders-arrival.webp` : QR et texte illustratifs, partiellement rognés ; rapport PDF : sections 4 et 7 non relues |

## MIG-03D-C — Incident visual assets

Three marketing illustrations (`alt=""`, decorative, no cartouche, no caption) placed in `/coro-incident`; the real proof `fiche_intervention.webp` and the timeline are unchanged.

- `incident-building.webp` — full-width 21:9 band opening section 01 (event). Shows fire crews on site; does not imply CORO dispatched them.
- `incident-command.webp` — section 03, dominant 4-8 split (8 columns of image).
- `normal-operations.webp` — full-width 16:9 closing band of section 07, before complementary capabilities.

REVIEW (baked text in the illustrations, not product proof): command image shows an illustrated screen with "Services d’urgence avisés" and "Caméra en direct" (invented UI, not CORO); normal-operations shows CORO-branded illustrated screens ("Le continuum CORO", "Projet clôturé"); building has a fictional sign "Tour Prémont" and a garbled vehicle lettering. Decision pending for human review; none was judged a blocking factual contradiction.

## MIG-03D-D — Final SEO and commit gate

**Illustrations** (classification MARKETING ILLUSTRATION; decorative, `alt=""`, not product proof):

| File | Note |
|---|---|
| `incident-building.webp` | Event context; fictional sign "Tour Prémont"; no product content. |
| `incident-command.webp` | Contains illustrative emergency-service wording ("Services d’urgence avisés", "Caméra en direct") on an illustrated screen; not CORO UI. |
| `normal-operations.webp` | Contains illustrative CORO-like screens; not real UI. |

None is a publication blocker unless a new contradiction appears.

**PUBLICATION-BLOCKER (kept):** `alert/fiche_intervention.webp` shows a real-looking address (1200 boul. Robert-Bourassa, Montréal) → SANITIZE OR RECAPTURE BEFORE GO-LIVE.

**SEO:** targeted research done (FR Québec terms + EN terminology). Result: KEEP title and description. The FR SERP for "gestion incident" is dominated by IT/EHS incident tools; Québec institutional vocabulary is "mesures d’urgence", "intervention d’urgence", "coordination". Current title/description already carry incident, activation, chronologie, rapport, équipe d’urgence, intervenants. No volume or ranking is claimed.

**Copy:** "Personnes inscrites comme présentes" is correct (no physical-detection claim). One FAQ answer said "Les employés présents"; changed to "inscrits comme présents" for consistency.

## MIG-03D-E — Contextual resources (Incident) and global rule

Rule added to `04-quality/QA-ACCEPTANCE-CHECKLIST.md` (« Editorial resource discovery »).

Blog inventory: 56 published articles from `GET https://api.getcoro.io/api/blog/public` (2026-09-26). None is dedicated to incident management, incident log, incident report or after-action review; the closest are emergency-team, exercise and gap-analysis articles. All candidates below answer 200 on `getcoro.io/blog/<slug>` and have a French and an English version.

| Article | URL | Topic | Relation to Incident | Status | Decision |
|---|---|---|---|---|---|
| Équipe d’urgence : qui est réellement disponible dans le bâtiment | `/blog/equipe-urgence-disponible-batiment` | Disponibilité réelle de l’équipe | Équipe mobilisable et personnes inscrites comme présentes (sections 02, 03) | published | LINK |
| Exercice sur table : tester un plan d’urgence | `/blog/exercice-sur-table-tester-plan-urgence` | Exercices | Mode exercice ; répétition des décisions et communications | published | LINK |
| Comment identifier les lacunes dans son organisation des mesures d’urgence | `/blog/identifier-lacunes-organisation-mesures-urgence` | Écarts, retour d’expérience, actions correctives | Section 07 (REX, actions correctives) | published | LINK |
| Comment savoir si tout le monde a évacué un bâtiment | `/blog/savoir-si-tout-le-monde-a-evacue-batiment` | Évacuation, décompte | Territoire Sentinelle (déjà lié depuis `/sentinelle`) ; contenu incorporant du CSS | published | DO NOT LINK |
| Comment savoir si son équipe d’urgence est réellement opérationnelle | `/blog/equipe-urgence-reellement-operationnelle` | Équipe d’urgence | Recouvre l’article retenu sur l’équipe disponible | published | DO NOT LINK (doublon) |
| Comment tester un plan de mesures d’urgence par un exercice | `/blog/comment-tester-plan-mesures-urgence-exercice` | Exercices | Recouvre l’exercice sur table | published | DO NOT LINK (doublon) |
| Qui est responsable du plan de mesures d’urgence | `/blog/responsable-plan-mesures-urgence-entreprise` | Gouvernance du PMU | Lien faible (rôle documentaire, pas l’incident) | published | DO NOT LINK |
| Articles PMU / PSI / PCA / résilience organisationnelle | divers | Documents et cadre | Territoire des pages documentaires et Résilience | published | DO NOT LINK |

Integration: a restrained ruled list « Approfondir la préparation à l’incident. » (3 articles, real titles, one-line reason) between the ecosystem section and the FAQ. Inline links evaluated and not added: each candidate is already in the resource list, so an inline copy would duplicate it. The heading says « préparation à l’incident » rather than « gestion des incidents » because the articles cover preparation, not incident handling.

Backlog for already-migrated pages (inventory only, nothing modified):

| Page | Resource opportunity? | Existing relevant content | Recommended future action |
|---|---|---|---|
| `/about` | Low | None specific | None |
| `/contact` | No | None | None |
| `/partners` | Low | `gerer-mandats-mesures-urgence`, `mesurer-performance-rentabilite-mandats` (consultants) | Decide with the partners audience; probably none |
| `/programme-recommandation` | No | None | None |
| `/gestion-documentaire` | Yes | `controle-versions-pmu-psi-pca`, `centraliser-gerer-documents-conformite-organisation`, `pourquoi-les-plans-urgence-deviennent-rapidement-desuets`, `frequence-mise-a-jour-plan-mesures-urgence-pmu` | Retrofit 3 to 4 |
| `/gestion-de-projets` | Yes | `gerer-mandats-mesures-urgence`, `mesurer-performance-rentabilite-mandats` | Retrofit 1 to 2 |
| `/performance-objectifs` | Yes | `mesurer-performance-rentabilite-mandats`, `gerer-mandats-mesures-urgence` | Retrofit 1 to 2 (avoid duplicating gestion-de-projets) |
| `/portail-client` | Yes | `simplifier-revision-approbation-documents-clients`, `coro-sur-mobile-vos-projets-documents-et-clients-accessibles-partout` | Retrofit 1 to 2 |
| `/resilience-operationnelle` | Yes | `indicateurs-resilience-kpi-preparation-organisation`, `resilience-operationnelle-mesurer-capacite-organisation-urgence`, `conformite-resilience-operationnelle-pmu`, `plan-urgence-formation-exercice-preparation-organisation`, `mesurer-niveau-preparation-batiment-urgence` | Retrofit 3 to 5 (strongest opportunity) |
| `/sentinelle` | Already done | 8 Sentinelle articles already linked (all verified in the API) | Optional review of the list only |
| `/sentinelle-population` | Unclear | No article on population alert or PUE beyond `obligations-plan-mesures-urgence-entreprise-quebec` (PUE tag only) | Check relevance before any link; likely none |
| `/coro-incident` | Done (MIG-03D-E) | 3 articles linked | None |

## MIG-03 — Final gate

Gel de la famille opérationnelle (Résilience, Sentinelle, Population, Incident) : matrice des frontières, recouvrements, signatures visuelles, langues, SEO, liens internes, données structurées, registre Go-Live consolidé, backlogs éditoriaux et dette d'accessibilité : `MIG-03-FINAL-GATE.md`. Résultat : PASS, aucun BOUNDARY CONFLICT, aucun changement runtime.
