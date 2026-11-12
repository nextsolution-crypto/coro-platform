# Journal et réconciliation

## Constat

Un lot cohérent en interne pouvait former une fourche avec le dernier événement LOCAL accepté.

## Correction

Le premier événement du lot est désormais ancré au dernier événement accepté; une chaîne divergente est refusée avant écriture.

## Preuve et tests

Chaîne valide, duplication, fork, événement étranger, réponse perdue et reprise idempotente sur PostgreSQL.

## Résultat et risque résiduel

PASS transactionnel/multitenant; rotation longue durée à mesurer au pilote.
