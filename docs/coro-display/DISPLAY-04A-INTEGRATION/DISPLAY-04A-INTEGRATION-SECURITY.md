# DISPLAY-04A-INTEGRATION — Sécurité

Le rasteriseur est distinct du worker d’orchestration : UID/GID 1000, `read_only`, `network_mode: none`, `cap_drop: ALL`, `no-new-privileges`, 16 PID, 384 MiB, swap borné, 1 CPU et `/tmp` isolé. Son environnement ne contient ni PostgreSQL, ni stockage, ni jeton applicatif. Le socket Docker n’est pas monté.

Le passage de fichier utilise un spool borné et privé; les lectures refusent les liens et vérifient taille et SHA-256. Le worker conserve seul DB et stockage. Heartbeat, bail, limite d’essais et nouvelle vérification de l’autorité avant persistance sont actifs.

Expérimentation dans l’image Linux candidate sans réseau : rendu valide, refus des contenus actifs/chiffrés, limites cgroup visibles et nettoyage des temporaires. Aucun secret détecté dans le diff.
