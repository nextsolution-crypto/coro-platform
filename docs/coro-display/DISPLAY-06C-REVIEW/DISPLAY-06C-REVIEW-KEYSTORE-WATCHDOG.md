# Keystore et watchdog

## Constats

Le seul keystore exécutable de 06C est explicitement synthétique et en mémoire. Aucun secret privé n’est stocké dans PostgreSQL ou le navigateur. `RestartWatchdog` borne des redémarrages logiques.

## Limites

Keystore OS/matériel : `NOT_IMPLEMENTED`. Superviseur OS : `NOT_IMPLEMENTED`. Watchdog matériel : `NOT_VERIFIED`. Ces limites interdisent un pilote physique.
