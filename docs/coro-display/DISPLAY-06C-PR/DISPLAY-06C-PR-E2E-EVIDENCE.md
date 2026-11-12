# DISPLAY-06C-PR — Preuves E2E

Le scénario local réel a utilisé HTTP, PostgreSQL, un processus Player et Chromium : enrôlement, authentification d’appareil, récupération du manifeste, cache privé, lecture, heartbeat, confirmation de synchronisation, redémarrage de processus et reprise hors ligne.

Résultats : 22 suites Display / 106 tests **PASS**. Les essais adversariaux couvrent jeton falsifié/expiré, appareil désactivé, changement de tenant, replay, ordre obsolète, manifeste invalide, cache corrompu et récupération contrôlée.

Les preuves détaillées restent dans `DISPLAY-06C-INTEGRATION-E2E-TEST-REPORT.md`, `...-ADVERSARIAL-TESTS.md` et `...-REGRESSION-TESTS.md`. La recette interactive authentifiée par un opérateur humain reste `NOT_VERIFIED`.
