# Régressions

## Exécuté

- 41 tests Display unitaires/adversariaux: PASS.
- 2 suites PostgreSQL Display: PASS.
- 185 migrations depuis zéro: PASS, tête `20261205030000_display_operational_heartbeat`.
- E2E intégré Chromium/PostgreSQL: PASS avec preuves.
- Prisma validate/generate: PASS.
- Build backend: PASS.
- TypeScript frontend et portail client (`tsc --noEmit`): PASS.
- Builds frontend et portail client: PASS.
- ESLint ciblé sur les fichiers corrigés: PASS.
- `git diff --check`: PASS.
- Audit runtime (`npm audit --omit=dev --audit-level=high`): PASS, 0 vulnérabilité runtime.

## Non exécuté ou limité

La suite backend historique complète a été lancée, mais son résultat terminal n'a pas été capturé de manière exploitable après la fin du processus: `NOT_VERIFIED`. Les suites Display ciblées, PostgreSQL et les builds ci-dessus constituent les preuves attribuables au candidat. La totalité historique des suites Documents/Knowledge n'est pas une preuve spécifique de DISPLAY-06D. OCR natif Windows indisponible: `NOT_VERIFIED`.
