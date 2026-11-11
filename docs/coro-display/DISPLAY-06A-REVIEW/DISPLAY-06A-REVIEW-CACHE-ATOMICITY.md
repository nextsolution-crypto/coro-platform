# DISPLAY-06A-REVIEW — Atomicité du cache

Correction : `stage()` retourne maintenant un token opaque exigé par `commit()` et `discardStage()`. Deux synchronisations concurrentes ne peuvent plus valider le mauvais candidat. Un token consommé est refusé.

Le cache logique conserve la dernière copie après échec de validation ou de commit. Il ne démontre pas encore `fsync`, renommage atomique, récupération après panne électrique, quotas ou chiffrement OS : ces garanties appartiennent au stockage DISPLAY-06B.
