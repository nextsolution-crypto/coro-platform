# Régressions

## PASS

- Prisma validate/generate; 181 migrations + seconde passe.
- PostgreSQL pertinent : 4 suites / 15 tests.
- Backend complet après génération Prisma : 293 suites / 2 733 tests PASS; 4 suites et 6 tests ignorés par leurs contrats.
- Reprise client auth + Display : 2 suites / 27 tests PASS.
- Display/Office ciblé : 8 suites PASS, 44 tests PASS, 1 test ignoré.
- Portail : 11 scripts de contrats PASS, dont Display, Liquid Glass et navigation.
- TypeScript backend et portail : PASS.
- Build Nest : PASS; build Next production : PASS (`/display` généré).
- ESLint des nouveaux services Display et de la page `/display` : PASS.
- `git diff --check` : PASS.

## Réserves

Le test OCR PNG réel échoue uniquement parce que `pdftoppm` n'est pas installé sur Windows (`ENOENT`). La suite complète termine donc à 2 échecs : cet environnement et, avant correction, le contrat de session; ce dernier repasse après le correctif. La validation OCR Linux reste à exécuter en CI Linux.

Le lint plus large remonte des dettes préexistantes dans des fichiers historiques (notamment `any` et formatage); les nouveaux composants Display ciblés sont propres.
