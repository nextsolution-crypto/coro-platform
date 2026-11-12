# Dépendances

## Constat

La dette dev doit être séparée de l'exposition runtime.

## Correction

Audits runtime et complet sont rapportés séparément, sans mise à jour transitive risquée hors périmètre.

## Preuve et tests

Runtime backend: 0 vulnérabilité. Installation backend: 30 vulnérabilités dev (4 low, 23 moderate, 3 high); portail: 8 moderate dev.

## Résultat et risque résiduel

PASS runtime; dette dev à traiter avec non-régression dédiée.
