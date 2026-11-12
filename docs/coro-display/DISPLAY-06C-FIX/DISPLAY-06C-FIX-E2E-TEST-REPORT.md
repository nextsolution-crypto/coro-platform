# Rapport E2E

Commande : `RUN_POSTGRES_TESTS=true NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --detectOpenHandles src/display-device/display-06c-operational-e2e.spec.ts`.

Résultat : 1 suite, 1 scénario intégré, PASS. Une seconde exécution sans `forceExit` est également PASS et ne signale aucun handle ouvert. La campagne DISPLAY complète : 21 suites, 99 tests, PASS.

PostgreSQL 16 : 185 migrations appliquées; seconde passe `No pending migrations`; `prisma validate` PASS.
