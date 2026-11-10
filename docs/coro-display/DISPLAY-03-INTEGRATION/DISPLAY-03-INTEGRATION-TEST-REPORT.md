# DISPLAY-03 Integration — Test Report

Date: 2026-11-09

| Control | Result |
|---|---|
| Prisma validate / generate | PASS |
| TypeScript `--noEmit` | PASS |
| Targeted ESLint | PASS |
| Backend build | PASS |
| Targeted Display/PostgreSQL tests | PASS — 11/11 |
| Full backend regression | PARTIAL — 2700 pass, 6 skipped, 1 environmental failure |
| Production dependency audit | PASS — 0 vulnerabilities |
| `git diff --check` | PASS |

The sole full-suite failure is `knowledge/office-extractor.spec.ts`: `spawnSync pdftoppm ENOENT`. `where pdftoppm` confirms the executable is absent. This is a pre-existing OCR environment dependency and not a DISPLAY-03 regression. It remains a CI/environment prerequisite rather than a reason to weaken or skip the test.

The PostgreSQL test covers governed publication, independent actors, exact source authority, foreign building refusal, foreign tenant refusal, missing permissions, ADMIN/SUPER_ADMIN non-bypass, contradictory spatial scope, suspension, revocation and immediate Player refusal.

No browser test is claimed: DISPLAY-03 provides backend contracts and no Player UI.
