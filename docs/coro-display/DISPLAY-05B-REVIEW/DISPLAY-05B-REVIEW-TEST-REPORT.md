# Rapport de tests

| Contrôle | Résultat |
|---|---|
| Migrations PostgreSQL 16 depuis zéro | PASS |
| Seconde passe migrations | PASS |
| Fixture PostgreSQL trois tenants | PASS (1/1) |
| DISPLAY manager PostgreSQL ciblé | PASS |
| Service Display client unitaire | PASS (9/9) |
| TypeScript portail | PASS |
| Build Next portail | PASS |
| Build Nest backend | PASS |
| TypeScript backend, heap 4 Gio | FAIL — OOM |
| TypeScript backend, heap 8 Gio | PASS |
| ESLint ciblé backend et portail | PASS |
| Audit npm runtime backend | PASS, 0 |
| Audit npm complet backend | RISK OPEN, 30 dev/outillage |
| Audit npm complet portail | RISK OPEN, 8 dev/outillage |
| Navigateur authentifié | NOT_VERIFIED |

`git diff --check` est exécuté avant clôture. Aucun test de production ni diffusion physique.
