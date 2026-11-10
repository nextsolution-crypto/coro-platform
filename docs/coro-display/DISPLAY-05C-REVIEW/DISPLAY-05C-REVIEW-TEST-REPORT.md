# Rapport de tests

- Prisma validate/generate : PASS.
- Migrations PostgreSQL depuis zéro et seconde passe : PASS.
- PostgreSQL ciblé : 3 suites, 5 tests, PASS.
- Unitaires DISPLAY-05C ciblés : 2 suites, 11 tests, PASS.
- Suite backend complète : 295 suites et 2 739 tests PASS; 4 suites/6 tests ignorés; 1 test OCR `NOT_EXECUTABLE` faute de `pdftoppm`. La suite AWS initialement bloquée par la sandbox passe hors sandbox.
- Contrats frontend DISPLAY et portail : PASS.
- Design system complet : PASS hors sandbox (sous-processus Git requis).
- TypeScript backend/frontend/portail : PASS.
- ESLint fichiers modifiés : PASS.
- Builds backend, frontend et portail : PASS.
- `git diff --check` : PASS.
- Browser authentifié : NOT_VERIFIED.

Le test OCR non exécutable ne touche pas DISPLAY-05C mais doit être rejoué sur un runner équipé de Poppler.
