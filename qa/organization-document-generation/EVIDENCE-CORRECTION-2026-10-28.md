# Preuves du candidat de correction — 2026-10-28

- Baseline : `12766061c5b0458894dd2d0b3b9dac7a161a2296`.
- PostgreSQL : 16, base jetable, 158 migrations appliquées.
- Autorisation : 17/17 + 12/12 unitaires, 5/5 PostgreSQL/HTTP.
- Gouvernance documentaire : 8/8 (PMU, PSI, PCA, refus, rollback, reprise, concurrence, incompatibilité de clé).
- API réelle : PMU 201/version 1; PSI 201/version 1; PCA 201/version 1.
- Refus : archive 409 et inactif 409, zéro document.
- Chrome : 12/12 (390×844, 768×1024, 1440×900, 2560×1440; Classic, Glass Light, Glass Dark).
- F5 : PSI et PCA PASS.
- Console critique : 0.
- Images locales : backend `sha256:9b716185ecf8d88f98a0f36633297b866370df909ebf7dbf8bffd965ceb2a4e1`; frontend `sha256:793faef1d9bca5bc931846362caf02117b4b42c71818b7d8c02f06fe2081b2e4`.
- Captures et JSON : `D:\CORO-QA\runs\organization-document-generation\2026-10-28`.
- Aucun fournisseur externe, aucune donnée réelle, aucune production.

Limites : PGC/PRA/PUE, export PDF aval, validation juridique et remédiation des anciennes lignes documentaires restent NOT_VERIFIED ou hors périmètre.
