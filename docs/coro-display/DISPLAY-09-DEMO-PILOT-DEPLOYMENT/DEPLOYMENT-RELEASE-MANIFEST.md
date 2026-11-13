# Manifeste de release propose

- Candidat : `5ae7cd213346169465ee739d09df6d39b26ac6c3`.
- Production avant release : `e83d83a1afcb80d9bc95037dadc27700d3f68d89`.
- Services : backend, frontend, client-portal, website (ensemble impose par le workflow).
- Images : quatre digests GHCR a construire par `workflow_dispatch`; **NOT_VERIFIED avant build**.
- PostgreSQL : passage de 176 a 187 migrations; tete attendue `20261207010000_display_permanent_url_web_player`.
- Variables : aucune nouvelle valeur secrete identifiee pour le Player Web; configuration de stockage PDF/worker existante a valider par `docker compose config` sans afficher les valeurs.
- Routes : `/api/display-*`, `/api/client-portal/display`, `/api/display-web`, portail `/display`, Player `/d/[publicDisplayId]`.
- Permissions : permissions Display existantes et portees batiment explicites.
- DNS/TLS : changement separe pour `display.getcoro.io`, actuellement NXDOMAIN.
- CI candidat : `43321546408`, SUCCESS; build-images et production-release SKIPPED.
- Capacite : run `43326095490`, `releaseReady=true`.
- Sauvegarde : run `43326095939`, `REMOTE_VERIFIED`.

Le manifeste final ne peut etre scelle qu'apres construction des quatre digests et revalidation de `origin/main == candidat`.
