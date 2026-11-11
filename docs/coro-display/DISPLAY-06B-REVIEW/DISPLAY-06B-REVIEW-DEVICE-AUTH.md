# DISPLAY-06B-REVIEW — Identité et authentification appareil

La preuve Ed25519 couvre domaine, appareil, horodatage, nonce, méthode, chemin et SHA-256 du corps. Les appareils non actifs, signatures invalides, opérations substituées, timestamps hors fenêtre et nonces rejoués sont refusés. Les nonces sont bornés en forme et taille afin de limiter l'abus mémoire.

Correction : `DeviceAuthenticator.snapshot()` permet de restaurer le ledger après redémarrage; le test indépendant prouve qu'un rejeu reste refusé après reconstruction avec ce snapshot. L'intégration doit rendre ce ledger atomique et persistant; instancier l'authenticator sans restaurer son état réouvre une fenêtre de rejeu et est interdit en production.

Rotation, suspension, retrait, attestation matérielle et stockage de clé OS restent **NOT_IMPLEMENTED**. Aucune session utilisateur n'est utilisée comme identité machine.
