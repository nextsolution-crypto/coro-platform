# DISPLAY-02A-REVIEW — Migration

## Migration examinée

`20261129010000_coro_display_spatial_foundations`

La migration est additive : deux enums, deux colonnes non nulles avec tableaux vides par défaut, trois tables, index, contraintes CHECK et clés étrangères. Elle ne supprime ni ne transforme aucune donnée existante.

## Chronologie

Le dernier `origin/main` vérifié se termine à `20261128010000_sentinelle_presence_integrity_finalize`. Le nom `20261129010000_coro_display_spatial_foundations` reste chronologiquement disponible et ne collisionne avec aucune migration distante observée. Aucun renommage n'est justifié.

## Intégrité

- Les clés composites lient chaque étage, zone et emplacement à la même organisation et au même bâtiment.
- La zone facultative d'un emplacement est liée au même étage par une FK composite.
- Les suppressions sont `RESTRICT`; l'API ne propose que l'archivage logique.
- Les coordonnées, paires X/Y, angles, niveaux et versions sont contrôlés en SQL.
- Les anciennes applications peuvent ignorer les nouvelles tables et colonnes.

## Preuve PostgreSQL

Un conteneur PostgreSQL 16 Alpine jetable, base locale `displayreview`, a reçu les 177 migrations depuis zéro. `prisma migrate status` a déclaré le schéma à jour. Le test PostgreSQL a ensuite validé création, hiérarchie, permissions, audit, pagination, parent inactif et rejet d'une FK inter-tenant.

## Risques et rollback

Un rollback applicatif vers le backend antérieur reste compatible tant qu'un lot futur ne dépend pas des nouvelles données. La suppression automatique des tables ou enums n'est pas un rollback sûr après usage et n'est pas proposée.
