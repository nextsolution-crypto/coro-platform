# DISPLAY-06B-INTEGRATION — Régressions

- Display : **13 suites PASS, 87 tests PASS, 1 SKIP préexistant**.
- DISPLAY-06B seul : **17/17 PASS**.
- Backend : **299 suites et 2 786 tests PASS**, 4 suites/6 tests ignorés; 7 blocages `spawn EPERM` sous bac à sable.
- Reprise hors bac à sable : **34/35 PASS**; seul OCR échoue faute de `pdftoppm`.
- PostgreSQL : test Display PASS; suite générale 80/81 suites et 429 tests PASS, réserve Knowledge/PDF.
- TypeScript backend, ESLint ciblé et build Nest : **PASS**.

Frontend et portail ne sont pas modifiés par le diff; leurs builds sont donc **NOT_APPLICABLE**. Aucun test défaillant n'a été désactivé.
