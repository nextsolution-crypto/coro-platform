# CI

## Avant fusion

Backend security, Client Portal, backend-tests, quatre typechecks et build portail : PASS sur `ff13091d49ccf7607a113437cb6d14f47cb64ec2`. `build-images` et `production-release` : SKIPPED.

## Après fusion

Workflow : `Validate and Release Production`, exécution `43312153290`, SHA `c35e1195f2d6959ea4a606a346eb91e6353edc52` : **SUCCESS**.

- typecheck backend, frontend, portail client et website : PASS;
- backend-tests, migrations PostgreSQL jetables, OCR et build backend : PASS;
- build portail client : PASS;
- `build-images` : SKIPPED;
- `production-release` : SKIPPED.

Les avertissements GitHub relatifs à la transition Node 20/24 et Ubuntu 26 sont non bloquants et ne modifient pas le résultat fonctionnel.
