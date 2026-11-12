# Réconciliation des événements

## Constats

Le lot est authentifié par challenge signé, limité à 100 événements et valide séquence, chaînage et hachage. PostgreSQL utilise `createMany(...skipDuplicates)` et classe les entrées `HISTORICAL_DEVICE_DECLARATION`.

## Tests

Authentification M2M, nonce, replay et isolation: couverts par les tests Gateway/PG PASS. Le Player retire `reconciledAt`, envoie les pending et acquitte les IDs acceptés.

## Limites

La première entrée d'un lot n'est pas ancrée à une dernière séquence/hash acceptée côté serveur; la continuité inter-lots n'est donc pas démontrée. Réponse perdue et concurrence multi-processus du journal n'ont pas de preuve dédiée. Verdict: GO partiel, réserve élevée.
