# Préparation DISPLAY-07

## Blocages obligatoires

1. Brancher réellement watchdog/sondes/actions et prouver crash, hang, circuit et récupération.
2. Remplacer le PEM d'environnement par un adaptateur CNG/TPM2/PKCS#11 sélectionné et testé.
3. Authentifier le manifeste d'intégrité et l'exécuter avant tout réseau/cache/Chromium.
4. Ajouter anti-rollback persistant aux révocations et rafraîchissement gouverné.
5. Ancrer la continuité de réconciliation inter-lots côté serveur.
6. Valider systemd réel, endurance ≥8 h et saturation disque.

DISPLAY-07 ne doit pas démarrer tant que ces éléments P0 ne sont pas clos par une intégration dédiée.
