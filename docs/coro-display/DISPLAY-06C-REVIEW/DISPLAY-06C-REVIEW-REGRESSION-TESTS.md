# Régressions

- Backend complet : 304 suites et 2 800 tests réussis; 1 suite/1 test OCR échoue (`pdftoppm ENOENT`), 6 suites ignorées.
- PostgreSQL global : 80/81 suites, 429/435 tests; six échecs `PDF_INVALID` de Knowledge liés à Poppler.
- PostgreSQL DISPLAY : 2/2 tests de revue ciblés PASS.
- TypeScript backend : PASS.
- Prisma generate/validate : PASS avec `DATABASE_URL` jetable.
- Build Nest : PASS.
- ESLint production ciblé : PASS.
- `npm audit` runtime et complet au moment du contrôle : 0 vulnérabilité signalée.
- OCR : `NOT_VERIFIED`; `pdftoppm` absent.

Les échecs OCR sont identiques à la baseline locale, mais la régression globale ne peut pas être déclarée PASS.
