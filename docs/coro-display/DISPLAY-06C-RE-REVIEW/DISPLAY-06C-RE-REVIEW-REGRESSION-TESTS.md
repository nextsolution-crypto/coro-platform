# Régressions

| Contrôle | Résultat |
|---|---|
| Prisma generate/validate | PASS |
| 185 migrations + seconde passe | PASS |
| Display ciblé | 22 suites, 106 tests PASS |
| Backend complet | 305 suites PASS, 1 FAIL OCR, 7 skipped; 2807 tests PASS |
| TypeScript backend (heap 8 Gio) | PASS |
| Build Nest | PASS |
| TypeScript frontend/portail | PASS / PASS |
| Build Next frontend/portail | PASS / PASS |
| ESLint fichiers modifiés | PASS après correction |
| `git diff --check` | PASS |

L’unique échec global est `office-extractor.spec.ts`: `pdftoppm ENOENT`, sans lien Display et non masqué.
