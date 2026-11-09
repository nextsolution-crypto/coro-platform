# DISPLAY-02A — Rapport de migration

## Migration

`20261129010000_coro_display_spatial_foundations`

La migration est additive : deux enums, deux colonnes de permissions vides, trois tables, indexes, CHECK et clés étrangères. Elle ne supprime ni ne renomme aucune colonne historique et ne modifie pas `Building.floors`.

## Exécution isolée

Environnement : conteneur local jetable `coro-display02a-postgres`, PostgreSQL 16 Alpine, base `display02a`, exposée uniquement sur `127.0.0.1:55442`. Aucune variable ni donnée de production n’a été utilisée.

Résultat : 177/177 migrations appliquées depuis zéro; `prisma migrate status` a déclaré la base à jour. Le test PostgreSQL intégré a ensuite réussi.

## Vérification de dérive

La comparaison schéma/base révèle des divergences historiques préexistantes sur plusieurs anciennes migrations (noms tronqués, contraintes SQL non représentées et colonnes générées). Le seul nom d’index DISPLAY-02A dépassant la limite PostgreSQL a été raccourci explicitement dans le schéma et la migration. Aucun correctif aux divergences historiques n’est inclus dans ce lot.

## Compatibilité et rollback

L’application ancienne ignore les nouvelles tables/colonnes. Un rollback applicatif est donc compatible tant qu’aucun futur lot n’a commencé à dépendre des données spatiales. La suppression des tables/enums n’est pas proposée comme rollback automatique : elle pourrait devenir destructive après utilisation et devra faire l’objet d’une décision gouvernée.

## Production

Migration de base partagée : NON EXÉCUTÉE. Déploiement : NON EXÉCUTÉ.
