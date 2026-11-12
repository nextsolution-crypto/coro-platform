# Régressions

| Contrôle | Résultat |
|---|---|
| Prisma validate/generate | PASS |
| 185 migrations + seconde passe | PASS |
| Display | 22 suites / 106 tests PASS |
| Backend complet | 305 suites, 2 807 tests PASS; 1 suite OCR FAIL |
| PostgreSQL général | 80 suites, 429 tests PASS; Knowledge OCR/PDF FAIL |
| TypeScript backend/frontend/portail | PASS |
| Builds Nest/frontend/portail | PASS |
| ESLint ciblé | PASS |
| Runtime audit | 0 vulnérabilité |
| `git diff --check` | PASS |

Poppler (`pdftoppm`) et Tesseract sont absents. Les fixtures n’ont pas été modifiées; validation OCR : NOT_VERIFIED.
