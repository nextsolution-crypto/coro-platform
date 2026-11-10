# DISPLAY-05A-INTEGRATION — PostgreSQL

## Environnement

PostgreSQL `16-alpine` jetable, lié uniquement à `127.0.0.1:55456`, base synthétique `coro_display_integration`. Aucun environnement partagé n'a été consulté ou migré.

## Migrations

- `prisma validate` : PASS.
- `prisma generate` : PASS.
- Première passe `migrate deploy` : 179 migrations appliquées.
- Seconde passe : aucune migration en attente.
- `migrate status` : schéma à jour.

## Tests réels

Création d'organisations, bâtiments, étages, emplacements, sources, publications et événements; permissions, portée tenant/bâtiment, brouillons, cycle complet, preuves, verrous, concurrence, suspension, reprise, révocation, historique, pagination et filtres : PASS.

## Nettoyage

Le conteneur exact `coro-display-05a-integration-pg` est supprimé après validation. Aucune donnée réelle n'y était présente.
