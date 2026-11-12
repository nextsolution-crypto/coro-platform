# Superviseur OS

L’unité `ops/display-player/systemd/coro-display-player.service` utilise un compte non privilégié, `Restart=on-failure`, une limite de quatre reprises sur dix minutes et un délai de cinq secondes. Les écritures sont limitées à `/var/lib/coro-display` et `/var/log/coro-display`; noyau, home, périphériques et namespaces sont restreints.

Le fichier est livré mais non installé, conformément à l’interdiction d’installer un service persistant. Exécution systemd : `NOT_VERIFIED`.
