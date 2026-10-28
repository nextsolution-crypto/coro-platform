# Constats — révision et approbation documentaire

Baseline commune : `fbccdd1c2618a42d967188edbb808eda590e35bf`,
PostgreSQL 16 jetable, 159 migrations, données synthétiques.

## REVIEW-001 — Approbation non liée au contenu révisé

- **Catégorie / gravité :** intégrité, **CRITICAL**
- **Statut :** FAIL
- **Reproduction :** soumettre un PMU, modifier son `Document.content`, puis
  approuver avec un second administrateur.
- **Attendu :** la décision référence une version immuable ou une empreinte du
  contenu effectivement examiné; tout changement invalide la soumission.
- **Observé :** l'approbation réussit. Le snapshot contient uniquement le numéro
  et les métadonnées de décision.
- **Impact :** une approbation peut couvrir silencieusement un contenu différent.
- **Code :** `approval.service.ts:121-151`; `ProjectVersion` dans
  `schema.prisma:2871-2883`.
- **Preuve :** test PostgreSQL
  `approval-workflow.postgres-audit-spec.ts` et test REVIEW-006.
- **Correction proposée :** matérialiser une révision soumise avec
  `documentId`, `documentVersion`, `lockVersion`, SHA-256 et statut; approuver
  par comparaison transactionnelle de cette identité.
- **Recette :** toute modification ou restauration après soumission produit un
  conflit et exige une nouvelle soumission.

## REVIEW-002 — Décision et version non atomiques

- **Catégorie / gravité :** concurrence et intégrité, **CRITICAL**
- **Statut :** FAIL
- **Reproduction :** injecter l'échec de `project.update` après succès de
  `projectVersion.create`.
- **Attendu :** aucune version n'existe si la transition de décision échoue.
- **Observé :** la version est créée puis l'appel échoue; aucune transaction
  Prisma n'encadre la séquence.
- **Impact :** version orpheline, numérotation conflictuelle, reprise ambiguë et
  double décision possible sous concurrence.
- **Code :** `approval.service.ts:121-175`.
- **Preuve :** test REVIEW-005 (version créée, transaction absente).
- **Correction proposée :** transaction PostgreSQL avec verrou du projet,
  transition conditionnelle `REVIEW`, unicité/idempotency key et journal dans
  la même transaction.
- **Recette :** approbations concurrentes et approbation/retour concurrent
  produisent une seule décision ou un conflit explicite, sans artefact partiel.

## REVIEW-003 — Observations sans autorité projet

- **Catégorie / gravité :** autorisation, **HIGH**
- **Statut :** FAIL
- **Rôle :** `OPERATOR` même organisation, non affecté.
- **Reproduction :** appeler l'ajout d'observation avec l'identifiant connu du
  projet affecté à un autre opérateur.
- **Attendu :** contrôle `projectAccessWhere` et permission de révision avant
  toute lecture ou mutation.
- **Observé :** observation persistée. Lecture, mise à jour et suppression ne
  filtrent que par `organizationId`.
- **Impact :** fuite de commentaires et altération de la piste de révision au
  sein d'une organisation.
- **Code :** `approval.service.ts:293-379`; contrôleur `:78-117`.
- **Preuve :** REVIEW-003 unitaire et scénario PostgreSQL réel.
- **Correction proposée :** résoudre le projet parent côté serveur et appliquer
  autorité canonique + permission par action; ne révéler aucune métadonnée au
  refus.
- **Recette :** opérateur non affecté, autre organisation, projet archivé et
  identifiant substitué refusés sans écriture.

## REVIEW-004 — Projet archivé soumis à nouveau

- **Catégorie / gravité :** cycle de vie, **HIGH**
- **Statut :** FAIL
- **Reproduction :** définir un projet synthétique `ARCHIVED`, puis appeler
  `submit` avec son auteur affecté.
- **Attendu :** consultation permise selon politique; mutation refusée.
- **Observé :** état `ARCHIVED → REVIEW`, `progress=50`.
- **Code :** `approval.service.ts:28-67`, qui emploie `projectAccessWhere` et non
  le prédicat mutable.
- **Preuve :** REVIEW-002 unitaire et scénario PostgreSQL réel.
- **Correction proposée :** transition explicite autorisée uniquement depuis
  les états convenus et projet actif.
