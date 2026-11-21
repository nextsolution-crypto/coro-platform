# systemd

L'unité utilise `Type=simple`, `User`/`Group` dédiés, redémarrage borné et durcissements (`NoNewPrivileges`, protections système/home, capacités supprimées, familles réseau et chemins d'écriture limités). Les répertoires persistants sont déclarés via tmpfiles.

Validation : inspection statique et tests synthétiques PASS. Une exécution systemd sur le mini-PC cible n'a pas été réalisée.

Verdict matériel systemd : **NOT_VERIFIED — PHYSICAL PILOT NOT AUTHORIZED**.
