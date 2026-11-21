# Verdict DISPLAY-06

## Constat

Les six P0 disposent d'une correction et d'une preuve logicielle. La contre-revue isolée est favorable, la CI de la PR #253 est verte sur `a855d06b99d4a830162dcf84c43f194a3debdd04` et la fusion est présente dans `main` au SHA `31f9a1ed02e2c8cea4e62082b033bdcba1a52efb`.

## Correction et preuve

Watchdog raccordé, signer externe, intégrité authentifiée, révocations signées/ancrées, captures réelles et suite backend terminale hors OCR.

## Tests et résultat

17/17 ciblés, 3/3 PostgreSQL/E2E, 2813/2813 backend hors OCR, TypeScript/builds et audit runtime PASS.

## Risque résiduel

Keystore matériel, systemd cible, UPS, coupures et endurance 8 h/24 h. L'OCR Linux est PASS en CI; il reste NOT_VERIFIED localement seulement.

## Verdict

**GO CONDITIONNEL DISPLAY-06-SOFTWARE-CLOSED.** DISPLAY-06A/B/C/D sont fusionnés, les critères logiciels P0 et la CI post-fusion sont démontrés. Les réserves conditionnelles sont physiques et explicitement transférées à DISPLAY-08. Aucune image, release, migration partagée ou production n'a été déclenchée.
