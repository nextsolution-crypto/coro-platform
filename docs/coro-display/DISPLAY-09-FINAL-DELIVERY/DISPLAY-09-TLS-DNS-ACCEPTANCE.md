# TLS et DNS — acceptation

Statut : **NO-GO / STOPPED BEFORE MUTATION**.

Inspection `43463944144` : NGINX et Certbot opérationnels; les quatre SNI historiques passent. `display.getcoro.io` reçoit le certificat de `client.getcoro.io` et échoue la validation de nom. Le nom Display demeure NXDOMAIN.

Conditions du Lot A : corréler la cible Cloudflare avec l'empreinte d'origine, sauvegarder NGINX, créer un certificat et un virtual host Display dédiés, créer le CNAME proxifié, valider publiquement TLS/routage/no-store et les quatre SNI historiques. Le lot est autorisé, mais sa mutation reste interdite tant que la corrélation n'est pas PASS.

## Exécution autorisée du Lot A

Le préflight fournisseur a été tenté le 2026-11-13. Résultats :

- aucune variable ou secret Cloudflare n'existe dans les périmètres GitHub Actions inspectés;
- aucun client API Cloudflare versionné n'est disponible dans le dépôt;
- le contrôle navigateur Windows échoue avant accès au fournisseur avec `native pipe is unavailable`;
- les preuves NGINX/DigitalOcean démontrent l'origine inspectée, mais pas la cible ni les Origin Rules détenues par Cloudflare.

`ORIGIN_PATH_VERIFIED=NOT_VERIFIED`. Le STOP obligatoire a donc été appliqué avant sauvegarde de changement, émission ACME, création NGINX, DNS ou reload.
