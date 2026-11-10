# PostgreSQL

Environnement: PostgreSQL 16 Alpine jetable, base `coro_display_05c`, port local 55467.

- 182 migrations appliquées: PASS.
- migration DISPLAY-05C additive: PASS.
- seconde passe `prisma migrate deploy`: aucune migration en attente.
- `prisma migrate status`: schéma à jour.
- base partagée/propriétaire: non utilisée.

La migration ajoute uniquement colonnes, table de messages, index, contraintes, fonctions et triggers. Aucune suppression ni reconstruction de données.
