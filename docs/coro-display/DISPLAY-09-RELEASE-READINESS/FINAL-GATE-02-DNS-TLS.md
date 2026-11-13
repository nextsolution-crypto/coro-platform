# Gate 2 — DNS et TLS

État constaté au 2026-11-13 :

- `display.getcoro.io` demeure NXDOMAIN;
- aucun enregistrement DNS ou réglage Cloudflare n'a été modifié;
- NGINX écoute sur 80 et 443 et Certbot est géré par `certbot.timer`;
- les certificats actuels sont séparés pour `getcoro.io`, `client.getcoro.io` et `app/api.getcoro.io`;
- aucun certificat ou virtual host dédié à `display.getcoro.io` n'existe;
- le SNI Display retombe sur le certificat de `client.getcoro.io`, donc la validation de nom échoue.

## Changement Phase B proposé

1. Sauvegarder `/etc/nginx/sites-enabled/getcoro`, l'inventaire des liens `sites-enabled` et les métadonnées Certbot (sans copier les clés dans les preuves).
2. Créer un virtual host NGINX dédié `display.getcoro.io`, limité au routage du Player Web vers l'upstream du portail client sur le port 3003 et conservant les en-têtes de proxy, sessions et `Cache-Control: no-store` applicables.
3. Créer un certificat Let's Encrypt dédié à `display.getcoro.io`, sans remplacer les certificats des autres services.
4. Préférer DNS-01 tant que le nom reste NXDOMAIN; HTTP-01 par le plugin NGINX devient possible seulement après création et propagation contrôlées du DNS vers la bonne origine.
5. Valider `nginx -t`, puis effectuer un reload contrôlé seulement après autorisation Phase B.
6. Créer/proxifier ensuite le DNS Cloudflare vers l'origine démontrée, maintenir une validation TLS stricte et vérifier le chemin Cloudflare → origine.
7. Rejouer les cinq SNI, le Player Web, les sessions, F5, `no-store` et les services existants.

## Rollback

- retirer uniquement le virtual host Display;
- restaurer la sauvegarde NGINX et valider `nginx -t`;
- reload contrôlé;
- retirer l'enregistrement DNS Display s'il avait été créé;
- conserver le certificat émis jusqu'à révocation/suppression gouvernée distincte;
- confirmer que les quatre SNI historiques et leurs upstreams sont inchangés.

## Conditions GO / NO-GO

GO Phase B seulement avec : cible Cloudflare/origine corrélée, méthode ACME choisie, sauvegarde vérifiée, fenêtre de changement, rollback testé sur configuration, validation `nginx -t` et autorisation explicite DNS/certificat/reload.

NO-GO actuel : `TLS_VALIDATED=FAIL` et `ORIGIN_PATH_VERIFIED=NOT_VERIFIED`.
