# DISPLAY-06B — Cache persistant

Le cache est cloisonné par appareil/emplacement, écrit en temporaire avec permissions minimales, synchronisé, puis renommé. La génération précédente est conservée et relue si la courante est corrompue.

Windows ne permet pas la même synchronisation de répertoire que Linux; la durabilité après panne électrique demeure **NOT_VERIFIED** malgré `fsync` des fichiers.
