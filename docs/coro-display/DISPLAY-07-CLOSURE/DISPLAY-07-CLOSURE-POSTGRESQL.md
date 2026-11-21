# PostgreSQL

- PostgreSQL 16 jetable : chaîne complète de 186 migrations réussie depuis zéro.
- Migration finale : `20261206010000_display_emergency_orchestration`.
- `prisma migrate status` : à jour sur la base jetable.
- Tests DISPLAY-07 PostgreSQL : 2/2 PASS.
- CI post-fusion : migrations, tests PostgreSQL et build backend PASS dans le job `backend-tests`.

Les commandes, livraisons, événements d'outbox et traces sont créés atomiquement. Les contraintes couvrent portée, séquence et états. Aucune migration n'a été appliquée à une base partagée ou de production.
