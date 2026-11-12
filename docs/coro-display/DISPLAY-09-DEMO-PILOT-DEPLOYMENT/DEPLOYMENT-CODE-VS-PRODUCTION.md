# Code fusionne versus production

`main` est a `5ae7cd213346169465ee739d09df6d39b26ac6c3`; la production est a `e83d83a1afcb80d9bc95037dadc27700d3f68d89`.

L'ecart comprend toute la chaine Display 02A a 09 : fondations spatiales, publication gouvernee, rasterisation PDF, portail client, observations, Player connecte, resilience, orchestration, Player Web permanent et pilote Demo. Il ne s'agit pas d'un simple changement de navigation.

Production actuelle : 176 migrations. Candidat : 187 migrations. Les 11 migrations nouvelles vont de `20261129010000_coro_display_spatial_foundations` a `20261207010000_display_permanent_url_web_player`.

Les requetes publiques non authentifiees du 2026-11-12 retournent 404 pour `https://client.getcoro.io/display` et `/d/nonexistent-display-pilot-check`, ce qui concorde avec la version active anterieure a Display. Apres release, les tests doivent distinguer une route existante avec refus/connexion d'un 404 de version absente.

Le workflow de release construit et deploie les quatre images (backend, frontend, portail, site). Meme si le changement fonctionnel principal concerne backend/portails, le candidat operationnel est necessairement l'ensemble immutable des quatre digests.
