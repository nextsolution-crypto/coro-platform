# Télémétrie

## Constats

Heartbeat et télémétrie sont authentifiés, limités au device et persistés avec organisation/bâtiment. Le serveur répond explicitement `physicalDisplayProof: false` et classe les valeurs comme déclarées.

## Tests

Heartbeat E2E, tenant synthétique et supervision PostgreSQL: PASS. Données anciennes/étrangères couvertes par nonce, signature et portée. Observation physique indépendante: NOT_VERIFIED.

## Risque

Un appareil compromis mais détenteur de sa clé peut mentir sur son affichage. Le Display Manager ne doit jamais convertir heartbeat en preuve physique.
