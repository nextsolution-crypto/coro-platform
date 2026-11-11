# DISPLAY-06B — Registre

Le modèle distingue REGISTERED, PENDING_ENROLLMENT, ACTIVE, SUSPENDED, REVOKED et RETIRED, avec portée, profil, clé, versions et synchronisation. La connectivité n'est jamais déduite du statut.

Le registre fourni est une autorité en mémoire pour tests. La persistance PostgreSQL additive et ses permissions sont **NOT_IMPLEMENTED** dans ce lot local.
