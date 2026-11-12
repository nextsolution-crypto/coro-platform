# GitHub CI

## Constat

Le premier SHA publié a révélé une incompatibilité TypeScript limitée à une fixture de test. Le constructeur attendait une chaîne ou un fournisseur asynchrone, mais recevait directement un Buffer.

## Correction

La fixture utilise désormais un fournisseur asynchrone. TypeScript complet avec 8 Go et les 19 tests critiques ont été rejoués localement avant le push du SHA `af1c1f833eb0258595fb9ae4d026bc87886b4074`. PR #253 maintenue Draft, sans auto-merge.

## Preuve et tests

PR: https://github.com/nextsolution-crypto/coro-platform/pull/253. PASS: Backend security checks, backend-tests (incluant PostgreSQL/OCR Linux), quatre typechecks, Client Portal checks et client-portal-build. `build-images` et `production-release`: SKIPPED conformément à la condition `workflow_dispatch`.

## Résultat et risque résiduel

**PASS CI sur le SHA final `a855d06b99d4a830162dcf84c43f194a3debdd04`.** PR #253 fusionnée par merge commit `31f9a1ed02e2c8cea4e62082b033bdcba1a52efb`. Le workflow post-fusion `43274357271` est PASS: backend-tests, PostgreSQL, OCR/PDF, Knowledge, quatre typechecks et build portail. `build-images` et `production-release` sont SKIPPED; aucune production.
