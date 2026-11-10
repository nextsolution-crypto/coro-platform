# PostgreSQL

Une instance PostgreSQL 16 Docker jetable a été utilisée; aucune base partagée n'a été contactée.

- Migration depuis zéro : PASS, 179 migrations.
- `prisma migrate status` : schéma à jour.
- Seconde passe `migrate deploy` : PASS, aucune migration en attente.
- DISPLAY-03 publication/révocation : 1/1 PASS.
- DISPLAY-04A file PDF : PASS.
- Public Knowledge : PASS.
- Knowledge canonique, isolation tenant, révocation et reprise : 7/7 PASS.

Aucune migration DISPLAY-04B supplémentaire n'était requise. Les bases et le réseau jetables sont supprimés après les contrôles.
