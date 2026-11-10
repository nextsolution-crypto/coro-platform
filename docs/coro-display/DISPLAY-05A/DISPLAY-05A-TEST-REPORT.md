# Rapport de tests

| Contrôle | Résultat |
|---|---|
| Prisma Client 6.19.3 | PASS |
| Tests service Display Manager | PASS — 3/3 |
| Suite backend complète | 292 suites / 2 723 tests PASS; 2 FAIL hors Display (`pdftoppm` absent, timeout PDF population) |
| Contrat frontend | PASS |
| TypeScript frontend | PASS |
| Build frontend Next 16.4.2 | PASS — route `/display` générée |
| Build backend Nest | PASS avec heap 8 Go |
| ESLint nouveaux contrôleur/service | PASS |
| ESLint page `/display` | PASS avec 1 avertissement justifié pour blob privé `<img>` |
| TypeScript backend 4 Go | FAIL OOM; build 8 Go PASS |
| PostgreSQL jetable / multitenant réel | NOT_VERIFIED |
| Recette navigateur authentifiée | NOT_VERIFIED |
| Captures QA | NOT_VERIFIED — aucune capture fictive créée |
| Audit npm production backend | PASS — 0 vulnérabilité |
| Audit npm production frontend | FAIL — 1 avis élevé hérité dans `follow-redirects`; aucun `audit fix` automatique appliqué |
| Installation npm | réserves dev héritées : 30 backend, 9 frontend selon `npm ci` |

Aucune base partagée, production, publication, approbation ou document client n'a été modifié.
