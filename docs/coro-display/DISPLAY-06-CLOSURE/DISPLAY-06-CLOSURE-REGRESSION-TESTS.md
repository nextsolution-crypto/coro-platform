# Régressions

## Constat

La revue initiale n'avait pas de résultat backend terminal exploitable.

## Correction

Les suites sont exécutées avec code de sortie/résumé; la dépendance OCR est isolée au lieu d'être masquée.

## Preuve et tests

17/17 ciblés, 3/3 PostgreSQL/E2E, 306 suites/2813 tests backend hors OCR, TypeScript et builds backend/frontend (75 pages)/portail (27 pages) PASS.

## Résultat et risque résiduel

PASS produit; OCR local NOT_VERIFIED (Tesseract absent), à confirmer en CI Linux.
