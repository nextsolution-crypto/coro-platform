# Gate 2 — compatibilité origine et routage

Inspection serveur READ ONLY finale : workflow `43463944144`, job `132017927912`, SHA `b93005aae4160c3c0c58dadcba2f9687c65b1810`.

## Preuves établies

- `INSPECTION_EXECUTED=PASS` : le workflow protégé et ses huit tests de sécurité ont réussi.
- Terminateur TLS : NGINX, configuration chargée depuis `/etc/nginx/nginx.conf`, `/etc/nginx/sites-enabled/default` et `/etc/nginx/sites-enabled/getcoro`.
- Le virtual host existant route déjà les applications vers les upstreams locaux, dont le portail client sur le port 3003.
- Certbot utilise l'authenticator et l'installer `nginx`; les profils sont dans `/etc/letsencrypt/renewal/`.
- `certbot.timer` est actif et activé; aucun hook personnalisé n'a été observé.
- HTTP-01 : listener HTTP présent, plugin NGINX présent, aucune location ACME statique chargée. Le challenge est techniquement disponible par le plugin, mais `display.getcoro.io` est encore NXDOMAIN.
- Le certificat présenté pour `display.getcoro.io` est celui de `client.getcoro.io`; son SAN ne contient que `client.getcoro.io`.
- Les quatre autres SNI contrôlés (`getcoro.io`, `client.getcoro.io`, `api.getcoro.io`, `app.getcoro.io`) passent la validation de nom.

## Verdicts distincts

- `INSPECTION_EXECUTED=PASS`
- `TLS_VALIDATED=FAIL` pour `display.getcoro.io`
- `ORIGIN_PATH_VERIFIED=NOT_VERIFIED` : une empreinte d'origine serveur a été calculée, mais aucune preuve fournisseur ne relie encore de façon certaine la cible Cloudflare à cette origine.

Le routage applicatif local est compatible. La publication reste bloquée par l'absence de certificat couvrant Display et par la corrélation Cloudflare/origine non démontrée.
