# Prisma et PostgreSQL

## Faits vérifiés

- Node `v22.15.0`; Prisma `6.19.3`.
- `prisma validate` et `prisma generate` : PASS.
- PostgreSQL 16 jetable, base isolée `coro_display_integration`, port local 55466.
- 181 migrations appliquées depuis zéro, dont `20261202010000_display_client_portal` et `20261203010000_display_client_portal_review_hardening`.
- Seconde passe : aucune migration en attente.
- Tests PostgreSQL pertinents : 4 suites, 15 tests, PASS.

La migration 181 ajoute les protections d'identité immuable, l'interdiction de suppression, les événements append-only et les index de priorité. Les contraintes d'organisation, client, bâtiment, auteur et unicité d'intention ont été exercées. Aucune base partagée n'a été modifiée.
