# Constats — génération documentaire

## DG-001 — Régénération d'un projet archivé

**Statut : CONFIRMED / BLOCKING**

Le prédicat `projectAccessWhere` vérifie l'organisation et l'affectation, mais pas `status != ARCHIVED`. Le test PostgreSQL génère avec succès un document pour un projet `ARCHIVED` et replace ensuite le projet à `IN_PROGRESS`.

**Impact :** contournement de la règle d'archive, mutation d'un dossier supposé figé et risque d'altération du contenu historique.

**Condition de levée :** refuser explicitement la génération et la régénération lorsque `status=ARCHIVED`, avant toute lecture de contenu ou écriture.

## DG-002 — Génération d'un projet désactivé

**Statut : CONFIRMED / BLOCKING**

Un projet `isActive=false` demeure accessible au générateur dès lors que l'acteur satisfait le prédicat d'affectation.

**Impact :** une ressource désactivée peut être réactivée fonctionnellement et mutée par la génération.

**Condition de levée :** intégrer `isActive=true` au contrôle canonique de l'opération de génération.

## DG-003 — Écritures non transactionnelles

**Statut : CONFIRMED / BLOCKING**

Le document est créé/mis à jour avant la mise à jour du projet. Une panne synthétique de `project.update` laisse un document en base alors que le projet reste `DRAFT`, progression 0.

**Impact :** faux état, reprise ambiguë, éditeur potentiellement disponible malgré une progression incohérente.

**Condition de levée :** transaction Prisma unique couvrant la sélection verrouillée, l'upsert du document et la transition du projet; retour d'erreur sans état partiel.

## DG-004 — Double génération concurrente

**Statut : CONFIRMED / BLOCKING**

`Document.projectId` n'est pas unique. Deux appels simultanés sur un projet sans document ont créé deux lignes `Document`.

**Impact :** `findFirst` devient non déterministe, versions divergentes et risque d'éditer/exporter un document différent de celui attendu.

**Condition de levée :** autorité documentaire unique par projet, contrainte de base, upsert transactionnel, idempotence et test de concurrence.

## DG-005 — Validation dérivée insuffisamment scoped

**Statut : CONFIRMED_BY_CODE / HIGH**

`GET /generator/validate/:projectId` appelle `ValidationService.validate(projectId, organizationId)`. Le service ne vérifie pas l'affectation OPERATOR canonique et peut retourner des constats sur un projet du même tenant non affecté.

**Impact :** fuite de métadonnées documentaires et de configuration au sein d'une organisation.

**Condition de levée :** transmettre l'acteur complet et appliquer `projectAccessWhere` avant toute lecture du document ou de `PcaConfig`.

## DG-006 — Absence de suivi persistant et de corrélation

**Statut : CONFIRMED / MEDIUM**

La génération est synchrone. L'interface ne possède qu'un booléen local `generating`; aucune tentative, erreur, corrélation ou étape n'est persistée.

**Impact :** après F5, timeout ou interruption réseau, l'utilisateur ne peut distinguer échec, succès tardif ou état partiel.

**Condition de levée :** soit rendre l'opération strictement atomique et idempotente avec réponse corrélée, soit introduire une tentative persistée gouvernée. Un deuxième système de jobs n'est pas requis si l'atomicité synchrone suffit.

## DG-007 — Corps legacy non typé

**Statut : CONFIRMED_BY_CODE / MEDIUM**

Le contrôleur accepte `config: any` et le body devient la source de génération lorsqu'aucun `configData` persisté n'existe.

**Impact :** valeurs mal formées ou inattendues dans les projets historiques, diagnostics imprécis.

**Condition de levée :** DTO/version de configuration, validation stricte et migration explicite des anciens projets.

## DG-008 — UX d'erreur et mobile non démontrée

**Statut : NOT_VERIFIED / MEDIUM**

Le toast ne fournit qu'un message générique. Les bandeaux d'action n'ont pas de comportement mobile explicitement adapté, et aucune preuve navigateur traçable au SHA n'a été produite.

**Condition de levée :** recette Chrome sur 320/390/768/1440 avec erreur synthétique, F5, texte long, double onglet et mesures de débordement.

## Réconciliation du candidat corrigé — 2026-10-28

| Constat | Statut candidat | Preuve |
|---|---|---|
| DG-001 archive | CORRECTED / PASS | HTTP 409, zéro `Document` et zéro demande persistée; lecture de l'archive conservée. |
| DG-002 projet inactif | CORRECTED / PASS | HTTP 409, zéro effet secondaire. |
| DG-003 écritures partielles | CORRECTED / PASS | Défaillance PostgreSQL injectée sur la transition projet; transaction entièrement annulée. |
| DG-004 concurrence | CORRECTED / PASS | Verrou transactionnel PostgreSQL, version attendue et clé idempotente; un succès/un conflit, une seule ligne `Document`. |
| DG-005 validation | CORRECTED / PASS | Acteur complet et `projectAccessWhere`; opérateur non affecté refusé sans résultat dérivé. |
| DG-006 reprise/corrélation | CORRECTED_FOR_SYNCHRONOUS_FLOW | `DocumentGenerationRequest` corrèle acteur, tenant, charge, version et résultat; une réponse perdue rejoue le même résultat. Aucun second système de jobs. |
| DG-007 body legacy | PARTIAL / OPEN | La génération privilégie la configuration persistée, mais le DTO legacy complet demeure hors de ce lot. |
| DG-008 UX/browser | CORRECTED / PASS | Chrome authentifié 12/12, F5 PSI/PCA, refus archive explicite, aucune erreur console critique. |

La migration est additive. Elle ne modifie ni ne supprime les anciens documents et échoue explicitement lorsqu'un projet possède déjà plusieurs lignes `Document`; leur inventaire/remédiation reste un chantier distinct.
