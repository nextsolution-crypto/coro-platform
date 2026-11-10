# DISPLAY-04A-REVIEW — PostgreSQL

## Observations

La migration additive crée une table de jobs liée par clés composites à la publication, à l'organisation et au bâtiment. L'unicité `(publicationId, requestId)` porte l'idempotence.

Deux défauts ont été relevés : aucun heartbeat pendant le rendu et un job abandonné à la troisième tentative pouvait rester éternellement `PROCESSING`.

## Preuves

- PostgreSQL : image `postgres:16-alpine`, base locale jetable, aucune base partagée.
- 179 migrations appliquées depuis zéro : PASS.
- Simulation de la tête précédente par retrait contrôlé de la seule migration 04A puis `migrate deploy` : PASS.
- Test réel de contraintes : DPI 301 refusé par PostgreSQL.
- Deux réservations concurrentes : exactement une obtient le job.
- Collision de clé d'idempotence : refusée.

## Tests

`display-pdf-worker.postgres-spec.ts` couvre : réservation atomique, reprise après crash, maximum de tentatives, contrainte DPI, révocation pendant conversion et absence de publication.

Les tests DISPLAY-03 et `spatial-foundations.postgres-spec.ts` passent sur la même base jetable : 4/4 scénarios additionnels PASS.

## Corrections

- Heartbeat toutes les 15 secondes pendant l'attente du rasteriseur.
- Baux expirés avec `attempts >= 3` terminés en `FAILED/LEASE_EXHAUSTED`.
- Autorité documentaire revérifiée après rendu et dans la transaction finale.
- La clause finale inclut `projectFileId`, source SHA/version et lock optimiste.

## Risques résiduels

La rétention/purge des jobs terminés n'est pas encore implémentée. Elle doit être ajoutée comme maintenance bornée et auditée, sans suppression des preuves nécessaires. La perte du processus après stockage mais avant commit peut laisser un objet privé orphelin; il n'est pas publiable, mais un inventaire de réconciliation sera requis.
