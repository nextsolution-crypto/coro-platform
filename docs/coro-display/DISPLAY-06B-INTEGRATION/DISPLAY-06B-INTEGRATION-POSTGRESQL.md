# DISPLAY-06B-INTEGRATION — PostgreSQL

Environnement jetable : PostgreSQL `16.15`, conteneur local lié à `127.0.0.1:55466`, bases synthétiques dédiées. Les 182 migrations existantes ont été appliquées; seconde passe : aucune migration en attente; table `_prisma_migrations` : 182 succès. Le conteneur a ensuite été supprimé.

Test Display/PostgreSQL ciblé : **1/1 PASS**. Suite générale sur la base `coro_display_06b_test` : **80/81 suites, 429 tests PASS**. La seule suite en réserve est `knowledge-master.postgres-spec.ts` : sous bac à sable `spawn EPERM`; hors bac à sable six fixtures retournent `PDF_INVALID`. Aucun schéma ou migration DISPLAY-06B n'a été créé.
