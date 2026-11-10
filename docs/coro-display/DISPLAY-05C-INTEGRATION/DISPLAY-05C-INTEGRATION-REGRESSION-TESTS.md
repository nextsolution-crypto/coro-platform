# Régressions

- Prisma validate/generate : PASS.
- 182 migrations PostgreSQL + seconde passe : PASS.
- PostgreSQL Display : 3 suites / 5 tests PASS.
- Unitaires workflow/DTO : 2 suites / 12 tests PASS.
- Backend complet : 295 suites et 2 744 tests PASS; 4 suites/6 tests ignorés.
- OCR image réel : `BLOCKED`, `pdftoppm` absent.
- PDF Population : timeout sous suite complète, puis 4/4 PASS isolément.
- Frontend DISPLAY : PASS.
- Portail DISPLAY-05B : PASS.
- Liquid Glass/design system : PASS.
- TypeScript frontend/portail : PASS.
- TypeScript backend : PASS avec heap Node bornée à 8 Go; défaut 4 Go documenté.
- ESLint ciblé : PASS avec une alerte préexistante `no-img-element`.
- Builds Nest, Next frontend, Next portail : PASS.
- Audits runtime : PASS; audits dev documentés.
- Browser authentifié : NOT_VERIFIED.

Aucun test défaillant n’a été désactivé.
