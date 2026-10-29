# Lot de correction proposé — Activités

Ce document est une proposition; aucune correction produit n'est incluse dans l'audit.

## Lot A — Autorité canonique (bloquant)

1. Faire accepter `AdviserActor` à `updateActivity`, `deleteActivity`, `duplicateActivities`, `downloadIcs` et `getClientPortfolio`.
2. Résoudre l'activité par relation projet et `projectAccessWhere(actor)`; appliquer séparément identité, portée, permission et état métier.
3. Utiliser `mutableProjectAccessWhere` pour les mutations lorsque la politique documentaire/projet l'exige.
4. Ajouter des tests PostgreSQL à deux organisations et deux opérateurs d'une même organisation, avec refus sans effet secondaire.

Critère de sortie : un ID connu ne permet ni lecture, ni ICS, ni écriture hors affectation; les accès admin légitimes restent fonctionnels.

## Lot B — Agrégation fiable

Créer un endpoint portefeuille serveur paginé, filtré et trié de façon déterministe. Retourner `total`, `page`, `pageSize`, fraîcheur et état d'exhaustivité. Éliminer le fan-out de 200 projets et les erreurs silencieuses.

Critère de sortie : les compteurs correspondent à PostgreSQL sur plus de 200 projets et une panne partielle ne produit jamais un faux résultat complet.

## Lot C — UX, erreurs et ICS

Valider `response.ok`/MIME avant téléchargement ICS; afficher les erreurs et un retry. Distinguer vide réel, absence d'autorisation et indisponibilité.

## Lot D — QA intégrée

Étendre le harnais global existant avec le frontend organisation, ports dynamiques et readiness. Exécuter la matrice 12/12, clavier/focus/zoom et la chaîne réservation→outbox→fournisseur simulé→reprise/déduplication.

## Hors lot / décision

Décider si « Activités » signifie planning de prestations ou fil d'interactions conseiller↔client. Un éventuel fil doit réutiliser les audits/outbox canoniques et ne pas créer une autorité parallèle.
