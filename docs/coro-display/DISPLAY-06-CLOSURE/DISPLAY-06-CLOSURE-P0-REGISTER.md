# Registre P0

| P0  | Constat                | Correction                                  | Preuve/test                            | Résultat          | Risque résiduel      |
| --- | ---------------------- | ------------------------------------------- | -------------------------------------- | ----------------- | -------------------- |
| 01  | Watchdog non raccordé  | Contrôleur runtime, sondes et restart borné | tests watchdog + E2E restart           | PASS              | endurance matérielle |
| 02  | PEM privée exportable  | signer externe, clé publique seulement      | tests signer/absence PEM               | PASS logiciel     | keystore matériel    |
| 03  | Intégrité facultative  | manifeste Ed25519 obligatoire avant startup | tests signature/version/temps/fichiers | PASS              | rotation de racine   |
| 04  | Révocations rejouables | registre signé, séquence et ancre séparée   | tests rollback/scope/signature         | PASS logiciel     | ancre OS/matérielle  |
| 05  | Captures 1×1 noires    | SVG réel et profils Chromium                | dimensions + inspection                | PASS              | écran physique       |
| 06  | Régression incomplète  | suite terminale et dépendance OCR isolée    | 2813/2813 hors OCR                     | PASS conditionnel | OCR CI Linux         |
