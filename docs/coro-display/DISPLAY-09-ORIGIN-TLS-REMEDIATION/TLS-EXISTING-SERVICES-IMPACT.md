# Impact services existants

La solution dédiée ne remplace pas le certificat de `getcoro.io`, `api`, `app` ou `client`. Aucun cookie, redirect ou vhost existant ne doit être modifié. Les cinq SNI doivent être testés avant/après; tout échec d'un service existant déclenche le rollback.
