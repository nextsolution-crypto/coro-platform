# DISPLAY-06B-INTEGRATION — Durabilité disque

Ordre : écriture, `fsync` du fichier, fermeture, renommage atomique et synchronisation du répertoire hors Windows. Une génération précédente est conservée et restaurée si le commit final échoue.

Atomicité logique : PASS. Crash et panne électrique matériels : **NOT_VERIFIED**. Windows ne synchronise pas le handle de répertoire; aucune durabilité après coupure réelle n'est affirmée.
