# Multitenant

## Constat
Une actualisation globale des révocations pouvait exposer un autre tenant.

## Correction
La route dérive organisation et bâtiment de l'appareil M2M authentifié; le client ne choisit pas librement le scope.

## Preuve et tests
Tests Gateway/PostgreSQL de mauvais scope et organisation; entrée étrangère non retournée ni réconciliée.

## Résultat et risque résiduel
PASS; pentest externe recommandé avant grande échelle.

