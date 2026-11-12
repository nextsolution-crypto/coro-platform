# Télémétrie

## Constats

La télémétrie est signée, liée à un nonce et journalisée comme `TELEMETRY_DECLARED`. La réponse précise `DECLARED_NOT_PHYSICALLY_VERIFIED`; elle ne crée pas d’état ONLINE.

## Tests et limites

Rejeu et signature falsifiée sont refusés. Les erreurs sont bornées. Il n’existe pas de heartbeat dédié, de politique de fraîcheur centralisée ni d’émission réelle depuis l’exécutable connecté.
