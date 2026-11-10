# DISPLAY-04A — Isolation conteneur

Le service Compose dédié utilise un UID/GID non privilégié, racine en lecture seule, `/tmp` temporaire 256 Mio avec `noexec,nosuid,nodev`, aucune capacité Linux, `no-new-privileges`, 32 PID, 512 Mio et 1 CPU. Aucun port ni socket Docker n'est monté.

Limite : le worker doit joindre PostgreSQL et le stockage privé. Compose ne démontre pas encore une politique egress limitée exclusivement à ces deux destinations en production. Cette preuve réseau et l'essai expérimental des limites restent **NOT_VERIFIED** et constituent un gate avant fusion/déploiement.
