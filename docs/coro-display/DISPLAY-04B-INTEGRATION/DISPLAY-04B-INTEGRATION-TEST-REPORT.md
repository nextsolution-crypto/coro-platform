# Rapport de tests

| Contrôle | Résultat |
|---|---|
| Profils/rendu/acceptation | PASS — 15/15 |
| ESLint ciblé | PASS |
| TypeScript / build NestJS local | PASS |
| Build Docker + Prisma generate | PASS |
| Prisma validate local | BLOCKED — téléchargement moteur Windows redirigé vers `127.0.0.1:9` |
| Prisma validate / generate Docker | PASS |
| Migrations zéro + reprise | PASS |
| PostgreSQL DISPLAY/Knowledge | PASS |
| Suite backend | 291 suites PASS, 2 suites initialement limitées par `spawn EPERM` |
| Relance hors bac à sable | Bedrock PASS; Office 5/6 PASS |
| OCR PNG réel | BLOCKED — `pdftoppm` absent du poste Windows |
| Audit npm production et complet | PASS — 0 vulnérabilité |
| `git diff --check` | PASS |

Bilan Jest complet : 2 715 tests PASS, 6 SKIPPED, 7 échecs environnementaux initiaux. Après relance autorisée, il ne subsiste qu'un contrôle OCR non exécuté faute de Poppler local; il ne touche pas le delta DISPLAY-04B. Aucun FAIL fonctionnel DISPLAY n'est observé.
