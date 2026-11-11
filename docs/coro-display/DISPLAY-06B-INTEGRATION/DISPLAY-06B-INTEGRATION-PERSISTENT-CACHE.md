# DISPLAY-06B-INTEGRATION — Cache persistant

Le cache impose portée contenue, refus de `.`/`..` et liens symboliques, fichiers temporaires exclusifs, commits sérialisés, séquence croissante, réauthentification du manifeste et liste de versions révoquées pour `current` et `previous`.

Les tests couvrent concurrence, corruption, rollback, manifeste substitué, traversal, symlink et fallback révoqué. Le verrou est intra-processus; verrou interprocessus, quotas et ACL OS restent à intégrer.
