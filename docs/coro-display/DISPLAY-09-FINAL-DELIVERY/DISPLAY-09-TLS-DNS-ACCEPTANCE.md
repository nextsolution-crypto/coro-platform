# TLS et DNS — acceptation

Statut : **NO-GO / NOT EXECUTED**.

Inspection `43463944144` : NGINX et Certbot opérationnels; les quatre SNI historiques passent. `display.getcoro.io` reçoit le certificat de `client.getcoro.io` et échoue la validation de nom. Le nom Display demeure NXDOMAIN.

Conditions du Lot A : corréler la cible Cloudflare avec l'empreinte d'origine, sauvegarder NGINX, créer un certificat et un virtual host Display dédiés, créer le CNAME proxifié, valider publiquement TLS/routage/no-store et les quatre SNI historiques. Aucun de ces changements n'est encore autorisé.
