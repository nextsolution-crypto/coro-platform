# Display Manager

## Constats

Les services exposent appareil, organisation, bâtiment, emplacement, statut, heartbeat, synchronisation, version, mode et erreurs. Les permissions et portées bâtiment ont des tests unitaires/PostgreSQL.

## Tests

Administrateur autorisé/refusé, périmètre étranger et appareil révoqué: PASS automatisé pertinent. L'E2E persiste le heartbeat et confirme `supervisionVerified: true` au sens serveur.

## Limite

La recette manuelle authentifiée de l'interface Manager n'a pas été exécutée dans cette revue: **NOT_VERIFIED**. Aucun PASS visuel n'est inventé.
