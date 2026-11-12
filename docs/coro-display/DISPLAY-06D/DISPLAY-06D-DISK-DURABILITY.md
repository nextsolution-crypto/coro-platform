# Durabilité disque

`atomicWrite` écrit avec création exclusive, permissions 0600, flush du fichier, renommage puis fsync du répertoire hors Windows. Cache, urgence, journal et révocations utilisent cette primitive.

Les interruptions logiques et la récupération `previous` sont testées. Windows saute le fsync de répertoire faute de sémantique portable. Aucune coupure électrique physique n’a été réalisée : durabilité électrique `NOT_VERIFIED`.
