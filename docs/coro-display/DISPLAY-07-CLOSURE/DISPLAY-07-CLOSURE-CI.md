# CI

## Avant fusion

HEAD `3a04a8d172a91191376ab93441ce5b32329b9e5b` : Backend security, Frontend, Client Portal, backend tests, TypeScript et build portail PASS. Runs principaux : `43286282294`, `43286282288`, `43286282332`, `43286282277`.

## Après fusion

Run `43288417928` sur `7bdcb085ac71d0d67af59d68a9e6158b4a995de1` : SUCCESS. Migrations, PostgreSQL, backend, OCR Linux, extraction PDF, Knowledge, TypeScript et build portail PASS.

`build-images` et `production-release` : SKIPPED avant et après fusion. Les avertissements Node 20 forcé vers Node 24 et migration future d'`ubuntu-latest` sont non bloquants et à suivre.
