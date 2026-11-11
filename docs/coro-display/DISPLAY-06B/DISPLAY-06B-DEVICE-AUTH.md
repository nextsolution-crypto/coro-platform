# DISPLAY-06B — Authentification appareil

Chaque appareil possède sa propre clé publique. Une requête signe appareil, horodatage, nonce, méthode, chemin et empreinte du corps. Fenêtre de deux minutes et registre de nonces empêchent le rejeu; appareils non actifs ou révoqués sont refusés.

TLS et stockage OS de la clé privée restent à assurer par le futur Gateway/kiosque. Aucune session utilisateur n'est réutilisée.
