# Audit, concurrence et idempotence

Les événements et messages restent append-only; les tentatives PostgreSQL de modification ou suppression sont refusées. Chaque mutation porte `expectedLockVersion` et `requestId`.

Deux qualifications concurrentes sur la même version produisent exactement une réussite et un conflit. Un rejeu légitime retourne l’état courant dans le périmètre autorisé. Un rejeu après révocation est refusé avant lecture de l’événement.

La fermeture bloque toute nouvelle mutation. Les tests ne révèlent ni doublon ni écrasement silencieux.
