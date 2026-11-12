# DISPLAY-06C-PR — Résultats CI

Première passe sur `3c01261494da305d0fe8674af3597ff9532695bb` :

- Backend PR Checks, run `43140951376` : **PASS**.
- Frontend PR Checks, run `43140951457` : **PASS**.
- Validate and Release Production, run `43140951448` : **PASS**. Typechecks Website/Backend/Client Portal/Frontend, build Client Portal, migrations, suites backend et PostgreSQL, build backend, politique Knowledge, OCR local synthétique et extraction PDF compilée sont réussis.
- `build-images` et `production-release` : **SKIPPED**, conformément au périmètre PR sans déploiement.

Annotations non bloquantes : migration future de `ubuntu-latest` et avertissement GitHub concernant Node 20 dans `actions/checkout@v4` / `actions/setup-node@v4`, forcés sur Node 24 par GitHub.

Une seconde passe est exigée après le commit des preuves de PR. Son état final est consigné dans le rapport de clôture de la PR et dans GitHub Checks.
