# Supervision

Le backend retourne les appareils autorisés et leurs champs réels. `DeviceSupervision` remplace le libellé statique historique et affiche statut administratif, connectivité estimée, heartbeat, synchronisation, mode, cache, runtime, réseau et version.

La politique visible considère le heartbeat frais pendant deux minutes et avertit explicitement qu'il ne prouve pas l'affichage physique. TypeScript, ESLint ciblé (zéro erreur, un avertissement historique `<img>`) et build Next.js PASS.

Recette authentifiée manuelle : `NOT_VERIFIED` dans cet environnement; le contrat UI automatisé est PASS.
