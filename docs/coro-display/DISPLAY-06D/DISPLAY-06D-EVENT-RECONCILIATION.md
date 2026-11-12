# Réconciliation des événements

`POST /device-gateway/events/reconcile` exige la preuve Ed25519 habituelle, limite chaque lot à 100, vérifie séquences, liens de hash et hash canonique. PostgreSQL utilise l’ID local comme `requestId` unique avec `skipDuplicates`.

Les événements sont marqués `HISTORICAL_DEVICE_DECLARATION`; ils ne remplacent jamais l’état courant. Le Player n’accuse localement que les IDs acceptés. Test d’authentification, ordre et persistance duplicate-safe : PASS.
