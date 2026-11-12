# Installateur

L'installation est bornée à Ubuntu 24.04 LTS x86-64, vérifie ses prérequis, crée un utilisateur non privilégié par systemd-sysusers et des répertoires par tmpfiles. Elle ne contient aucune installation implicite sur l'hôte de développement.

Preuves : 3/3 tests d'installateur PASS, couvrant installation synthétique, seconde passe/idempotence, permissions, refus de préflight et retrait/réinstallation. Les essais ont utilisé un environnement jetable; aucun service persistant n'a été installé sur le poste hôte.
