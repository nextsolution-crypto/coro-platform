# DISPLAY-02B — Validation de migration

## Migration

`20261129010000_coro_display_spatial_foundations`

La migration reste postérieure à la tête distante observée `20261128010000_sentinelle_presence_integrity_finalize`. Elle n'a pas été appliquée dans un environnement partagé et a donc été complétée avant publication avec `displayBuildingIds`.

## Nature

- Deux enums additifs.
- Deux tableaux de permissions et deux tableaux de bâtiments, non nuls et vides par défaut.
- Trois tables spatiales nouvelles.
- Index, contraintes CHECK et clés étrangères composites.
- Aucune suppression, transformation ou reprise de données historiques.

## Validation réelle

- Prisma validate : PASS.
- Prisma generate : PASS.
- 177 migrations appliquées depuis zéro sur PostgreSQL 16 jetable : PASS.
- `prisma migrate status` : schéma à jour.
- Test PostgreSQL spatial : PASS.

## Rollback

Un backend antérieur peut ignorer les nouvelles colonnes et tables. Une suppression automatique de la migration ou de ses données n'est pas proposée après utilisation.
