# PostgreSQL

Migration additive `20261207010000_display_permanent_url_web_player`; total vérifié : 187 migrations.

Preuves du 12 novembre 2026 sur un conteneur PostgreSQL 16 jetable, sans volume et supprimé après la recette :

- application depuis zéro : 187/187 PASS;
- migration DISPLAY-09 appliquée après DISPLAY-08;
- index composite `DisplayLocation_id_organizationId_buildingId_key` présent avant les clés étrangères d'activation et de session;
- seconde passe `prisma migrate deploy` : `No pending migrations to apply`;
- base partagée et production : non touchées.

La migration rétroremplit les identifiants publics opaques, ajoute les activations et sessions Web, et contraint leurs références à l'organisation, au bâtiment et à l'emplacement.
