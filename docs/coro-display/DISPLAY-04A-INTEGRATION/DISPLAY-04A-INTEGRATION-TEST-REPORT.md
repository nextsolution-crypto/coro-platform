# DISPLAY-04A-INTEGRATION — Rapport de tests

| Contrôle | Résultat |
|---|---|
| Prisma validate/generate | PASS |
| 179 migrations zéro + upgrade | PASS |
| Build NestJS | PASS |
| Tests ciblés PDF/rétention | PASS, 10/10 |
| PostgreSQL worker | PASS, 3/3 |
| Knowledge Linux | PASS, 7/7 |
| Corpus hostile Linux | PASS avec deux limites documentées |
| Image production + smokes Knowledge | PASS |
| Suite backend Linux | 289 suites PASS, 2 FAIL de contexte dépôt, 4 SKIPPED |
| Rejeu des 2 suites de contexte dans worktree complet | PASS, 25/25 |
| Audit npm production | PASS, 0 vulnérabilité (image production) |

Les deux échecs de la suite complète cherchent `/docker-compose.yml` et des sources frontend absentes du contexte Docker limité à `coro-backend`; ils passent dans le worktree complet. Les 2709 autres tests passent. Aucun faux PASS n’est attribué à l’exécution Linux initiale.
