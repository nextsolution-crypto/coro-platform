# Monitoring préparé

Surveiller pendant 30 minutes après release puis après fixture : santé/restarts des cinq conteneurs, PostgreSQL/migrations, 5xx backend/portail/Player, latence p95, erreurs d'activation/publication/sync, révocations, worker PDF, stockage et capacité.

Rollback immédiat si : service malsain >5 min, migration en échec, fuite multitenant/permission, publication non approuvée, révocation non effective, 5xx >2 % pendant 5 min ou erreur P0. Aucune alerte de production n'a été créée dans ce mandat.
