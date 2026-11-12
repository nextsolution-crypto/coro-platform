# GitHub et CI

Baseline vérifiée : `origin/main` `c35e1195f2d6959ea4a606a346eb91e6353edc52`. PR documentaire #260 : Draft, contrôles obligatoires PASS, jobs de déploiement ignorés.

PR Draft : [#261](https://github.com/nextsolution-crypto/coro-platform/pull/261). Premier SHA publié et validé : `94bb04152a25b6f390f52eacc45466bbf7072704`.

Résultats GitHub : Client Portal checks PASS; typecheck backend, portail, frontend et website PASS; client-portal-build PASS; backend-tests PASS, incluant migrations PostgreSQL jetables, intégration PostgreSQL, build, Knowledge et OCR. `build-images` et `production-release` sont SKIPPED car réservés à `workflow_dispatch`. Aucun workflow manuel, auto-merge ou déploiement n'a été lancé.
