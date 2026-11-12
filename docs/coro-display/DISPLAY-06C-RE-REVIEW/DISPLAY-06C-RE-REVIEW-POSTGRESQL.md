# PostgreSQL

- Image : `postgres:16-alpine`.
- Instance jetable : `coro-display-06c-rereview-pg16`, port loopback 55472.
- Base : `coro_display_rereview`; aucune base partagée.
- 185 migrations appliquées avec succès.
- Seconde passe : `No pending migrations to apply` et schéma à jour.
- Les tests couvrent consommation atomique d’invitation/nonce, contraintes de portée, confirmations, séquences et heartbeat.

Le conteneur doit être supprimé après conservation des preuves; aucune migration existante n’a été modifiée.