- **Recette :** `ARCHIVED` et `isActive=false` refusés sans notification.

## REVIEW-005 — Aide `canApprove` incohérente avec l'autorité serveur

- **Catégorie / gravité :** autorisation/UX, **HIGH**
- **Statut :** FAIL
- **Reproduction :** interroger `canApprove` comme `OPERATOR` non soumetteur.
- **Observé :** `true`; le POST `approve` refuse ensuite ce rôle.
- **Impact :** exposition d'actions non autorisées et expérience trompeuse.
- **Code :** `approval.service.ts:405-426`; frontend
  `projects/[id]/page.tsx:198-207,786,898`.
- **Correction proposée :** utiliser la même fonction d'autorité complète pour
  capacité et mutation, incluant rôle et portée projet.

## REVIEW-006 — Aide `canEdit` ignore portée et état final

- **Catégorie / gravité :** autorisation/UX, **HIGH**
- **Statut :** FAIL
- **Observé :** un projet archivé même organisation est déclaré modifiable; la
  fonction ne reçoit pas le rôle et n'applique pas l'affectation.
- **Code :** `approval.service.ts:384-403`.
- **Correction proposée :** dériver la capacité du service d'intégrité canonique
  et du prédicat mutable.

## REVIEW-007 — Rejet et retour non distingués; motif serveur facultatif

- **Catégorie / gravité :** règle métier / traçabilité, **MEDIUM**
- **Statut :** DÉCISION_PRODUIT_REQUISE
- **Observé :** les deux actions UI appellent `request-revision`; le navigateur
  impose le motif pour « rejet », mais l'API l'accepte vide.
- **Code :** frontend `page.tsx:327-338,1522-1576`; backend
  `approval.service.ts:241-289`.
- **Impact :** impossible de distinguer rejet, correction et réouverture dans
  l'historique.
- **Décision requise :** définir les décisions officielles, leur motif obligatoire
  et les transitions.

## REVIEW-008 — Piste d'audit incomplète et non atomique

- **Catégorie / gravité :** audit, **HIGH**
- **Statut :** FAIL
- **Observé :** seul `approve` appelle explicitement `AuditService`; cet appel
  survient après la mutation du service. Soumission, retour et CRUD observations
  n'ont pas d'événement canonique équivalent.
- **Code :** `approval.controller.ts:30-52`.
- **Impact :** décision persistée avec réponse en erreur si l'audit échoue;
  transitions importantes non corrélées à document/version/motif.
- **Correction proposée :** événement typé dans la transaction métier, avec
  état précédent/nouveau, acteur serveur, document/version et corrélation.

## REVIEW-009 — Effets secondaires non durables et message prématuré

- **Catégorie / gravité :** reprise, **MEDIUM**
- **Statut :** FAIL
- **Observé :** PDF, notifications et courriels sont fire-and-forget sans outbox.
  Le message d'approbation annonce que l'export PDF est disponible avant la fin
  de sa génération.
- **Code :** `approval.service.ts:177-234,455-518`.
- **Impact :** perte silencieuse après redémarrage, doublons lors de reprises
  externes, promesse UX fausse.
- **Correction proposée :** outbox/job idempotent; statut PDF séparé; notification
  de disponibilité uniquement après stockage confirmé.

## REVIEW-010 — Affectation du réviseur absente

- **Catégorie / gravité :** gouvernance, **MEDIUM**
- **Statut :** DÉCISION_PRODUIT_REQUISE
- **Observé :** aucune entité de demande/affectation; tous les ADMIN/SUPER_ADMIN
  de l'organisation peuvent décider. Aucun lecteur seul n'existe dans ce modèle.
- **Décision requise :** confirmer si l'approbateur est un rôle global ou une
  affectation explicite par document/version, et définir le multi-réviseur.

## REVIEW-011 — Responsive et accessibilité non démontrés

- **Catégorie / gravité :** UX, **MEDIUM**
- **Statut :** NOT_VERIFIED
- **Observé :** aucune campagne Chrome authentifiée complète n'a été déclarée.
- **Critère de recette :** 4 viewports × thèmes disponibles, clavier, focus,
  erreurs/conflits, zoom 200 %; lecteur d'écran réel séparément.
