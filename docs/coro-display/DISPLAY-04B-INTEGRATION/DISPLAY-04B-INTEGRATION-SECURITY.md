# Sécurité

- Permissions serveur : PASS; `ADMIN` et `SUPER_ADMIN` sans droits DISPLAY explicites sont refusés.
- Multitenant : PASS; organisation et bâtiment étrangers sont refusés.
- Séparation des rôles : PASS; auto-revue et approbation par le réviseur sont refusées.
- Révocation DISPLAY-03 : PASS et immédiatement effective.
- Intégrité/version périmée : PASS.
- Stockage : privé; aucun document client suivi dans Git.
- Audit npm production : 0 vulnérabilité.
- Scan ciblé de secrets : aucune clé privée ou clé AWS détectée.

Le rasteriseur DISPLAY-04A reste non privilégié, en lecture seule, sans réseau, avec capacités supprimées, `no-new-privileges`, limites CPU/mémoire/PID, tmpfs borné et spool privé. Aucune conversion n'est réintroduite dans le processus HTTP.
