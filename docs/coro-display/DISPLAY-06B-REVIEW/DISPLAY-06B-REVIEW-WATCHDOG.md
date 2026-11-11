# DISPLAY-06B-REVIEW — Watchdog

Le budget de redémarrages limite les boucles dans une fenêtre glissante; le test existant refuse le troisième redémarrage lorsque la limite vaut deux. Le cache et l'état d'urgence sont dans des fichiers séparés du compteur et ne sont pas effacés par cette classe.

Il n'existe toutefois ni détection de heartbeat, ni backoff calculé, ni persistance du budget, ni superviseur Windows/Linux. Détection de blocage et reprise OS : **NOT_IMPLEMENTED**. Le watchdog actuel est un contrat local, pas une garantie opérationnelle.
