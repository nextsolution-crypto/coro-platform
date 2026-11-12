# CI

CI pré-fusion sur `97d8e30d` : PASS, incluant migrations, OCR Linux, tests backend/PostgreSQL, build Nest, Knowledge, extraction PDF et contrôles TypeScript.

CI post-fusion : workflow [43297493343](https://github.com/nextsolution-crypto/coro-platform/actions/runs/43297493343) sur `3d89741c`, PASS :

- backend-tests : PASS (3m50s);
- typecheck client portal/backend/frontend/website : PASS;
- build client portal : PASS;
- build-images : SKIPPED;
- production-release : SKIPPED.

Les avertissements de migration future d'`ubuntu-latest` et de dépréciation Node 20 des actions GitHub sont non bloquants et à suivre.
