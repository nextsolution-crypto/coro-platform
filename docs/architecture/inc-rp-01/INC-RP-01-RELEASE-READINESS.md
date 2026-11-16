# INC-RP-01 — Préparation de livraison

## Périmètre candidat

- contrats Lot 0 et inventaire Lot 0A;
- modèles Prisma, migration additive et permissions Lot 1;
- feature flag serveur désactivé;
- tests de structure et de non-attribution implicite.

## Gates avant merge

CI terminale du HEAD exact, revue sécurité, migration depuis zéro et tête
réelle, absence de conflit de migration, diff complet et approbations GitHub.

## Gates avant release future

Sauvegarde distante/restauration, capacité, verrou, candidat immuable,
compatibilité rollback, inspection et réconciliation PostgreSQL. Le flag reste
`false`; aucune fonctionnalité utilisateur ne doit apparaître.

## Verdict provisoire

`GO WITH RESTRICTIONS` pour soumettre le Lot 1 à revue. `NO-GO` pour activer le
moteur, importer des données RP ou exposer des routes avant les lots suivants.
