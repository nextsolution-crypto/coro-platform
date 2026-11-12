# Cloisonnement multitenant

## Constats

Le Gateway dérive la portée de l’appareil authentifié et filtre affectation/publication/rendu. La migration corrective ferme les substitutions de localisation et d’organisation au niveau PostgreSQL.

## Tests

Deux organisations synthétiques suffisent au test DB de substitution; les tests existants couvrent les substitutions de manifeste/cache. Le mandat demandait trois organisations : le troisième scénario reste couvert logiquement mais pas matérialisé dans ce test DB.

## Risque résiduel

La supervision retourne uniquement les bâtiments affectés. L’absence d’API administrative gouvernée empêche de valider le cycle complet d’affectation multitenant.
