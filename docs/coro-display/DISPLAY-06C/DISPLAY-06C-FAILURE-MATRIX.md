# Matrice des pannes

| Panne | Comportement |
|---|---|
| Réseau/serveur/DNS/TLS | cache actif conservé; synchronisation non confirmée |
| Rendu corrompu | refus SHA-256; aucun remplacement |
| Manifeste/signature invalide | refus fermé |
| Appareil/clé/publication révoqué | refus de manifeste et rendu |
| Cache corrompu | récupération génération précédente uniquement si encore admissible |
| Stockage saturé/écriture interrompue | transaction abandonnée |
| Nonce ou invitation concurrente | une seule consommation |
| Horloge hors fenêtre | requête refusée |
| Urgence active | persistée; aucune sortie automatique |
| Crash répété | backoff et limite du watchdog |

Panne électrique, DNS/TLS réels et saturation matérielle: `NOT_VERIFIED`.
