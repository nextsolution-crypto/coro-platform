# Lot de correction proposé — révision documentaire

Ce document est une proposition issue de l'audit. Il n'autorise aucune
modification produit.

## Lot 1 — Autorité et états (bloquant)

1. Appliquer l'autorité projet canonique à toutes les routes, capacités et
   observations.
2. Introduire une matrice explicite des transitions; refuser `ARCHIVED` et
   `isActive=false` pour toute mutation.
3. Faire dériver `canEdit` et `canApprove` de la même autorité que les actions.
4. Valider les DTO d'observation, statuts autorisés et permissions par action.

**Sortie :** opérateur non affecté, autre organisation, inactif et projet
archivé refusés sans lecture protégée ni effet secondaire.

## Lot 2 — Révision immuable (bloquant)

1. Créer une identité de soumission liée à `projectId`, `documentId`, version,
   `lockVersion`, SHA-256, soumetteur et horodatage.
2. Empêcher ou invalider la décision si l'un de ces éléments change.
3. Conserver le snapshot approuvé et sa provenance historique.
4. Définir l'effet des changements de configuration canonique et restauration
   de version.

**Sortie :** l'approbateur peut identifier exactement le contenu soumis; une
modification postérieure exige une nouvelle soumission.

## Lot 3 — Transaction, concurrence et reprise (bloquant)

1. Verrouiller le projet/la soumission en transaction PostgreSQL.
2. Effectuer transition conditionnelle, version, décision et audit dans la même
   transaction.
3. Ajouter une clé d'idempotence et une réponse de réconciliation explicite.
4. Tester approbation/approbation, approbation/retour,
   approbation/modification et approbation/archivage concurrents.

**Sortie :** une décision finale unique, aucun numéro/version orphelin, conflit
explicite pour la session obsolète.

## Lot 4 — Gouvernance des décisions (décision produit préalable)

1. Décider : réviseur global ou affectation par soumission.
2. Décider : rejet distinct, retour en correction, réouverture après validation.
3. Définir motif obligatoire, multi-réviseur et quorum éventuel.
4. Définir la complétude par PMU/PSI/PCA et le comportement des documents
   volontairement incomplets.

## Lot 5 — Audit et effets secondaires

1. Événements typés pour soumission, attribution, observation, décision,
   retour, resoumission et annulation.
2. Outbox transactionnelle et jobs idempotents pour notifications/PDF.
3. Ne notifier la disponibilité du PDF qu'après stockage confirmé.
4. Corrélation, tentatives, échec et reprise sans contenu excessif.

## Lot 6 — UX et acceptation

1. Afficher auteur, réviseur/autorité, document/version/hash abrégé, statut,
   date et motif.
2. Expliquer les actions indisponibles et différencier progression/approbation.
3. Conserver la saisie lors d'un conflit et proposer la réconciliation.
4. Exécuter la matrice navigateur 4 viewports × thèmes disponibles, clavier,
   zoom 200 %, puis lecteur d'écran réel si disponible.

## Ordre recommandé

`Lot 4 décisions` → `Lot 1 autorité` → `Lot 2 immutabilité` → `Lot 3 atomicité`
→ `Lot 5 audit/outbox` → `Lot 6 UX/E2E`.

La publication doit rester bloquée tant que les lots 1 à 3 ne sont pas
acceptés sur PostgreSQL réel et API réelles.
