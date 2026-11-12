# Preuves de test

- PostgreSQL : conteneur `coro-display-06d-postgres`, port loopback 55436, 185 migrations, seconde passe « No pending migrations ».
- Tests ciblés : 6 suites / 29 tests PASS; suite Display : 10 suites / 67 tests PASS, 3 tests conditionnels ignorés.
- PostgreSQL ciblé : 2 suites / 2 tests PASS.
- E2E : 1 test PASS avec Chromium réel et PostgreSQL.
- TypeScript : PASS avec heap 8 Go après génération Prisma; tentative 4 Go OOM documentée.
- Backend complet : 305 suites / 2 807 tests PASS; une suite Bedrock relancée hors sandbox PASS. Six contrôles Office passent hors sandbox, mais le cas OCR PNG reste FAIL/`NOT_VERIFIED` car `pdftoppm` est absent (`ENOENT`).
- TypeScript frontend et portail : PASS. Builds Next/Turbopack frontend (75 pages) et portail (27 pages) : PASS. Build Nest : PASS.
- ESLint ciblé production et nouvelles suites : PASS. Scan de secrets ciblé et `git diff --check` : PASS.
- Captures et JSON : dossier `evidence/`.

Tous les identifiants sont synthétiques; aucune donnée ou clé de production.
