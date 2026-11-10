# DISPLAY-05A-INTEGRATION — Rapport de tests

| Contrôle | Résultat | Détail |
|---|---|---|
| Git / PR #246 | PASS | `origin/main=8637b702`, source directe |
| Prisma validate/generate | PASS | Prisma 6.19.3 |
| Migrations PostgreSQL | PASS | 179 + seconde passe vide |
| Manager/PostgreSQL | PASS | 3 tests, permissions, tenant, pagination/filtres |
| Gouvernance DISPLAY-03 | PASS | Cycle complet PostgreSQL |
| HTTP/spatial PostgreSQL | PASS | 7 tests, 3 suites |
| Display/Spatial unitaires | PASS | 47 tests + correctifs de revue |
| OCR/Office Linux | PASS | 7/7 |
| PDF Population Linux | PASS | 9/9 |
| Suite backend Linux | PASS avec adaptation de contexte | 292 suites/2 724 tests PASS; 2 tests de chemins repo relancés sur hôte |
| Deux suites dépendantes du repo | PASS | 25/25 sur hôte; les 2 assertions auparavant en échec passent |
| Bilan backend combiné | PASS | 2 726 PASS, 6 SKIPPED conditionnels |
| TypeScript backend | PASS | Heap 8 Go; essai 4 Go OOM documenté |
| TypeScript frontend | PASS | `tsc --noEmit` et build |
| ESLint backend ciblé | PASS | Auth, Manager, test PostgreSQL |
| ESLint frontend ciblé | PASS avec avertissement | 0 erreur, image blob `<img>` |
| Contrat frontend | PASS | Route, droits, blob, gouvernance |
| Build backend | PASS | Nest |
| Build frontend | PASS | Next 16.4.2, 75 pages |
| Audit production | PASS | 0 vulnérabilité backend/frontend |
| follow-redirects | PASS | 1.16.3 overridden |
| Scan de secrets | PASS | Aucun secret; faux positifs lexicaux seulement |
| `git diff --check` | PASS | Aucun défaut |
| Navigateur réel | NOT_VERIFIED | Connecteur natif indisponible |

Les deux échecs Linux de la suite complète étaient causés par le contexte Docker limité à `coro-backend`, qui ne contient ni la racine `docker-compose.yml` ni les sources frontend référencées par le manuel. Les mêmes suites passent dans le worktree complet; ce n'est pas une régression produit.
